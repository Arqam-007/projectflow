import type { Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import type { AuthenticatedRequest } from './auth.js';
import { workspaceRepository, type WorkspaceRecord } from '../repositories/workspace.repository.js';
import { projectRepository, type ProjectRecord } from '../repositories/project.repository.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export interface AuthorizedRequest extends AuthenticatedRequest {
  workspace?: WorkspaceRecord;
  workspaceRole?: Role;
  project?: ProjectRecord;
  projectRole?: Role;
  task?: unknown;
}

const ROLE_PRIORITY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function isRoleSufficient(userRole: Role, requiredRole: Role): boolean {
  return ROLE_PRIORITY[userRole] >= ROLE_PRIORITY[requiredRole];
}

export function requireWorkspaceRole(allowedRoles: Role[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        throw new NotFoundError('Workspace parameter missing');
      }

      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) {
        // Return 404 to prevent resource enumeration
        throw new NotFoundError('Workspace not found');
      }

      let userRole: Role | null = null;
      if (workspace.ownerId === req.user.id) {
        userRole = 'OWNER';
      } else {
        const member = await workspaceRepository.findMember(workspaceId, req.user.id);
        if (member) {
          userRole = member.role;
        }
      }

      if (!userRole) {
        // User has no membership in this workspace
        throw new NotFoundError('Workspace not found');
      }

      const hasPermission = allowedRoles.some((role) => isRoleSufficient(userRole!, role));
      if (!hasPermission) {
        throw new ForbiddenError(
          `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`
        );
      }

      req.workspace = workspace;
      req.workspaceRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireProjectRole(allowedRoles: Role[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const projectId = req.params.projectId || req.body.projectId;
      if (!projectId) {
        throw new NotFoundError('Project parameter missing');
      }

      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check cross-workspace consistency if workspaceId is provided in URL path
      if (req.params.workspaceId && req.params.workspaceId !== project.workspaceId) {
        throw new NotFoundError('Project does not belong to the specified workspace');
      }

      let effectiveRole: Role | null = null;

      // 1. Direct project owner check
      if (project.ownerId === req.user.id) {
        effectiveRole = 'OWNER';
      } else {
        // 2. Direct project membership check
        const projectMember = await projectRepository.findMember(projectId, req.user.id);
        if (projectMember) {
          effectiveRole = projectMember.role;
        } else {
          // 3. Parent workspace role inheritance: Workspace OWNER or ADMIN inherits project rights
          const workspace = await workspaceRepository.findById(project.workspaceId);
          if (workspace) {
            if (workspace.ownerId === req.user.id) {
              effectiveRole = 'OWNER';
            } else {
              const wsMember = await workspaceRepository.findMember(project.workspaceId, req.user.id);
              if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
                effectiveRole = wsMember.role;
              }
            }
          }
        }
      }

      if (!effectiveRole) {
        throw new NotFoundError('Project not found');
      }

      const hasPermission = allowedRoles.some((role) => isRoleSufficient(effectiveRole!, role));
      if (!hasPermission) {
        throw new ForbiddenError(
          `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}. Your role: ${effectiveRole}`
        );
      }

      req.project = project;
      req.projectRole = effectiveRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireTaskRole(allowedRoles: Role[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const taskId = req.params.taskId || req.body.taskId;
      if (!taskId) {
        throw new NotFoundError('Task parameter missing');
      }

      const { taskRepository } = await import('../repositories/task.repository.js');
      const task = await taskRepository.findById(taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Check project role for the task's project
      req.params.projectId = task.projectId;
      req.task = task;

      // Delegate to requireProjectRole
      return requireProjectRole(allowedRoles)(req, _res, next);
    } catch (err) {
      next(err);
    }
  };
}
