import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import Repository from '../models/Repository.js';
import Scan from '../models/Scan.js';
import Finding from '../models/Finding.js';
import { runGitleaks } from '../services/gitleaks.service.js';
import { runTrivy } from '../services/trivy.service.js';
import { createNotificationSafely } from './notification.controller.js';
import Notification from '../models/Notification.js';

/**
 * Calculates severity-weighted repository security health score (0-100).
 * Heuristic formula:
 * Baseline: 100
 * Deductions:
 *   - Critical: 25 pts
 *   - High: 15 pts
 *   - Medium: 5 pts
 *   - Low: 2 pts
 *   - Accepted Risk: 1 pt
 *   - Resolved: 0 pts (no penalty)
 * Clamped between 0 and 100.
 */
export const calculateSecurityScore = (findings, scanStatus = 'COMPLETED') => {
  if (scanStatus === 'FAILED') return null;
  if (!Array.isArray(findings)) return null;

  let deduction = 0;
  for (const f of findings) {
    if (f.status === 'RESOLVED') continue;

    if (f.status === 'ACCEPTED_RISK') {
      deduction += 1;
      continue;
    }

    const sev = (f.severity || '').toUpperCase();
    if (sev === 'CRITICAL') deduction += 25;
    else if (sev === 'HIGH') deduction += 15;
    else if (sev === 'MEDIUM') deduction += 5;
    else if (sev === 'LOW') deduction += 2;
    else deduction += 1;
  }

  const score = Math.max(0, Math.min(100, 100 - deduction));
  let grade = 'A';
  let riskLevel = 'Low Risk (Clean Posture)';

  if (score >= 90) {
    grade = 'A';
    riskLevel = 'Low Risk (Clean Posture)';
  } else if (score >= 75) {
    grade = 'B';
    riskLevel = 'Moderate Risk';
  } else if (score >= 50) {
    grade = 'C';
    riskLevel = 'Elevated Risk';
  } else {
    grade = 'D';
    riskLevel = 'Critical Risk';
  }

  return {
    score,
    grade,
    riskLevel,
    formula: '100 - (Critical*25 + High*15 + Medium*5 + Low*2 + AcceptedRisk*1)',
    disclaimer: 'Internal heuristic risk indicator based on weighted vulnerability severity. Not a formal government or ISO/NIST certification.',
  };
};

/**
 * Clones repository into a specified target directory with timeout and prompt protection.
 *
 * @param {string} url - Git repository clone URL.
 * @param {string} branch - Branch name (optional).
 * @param {string} targetDir - Destination folder.
 * @param {number} [timeoutMs=60000] - Clone timeout in milliseconds.
 */
const cloneRepository = (url, branch, targetDir, timeoutMs = 60000) => {
  return new Promise((resolve, reject) => {
    const cloneArgs = ['clone', '--depth', '1'];
    if (branch) {
      cloneArgs.push('-b', branch);
    }
    cloneArgs.push(url, targetDir);

    let settled = false;
    const gitProc = spawn('git', cloneArgs, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'echo',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          gitProc.kill('SIGKILL');
        } catch {}
        reject(new Error(`Git clone timed out after ${timeoutMs / 1000} seconds.`));
      }
    }, timeoutMs);

    let stderr = '';
    gitProc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    gitProc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start git process: ${err.message}`));
    });

    gitProc.on('close', (code) => {
      if (settled) return;

      if (code === 0) {
        settled = true;
        clearTimeout(timer);
        return resolve();
      }

      // If branch checkout failed, try fallback cloning default branch without -b
      if (branch) {
        console.warn(`[Git Clone] Branch "${branch}" checkout failed, falling back to default branch clone.`);
        
        const fallbackProc = spawn('git', ['clone', '--depth', '1', url, targetDir], {
          shell: false,
          windowsHide: true,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_ASKPASS: 'echo',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let fbStderr = '';
        fallbackProc.stderr.on('data', (d) => {
          fbStderr += d.toString();
        });

        fallbackProc.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error(`Failed to start fallback git process: ${err.message}`));
        });

        fallbackProc.on('close', (fbCode) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          if (fbCode === 0) {
            return resolve();
          }
          reject(new Error(`Git clone failed with code ${fbCode}: ${fbStderr.trim() || stderr.trim()}`));
        });
      } else {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Git clone failed with code ${code}: ${stderr.trim()}`));
      }
    });
  });
};

/**
 * Initiates an end-to-end security scan for a repository.
 */
