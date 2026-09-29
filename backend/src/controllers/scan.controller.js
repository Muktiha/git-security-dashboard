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
 * Clones repository into a specified target directory.
 */
const cloneRepository = (url, branch, targetDir) => {
  return new Promise((resolve, reject) => {
    const cloneArgs = ['clone', '--depth', '1'];
    if (branch) {
      cloneArgs.push('-b', branch);
    }
    cloneArgs.push(url, targetDir);

    const gitProc = spawn('git', cloneArgs, {
      shell: false,
      windowsHide: true,
    });

    let stderr = '';
    gitProc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    gitProc.on('error', (err) => {
      reject(new Error(`Failed to start git process: ${err.message}`));
    });

    gitProc.on('close', (code) => {
      if (code === 0) {
        return resolve();
      }

      // If branch checkout failed, try cloning default branch without -b
      if (branch) {
        console.warn(`[Git Clone] Branch ${branch} checkout failed, falling back to default branch.`);
        const fallbackProc = spawn('git', ['clone', '--depth', '1', url, targetDir], {
          shell: false,
          windowsHide: true,
        });

        let fbStderr = '';
        fallbackProc.stderr.on('data', (d) => {
          fbStderr += d.toString();
        });

        fallbackProc.on('error', (err) => {
          reject(new Error(`Failed to start fallback git process: ${err.message}`));
        });

        fallbackProc.on('close', (fbCode) => {
          if (fbCode === 0) {
            return resolve();
          }
          reject(new Error(`Git clone failed with code ${fbCode}: ${fbStderr.trim() || stderr.trim()}`));
        });
      } else {
        reject(new Error(`Git clone failed with code ${code}: ${stderr.trim()}`));
      }
    });
  });
};

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

    // Create scan record in RUNNING status
    scan = await Scan.create({
      repositoryId: repository._id,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    // Define temporary clone folder
    scanTempDir = path.join(os.tmpdir(), 'git-sec-scans', scan._id.toString());
    await fs.promises.mkdir(path.dirname(scanTempDir), { recursive: true });

    // Step 1: Clone repository
    await cloneRepository(repository.url, repository.branch, scanTempDir);

    // Step 2: Run security scanners (Gitleaks + Trivy)
    const [gitleaksSettled, trivySettled] = await Promise.allSettled([
      runGitleaks(scanTempDir),
      runTrivy(scanTempDir),
    ]);

    const gitleaksSuccess = gitleaksSettled.status === 'fulfilled';
    const trivySuccess = trivySettled.status === 'fulfilled';

    if (!gitleaksSuccess) {
      console.warn('[Scan Warning] Gitleaks scanner encountered an issue:', gitleaksSettled.reason?.message);
    }
    if (!trivySuccess) {
      console.warn('[Scan Warning] Trivy scanner encountered an issue:', trivySettled.reason?.message);
    }

    const rawGitleaks = gitleaksSuccess ? gitleaksSettled.value : [];
    const rawTrivy = trivySuccess ? trivySettled.value : null;

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
          });
        }
      }
    }

    const allFindings = [...normalizedGitleaks, ...normalizedTrivy];

    // Step 5: Save findings to MongoDB
    if (allFindings.length > 0) {
      await Finding.insertMany(allFindings);
    }

    // Step 6: Compute counts and update Scan
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
    scan.completedAt = completedAt;
    scan.duration = duration;
    scan.totalFindings = allFindings.length;
    scan.criticalCount = criticalCount;
    scan.highCount = highCount;
    scan.mediumCount = mediumCount;
    scan.lowCount = lowCount;
    await scan.save();

    // Step 7: Update Repository lastScannedAt in MongoDB
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
      scan.completedAt = new Date();
      await scan.save().catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete security scan.',
      scan,
    });
  } finally {
    // Step 8: Cleanup temporary clone directory
    if (scanTempDir) {
      try {
        await fs.promises.rm(scanTempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('[Scan Cleanup Warning]', cleanupErr.message);
      }
    }
  }
};

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