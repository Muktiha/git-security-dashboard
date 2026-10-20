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

async function testUpgrade() {
  console.log('=== STARTING UPGRADE E2E TESTS ===\n');

  await connectDB();

  // 1. Create a temporary test user and JWT token
  const testEmail = `upgrade_tester_${Date.now()}@example.com`;
  let user = null;
  let repo = null;

  user = await User.create({
    name: 'Upgrade E2E Tester',
    email: testEmail,
    passwordHash: 'dummyhash123',
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(`[Step 1] Created test user: ${testEmail}`);

  try {
    // 2. Create test repository
    repo = await Repository.create({
      userId: user._id,
      name: 'gov-portal-security',
      owner: 'sih-org',
      url: 'https://github.com/sih-org/gov-portal-security',
      branch: 'main',
      visibility: 'public',
      lastScannedAt: new Date(),
    });
    console.log(`[Step 2] Created test repository: ${repo.owner}/${repo.name}`);

    // 3. Create two scans for comparison
    // Base Scan 1 (Completed with 2 findings)
    const scan1 = await Scan.create({
      repositoryId: repo._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3590000),
      duration: 10,
      totalFindings: 2,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
    });

    const finding1 = await Finding.create({
      scanId: scan1._id,
      repositoryId: repo._id,
      scanner: 'GITLEAKS',
      type: 'generic-api-key',
      severity: 'CRITICAL',
      title: 'Planted Test API Key',
      description: 'Synthetic secret for testing lifecycle',
      file: 'config.js',
      line: 12,
      identifier: 'generic-api-key',
      fingerprint: 'config.js:12:generic-api-key',
      status: 'OPEN',
    });

    const finding2 = await Finding.create({
      scanId: scan1._id,
      repositoryId: repo._id,
      scanner: 'TRIVY',
      type: 'Vulnerability',
      severity: 'HIGH',
      title: 'CVE-2023-99999 In express package',
      description: 'Synthetic high severity vuln',
      file: 'package-lock.json',
      line: null,
      identifier: 'CVE-2023-99999',
      fingerprint: 'package-lock.json:CVE-2023-99999:express',
      status: 'OPEN',
    });

    // Target Scan 2 (Completed with 1 persistent finding, 1 fixed, 1 new)
    const scan2 = await Scan.create({
      repositoryId: repo._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 1800000),
      completedAt: new Date(Date.now() - 1790000),
      duration: 10,
      totalFindings: 2,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
    });

    // finding1 is persistent in scan2
    const finding1InScan2 = await Finding.create({
      scanId: scan2._id,
      repositoryId: repo._id,
      scanner: 'GITLEAKS',
      type: 'generic-api-key',
      severity: 'HIGH',
      title: 'Planted Test API Key',
      description: 'Persistent test secret',
      file: 'config.js',
      line: 12,
      identifier: 'generic-api-key',
      fingerprint: 'config.js:12:generic-api-key',
      status: 'OPEN',
    });

    // New finding in scan2
    const finding3 = await Finding.create({
      scanId: scan2._id,
      repositoryId: repo._id,
      scanner: 'TRIVY',
      type: 'Vulnerability',
      severity: 'MEDIUM',
      title: 'CVE-2024-11111 In lodash package',
      description: 'Newly introduced medium vulnerability',
      file: 'package.json',
      line: null,
      identifier: 'CVE-2024-11111',
      fingerprint: 'package.json:CVE-2024-11111:lodash',
      status: 'OPEN',
    });

    console.log(`[Step 3] Seeded test scans: Scan1 (${scan1._id}), Scan2 (${scan2._id})`);

    // 4. Test Vulnerability Lifecycle API: PATCH /api/findings/:id/status
    console.log('\n[Test 4] Testing Lifecycle Status Transition & Remediation Notes...');
    const updateRes = await fetch(`http://localhost:5000/api/findings/${finding1._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        note: 'Revoked test token and moved secret to environment variables.',
      }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || updateData.finding.status !== 'RESOLVED') {
      throw new Error(`Failed to update finding status: ${JSON.stringify(updateData)}`);
    }
    if (updateData.finding.remediationNote !== 'Revoked test token and moved secret to environment variables.') {
      throw new Error('Remediation note was not saved correctly.');
    }
    if (!updateData.finding.statusHistory || updateData.finding.statusHistory.length === 0) {
      throw new Error('Status history was not recorded in MongoDB.');
    }
    console.log('✓ Finding status successfully updated to RESOLVED with remediation note and audit trail.');

    // 5. Test Notifications API: GET /api/notifications
    console.log('\n[Test 5] Testing Notification Delivery...');
    const notifRes = await fetch('http://localhost:5000/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifData = await notifRes.json();
    if (!notifData.success || !Array.isArray(notifData.notifications)) {
      throw new Error(`Failed to fetch notifications: ${JSON.stringify(notifData)}`);
    }
    console.log(`✓ Fetched ${notifData.notifications.length} notifications, unread: ${notifData.unreadCount}. Latest: "${notifData.notifications[0]?.title}"`);

    // 6. Test Security Analytics API: GET /api/scans/analytics
    console.log('\n[Test 6] Testing Security Analytics Calculation...');
    const analyticsRes = await fetch('http://localhost:5000/api/scans/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const analyticsData = await analyticsRes.json();
    if (!analyticsData.success || !analyticsData.analytics) {
      throw new Error(`Failed to get analytics: ${JSON.stringify(analyticsData)}`);
    }
    const a = analyticsData.analytics;
    console.log(`✓ Analytics returned:
       - Total Repositories: ${a.totalRepositories}
       - Total Findings: ${a.totalFindings}
       - Resolved Findings: ${a.resolvedFindings}
       - Resolution Rate: ${a.resolutionRate}
       - Global Score: ${a.globalScore} (Grade: ${a.globalGrade})
       - Scan History Trends Count: ${a.scanTrends.length}`);

    // 7. Test Scan History API: GET /api/scans/history
    console.log('\n[Test 7] Testing Scan History...');
    const historyRes = await fetch('http://localhost:5000/api/scans/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const historyData = await historyRes.json();
    if (!historyData.success || historyData.scans.length < 2) {
      throw new Error(`Scan history returned invalid response: ${JSON.stringify(historyData)}`);
    }
    console.log(`✓ Scan history returned ${historyData.scans.length} scans with calculated security scores.`);

    // 8. Test Scan Comparison API: POST /api/scans/compare
    console.log('\n[Test 8] Testing Scan Comparison & Fingerprint Matching...');
    const compareRes = await fetch('http://localhost:5000/api/scans/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        baseScanId: scan1._id,
        targetScanId: scan2._id,
      }),
    });
    const compareData = await compareRes.json();
    if (!compareData.success || !compareData.comparison) {
      throw new Error(`Scan comparison failed: ${JSON.stringify(compareData)}`);
    }
    const comp = compareData.comparison;
    console.log(`✓ Comparison Result:
       - Reliable: ${comp.reliable}
       - Newly detected: ${comp.summary.newCount} (Expected: 1)
       - Persistent: ${comp.summary.persistentCount} (Expected: 1)
       - Fixed: ${comp.summary.fixedCount} (Expected: 1)
       - Score Delta: ${comp.scoreDelta}`);

    if (comp.summary.newCount !== 1 || comp.summary.persistentCount !== 1 || comp.summary.fixedCount !== 1) {
      throw new Error(`Mismatch in comparison counts: expected 1 new, 1 persistent, 1 fixed; got ${JSON.stringify(comp.summary)}`);
    }

    // 9. Test Scan Comparison with FAILED scan (verifying it does NOT falsely claim fixed)
    console.log('\n[Test 9] Testing Failed Scan Rule: Must NOT report findings as fixed if target scan failed...');
    const failedScan = await Scan.create({
      repositoryId: repo._id,
      status: 'FAILED',
      failureReason: 'Connection timed out',
    });
    const failedCompRes = await fetch('http://localhost:5000/api/scans/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        baseScanId: scan1._id,
        targetScanId: failedScan._id,
      }),
    });
    const failedCompData = await failedCompRes.json();
    if (!failedCompData.success || failedCompData.comparison.reliable !== false) {
      throw new Error(`Failed scan should be marked reliable=false, got: ${JSON.stringify(failedCompData)}`);
    }
    if (failedCompData.comparison.summary.fixedCount !== 0) {
      throw new Error(`Failed scan falsely reported ${failedCompData.comparison.summary.fixedCount} fixed findings!`);
    }
    console.log(`✓ Correctly handled failed scan: fixedCount is ${failedCompData.comparison.summary.fixedCount} and reliable=false.`);

    console.log('\n=== ALL UPGRADE BACKEND TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Cleanup test records
    await Finding.deleteMany({ repositoryId: repo._id }).catch(() => {});
    await Scan.deleteMany({ repositoryId: repo._id }).catch(() => {});
    await Notification.deleteMany({ userId: user._id }).catch(() => {});
    await Repository.deleteOne({ _id: repo._id }).catch(() => {});
    await User.deleteOne({ _id: user._id }).catch(() => {});
    await mongoose.disconnect();
  }
}

testUpgrade().catch((err) => {
  console.error('\n❌ UPGRADE TEST FAILED:', err);
  process.exit(1);
});