export const startScan = async (req, res) => {
  let scan = null;
  let scanTempDir = null;

  try {
    const { repositoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID.',
      });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    // Prevent duplicate scan requests while a scan is currently RUNNING
    const existingRunningScan = await Scan.findOne({
      repositoryId: repository._id,
      status: 'RUNNING',
    });

    if (existingRunningScan) {
      const isStale = (Date.now() - new Date(existingRunningScan.startedAt || existingRunningScan.createdAt).getTime()) > 300000;
      if (isStale) {
        // Recover stale scan older than 5 minutes to terminal FAILED state
        existingRunningScan.status = 'FAILED';
        existingRunningScan.failureReason = 'Previous scan timed out or was abandoned.';
        existingRunningScan.completedAt = new Date();
        await existingRunningScan.save();
      } else {
        return res.status(409).json({
          success: false,
          message: 'A security scan is already in progress for this repository. Please wait for it to complete.',
          scanId: existingRunningScan._id,
        });
      }
    }

    // Create new scan record in RUNNING status
    scan = await Scan.create({
      repositoryId: repository._id,
      status: 'RUNNING',
      startedAt: new Date(),
      failureReason: '',
    });

    // Define temporary clone folder
    scanTempDir = path.join(os.tmpdir(), 'git-sec-scans', scan._id.toString());
    await fs.promises.mkdir(path.dirname(scanTempDir), { recursive: true });

    // Step 1: Clone repository with 60s timeout
    try {
      await cloneRepository(repository.url, repository.branch, scanTempDir, 60000);
    } catch (cloneErr) {
      scan.status = 'FAILED';
      scan.failureReason = `Git clone error: ${cloneErr.message}`;
      scan.completedAt = new Date();
      await scan.save();

      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'SCAN_FAILED',
        title: `Security Scan Failed: ${repository.name}`,
        message: `Unable to clone repository ${repository.owner}/${repository.name}: ${cloneErr.message}`,
        link: '/repositories',
      });

      return res.status(400).json({
        success: false,
        message: `Unable to clone repository: ${cloneErr.message}`,
        scan,
      });
    }

    // Step 2: Run security scanners concurrently with timeouts
    const [gitleaksSettled, trivySettled] = await Promise.allSettled([
      runGitleaks(scanTempDir, 60000),
      runTrivy(scanTempDir, 90000),
    ]);

    const gitleaksSuccess = gitleaksSettled.status === 'fulfilled';
    const trivySuccess = trivySettled.status === 'fulfilled';

    // If BOTH scanners failed, mark scan as FAILED (do not report false success)
    if (!gitleaksSuccess && !trivySuccess) {
      const gitleaksErr = gitleaksSettled.reason?.message || 'Gitleaks execution failed';
      const trivyErr = trivySettled.reason?.message || 'Trivy execution failed';
      const combinedFailure = `Both security scanners failed. Gitleaks: ${gitleaksErr} | Trivy: ${trivyErr}`;

      scan.status = 'FAILED';
      scan.failureReason = combinedFailure;
      scan.completedAt = new Date();
      await scan.save();

      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'SCAN_FAILED',
        title: `Security Scan Failed: ${repository.name}`,
        message: combinedFailure,
        link: '/repositories',
      });

      return res.status(500).json({
        success: false,
        message: combinedFailure,
        scan,
      });
    }

    const rawGitleaks = gitleaksSuccess ? gitleaksSettled.value : [];
    const rawTrivy = trivySuccess ? trivySettled.value : null;

    // Record partial scanner failure if one failed
    let partialWarning = '';
    if (!gitleaksSuccess) {
      partialWarning = `Gitleaks scanner warning: ${gitleaksSettled.reason?.message}`;
      console.warn('[Scan Partial Warning]', partialWarning);
    } else if (!trivySuccess) {
      partialWarning = `Trivy scanner warning: ${trivySettled.reason?.message}`;
      console.warn('[Scan Partial Warning]', partialWarning);
    }

    // Step 3: Normalize Gitleaks findings
    const normalizedGitleaks = rawGitleaks.map((item) => {
      const masked = item.Secret 
        ? (item.Secret.length > 6 ? `${item.Secret.slice(0, 3)}****${item.Secret.slice(-2)}` : '****')
        : 'Credential Pattern';

      return {
        scanId: scan._id,
        repositoryId: repository._id,
        scanner: 'GITLEAKS',
        type: item.RuleID || 'Secret',
        severity: 'HIGH',
        title: item.Description || item.RuleID || 'Exposed Secret Detected',
        description: `Secret rule: ${item.RuleID || 'Unknown'}. Match: ${masked}`,
        file: item.File || '',
        line: item.StartLine || null,
        identifier: item.RuleID || '',
        fingerprint: item.Fingerprint || `${item.File}:${item.StartLine}:${item.RuleID}`,
        remediation: 'Immediately revoke and rotate the exposed secret. Remove the credential from Git history using git-filter-repo or BFG Repo-Cleaner, and ensure .env or credentials files are included in .gitignore.',
      };
    });

    // Step 4: Normalize Trivy findings
    const normalizedTrivy = [];
    if (rawTrivy && Array.isArray(rawTrivy.Results)) {
      for (const result of rawTrivy.Results) {
        const targetFile = result.Target || '';
        const vulns = Array.isArray(result.Vulnerabilities) ? result.Vulnerabilities : [];

        for (const vuln of vulns) {
          let sev = (vuln.Severity || 'UNKNOWN').toUpperCase();
          if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].includes(sev)) {
            sev = 'UNKNOWN';
          }

          normalizedTrivy.push({
            scanId: scan._id,
            repositoryId: repository._id,
            scanner: 'TRIVY',
            type: 'Vulnerability',
            severity: sev,
            title: vuln.Title || vuln.VulnerabilityID || `Vulnerability in ${vuln.PkgName || 'package'}`,
            description: vuln.Description
              ? vuln.Description.slice(0, 500)
              : `Package: ${vuln.PkgName || 'unknown'} (${vuln.InstalledVersion || 'unknown'}) -> Fixed in: ${vuln.FixedVersion || 'none'}`,
            file: targetFile,
            line: null,
            identifier: vuln.VulnerabilityID || '',
            fingerprint: `${targetFile}:${vuln.VulnerabilityID || ''}:${vuln.PkgName || ''}`,
            remediation: vuln.FixedVersion
              ? `Upgrade ${vuln.PkgName || 'package'} to version ${vuln.FixedVersion} or later.`
              : (vuln.PrimaryURL ? `Review upstream security advisory: ${vuln.PrimaryURL}` : 'No fixed version announced yet. Review package usage or implement compensating controls.'),
          });
        }
      }
    }

    const allFindings = [...normalizedGitleaks, ...normalizedTrivy];

    // Step 5: Save findings to MongoDB associated with this scan
    if (allFindings.length > 0) {
      await Finding.insertMany(allFindings);
    }

    // Step 6: Compute counts and mark Scan COMPLETED
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const f of allFindings) {
      if (f.severity === 'CRITICAL') criticalCount++;
      else if (f.severity === 'HIGH') highCount++;
      else if (f.severity === 'MEDIUM') mediumCount++;
      else if (f.severity === 'LOW') lowCount++;
    }

    const completedAt = new Date();
    const duration = Math.max(1, Math.round((completedAt - scan.startedAt) / 1000));

    scan.status = 'COMPLETED';
    scan.failureReason = partialWarning;
    scan.completedAt = completedAt;
    scan.duration = duration;
    scan.totalFindings = allFindings.length;
    scan.criticalCount = criticalCount;
    scan.highCount = highCount;
    scan.mediumCount = mediumCount;
    scan.lowCount = lowCount;
    await scan.save();

    // Step 7: Update Repository lastScannedAt
    repository.lastScannedAt = completedAt;
    await repository.save();

    // Trigger in-app notification based on scan results
    if (criticalCount > 0) {
      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'CRITICAL_FINDINGS',
        title: `Critical Vulnerabilities: ${repository.name}`,
        message: `Detected ${criticalCount} Critical and ${highCount} High vulnerabilities in ${repository.name}. Immediate triage required.`,
        link: `/findings?scanId=${scan._id}`,
      });
    } else if (highCount > 0) {
      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'HIGH_FINDINGS',
        title: `High Severity Findings: ${repository.name}`,
        message: `Detected ${highCount} High severity security findings in ${repository.name}.`,
        link: `/findings?scanId=${scan._id}`,
      });
    } else {
      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'SCAN_COMPLETED',
        title: `Scan Completed: ${repository.name}`,
        message: `Scan finished in ${duration}s. ${allFindings.length === 0 ? 'No security issues detected.' : `${allFindings.length} findings recorded.`}`,
        link: `/findings?scanId=${scan._id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Scan completed successfully.',
      scan,
      repository,
      findingsSummary: {
        total: allFindings.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      scannersExecuted: {
        gitleaks: gitleaksSuccess,
        trivy: trivySuccess,
      },
    });
  } catch (error) {
    console.error('[Scan Error]', error);

    if (scan) {
      scan.status = 'FAILED';
      scan.failureReason = error.message || 'Scan aborted due to an internal error.';
      scan.completedAt = new Date();
      await scan.save().catch(() => {});

      await createNotificationSafely({
        userId: req.user.id,
        repositoryId: repository._id,
        scanId: scan._id,
        type: 'SCAN_FAILED',
        title: `Scan Terminated: ${repository.name}`,
        message: error.message || 'Scan aborted due to an internal error.',
        link: '/repositories',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete security scan.',
      scan,
    });
  } finally {
    // Step 8: Safe cleanup of temporary clone directory
    if (scanTempDir) {
      try {
        await fs.promises.rm(scanTempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('[Scan Cleanup Warning]', cleanupErr.message);
      }
    }
  }
};

/**
 * Retrieves all scans for a specific repository.
 */
export const getRepositoryScans = async (req, res) => {
  try {
    const { repositoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID.',
      });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    const scans = await Scan.find({
      repositoryId: repository._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      scans,
    });
  } catch (error) {
    console.error('[Scan Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scans.',
    });
  }
};

/**
 * Retrieves all security findings for the authenticated user's repositories,
 * with optional filtering by scanId or repositoryId.
 */
export const getAllFindings = async (req, res) => {
  try {
    const { scanId, repositoryId } = req.query;

    const userRepos = await Repository.find({ userId: req.user.id })
      .select('_id name owner url branch lastScannedAt')
      .lean();
    
    const repoIds = userRepos.map((r) => r._id);

    // If a specific scanId is requested:
    if (scanId) {
      if (!mongoose.Types.ObjectId.isValid(scanId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scan ID format.',
        });
      }

      const scan = await Scan.findOne({
        _id: scanId,
        repositoryId: { $in: repoIds },
      }).populate('repositoryId', 'name owner url branch lastScannedAt');

      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan record not found or access denied.',
        });
      }

      const findings = await Finding.find({ scanId: scan._id })
        .populate('repositoryId', 'name owner url branch')
        .populate('scanId', 'status completedAt duration failureReason totalFindings criticalCount highCount mediumCount lowCount')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: findings.length,
        scan,
        repository: scan.repositoryId,
        findings,
        repositories: userRepos,
      });
    }

    // Filter by repositoryId if valid
    const targetRepoIds = repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)
      ? repoIds.filter((id) => id.toString() === repositoryId)
      : repoIds;

    // Fetch findings and latest scan aggregation concurrently
    const [findings, latestScans] = await Promise.all([
      Finding.find({ repositoryId: { $in: targetRepoIds } })
        .populate('repositoryId', 'name owner url branch')
        .populate('scanId', 'status completedAt duration failureReason totalFindings criticalCount highCount mediumCount lowCount')
        .sort({ createdAt: -1 })
        .lean(),
      Scan.aggregate([
        { $match: { repositoryId: { $in: repoIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$repositoryId',
            latestScan: { $first: '$$ROOT' },
          },
        },
      ]),
    ]);

    const latestScanMap = {};
    for (const item of latestScans) {
      latestScanMap[item._id.toString()] = item.latestScan;
    }

    const reposWithScanStatus = userRepos.map((repo) => ({
      ...repo,
      latestScan: latestScanMap[repo._id.toString()] || null,
    }));

    return res.status(200).json({
      success: true,
      count: findings.length,
      findings,
      repositories: reposWithScanStatus,
    });
  } catch (error) {
    console.error('[Findings Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve security findings.',
    });
  }
};

/**
 * Retrieves scan metadata and findings for a specific scan ID.
 */
export const getScanFindings = async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scan ID format.',
      });
    }

    const userRepos = await Repository.find({ userId: req.user.id }).select('_id');
    const repoIds = userRepos.map((r) => r._id);

    const scan = await Scan.findOne({
      _id: scanId,
      repositoryId: { $in: repoIds },
    }).populate('repositoryId', 'name owner url branch lastScannedAt');

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan record not found or access denied.',
      });
    }

    const findings = await Finding.find({ scanId: scan._id })
      .populate('repositoryId', 'name owner url branch')
      .populate('scanId', 'status completedAt duration failureReason totalFindings criticalCount highCount mediumCount lowCount')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: findings.length,
      scan,
      repository: scan.repositoryId,
      findings,
    });
  } catch (error) {
    console.error('[Scan Findings Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve findings for the specified scan.',
    });
  }
};

/**
 * Computes comprehensive DevSecOps security command center statistics from real database records.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { repositoryId, timeRange, severity, scanner, status } = req.query;

    const userRepos = await Repository.find({ userId: req.user.id })
      .select('_id name owner url branch lastScannedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const repoIds = userRepos.map((r) => r._id);

    // Apply repository filter if passed
    const targetRepoIds = (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId))
      ? repoIds.filter((id) => id.toString() === repositoryId)
      : repoIds;

    // Time filter for findings/scans (7d, 30d, all)
    let dateFilter = null;
    const now = new Date();
    if (timeRange === '7d') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build finding query
    const findingQuery = { repositoryId: { $in: targetRepoIds } };
    if (dateFilter) {
      findingQuery.createdAt = { $gte: dateFilter };
    }
    if (severity && severity !== 'ALL') {
      findingQuery.severity = severity.toUpperCase();
    }
    if (scanner && scanner !== 'ALL') {
      findingQuery.scanner = scanner.toUpperCase();
    }
    if (status && status !== 'ALL') {
      findingQuery.status = status.toUpperCase();
    }

    const scanQuery = { repositoryId: { $in: targetRepoIds } };
    if (dateFilter) {
      scanQuery.createdAt = { $gte: dateFilter };
    }

    // Fetch findings, scans, and notifications in parallel with field projections
    const [findings, scans, notifications] = await Promise.all([
      Finding.find(findingQuery)
        .select('_id repositoryId scanner severity status createdAt')
        .populate('repositoryId', 'name owner branch url')
        .lean(),
      Scan.find(scanQuery)
        .select('_id repositoryId status duration failureReason totalFindings criticalCount highCount mediumCount lowCount startedAt completedAt createdAt')
        .populate('repositoryId', 'name owner branch url')
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ userId: req.user.id })
        .select('_id userId repositoryId scanId type title message link isRead createdAt')
        .populate('repositoryId', 'name owner')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // 1. Compute Summary Metrics
    const totalRepos = userRepos.length;
    const scannedReposCount = userRepos.filter((r) => r.lastScannedAt !== null).length;

    // Unresolved findings (OPEN, IN_PROGRESS, or undefined)
    const openFindings = findings.filter((f) => (f.status || 'OPEN') === 'OPEN' || f.status === 'IN_PROGRESS');
    const resolvedFindings = findings.filter((f) => f.status === 'RESOLVED');
    const openCritical = openFindings.filter((f) => f.severity === 'CRITICAL');
    const openHigh = openFindings.filter((f) => f.severity === 'HIGH');
    const exposedSecrets = openFindings.filter((f) => f.scanner === 'GITLEAKS');
    const criticalCVEs = openFindings.filter((f) => f.scanner === 'TRIVY' && f.severity === 'CRITICAL');

    // Global security health score
    let healthScore = 100;
    let healthGrade = 'A';
    let healthLabel = 'Pending initial scan';
    if (scannedReposCount > 0) {
      const scoreObj = calculateSecurityScore(findings);
      healthScore = scoreObj ? scoreObj.score : 100;
      healthGrade = scoreObj ? scoreObj.grade : 'A';
      healthLabel = scoreObj ? scoreObj.riskLevel : 'Clean posture';
    }

    // 2. Scan Freshness & Hygiene Evaluation
    const STALE_THRESHOLD_DAYS = 7;
    const staleThresholdMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    let freshCount = 0;
    let staleCount = 0;
    let neverScannedCount = 0;

    // Latest scan per repository map
    const latestScanMap = {};
    for (const s of scans) {
      const rId = s.repositoryId?._id?.toString() || s.repositoryId?.toString();
      if (!latestScanMap[rId]) {
        latestScanMap[rId] = s;
      }
    }

    // Findings grouped by repo
    const findingsByRepoMap = {};
    for (const f of findings) {
      const rId = f.repositoryId?._id?.toString() || f.repositoryId?.toString();
      if (!findingsByRepoMap[rId]) findingsByRepoMap[rId] = [];
      findingsByRepoMap[rId].push(f);
    }

    // 3. Repository Risk Table Data
    const repositoryRiskTable = userRepos.map((repo) => {
      const rId = repo._id.toString();
      const rFindings = findingsByRepoMap[rId] || [];
      const latestScan = latestScanMap[rId] || null;

      let freshness = 'NEVER_SCANNED';
      if (repo.lastScannedAt) {
        const timeSinceScan = now.getTime() - new Date(repo.lastScannedAt).getTime();
        if (timeSinceScan > staleThresholdMs) {
          freshness = 'STALE';
          staleCount++;
        } else {
          freshness = 'FRESH';
          freshCount++;
        }
      } else {
        neverScannedCount++;
      }

      const rOpenCritical = rFindings.filter((f) => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length;
      const rOpenHigh = rFindings.filter((f) => f.severity === 'HIGH' && f.status !== 'RESOLVED').length;
      const rOpenTotal = rFindings.filter((f) => f.status !== 'RESOLVED').length;

      let repoScore = null;
      let repoGrade = 'N/A';
      if (latestScan && latestScan.status === 'COMPLETED') {
        const scoreObj = calculateSecurityScore(rFindings, 'COMPLETED');
        repoScore = scoreObj ? scoreObj.score : 100;
        repoGrade = scoreObj ? scoreObj.grade : 'A';
      }

      return {
        _id: repo._id,
        name: repo.name,
        owner: repo.owner,
        fullName: `${repo.owner}/${repo.name}`,
        url: repo.url,
        branch: repo.branch || 'main',
        lastScannedAt: repo.lastScannedAt,
        freshness,
        scanStatus: latestScan ? latestScan.status : 'PENDING',
        latestScanId: latestScan ? latestScan._id : null,
        latestScanDuration: latestScan ? latestScan.duration : null,
        failureReason: latestScan?.failureReason || '',
        openCriticalCount: rOpenCritical,
        openHighCount: rOpenHigh,
        openTotal: rOpenTotal,
        totalFindings: rFindings.length,
        score: repoScore,
        grade: repoGrade,
      };
    });

    // 4. Recommended Actions / Security Advisories Generator
    const recommendedActions = [];

    // Check failed scans first
    for (const repo of repositoryRiskTable) {
      if (repo.scanStatus === 'FAILED') {
        recommendedActions.push({
          id: `failed-${repo._id}`,
          priority: 'CRITICAL',
          category: 'SCAN_FAILURE',
          title: `Retry failed security scan for ${repo.name}`,
          description: `Latest scan failed: ${repo.failureReason || 'Tool error or clone timeout'}. Run a new scan to establish security baseline.`,
          actionType: 'RETRY_SCAN',
          repoId: repo._id,
          repoName: repo.name,
          link: `/repositories`,
        });
      }
    }

    // Check open critical vulnerabilities
    for (const repo of repositoryRiskTable) {
      if (repo.openCriticalCount > 0) {
        recommendedActions.push({
          id: `crit-${repo._id}`,
          priority: 'CRITICAL',
          category: 'CRITICAL_VULN',
          title: `Remediate ${repo.openCriticalCount} critical issues in ${repo.name}`,
          description: `Unresolved critical secrets or CVEs detected. Immediate remediation advised before merging pull requests.`,
          actionType: 'VIEW_FINDINGS',
          repoId: repo._id,
          repoName: repo.name,
          link: `/findings?repoId=${repo._id}&severity=CRITICAL`,
        });
      } else if (repo.openHighCount > 0) {
        recommendedActions.push({
          id: `high-${repo._id}`,
          priority: 'HIGH',
          category: 'HIGH_VULN',
          title: `Triage ${repo.openHighCount} high severity findings in ${repo.name}`,
          description: `High severity vulnerabilities present. Review dependencies or patch packages.`,
          actionType: 'VIEW_FINDINGS',
          repoId: repo._id,
          repoName: repo.name,
          link: `/findings?repoId=${repo._id}&severity=HIGH`,
        });
      }
    }

    // Check never scanned repos
    for (const repo of repositoryRiskTable) {
      if (repo.freshness === 'NEVER_SCANNED') {
        recommendedActions.push({
          id: `never-${repo._id}`,
          priority: 'MEDIUM',
          category: 'NEVER_SCANNED',
          title: `Initialize security scan for ${repo.name}`,
          description: `Repository has never been scanned. Run automated Gitleaks & Trivy inspection to assess posture.`,
          actionType: 'SCAN',
          repoId: repo._id,
          repoName: repo.name,
          link: `/repositories`,
        });
      }
    }

    // Check stale scans
    for (const repo of repositoryRiskTable) {
      if (repo.freshness === 'STALE') {
        const days = Math.max(1, Math.round((now.getTime() - new Date(repo.lastScannedAt).getTime()) / (1000 * 60 * 60 * 24)));
        recommendedActions.push({
          id: `stale-${repo._id}`,
          priority: 'LOW',
          category: 'STALE_SCAN',
          title: `Refresh stale security scan for ${repo.name}`,
          description: `Last successful scan was ${days} days ago. Scheduled refresh recommended to detect new upstream CVE disclosures.`,
          actionType: 'SCAN',
          repoId: repo._id,
          repoName: repo.name,
          link: `/repositories`,
        });
      }
    }

    // 5. Automated Latest Scan Comparison (Latest Completed Scan vs Previous Completed Scan for same repo)
    let latestScanComparison = null;
    const completedScans = scans.filter((s) => s.status === 'COMPLETED');
    if (completedScans.length >= 2) {
      const targetScan = completedScans[0];
      const targetRepoIdStr = targetScan.repositoryId?._id?.toString() || targetScan.repositoryId?.toString();
      // Find previous scan for same repo
      const baseScan = completedScans.slice(1).find((s) => {
        const rIdStr = s.repositoryId?._id?.toString() || s.repositoryId?.toString();
        return rIdStr === targetRepoIdStr;
      });

      if (baseScan) {
        const [targetF, baseF] = await Promise.all([
          Finding.find({ scanId: targetScan._id }).select('scanId fingerprint scanner identifier title file line status severity').lean(),
          Finding.find({ scanId: baseScan._id }).select('scanId fingerprint scanner identifier title file line status severity').lean(),
        ]);

        const getFingerprint = (f) => f.fingerprint || `${f.scanner}:${f.identifier || f.title}:${f.file || ''}:${f.line || ''}`;
        const baseSet = new Set(baseF.map(getFingerprint));
        const targetSet = new Set(targetF.map(getFingerprint));

        let newCount = 0;
        let persistentCount = 0;
        let fixedCount = 0;

        for (const t of targetF) {
          if (baseSet.has(getFingerprint(t))) persistentCount++;
          else newCount++;
        }
        for (const b of baseF) {
          if (!targetSet.has(getFingerprint(b))) fixedCount++;
        }

        const baseScoreObj = calculateSecurityScore(baseF, 'COMPLETED');
        const targetScoreObj = calculateSecurityScore(targetF, 'COMPLETED');
        const baseScore = baseScoreObj ? baseScoreObj.score : 100;
        const targetScore = targetScoreObj ? targetScoreObj.score : 100;

        latestScanComparison = {
          repoName: targetScan.repositoryId?.name || 'Repository',
          repoOwner: targetScan.repositoryId?.owner || '',
          baseScanId: baseScan._id,
          targetScanId: targetScan._id,
          baseDate: baseScan.completedAt || baseScan.createdAt,
          targetDate: targetScan.completedAt || targetScan.createdAt,
          baseScore,
          targetScore,
          scoreDelta: targetScore - baseScore,
          newCount,
          fixedCount,
          persistentCount,
          totalBaseFindings: baseF.length,
          totalTargetFindings: targetF.length,
        };
      }
    }

    // 6. Security Trends Data (Chronological for Charting)
    const scanTrends = completedScans
      .slice(0, 10)
      .reverse()
      .map((s, idx) => ({
        index: idx + 1,
        date: s.completedAt ? new Date(s.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
        repo: s.repositoryId?.name || 'Repo',
        totalFindings: s.totalFindings || 0,
        critical: s.criticalCount || 0,
        high: s.highCount || 0,
        medium: s.mediumCount || 0,
        low: s.lowCount || 0,
      }));

    // Newly detected vs resolved findings breakdown
    const newVsResolvedTrends = [
      { name: 'Active Open', count: openFindings.length, fill: '#ef4444' },
      { name: 'In Progress', count: findings.filter((f) => f.status === 'IN_PROGRESS').length, fill: '#0ea5e9' },
      { name: 'Resolved', count: resolvedFindings.length, fill: '#10b981' },
      { name: 'Accepted Risk', count: findings.filter((f) => f.status === 'ACCEPTED_RISK').length, fill: '#a855f7' },
    ];

    // Severity distribution
    const sevMap = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const f of openFindings) {
      const s = (f.severity || 'UNKNOWN').toUpperCase();
      sevMap[s] = (sevMap[s] || 0) + 1;
    }
    const severityDistribution = [
      { name: 'Critical', count: sevMap.CRITICAL, fill: '#ef4444' },
      { name: 'High', count: sevMap.HIGH, fill: '#f97316' },
      { name: 'Medium', count: sevMap.MEDIUM, fill: '#eab308' },
      { name: 'Low', count: sevMap.LOW, fill: '#3b82f6' },
    ];

    // 7. Recent Security Activity Stream
    const recentActivity = [];

    // Add recent scans
    for (const s of scans.slice(0, 6)) {
      const rName = s.repositoryId?.name || 'Repository';
      recentActivity.push({
        id: `scan-${s._id}`,
        type: s.status === 'FAILED' ? 'SCAN_FAILED' : 'SCAN_COMPLETED',
        title: s.status === 'FAILED' ? `Scan failed on ${rName}` : `Scan completed for ${rName}`,
        message: s.status === 'FAILED' ? (s.failureReason || 'Encountered error') : `Detected ${s.totalFindings} findings (${s.criticalCount} Critical, ${s.highCount} High) in ${s.duration || 1}s.`,
        timestamp: s.completedAt || s.createdAt,
        link: s.status === 'FAILED' ? '/repositories' : `/findings?scanId=${s._id}`,
        status: s.status,
      });
    }

    // Add recent notifications/status changes
    for (const n of notifications.slice(0, 4)) {
      recentActivity.push({
        id: `notif-${n._id}`,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.createdAt,
        link: n.link || '/notifications',
        status: n.isRead ? 'READ' : 'UNREAD',
      });
    }

    // Format backwards-compatible recentScans list
    const recentScansList = scans.slice(0, 10).map((s) => ({
      scanId: s._id,
      repositoryId: s.repositoryId?._id || s.repositoryId,
      repositoryName: s.repositoryId?.name || 'Repository',
      status: s.status,
      completedAt: s.completedAt || s.createdAt,
      totalFindings: s.totalFindings || 0,
      criticalCount: s.criticalCount || 0,
      highCount: s.highCount || 0,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        trackedRepositories: totalRepos,
        scannedRepositories: scannedReposCount,
        openCriticalFindings: openCritical.length,
        unresolvedFindings: openFindings.length,
        resolvedFindings: resolvedFindings.length,
        totalFindings: findings.length,
        exposedSecrets: exposedSecrets.length,
        criticalCVEs: criticalCVEs.length,
        healthScore: `${healthScore}%`,
        healthScoreNumber: healthScore,
        healthGrade,
        healthLabel,
        freshness: {
          fresh: freshCount,
          stale: staleCount,
          neverScanned: neverScannedCount,
          thresholdDays: STALE_THRESHOLD_DAYS,
        },
      },
      repositoryRiskTable,
      recommendedActions: recommendedActions.slice(0, 6),
      latestScanComparison,
      trends: {
        scanTrends,
        newVsResolvedTrends,
        severityDistribution,
      },
      recentScans: recentScansList,
      recentActivity: recentActivity.slice(0, 8),
      availableRepositories: userRepos.map((r) => ({ _id: r._id, name: r.name, owner: r.owner })),
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics.',
    });
  }
};

/**
 * Updates a finding's vulnerability lifecycle status and remediation notes.
 */
export const updateFindingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid finding ID format.',
      });
    }

    const userRepos = await Repository.find({ userId: req.user.id }).select('_id');
    const repoIds = userRepos.map((r) => r._id);

    const finding = await Finding.findOne({
      _id: id,
      repositoryId: { $in: repoIds },
    }).populate('repositoryId', 'name owner url');

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding record not found or access denied.',
      });
    }

    const previousStatus = finding.status || 'OPEN';
    finding.status = status;
    if (typeof note === 'string') {
      finding.remediationNote = note.trim();
    }

    if (!Array.isArray(finding.statusHistory)) {
      finding.statusHistory = [];
    }

    finding.statusHistory.push({
      status,
      note: typeof note === 'string' ? note.trim() : '',
      changedBy: req.user.id,
      changedAt: new Date(),
    });

    await finding.save();

    // Trigger in-app notification for status modification
    await createNotificationSafely({
      userId: req.user.id,
      repositoryId: finding.repositoryId?._id,
      findingId: finding._id,
      type: 'STATUS_CHANGED',
      title: `Finding Status Changed: ${status}`,
      message: `Finding "${finding.title}" in ${finding.repositoryId?.name || 'repository'} changed from ${previousStatus} to ${status}${note ? ` (Note: ${note.trim()})` : ''}.`,
      link: `/findings?repoId=${finding.repositoryId?._id}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Finding status updated successfully.',
      finding,
    });
  } catch (error) {
    console.error('[Update Finding Status Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update finding status.',
    });
  }
};

