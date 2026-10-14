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

    // Fetch findings populated with repository and scan details
    const findings = await Finding.find({ repositoryId: { $in: targetRepoIds } })
      .populate('repositoryId', 'name owner url branch')
      .populate('scanId', 'status completedAt duration failureReason totalFindings criticalCount highCount mediumCount lowCount')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch latest scan for each repository to determine scan status (completed vs failed)
    const latestScans = await Scan.aggregate([
      { $match: { repositoryId: { $in: repoIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$repositoryId',
          latestScan: { $first: '$$ROOT' },
        },
      },
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
 * Computes dashboard statistics from real scan results and repository states.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const repositories = await Repository.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const repoIds = repositories.map((r) => r._id);

    const findings = await Finding.find({ repositoryId: { $in: repoIds } });

    const recentScans = await Scan.find({ repositoryId: { $in: repoIds } })
      .populate('repositoryId', 'name owner branch url')
      .sort({ createdAt: -1 })
      .limit(6);

    const trackedCount = repositories.length;
    const scannedCount = repositories.filter((r) => r.lastScannedAt !== null).length;
    const exposedSecrets = findings.filter((f) => f.scanner === 'GITLEAKS').length;
    const criticalCVEs = findings.filter((f) => f.scanner === 'TRIVY' && f.severity === 'CRITICAL').length;

    const criticalTotal = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highTotal = findings.filter((f) => f.severity === 'HIGH').length;
    const mediumTotal = findings.filter((f) => f.severity === 'MEDIUM').length;
    const lowTotal = findings.filter((f) => f.severity === 'LOW').length;

    let healthScore = 100;
    if (scannedCount > 0) {
      healthScore = Math.max(0, 100 - (criticalTotal * 25 + highTotal * 15 + mediumTotal * 5 + lowTotal * 2));
    }

    let healthLabel = 'Clean posture';
    if (scannedCount === 0) {
      healthLabel = 'Pending initial scan';
    } else if (healthScore >= 90) {
      healthLabel = 'Clean posture';
    } else if (healthScore >= 70) {
      healthLabel = 'Moderate posture';
    } else {
      healthLabel = 'Immediate fix needed';
    }

    const formattedRecentActivity = recentScans.map((s) => ({
      id: s._id,
      scanId: s._id,
      repositoryId: s.repositoryId?._id || s.repositoryId,
      repo: s.repositoryId ? `${s.repositoryId.owner}/${s.repositoryId.name}` : 'Unknown Repository',
      repoName: s.repositoryId?.name || '',
      repoOwner: s.repositoryId?.owner || '',
      repoUrl: s.repositoryId?.url || '',
      branch: s.repositoryId?.branch || 'main',
      status: s.status,
      failureReason: s.failureReason || '',
      completedAt: s.completedAt || s.createdAt,
      duration: s.duration,
      totalFindings: s.totalFindings || 0,
      criticalCount: s.criticalCount || 0,
      highCount: s.highCount || 0,
      mediumCount: s.mediumCount || 0,
      lowCount: s.lowCount || 0,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        trackedRepositories: trackedCount,
        scannedRepositories: scannedCount,
        exposedSecrets,
        criticalCVEs,
        totalFindings: findings.length,
        healthScore: `${healthScore}%`,
        healthLabel,
      },
      recentScans: formattedRecentActivity,
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics.',
    });
  }
};