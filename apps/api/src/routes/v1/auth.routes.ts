import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
} from '../../controllers/auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticateToken } from '../../middleware/auth.js';
import { RegisterSchema, LoginSchema } from '../../../../../packages/shared/src/schemas.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validateBody(RegisterSchema), registerHandler);

// POST /api/v1/auth/login
router.post('/login', validateBody(LoginSchema), loginHandler);

// POST /api/v1/auth/logout (Protected)
router.post('/logout', authenticateToken, logoutHandler);

// GET /api/v1/auth/me (Protected)
router.get('/me', authenticateToken, getMeHandler);

export default router;