/**
 * Aggregates real security analytics across repositories and scan history.
 */
export const getSecurityAnalytics = async (req, res) => {
  try {
    const userRepos = await Repository.find({ userId: req.user.id })
      .select('_id name owner lastScannedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const repoIds = userRepos.map((r) => r._id);

    // Fetch findings and scans concurrently with field projections
    const [findings, recentScans] = await Promise.all([
      Finding.find({ repositoryId: { $in: repoIds } })
        .select('repositoryId scanner severity status')
        .populate('repositoryId', 'name owner')
        .lean(),
      Scan.find({ repositoryId: { $in: repoIds } })
        .select('repositoryId status completedAt duration totalFindings criticalCount highCount mediumCount lowCount')
        .populate('repositoryId', 'name owner')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    // 1. Severity Distribution
    const severityMap = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const f of findings) {
      const sev = (f.severity || 'UNKNOWN').toUpperCase();
      severityMap[sev] = (severityMap[sev] || 0) + 1;
    }

    const severityDistribution = [
      { name: 'Critical', count: severityMap.CRITICAL, color: '#ef4444' },
      { name: 'High', count: severityMap.HIGH, color: '#f97316' },
      { name: 'Medium', count: severityMap.MEDIUM, color: '#eab308' },
      { name: 'Low', count: severityMap.LOW, color: '#3b82f6' },
      { name: 'Unknown', count: severityMap.UNKNOWN, color: '#94a3b8' },
    ];

    // 2. Lifecycle Status Distribution
    const statusMap = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, ACCEPTED_RISK: 0 };
    for (const f of findings) {
      const st = f.status || 'OPEN';
      statusMap[st] = (statusMap[st] || 0) + 1;
    }

    const lifecycleBreakdown = [
      { status: 'OPEN', label: 'Open', count: statusMap.OPEN, color: '#ef4444' },
      { status: 'IN_PROGRESS', label: 'In Progress', count: statusMap.IN_PROGRESS, color: '#0ea5e9' },
      { status: 'RESOLVED', label: 'Resolved', count: statusMap.RESOLVED, color: '#10b981' },
      { status: 'ACCEPTED_RISK', label: 'Accepted Risk', count: statusMap.ACCEPTED_RISK, color: '#a855f7' },
    ];

    // 3. Findings by Repository
    const repoFindingsMap = {};
    for (const r of userRepos) {
      repoFindingsMap[r._id.toString()] = {
        repoId: r._id,
        name: r.name,
        fullName: `${r.owner}/${r.name}`,
        secrets: 0,
        vulnerabilities: 0,
        critical: 0,
        high: 0,
        total: 0,
        repoFindings: [],
      };
    }

    for (const f of findings) {
      const rId = f.repositoryId?._id?.toString() || f.repositoryId?.toString();
      if (repoFindingsMap[rId]) {
        repoFindingsMap[rId].total++;
        repoFindingsMap[rId].repoFindings.push(f);
        if (f.scanner === 'GITLEAKS') repoFindingsMap[rId].secrets++;
        if (f.scanner === 'TRIVY') repoFindingsMap[rId].vulnerabilities++;
        if (f.severity === 'CRITICAL') repoFindingsMap[rId].critical++;
        if (f.severity === 'HIGH') repoFindingsMap[rId].high++;
      }
    }

    const findingsByRepository = Object.values(repoFindingsMap).map((repoData) => {
      const scoreObj = calculateSecurityScore(repoData.repoFindings);
      return {
        repoId: repoData.repoId,
        name: repoData.name,
        fullName: repoData.fullName,
        secrets: repoData.secrets,
        vulnerabilities: repoData.vulnerabilities,
        critical: repoData.critical,
        high: repoData.high,
        total: repoData.total,
        score: scoreObj ? scoreObj.score : 100,
        grade: scoreObj ? scoreObj.grade : 'A',
      };
    });

    // 4. Scan History Trends (chronological for charting)
    const scanTrends = recentScans
      .filter((s) => s.status === 'COMPLETED')
      .slice(0, 15)
      .reverse()
      .map((s, idx) => ({
        scanIndex: idx + 1,
        scanId: s._id,
        date: s.completedAt
          ? new Date(s.completedAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Unknown',
        repo: s.repositoryId?.name || 'Repo',
        totalFindings: s.totalFindings || 0,
        critical: s.criticalCount || 0,
        high: s.highCount || 0,
        medium: s.mediumCount || 0,
        low: s.lowCount || 0,
        duration: s.duration || 0,
      }));

    // 5. Scanner Engine Breakdown
    const gitleaksCount = findings.filter((f) => f.scanner === 'GITLEAKS').length;
    const trivyCount = findings.filter((f) => f.scanner === 'TRIVY').length;

    const scannerBreakdown = [
      { name: 'Gitleaks (Secrets)', count: gitleaksCount, color: '#f59e0b' },
      { name: 'Trivy (Vulnerabilities)', count: trivyCount, color: '#0ea5e9' },
    ];

    // 6. Overall Metrics
    const totalFindingsCount = findings.length;
    const resolvedCount = statusMap.RESOLVED;
    const resolutionRate = totalFindingsCount > 0
      ? Math.round((resolvedCount / totalFindingsCount) * 100)
      : 100;

    const globalScoreObj = calculateSecurityScore(findings);

    return res.status(200).json({
      success: true,
      analytics: {
        totalRepositories: userRepos.length,
        scannedRepositories: userRepos.filter((r) => r.lastScannedAt !== null).length,
        totalScans: recentScans.length,
        totalFindings: totalFindingsCount,
        resolvedFindings: resolvedCount,
        resolutionRate: `${resolutionRate}%`,
        globalScore: globalScoreObj ? globalScoreObj.score : 100,
        globalGrade: globalScoreObj ? globalScoreObj.grade : 'A',
        globalRiskLevel: globalScoreObj ? globalScoreObj.riskLevel : 'Low Risk (Clean Posture)',
        severityDistribution,
        lifecycleBreakdown,
        findingsByRepository,
        scanTrends,
        scannerBreakdown,
      },
    });
  } catch (error) {
    console.error('[Analytics Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate security analytics.',
    });
  }
};

/**
 * Retrieves full scan history for the user's repositories with computed security scores.
 */
export const getScanHistory = async (req, res) => {
  try {
    const { repositoryId } = req.query;
    const userRepos = await Repository.find({ userId: req.user.id }).select('_id');
    const repoIds = userRepos.map((r) => r._id);

    const matchQuery = { repositoryId: { $in: repoIds } };
    if (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)) {
      matchQuery.repositoryId = repositoryId;
    }

    const scans = await Scan.find(matchQuery)
      .populate('repositoryId', 'name owner url branch')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Fetch findings to compute scores per scan with minimal projection
    const scanIds = scans.map((s) => s._id);
    const findings = await Finding.find({ scanId: { $in: scanIds } })
      .select('scanId status severity')
      .lean();

    const findingsByScan = {};
    for (const f of findings) {
      const sId = f.scanId.toString();
      if (!findingsByScan[sId]) findingsByScan[sId] = [];
      findingsByScan[sId].push(f);
    }

    const formattedScans = scans.map((s) => {
      const sFindings = findingsByScan[s._id.toString()] || [];
      const scoreObj = calculateSecurityScore(sFindings, s.status);

      return {
        _id: s._id,
        repository: s.repositoryId,
        status: s.status,
        failureReason: s.failureReason,
        duration: s.duration,
        startedAt: s.startedAt || s.createdAt,
        completedAt: s.completedAt,
        totalFindings: s.totalFindings || 0,
        criticalCount: s.criticalCount || 0,
        highCount: s.highCount || 0,
        mediumCount: s.mediumCount || 0,
        lowCount: s.lowCount || 0,
        securityScore: scoreObj ? scoreObj.score : null,
        grade: scoreObj ? scoreObj.grade : null,
        riskLevel: scoreObj ? scoreObj.riskLevel : (s.status === 'FAILED' ? 'Scan Failed' : 'Pending'),
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedScans.length,
      scans: formattedScans,
    });
  } catch (error) {
    console.error('[Scan History Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan history.',
    });
  }
};

