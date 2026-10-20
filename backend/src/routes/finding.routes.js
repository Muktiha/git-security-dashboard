import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAllFindings, getScanFindings, updateFindingStatus } from '../controllers/scan.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllFindings);
router.patch('/:id/status', updateFindingStatus);
router.get('/:scanId', getScanFindings);

export default router;
