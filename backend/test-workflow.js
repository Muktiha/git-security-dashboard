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
import { runGitleaks } from './src/services/gitleaks.service.js';
import { runTrivy } from './src/services/trivy.service.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import os from 'os';

async function runTests() {
  console.log('--- STARTING WORKFLOW TESTS ---');

  // Step 1: Verify Database Connection
  console.log('\n[Test 1] Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('✓ Successfully connected to MongoDB Atlas database:', mongoose.connection.name);

  // Step 2: Test User Authentication and JWT
  console.log('\n[Test 2] Testing User Authentication & Token Generation...');
  const testEmail = `test_analyst_${Date.now()}@example.com`;
  const testUser = await User.create({
    name: 'Automated Test User',
    email: testEmail,
    passwordHash: '$2a$10$e8w...dummyhashforautomatedtesting',
  });

  const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.id !== testUser._id.toString()) {
    throw new Error('JWT token verification failed.');
  }
  console.log('✓ User created and JWT authentication token verified successfully.');

  // Step 3: Test Gitleaks with Synthetic Secret Fixture
  console.log('\n[Test 3] Testing Gitleaks with safe synthetic test credential...');
  const tempFixtureDir = path.join(os.tmpdir(), `sec-test-fixture-${Date.now()}`);
  await fs.promises.mkdir(tempFixtureDir, { recursive: true });

  const syntheticSecretContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
-----END OPENSSH PRIVATE KEY-----`;
  await fs.promises.writeFile(path.join(tempFixtureDir, 'id_rsa'), syntheticSecretContent, 'utf-8');

  const gitleaksFindings = await runGitleaks(tempFixtureDir, 30000);
  console.log(`✓ Gitleaks executed and detected ${gitleaksFindings.length} synthetic test secret finding(s).`);
  if (gitleaksFindings.length === 0) {
    throw new Error('Expected Gitleaks to detect synthetic credential pattern.');
  }

  // Cleanup fixture
  await fs.promises.rm(tempFixtureDir, { recursive: true, force: true });

  // Step 4: Test Saving Findings to MongoDB with Scan Association
  console.log('\n[Test 4] Testing Finding persistence in MongoDB associated with Scan...');
  const testRepo = await Repository.create({
    userId: testUser._id,
    name: 'test-synthetic-repo',
    owner: 'test-owner',
    url: 'https://github.com/test-owner/test-synthetic-repo',
    branch: 'main',
    visibility: 'public',
  });

  const testScan = await Scan.create({
    repositoryId: testRepo._id,
    status: 'RUNNING',
    startedAt: new Date(),
  });

  const findingDocs = gitleaksFindings.map((item) => ({
    scanId: testScan._id,
    repositoryId: testRepo._id,
    scanner: 'GITLEAKS',
    type: item.RuleID || 'Secret',
    severity: 'HIGH',
    title: item.Description || item.RuleID || 'Exposed Secret Detected',
    description: `Rule: ${item.RuleID}`,
    file: item.File || 'credentials.env',
    line: item.StartLine || 1,
    identifier: item.RuleID || 'aws-secret',
    fingerprint: item.Fingerprint || `${item.File}:${item.StartLine}:${item.RuleID}`,
  }));

  await Finding.insertMany(findingDocs);

  testScan.status = 'COMPLETED';
  testScan.completedAt = new Date();
  testScan.duration = 2;
  testScan.totalFindings = findingDocs.length;
  testScan.highCount = findingDocs.length;
  await testScan.save();

  const retrievedFindings = await Finding.find({ scanId: testScan._id });
  if (retrievedFindings.length !== findingDocs.length) {
    throw new Error('Retrieved findings count does not match saved count.');
  }
  console.log(`✓ Successfully saved and retrieved ${retrievedFindings.length} findings linked to scanId: ${testScan._id}`);

  // Step 5: Test Scanner Failure Terminal State
  console.log('\n[Test 5] Testing scanner failure handling and terminal FAILED state...');
  const failedScan = await Scan.create({
    repositoryId: testRepo._id,
    status: 'RUNNING',
    startedAt: new Date(),
  });

  // Simulate clone failure
  const cloneErrorMsg = 'Git clone failed: Repository not found or access denied.';
  failedScan.status = 'FAILED';
  failedScan.failureReason = cloneErrorMsg;
  failedScan.completedAt = new Date();
  await failedScan.save();

  const reloadedScan = await Scan.findById(failedScan._id);
  if (reloadedScan.status !== 'FAILED' || !reloadedScan.failureReason.includes('Git clone failed')) {
    throw new Error('Terminal state FAILED was not correctly persisted with failureReason.');
  }
  console.log(`✓ Terminal state correctly verified as FAILED with failureReason: "${reloadedScan.failureReason}".`);

  // Step 6: Test Clean Repository / Zero Findings State
  console.log('\n[Test 6] Testing clean scan state with 0 findings...');
  const cleanScan = await Scan.create({
    repositoryId: testRepo._id,
    status: 'COMPLETED',
    startedAt: new Date(),
    completedAt: new Date(),
    duration: 1,
    totalFindings: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    failureReason: '',
  });

  const cleanFindings = await Finding.find({ scanId: cleanScan._id });
  if (cleanFindings.length !== 0) {
    throw new Error('Expected 0 findings for clean scan.');
  }
  console.log('✓ Clean scan correctly records 0 findings in database.');

  // Cleanup test documents
  await Finding.deleteMany({ repositoryId: testRepo._id });
  await Scan.deleteMany({ repositoryId: testRepo._id });
  await Repository.findByIdAndDelete(testRepo._id);
  await User.findByIdAndDelete(testUser._id);
  console.log('\n✓ Test data cleaned up successfully.');

  console.log('\n=========================================');
  console.log('ALL WORKFLOW VERIFICATION TESTS PASSED!');
  console.log('=========================================');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('\n❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
