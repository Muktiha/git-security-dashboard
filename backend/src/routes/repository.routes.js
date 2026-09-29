import { Router } from 'express';
import {
  createRepository,
  getRepositories,
  getRepository,
  deleteRepository,
} from '../controllers/repository.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Protect all repository endpoints with JWT authentication middleware
router.use(authenticate);

// Repository endpoints
router.post('/', createRepository);
router.get('/', getRepositories);
router.get('/:id', getRepository);
router.delete('/:id', deleteRepository);

export default router;
