import { Router } from 'express';
import {
  getTaskHandler,
  updateTaskHandler,
  updateTaskStatusHandler,
  deleteTaskHandler,
} from '../../controllers/task.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { requireTaskRole } from '../../middleware/rbac.js';
import {
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
} from '../../../../../packages/shared/src/schemas.js';

const router = Router();

// Single Task endpoints
router.get('/:taskId', authenticateToken, requireTaskRole(), getTaskHandler);
router.patch(
  '/:taskId',
  authenticateToken,
  requireTaskRole(['MEMBER', 'ADMIN', 'OWNER']),
  validateBody(UpdateTaskSchema),
  updateTaskHandler
);
router.patch(
  '/:taskId/status',
  authenticateToken,
  requireTaskRole(['MEMBER', 'ADMIN', 'OWNER']),
  validateBody(UpdateTaskStatusSchema),
  updateTaskStatusHandler
);
router.delete(
  '/:taskId',
  authenticateToken,
  requireTaskRole(['MEMBER', 'ADMIN', 'OWNER']),
  deleteTaskHandler
);

export default router;
