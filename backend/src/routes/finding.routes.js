import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAllFindings, getScanFindings } from '../controllers/scan.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllFindings);
router.get('/:scanId', getScanFindings);

export default router;
