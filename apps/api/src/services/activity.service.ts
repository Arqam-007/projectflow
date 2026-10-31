import { activityRepository, type ActivityWithRelations } from '../repositories/activity.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { ActivitySummary, PaginationMeta } from '../../../../packages/shared/src/types.js';

export function sanitizeActivity(activity: ActivityWithRelations): ActivitySummary {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    projectId: activity.projectId,
    userId: activity.userId,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    details: (activity.details as Record<string, unknown>) || null,
    createdAt: activity.createdAt.toISOString(),
    user: {
      id: activity.user.id,
      email: activity.user.email,
      name: activity.user.name,
      avatarUrl: activity.user.avatarUrl,
    },
    project: activity.project
      ? {
          id: activity.project.id,
          name: activity.project.name,
          key: activity.project.key,
        }
      : undefined,
  };
}

export class ActivityService {
  public async getProjectActivities(
    projectId: string,
    options: { page?: number; limit?: number; action?: string } = {}
  ): Promise<{ items: ActivitySummary[]; pagination: PaginationMeta }> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const { items, total } = await activityRepository.findByProject(projectId, {
      page,
      limit,
      action: options.action,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map(sanitizeActivity),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getWorkspaceActivities(
    workspaceId: string,
    options: { page?: number; limit?: number; action?: string } = {}
  ): Promise<{ items: ActivitySummary[]; pagination: PaginationMeta }> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const { items, total } = await activityRepository.findByWorkspace(workspaceId, {
      page,
      limit,
      action: options.action,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map(sanitizeActivity),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

export const activityService = new ActivityService();
