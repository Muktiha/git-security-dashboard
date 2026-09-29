import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  startScan,
  getRepositoryScans,
} from '../controllers/scan.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/:repositoryId', startScan);

router.get('/:repositoryId', getRepositoryScans);

export default router;