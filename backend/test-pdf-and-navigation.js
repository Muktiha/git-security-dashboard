import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import app from './src/app.js';
import User from './src/models/User.js';
import Repository from './src/models/Repository.js';
import Scan from './src/models/Scan.js';
import Finding from './src/models/Finding.js';
import jwt from 'jsonwebtoken';
import http from 'http';

async function runTests() {
  console.log('--- STARTING PDF EXPORT & SCAN NAVIGATION VERIFICATION ---');

  // Step 1: Connect to Atlas Database
  console.log('\n[Test 1] Connecting to MongoDB Atlas...');
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`✓ Test HTTP server listening on ${baseUrl}`);

  try {
    // Step 2: Create Test User and Auth Token
    console.log('\n[Test 2] Creating test user and authenticating...');
    const testUser = await User.create({
      name: 'Navigation & PDF Tester',
      email: `nav_pdf_${Date.now()}@example.com`,
      passwordHash: '$2a$10$e8w...dummyhashforautomatedtesting',
    });

    const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    console.log('✓ Test user created with valid JWT token.');

    // Step 3: Create Two Distinct Repositories with Scans
    console.log('\n[Test 3] Creating two test repositories with distinct scans...');
    
    // Repository 1: Clean repository with 0 findings
    const repoClean = await Repository.create({
      userId: testUser._id,
      name: 'clean-service-api',
      owner: 'acme-gov',
      url: 'https://github.com/acme-gov/clean-service-api',
      branch: 'main',
      visibility: 'public',
      lastScannedAt: new Date(),
    });

    const scanClean = await Scan.create({
      repositoryId: repoClean._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
      duration: 3,
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      failureReason: '',
    });

    // Repository 2: Vulnerable repository with synthetic findings
    const repoWithVulns = await Repository.create({
      userId: testUser._id,
      name: 'vulnerable-portal',
      owner: 'acme-gov',
      url: 'https://github.com/acme-gov/vulnerable-portal',
      branch: 'develop',
      visibility: 'public',
      lastScannedAt: new Date(),
    });

    const scanWithVulns = await Scan.create({
      repositoryId: repoWithVulns._id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 120000),
      completedAt: new Date(Date.now() - 30000),
      duration: 12,
      totalFindings: 2,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      failureReason: '',
    });

    // Insert findings associated with scanWithVulns
    await Finding.create([
      {
        scanId: scanWithVulns._id,
        repositoryId: repoWithVulns._id,
        scanner: 'GITLEAKS',
        type: 'aws-access-token',
        severity: 'HIGH',
        title: 'Exposed AWS Access Key',
        description: 'Secret rule: aws-access-token. Match: AKIA****LE',
        file: 'backend/.env.test',
        line: 14,
        identifier: 'aws-access-token',
        fingerprint: 'backend/.env.test:14:aws-access-token',
        remediation: 'Immediately revoke and rotate the exposed AWS key and update secret vault.',
      },
      {
        scanId: scanWithVulns._id,
        repositoryId: repoWithVulns._id,
        scanner: 'TRIVY',
        type: 'Vulnerability',
        severity: 'CRITICAL',
        title: 'CVE-2023-44487: HTTP/2 Rapid Reset',
        description: 'Rapid Reset attack leading to denial of service in HTTP/2 protocol.',
        file: 'package-lock.json',
        line: null,
        identifier: 'CVE-2023-44487',
        fingerprint: 'package-lock.json:CVE-2023-44487:node',
        remediation: 'Upgrade to Node.js >= 18.18.2 or apply vendor security advisory patch.',
      },
    ]);

    console.log(`✓ Repository 1 created: ${repoClean.name} (Scan: ${scanClean._id}, 0 findings)`);
    console.log(`✓ Repository 2 created: ${repoWithVulns.name} (Scan: ${scanWithVulns._id}, 2 findings)`);

    // Step 4: Verify Dashboard Recent Activity includes scanId and repositoryId
    console.log('\n[Test 4] Verifying Dashboard Recent Activity contains navigation identifiers...');
    const statsRes = await fetch(`${baseUrl}/scans/dashboard/stats`, {
      method: 'GET',
      headers: authHeaders,
    });
    const statsData = await statsRes.json();
    if (!statsData.success || !Array.isArray(statsData.recentScans)) {
      throw new Error('Failed to retrieve dashboard stats.');
    }

    const activityScan1 = statsData.recentScans.find((s) => s.scanId.toString() === scanClean._id.toString());
    const activityScan2 = statsData.recentScans.find((s) => s.scanId.toString() === scanWithVulns._id.toString());

    if (!activityScan1 || !activityScan1.repositoryId) {
      throw new Error('Recent activity for clean scan is missing scanId or repositoryId.');
    }
    if (!activityScan2 || !activityScan2.repositoryId) {
      throw new Error('Recent activity for vulnerable scan is missing scanId or repositoryId.');
    }
    console.log('✓ Recent activity item 1 navigation target: /findings?scanId=' + activityScan1.scanId + '&repoId=' + activityScan1.repositoryId);
    console.log('✓ Recent activity item 2 navigation target: /findings?scanId=' + activityScan2.scanId + '&repoId=' + activityScan2.repositoryId);

    // Step 5: Test Navigation to Scan 1 (Clean scan - 0 findings)
    console.log('\n[Test 5] Fetching findings for Clean Scan via /api/findings?scanId=' + scanClean._id);
    const cleanScanRes = await fetch(`${baseUrl}/findings?scanId=${scanClean._id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const cleanScanData = await cleanScanRes.json();
    if (cleanScanRes.status !== 200 || !cleanScanData.success) {
      throw new Error(`Failed to load clean scan: ${JSON.stringify(cleanScanData)}`);
    }
    if (cleanScanData.findings.length !== 0) {
      throw new Error(`Expected 0 findings for clean scan, got ${cleanScanData.findings.length}`);
    }
    if (cleanScanData.scan.status !== 'COMPLETED' || cleanScanData.repository.name !== 'clean-service-api') {
      throw new Error('Clean scan metadata mismatch.');
    }
    console.log('✓ Clean scan correctly returned 0 findings, status COMPLETED, and repository "clean-service-api".');

    // Step 6: Test Navigation to Scan 2 (Vulnerable scan - 2 findings)
    console.log('\n[Test 6] Fetching findings for Vulnerable Scan via /api/findings?scanId=' + scanWithVulns._id);
    const vulnScanRes = await fetch(`${baseUrl}/findings?scanId=${scanWithVulns._id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const vulnScanData = await vulnScanRes.json();
    if (vulnScanRes.status !== 200 || !vulnScanData.success) {
      throw new Error(`Failed to load vulnerable scan: ${JSON.stringify(vulnScanData)}`);
    }
    if (vulnScanData.findings.length !== 2) {
      throw new Error(`Expected 2 findings for vulnerable scan, got ${vulnScanData.findings.length}`);
    }
    if (vulnScanData.repository.name !== 'vulnerable-portal') {
      throw new Error('Vulnerable scan repository name mismatch.');
    }
    const hasRemediation = vulnScanData.findings.every((f) => f.remediation && f.remediation.length > 5);
    if (!hasRemediation) {
      throw new Error('Findings are missing expected remediation recommendations.');
    }
    console.log('✓ Vulnerable scan correctly returned 2 findings with detailed remediation recommendations.');

    // Step 7: Test /api/scans/:scanId/findings dedicated endpoint
    console.log('\n[Test 7] Testing dedicated endpoint /api/scans/' + scanWithVulns._id + '/findings');
    const dedicatedRes = await fetch(`${baseUrl}/scans/${scanWithVulns._id}/findings`, {
      method: 'GET',
      headers: authHeaders,
    });
    const dedicatedData = await dedicatedRes.json();
    if (dedicatedRes.status !== 200 || dedicatedData.findings.length !== 2) {
      throw new Error('Dedicated scan findings endpoint failed.');
    }
    console.log('✓ Dedicated scan findings endpoint returned correct 2 findings.');

    // Step 8: Test Invalid Scan ID Handling
    console.log('\n[Test 8] Testing invalid scan ID error handling...');
    const invalidScanRes = await fetch(`${baseUrl}/findings?scanId=000000000000000000000000`, {
      method: 'GET',
      headers: authHeaders,
    });
    console.log(`Non-existent scan response status: ${invalidScanRes.status}`);
    if (invalidScanRes.status !== 404) {
      throw new Error(`Expected 404 for non-existent scan, received ${invalidScanRes.status}`);
    }
    const invalidScanBody = await invalidScanRes.json();
    console.log('✓ Non-existent scan correctly returned 404 with message:', invalidScanBody.message);

    const malformedScanRes = await fetch(`${baseUrl}/findings?scanId=invalid-id-123`, {
      method: 'GET',
      headers: authHeaders,
    });
    console.log(`Malformed scan response status: ${malformedScanRes.status}`);
    if (malformedScanRes.status !== 400) {
      throw new Error(`Expected 400 for malformed scan ID, received ${malformedScanRes.status}`);
    }
    console.log('✓ Malformed scan ID correctly returned 400.');

    // Cleanup test records
    console.log('\n[Cleanup] Cleaning up test records from MongoDB Atlas...');
    await Finding.deleteMany({ repositoryId: { $in: [repoClean._id, repoWithVulns._id] } });
    await Scan.deleteMany({ repositoryId: { $in: [repoClean._id, repoWithVulns._id] } });
    await Repository.deleteMany({ _id: { $in: [repoClean._id, repoWithVulns._id] } });
    await User.findByIdAndDelete(testUser._id);
    console.log('✓ Test records cleaned up.');

    console.log('\n=========================================');
    console.log('ALL PDF & SCAN NAVIGATION TESTS PASSED!');
    console.log('=========================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch(async (err) => {
  console.error('\n❌ Verification failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
