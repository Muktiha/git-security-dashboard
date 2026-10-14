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

async function runE2ETests() {
  console.log('--- STARTING HTTP API END-TO-END TESTS ---');

  // Step 1: Connect to Atlas Database
  console.log('\n[E2E 1] Connecting to MongoDB Atlas...');
  await connectDB();

  // Start HTTP server on temporary port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`✓ Test HTTP server listening on ${baseUrl}`);

  try {
    // Step 2: Test Route Protection (No Token -> 401)
    console.log('\n[E2E 2] Testing route protection without token...');
    const unauthRes = await fetch(`${baseUrl}/findings`);
    console.log(`Status without token: ${unauthRes.status}`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, received ${unauthRes.status}`);
    }
    const unauthBody = await unauthRes.json();
    console.log('✓ Route correctly rejected with 401 and message:', unauthBody.message);

    // Step 3: Register/Login and acquire JWT
    console.log('\n[E2E 3] Testing user registration & acquiring JWT...');
    const testEmail = `e2e_user_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test User',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const regBody = await regRes.json();
    if (regRes.status !== 201 || !regBody.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regBody)}`);
    }
    const token = regBody.token;
    console.log('✓ Successfully registered and acquired token:', token.slice(0, 20) + '...');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Step 4: Add a Repository
    console.log('\n[E2E 4] Testing adding repository via API...');
    const addRepoRes = await fetch(`${baseUrl}/repositories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        url: 'https://github.com/octocat/Hello-World',
        branch: 'master',
        visibility: 'public',
      }),
    });
    const addRepoBody = await addRepoRes.json();
    if (addRepoRes.status !== 201 || !addRepoBody.repository) {
      throw new Error(`Adding repository failed: ${JSON.stringify(addRepoBody)}`);
    }
    const repo = addRepoBody.repository;
    console.log(`✓ Successfully added repository: ${repo.owner}/${repo.name} (id: ${repo._id})`);

    // Step 5: Test Duplicate Scan Prevention
    console.log('\n[E2E 5] Testing duplicate scan prevention (409 Conflict)...');
    // Simulate a currently running scan
    const activeScan = await Scan.create({
      repositoryId: repo._id,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    const dupScanRes = await fetch(`${baseUrl}/scans/${repo._id}`, {
      method: 'POST',
      headers: authHeaders,
    });
    const dupScanBody = await dupScanRes.json();
    console.log(`Duplicate scan attempt response status: ${dupScanRes.status}`);
    if (dupScanRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate scan, received ${dupScanRes.status}`);
    }
    console.log('✓ Duplicate scan blocked with 409 Conflict and message:', dupScanBody.message);

    // Clean up active scan
    await Scan.findByIdAndDelete(activeScan._id);

    // Step 6: Test Scanner Failure Handling with Invalid Repository URL
    console.log('\n[E2E 6] Testing scanner failure handling with invalid repository...');
    const invalidRepo = await Repository.create({
      userId: regBody.user.id,
      name: 'non-existent-repo-test',
      owner: 'non-existent-org-12345',
      url: 'https://github.com/non-existent-org-12345/non-existent-repo-9999.git',
      branch: 'main',
      visibility: 'public',
    });

    const failedScanRes = await fetch(`${baseUrl}/scans/${invalidRepo._id}`, {
      method: 'POST',
      headers: authHeaders,
    });
    const failedScanBody = await failedScanRes.json();
    console.log(`Invalid clone attempt status: ${failedScanRes.status}`);
    if (failedScanRes.status !== 400 && failedScanRes.status !== 500) {
      throw new Error(`Expected 400/500 for failed clone, received ${failedScanRes.status}`);
    }
    console.log('✓ Failed scan handled gracefully with message:', failedScanBody.message);

    // Check Scan record in database reached terminal FAILED state
    const savedFailedScan = await Scan.findOne({ repositoryId: invalidRepo._id }).sort({ createdAt: -1 });
    if (!savedFailedScan || savedFailedScan.status !== 'FAILED') {
      throw new Error(`Expected terminal state FAILED, got ${savedFailedScan?.status}`);
    }
    console.log(`✓ Scan reached terminal state FAILED with failureReason: "${savedFailedScan.failureReason}"`);

    // Step 7: Test Findings API Returns Scans & Repositories Context
    console.log('\n[E2E 7] Testing Findings API (/api/findings)...');
    const findingsRes = await fetch(`${baseUrl}/findings`, {
      method: 'GET',
      headers: authHeaders,
    });
    const findingsBody = await findingsRes.json();
    if (findingsRes.status !== 200 || !findingsBody.success) {
      throw new Error(`Failed to retrieve findings: ${JSON.stringify(findingsBody)}`);
    }
    console.log(`✓ Findings retrieved: count = ${findingsBody.count}`);
    console.log(`✓ Repositories context attached: count = ${findingsBody.repositories?.length}`);
    const failedRepoEntry = findingsBody.repositories?.find((r) => r.latestScan?.status === 'FAILED');
    if (failedRepoEntry) {
      console.log(`✓ Failed scan identified in repository context: "${failedRepoEntry.name}" -> ${failedRepoEntry.latestScan?.failureReason}`);
    }

    // Step 8: Test Dashboard Stats API (/api/scans/dashboard/stats)
    console.log('\n[E2E 8] Testing Dashboard Stats API (/api/scans/dashboard/stats)...');
    const statsRes = await fetch(`${baseUrl}/scans/dashboard/stats`, {
      method: 'GET',
      headers: authHeaders,
    });
    const statsBody = await statsRes.json();
    if (statsRes.status !== 200 || !statsBody.success) {
      throw new Error(`Failed to retrieve dashboard stats: ${JSON.stringify(statsBody)}`);
    }
    console.log('✓ Dashboard stats retrieved successfully:');
    console.log('  Tracked Repositories:', statsBody.stats.trackedRepositories);
    console.log('  Scanned Repositories:', statsBody.stats.scannedRepositories);
    console.log('  Exposed Secrets:', statsBody.stats.exposedSecrets);
    console.log('  Critical CVEs:', statsBody.stats.criticalCVEs);
    console.log('  Security Health Score:', statsBody.stats.healthScore);

    // Clean up test data
    console.log('\n[Cleanup] Cleaning up test records from MongoDB Atlas...');
    await Finding.deleteMany({ repositoryId: { $in: [repo._id, invalidRepo._id] } });
    await Scan.deleteMany({ repositoryId: { $in: [repo._id, invalidRepo._id] } });
    await Repository.deleteMany({ _id: { $in: [repo._id, invalidRepo._id] } });
    await User.findByIdAndDelete(regBody.user.id);
    console.log('✓ Cleanup complete.');

    console.log('\n=========================================');
    console.log('ALL HTTP API E2E TESTS PASSED!');
    console.log('=========================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runE2ETests().catch(async (err) => {
  console.error('\n❌ E2E Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
