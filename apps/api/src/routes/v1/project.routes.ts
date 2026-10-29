import { Router } from 'express';
import {
  getProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  listProjectMembersHandler,
  addProjectMemberHandler,
  updateProjectMemberRoleHandler,
  removeProjectMemberHandler,
} from '../../controllers/project.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { requireProjectRole } from '../../middleware/rbac.js';
import {
  UpdateProjectSchema,
  AddMemberSchema,
  UpdateRoleSchema,
} from '../../../../../packages/shared/src/schemas.js';

const router = Router();

// Single Project
router.get('/:projectId', authenticateToken, requireProjectRole(), getProjectHandler);
router.patch(
  '/:projectId',
  authenticateToken,
  requireProjectRole(['ADMIN', 'OWNER']),
  validateBody(UpdateProjectSchema),
  updateProjectHandler
);
router.delete('/:projectId', authenticateToken, requireProjectRole(['OWNER']), deleteProjectHandler);

// Project Members
router.get('/:projectId/members', authenticateToken, requireProjectRole(), listProjectMembersHandler);
router.post(
  '/:projectId/members',
  authenticateToken,
  requireProjectRole(['ADMIN', 'OWNER']),
  validateBody(AddMemberSchema),
  addProjectMemberHandler
);
router.patch(
  '/:projectId/members/:userId',
  authenticateToken,
  requireProjectRole(['ADMIN', 'OWNER']),
  validateBody(UpdateRoleSchema),
  updateProjectMemberRoleHandler
);
router.delete('/:projectId/members/:userId', authenticateToken, requireProjectRole(), removeProjectMemberHandler);

export default router;
