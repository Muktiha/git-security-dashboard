import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import Repository from './src/models/Repository.js';
import Scan from './src/models/Scan.js';
import Finding from './src/models/Finding.js';
import Notification from './src/models/Notification.js';
import jwt from 'jsonwebtoken';

async function testDashboardE2E() {
  console.log('=== STARTING DEVSECOPS DASHBOARD COMMAND CENTER E2E TESTS ===\n');

  await connectDB();

  const testEmail = `dashboard_tester_${Date.now()}@example.com`;
  let user = null;
  let repo1 = null;
  let repo2 = null;
  let repo3 = null;

  user = await User.create({
    name: 'DevSecOps Dashboard Tester',
    email: testEmail,
    passwordHash: 'dummyhash123',
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(`[Step 1] Created test user: ${testEmail}`);

  try {
    // 2. Create repositories: one active with scans, one stale, one never scanned
    repo1 = await Repository.create({
      userId: user._id,
      name: 'core-banking-service',
      owner: 'sih-fintech',
      url: 'https://github.com/sih-fintech/core-banking-service',
      branch: 'main',
      visibility: 'public',
      lastScannedAt: new Date(),
    });

    repo2 = await Repository.create({
      userId: user._id,
      name: 'legacy-auth-api',
      owner: 'sih-fintech',
      url: 'https://github.com/sih-fintech/legacy-auth-api',
      branch: 'master',
      visibility: 'private',
      lastScannedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (stale)
    });

    repo3 = await Repository.create({
      userId: user._id,
      name: 'unscanned-microservice',
      owner: 'sih-fintech',
      url: 'https://github.com/sih-fintech/unscanned-microservice',
      branch: 'develop',
      visibility: 'public',
      lastScannedAt: null, // never scanned
    });

    console.log(`[Step 2] Created 3 test repositories: core-banking-service, legacy-auth-api (stale), unscanned-microservice`);

    // 3. Create scans for repo1:
    // Base scan (older)
    const scanBase = await Scan.create({
      repositoryId: repo1._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 48 * 3600000),
      completedAt: new Date(Date.now() - 48 * 3600000 + 15000),
      duration: 15,
      totalFindings: 3,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
    });

    await Finding.create({
      scanId: scanBase._id,
      repositoryId: repo1._id,
      scanner: 'GITLEAKS',
      type: 'aws-access-key-id',
      severity: 'CRITICAL',
      title: 'AWS Access Key ID exposed',
      description: 'Found leaked AWS key in serverless.yml',
      file: 'serverless.yml',
      line: 14,
      identifier: 'aws-access-key-id',
      fingerprint: 'serverless.yml:14:aws-access-key-id',
      status: 'RESOLVED',
      remediationNotes: 'Rotated AWS credentials in IAM and updated secrets manager',
    });

    // Latest scan (recent)
    const scanLatest = await Scan.create({
      repositoryId: repo1._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 2 * 3600000),
      completedAt: new Date(Date.now() - 2 * 3600000 + 20000),
      duration: 20,
      totalFindings: 2,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
    });

    await Finding.create({
      scanId: scanLatest._id,
      repositoryId: repo1._id,
      scanner: 'GITLEAKS',
      type: 'jwt-secret',
      severity: 'CRITICAL',
      title: 'Hardcoded JWT secret token',
      description: 'Found hardcoded secret key',
      file: 'src/middleware/auth.js',
      line: 45,
      identifier: 'jwt-secret',
      fingerprint: 'src/middleware/auth.js:45:jwt-secret',
      status: 'OPEN',
    });

    await Finding.create({
      scanId: scanLatest._id,
      repositoryId: repo1._id,
      scanner: 'TRIVY',
      type: 'Vulnerability',
      severity: 'HIGH',
      title: 'CVE-2024-21538 in async package',
      description: 'Prototype pollution in async',
      file: 'package-lock.json',
      line: null,
      identifier: 'CVE-2024-21538',
      fingerprint: 'package-lock.json:CVE-2024-21538:async',
      status: 'IN_PROGRESS',
      remediationNotes: 'Upgraded package version in PR #42',
    });

    // Create a failed scan for repo2
    const scanFailed = await Scan.create({
      repositoryId: repo2._id,
      status: 'FAILED',
      startedAt: new Date(Date.now() - 10 * 24 * 3600000),
      completedAt: new Date(Date.now() - 10 * 24 * 3600000 + 5000),
      duration: 5,
      errorMessage: 'Authentication failed for private repository clone',
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    });

    // Create a notification
    await Notification.create({
      userId: user._id,
      title: 'Critical Finding Detected',
      message: 'New critical secret found in core-banking-service',
      type: 'CRITICAL_FINDINGS',
      repositoryId: repo1._id,
      scanId: scanLatest._id,
      isRead: false,
    });

    console.log(`[Step 3] Planted test scans, findings (OPEN, IN_PROGRESS, RESOLVED), and notifications`);

    // 4. Test GET /api/scans/dashboard/stats (Default global dashboard view)
    const baseUrl = 'http://localhost:5000/api/scans/dashboard/stats';
    const resAll = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resAll.ok) {
      throw new Error(`Failed to fetch default dashboard stats: ${resAll.status} ${await resAll.text()}`);
    }

    const dataAll = await resAll.json();
    console.log(`[Step 4] Default dashboard stats response status: ${resAll.status}`);
    console.log('--- Summary Metrics ---');
    console.log(`  Total Repos: ${dataAll.stats.trackedRepositories}`);
    console.log(`  Scanned Repos: ${dataAll.stats.scannedRepositories}`);
    console.log(`  Open Critical: ${dataAll.stats.openCriticalFindings}`);
    console.log(`  Unresolved: ${dataAll.stats.unresolvedFindings}`);
    console.log(`  Resolved: ${dataAll.stats.resolvedFindings}`);
    console.log(`  Health Score: ${dataAll.stats.healthScore} (${dataAll.stats.healthGrade} - ${dataAll.stats.healthLabel})`);

    // Validations on summary metrics
    if (dataAll.stats.trackedRepositories < 3) throw new Error('Summary trackedRepositories should be >= 3');
    if (dataAll.stats.openCriticalFindings < 1) throw new Error('Open critical findings should be >= 1');
    if (dataAll.stats.resolvedFindings < 1) throw new Error('Resolved findings should be >= 1');

    console.log('--- Hygiene & Freshness ---');
    console.log(`  Fresh: ${dataAll.stats.freshness.fresh}, Stale: ${dataAll.stats.freshness.stale}, Never Scanned: ${dataAll.stats.freshness.neverScanned}`);
    if (dataAll.stats.freshness.stale < 1) throw new Error('Should detect at least 1 stale repository (>7 days)');
    if (dataAll.stats.freshness.neverScanned < 1) throw new Error('Should detect at least 1 never scanned repository');

    console.log('--- Repository Risk Table ---');
    console.log(`  Items count: ${dataAll.repositoryRiskTable.length}`);
    const r1Risk = dataAll.repositoryRiskTable.find(r => r.name === 'core-banking-service');
    if (!r1Risk) throw new Error('core-banking-service missing from risk table');
    console.log(`  core-banking-service: Score ${r1Risk.score} (${r1Risk.grade}), Freshness: ${r1Risk.freshness}, Critical: ${r1Risk.openCriticalCount}`);
    if (r1Risk.freshness !== 'FRESH') throw new Error('core-banking-service should be marked FRESH');
    if (r1Risk.openCriticalCount < 1) throw new Error('core-banking-service should have >= 1 open critical finding');

    console.log('--- Recommended Actions ---');
    console.log(`  Actions generated: ${dataAll.recommendedActions.length}`);
    dataAll.recommendedActions.forEach((act, idx) => {
      console.log(`  [${act.priority}] ${act.title}: ${act.actionType}`);
    });
    if (dataAll.recommendedActions.length === 0) throw new Error('Recommended actions should not be empty');

    console.log('--- Trends & Comparisons ---');
    console.log(`  Scan history points: ${dataAll.trends.scanTrends.length}`);
    console.log(`  Severity slices: ${JSON.stringify(dataAll.trends.severityDistribution)}`);
    console.log(`  Status distribution: ${JSON.stringify(dataAll.trends.newVsResolvedTrends)}`);
    console.log(`  Recent activity entries: ${dataAll.recentActivity.length}`);

    // 5. Test filtered by repositoryId
    const resFiltered = await fetch(`${baseUrl}?repositoryId=${repo1._id}&timeRange=7d`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resFiltered.ok) {
      throw new Error(`Failed to fetch filtered dashboard stats: ${resFiltered.status}`);
    }
    const dataFiltered = await resFiltered.json();
    console.log(`\n[Step 5] Filtered by repo1 (core-banking-service):`);
    console.log(`  Has Comparison: ${dataFiltered.latestScanComparison ? true : false}`);
    if (dataFiltered.latestScanComparison) {
      console.log(`  Score Delta: ${dataFiltered.latestScanComparison.scoreDelta}`);
      console.log(`  New findings: ${dataFiltered.latestScanComparison.newCount}`);
      console.log(`  Fixed findings: ${dataFiltered.latestScanComparison.fixedCount}`);
      console.log(`  Persistent findings: ${dataFiltered.latestScanComparison.persistentCount}`);
    }

    // 6. Test filtered by severity & status
    const resSevFilter = await fetch(`${baseUrl}?severity=CRITICAL&status=OPEN`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resSevFilter.ok) {
      throw new Error(`Failed severity/status filtered request: ${resSevFilter.status}`);
    }
    const dataSev = await resSevFilter.json();
    console.log(`\n[Step 6] Filtered by severity=CRITICAL & status=OPEN:`);
    console.log(`  Open Critical Findings: ${dataSev.stats.openCriticalFindings}`);

    console.log('\n✅ ALL DEVSECOPS DASHBOARD COMMAND CENTER E2E TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Cleanup test data
    console.log('[Cleanup] Removing test user, repos, scans, findings, notifications...');
    if (user) {
      const repos = await Repository.find({ userId: user._id });
      const repoIds = repos.map(r => r._id);
      await Finding.deleteMany({ repositoryId: { $in: repoIds } });
      await Scan.deleteMany({ repositoryId: { $in: repoIds } });
      await Notification.deleteMany({ userId: user._id });
      await Repository.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
      console.log('[Cleanup] Completed successfully.');
    }
    await mongoose.disconnect();
  }
}

testDashboardE2E().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
