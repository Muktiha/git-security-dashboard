import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  startScan,
  getRepositoryScans,
  getAllFindings,
  getScanFindings,
  getDashboardStats,
  getSecurityAnalytics,
  getScanHistory,
  compareScans,
} from '../controllers/scan.controller.js';

const router = express.Router();

router.use(authenticate);

// Aggregated / collection endpoints (must be before :repositoryId parameter)
router.get('/analytics', getSecurityAnalytics);
router.get('/history', getScanHistory);
router.post('/compare', compareScans);
router.get('/findings', getAllFindings);
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);

// Scan-specific endpoints
router.get('/:scanId/findings', getScanFindings);

// Repository-specific endpoints
router.post('/:repositoryId', startScan);
router.get('/:repositoryId', getRepositoryScans);

export default router;