/**
 * Compares two scans from the same repository to identify new, fixed, and persistent findings.
 * Adheres to rule: "Do not claim a finding is fixed merely because it is absent from a failed or incomplete scan."
 */
export const compareScans = async (req, res) => {
  try {
    const { baseScanId, targetScanId } = req.body;

    if (!baseScanId || !targetScanId) {
      return res.status(400).json({
        success: false,
        message: 'Both baseScanId and targetScanId are required for comparison.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(baseScanId) || !mongoose.Types.ObjectId.isValid(targetScanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scan ID format provided.',
      });
    }

    if (baseScanId === targetScanId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot compare a scan against itself. Please select two different scans.',
      });
    }

    const userRepos = await Repository.find({ userId: req.user.id }).select('_id');
    const repoIds = userRepos.map((r) => r._id);

    const [baseScan, targetScan] = await Promise.all([
      Scan.findOne({ _id: baseScanId, repositoryId: { $in: repoIds } }).populate('repositoryId', 'name owner url branch').lean(),
      Scan.findOne({ _id: targetScanId, repositoryId: { $in: repoIds } }).populate('repositoryId', 'name owner url branch').lean(),
    ]);

    if (!baseScan || !targetScan) {
      return res.status(404).json({
        success: false,
        message: 'One or both scan records were not found or access was denied.',
      });
    }

    if (baseScan.repositoryId._id.toString() !== targetScan.repositoryId._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Scans must belong to the same repository to be compared.',
      });
    }

    const [baseFindings, targetFindings] = await Promise.all([
      Finding.find({ scanId: baseScan._id }).lean(),
      Finding.find({ scanId: targetScan._id }).lean(),
    ]);

    const targetFailed = targetScan.status === 'FAILED';
    const baseFailed = baseScan.status === 'FAILED';
    const reliable = !targetFailed && !baseFailed;

    let warning = '';
    if (targetFailed && baseFailed) {
      warning = 'Both selected scans failed. Finding delta cannot be determined.';
    } else if (targetFailed) {
      warning = 'Target scan failed during execution. Findings absent from the target scan CANNOT be considered fixed.';
    } else if (baseFailed) {
      warning = 'Base scan failed during execution. Fixed status cannot be reliably determined.';
    }

    const getFingerprint = (f) => {
      if (f.fingerprint && f.fingerprint.trim().length > 0) return f.fingerprint.trim();
      return `${f.scanner}:${f.identifier || f.title}:${f.file || ''}:${f.line || ''}`;
    };

    const baseMap = new Map();
    baseFindings.forEach((f) => {
      baseMap.set(getFingerprint(f), f);
    });

    const targetMap = new Map();
    targetFindings.forEach((f) => {
      targetMap.set(getFingerprint(f), f);
    });

    const newlyDetected = [];
    const persistent = [];
    const fixed = [];

    // Evaluate target findings
    for (const [key, tFinding] of targetMap.entries()) {
      if (baseMap.has(key)) {
        persistent.push({
          ...tFinding,
          baseMatch: baseMap.get(key),
        });
      } else {
        newlyDetected.push(tFinding);
      }
    }

    // Evaluate base findings for fixed status (ONLY if targetScan completed successfully!)
    if (targetScan.status === 'COMPLETED') {
      for (const [key, bFinding] of baseMap.entries()) {
        if (!targetMap.has(key)) {
          fixed.push(bFinding);
        }
      }
    }

    const baseScoreObj = calculateSecurityScore(baseFindings, baseScan.status);
    const targetScoreObj = calculateSecurityScore(targetFindings, targetScan.status);

    const baseScore = baseScoreObj ? baseScoreObj.score : null;
    const targetScore = targetScoreObj ? targetScoreObj.score : null;
    const scoreDelta = (baseScore !== null && targetScore !== null) ? (targetScore - baseScore) : null;

    return res.status(200).json({
      success: true,
      comparison: {
        repository: {
          id: baseScan.repositoryId._id,
          name: baseScan.repositoryId.name,
          owner: baseScan.repositoryId.owner,
          url: baseScan.repositoryId.url,
          branch: baseScan.repositoryId.branch,
        },
        baseScan: {
          id: baseScan._id,
          status: baseScan.status,
          completedAt: baseScan.completedAt || baseScan.createdAt,
          totalFindings: baseFindings.length,
          score: baseScore,
          grade: baseScoreObj?.grade || 'N/A',
        },
        targetScan: {
          id: targetScan._id,
          status: targetScan.status,
          completedAt: targetScan.completedAt || targetScan.createdAt,
          totalFindings: targetFindings.length,
          score: targetScore,
          grade: targetScoreObj?.grade || 'N/A',
        },
        reliable,
        warning,
        scoreDelta,
        findingsDelta: targetFindings.length - baseFindings.length,
        summary: {
          newCount: newlyDetected.length,
          fixedCount: fixed.length,
          persistentCount: persistent.length,
        },
        newlyDetected,
        fixed,
        persistent,
      },
    });
  } catch (error) {
    console.error('[Compare Scans Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compare scans.',
    });
  }
};