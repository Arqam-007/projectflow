import { Router } from 'express';
import {
  createWorkspaceHandler,
  listWorkspacesHandler,
  getWorkspaceHandler,
  updateWorkspaceHandler,
  deleteWorkspaceHandler,
  listWorkspaceMembersHandler,
  addWorkspaceMemberHandler,
  updateWorkspaceMemberRoleHandler,
  removeWorkspaceMemberHandler,
} from '../../controllers/workspace.controller.js';
import {
  createProjectHandler,
  listWorkspaceProjectsHandler,
} from '../../controllers/project.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { requireWorkspaceRole } from '../../middleware/rbac.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddMemberSchema,
  UpdateRoleSchema,
  CreateProjectSchema,
  ActivityFilterSchema,
} from '../../../../../packages/shared/src/schemas.js';

const router = Router();

// Workspaces collection
router.post('/', authenticateToken, validateBody(CreateWorkspaceSchema), createWorkspaceHandler);
router.get('/', authenticateToken, listWorkspacesHandler);

// Single Workspace
router.get('/:workspaceId', authenticateToken, requireWorkspaceRole(), getWorkspaceHandler);
router.patch(
  '/:workspaceId',
  authenticateToken,
  requireWorkspaceRole(['ADMIN', 'OWNER']),
  validateBody(UpdateWorkspaceSchema),
  updateWorkspaceHandler
);
router.delete('/:workspaceId', authenticateToken, requireWorkspaceRole(['OWNER']), deleteWorkspaceHandler);

// Workspace Members
router.get('/:workspaceId/members', authenticateToken, requireWorkspaceRole(), listWorkspaceMembersHandler);
router.post(
  '/:workspaceId/members',
  authenticateToken,
  requireWorkspaceRole(['ADMIN', 'OWNER']),
  validateBody(AddMemberSchema),
  addWorkspaceMemberHandler
);
router.patch(
  '/:workspaceId/members/:userId',
  authenticateToken,
  requireWorkspaceRole(['ADMIN', 'OWNER']),
  validateBody(UpdateRoleSchema),
  updateWorkspaceMemberRoleHandler
);
router.delete('/:workspaceId/members/:userId', authenticateToken, requireWorkspaceRole(), removeWorkspaceMemberHandler);

// Projects within Workspace
router.post(
  '/:workspaceId/projects',
  authenticateToken,
  requireWorkspaceRole(['MEMBER', 'ADMIN', 'OWNER']),
  validateBody(CreateProjectSchema),
  createProjectHandler
);
router.get('/:workspaceId/projects', authenticateToken, requireWorkspaceRole(), listWorkspaceProjectsHandler);

// Workspace Analytics and Activity Logs
import { getWorkspaceAnalyticsHandler } from '../../controllers/analytics.controller.js';
import { getWorkspaceActivitiesHandler } from '../../controllers/activity.controller.js';

router.get('/:workspaceId/analytics', authenticateToken, requireWorkspaceRole(), getWorkspaceAnalyticsHandler);
router.get(
  '/:workspaceId/activity',
  authenticateToken,
  requireWorkspaceRole(),
  validateQuery(ActivityFilterSchema),
  getWorkspaceActivitiesHandler
);
router.get(
  '/:workspaceId/activities',
  authenticateToken,
  requireWorkspaceRole(),
  validateQuery(ActivityFilterSchema),
  getWorkspaceActivitiesHandler
);

export default router;
