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

async function runBenchmark() {
  console.log('====================================================');
  console.log('   PERFORMANCE BENCHMARK: MEASURING API LATENCIES   ');
  console.log('====================================================\n');

  await connectDB();

  // 1. Create a user with several repos, scans, and findings to simulate real workload
  const benchmarkEmail = `bench_${Date.now()}@test.com`;
  const user = await User.create({
    name: 'Benchmark User',
    email: benchmarkEmail,
    passwordHash: 'dummy',
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const repoIds = [];
  const scanIds = [];

  try {
    // Seed 4 repositories
    for (let r = 1; r <= 4; r++) {
      const repo = await Repository.create({
        userId: user._id,
        name: `benchmark-repo-${r}`,
        owner: 'bench-org',
        url: `https://github.com/bench-org/benchmark-repo-${r}`,
        branch: 'main',
        lastScannedAt: new Date(),
      });
      repoIds.push(repo._id);

      // Seed 3 scans per repository
      for (let s = 1; s <= 3; s++) {
        const scan = await Scan.create({
          repositoryId: repo._id,
          status: 'COMPLETED',
          startedAt: new Date(Date.now() - s * 3600000),
          completedAt: new Date(Date.now() - s * 3600000 + 15000),
          duration: 15,
          totalFindings: 6,
          criticalCount: 2,
          highCount: 2,
          mediumCount: 2,
          lowCount: 0,
        });
        scanIds.push(scan._id);

        // Seed 6 findings per scan
        const findingsData = [
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'GITLEAKS',
            type: 'generic-api-key',
            severity: 'CRITICAL',
            title: `Secret Leak #${r}-${s}-1`,
            description: 'Hardcoded secret token in auth config',
            file: 'src/config/jwt.js',
            line: 12,
            identifier: 'generic-api-key',
            fingerprint: `src/config/jwt.js:12:generic-api-key`,
            status: 'OPEN',
          },
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'GITLEAKS',
            type: 'aws-access-token',
            severity: 'CRITICAL',
            title: `AWS Secret #${r}-${s}-2`,
            description: 'Found leaked AWS key',
            file: 'deploy.env',
            line: 4,
            identifier: 'aws-access-token',
            fingerprint: `deploy.env:4:aws-access-token`,
            status: 'RESOLVED',
          },
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'TRIVY',
            type: 'Vulnerability',
            severity: 'HIGH',
            title: `CVE-2023-1111 in express`,
            description: 'High vuln description',
            file: 'package-lock.json',
            identifier: 'CVE-2023-1111',
            fingerprint: `package-lock.json:CVE-2023-1111`,
            status: 'OPEN',
          },
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'TRIVY',
            type: 'Vulnerability',
            severity: 'HIGH',
            title: `CVE-2023-2222 in lodash`,
            description: 'Prototype pollution in lodash',
            file: 'package-lock.json',
            identifier: 'CVE-2023-2222',
            fingerprint: `package-lock.json:CVE-2023-2222`,
            status: 'IN_PROGRESS',
          },
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'TRIVY',
            type: 'Vulnerability',
            severity: 'MEDIUM',
            title: `CVE-2023-3333 in axios`,
            description: 'Medium SSRF risk',
            file: 'package-lock.json',
            identifier: 'CVE-2023-3333',
            fingerprint: `package-lock.json:CVE-2023-3333`,
            status: 'OPEN',
          },
          {
            scanId: scan._id,
            repositoryId: repo._id,
            scanner: 'TRIVY',
            type: 'Vulnerability',
            severity: 'MEDIUM',
            title: `CVE-2023-4444 in jsonwebtoken`,
            description: 'Medium verification bypass',
            file: 'package-lock.json',
            identifier: 'CVE-2023-4444',
            fingerprint: `package-lock.json:CVE-2023-4444`,
            status: 'ACCEPTED_RISK',
          },
        ];
        await Finding.insertMany(findingsData);
      }
    }

    // Seed 10 notifications
    for (let n = 1; n <= 10; n++) {
      await Notification.create({
        userId: user._id,
        repositoryId: repoIds[0],
        scanId: scanIds[0],
        type: 'CRITICAL_FINDINGS',
        title: `Notification #${n}`,
        message: `Alert message #${n}`,
        isRead: n % 2 === 0,
      });
    }

    console.log(`Seeded 4 repos, 12 scans, 72 findings, 10 notifications for user ${benchmarkEmail}\n`);

    const endpoints = [
      { name: 'GET /api/repositories', url: 'http://localhost:5000/api/repositories', method: 'GET' },
      { name: 'GET /api/scans/dashboard/stats', url: 'http://localhost:5000/api/scans/dashboard/stats', method: 'GET' },
      { name: 'GET /api/findings', url: 'http://localhost:5000/api/findings', method: 'GET' },
      { name: 'GET /api/findings?repositoryId=' + repoIds[0], url: `http://localhost:5000/api/findings?repositoryId=${repoIds[0]}`, method: 'GET' },
      { name: 'GET /api/scans/history', url: 'http://localhost:5000/api/scans/history', method: 'GET' },
      { name: 'GET /api/scans/analytics', url: 'http://localhost:5000/api/scans/analytics', method: 'GET' },
      { name: 'GET /api/notifications', url: 'http://localhost:5000/api/notifications', method: 'GET' },
      {
        name: 'POST /api/scans/compare',
        url: 'http://localhost:5000/api/scans/compare',
        method: 'POST',
        body: JSON.stringify({ baseScanId: scanIds[1], targetScanId: scanIds[0] }),
      },
    ];

    const results = [];

    // Run each endpoint 5 times to get min, max, avg
    for (const ep of endpoints) {
      const times = [];
      let payloadSize = 0;
      let statusCode = 200;

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: ep.body || undefined,
        });
        const text = await res.text();
        const duration = performance.now() - start;
        times.push(duration);
        payloadSize = Buffer.byteLength(text, 'utf8');
        statusCode = res.status;
      }

      const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
      const min = Math.min(...times).toFixed(1);
      const max = Math.max(...times).toFixed(1);

      results.push({
        Endpoint: ep.name,
        Status: statusCode,
        'Avg (ms)': `${avg} ms`,
        'Min (ms)': `${min} ms`,
        'Max (ms)': `${max} ms`,
        'Payload (KB)': (payloadSize / 1024).toFixed(2) + ' KB',
      });
    }

    console.table(results);
    console.log('\nBenchmark completed successfully.');
  } finally {
    console.log('\nCleaning up benchmark seeded data...');
    await Finding.deleteMany({ repositoryId: { $in: repoIds } });
    await Scan.deleteMany({ repositoryId: { $in: repoIds } });
    await Notification.deleteMany({ userId: user._id });
    await Repository.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
    await mongoose.disconnect();
    console.log('Cleanup finished.');
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
