import type { TaskStatus, Role, TaskPriority } from '@prisma/client';
import { taskRepository, type TaskWithRelations } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilterParams,
  TaskSummary,
  PaginationMeta,
  ProjectAnalyticsSummary,
  WorkspaceAnalyticsSummary,
  TaskStatusCounts,
  TaskPriorityCounts,
} from '../../../../packages/shared/src/types.js';

export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BACKLOG: ['TODO', 'IN_PROGRESS'],
  TODO: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW', 'DONE', 'BACKLOG'],
  IN_REVIEW: ['IN_PROGRESS', 'DONE', 'TODO'],
  DONE: ['TODO', 'IN_PROGRESS'],
};

export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function sanitizeTask(task: TaskWithRelations): TaskSummary {
  const projectKey = task.project?.key || 'TASK';
  const taskKey = `${projectKey}-${task.taskNumber}`;

  return {
    id: task.id,
    taskNumber: task.taskNumber,
    taskKey,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    orderIndex: task.orderIndex,
    projectId: task.projectId,
    creatorId: task.creatorId,
    assigneeId: task.assigneeId,
    creator: task.creator
      ? {
          id: task.creator.id,
          email: task.creator.email,
          name: task.creator.name,
          avatarUrl: task.creator.avatarUrl,
          createdAt: new Date().toISOString(),
        }
      : undefined,
    assignee: task.assignee
      ? {
          id: task.assignee.id,
          email: task.assignee.email,
          name: task.assignee.name,
          avatarUrl: task.assignee.avatarUrl,
          createdAt: new Date().toISOString(),
        }
      : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TaskService {
  public async createTask(
    projectId: string,
    creatorId: string,
    data: CreateTaskRequest
  ): Promise<TaskSummary> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    if (data.assigneeId) {
      const isMember = await projectRepository.findMember(projectId, data.assigneeId);
      if (!isMember && project.ownerId !== data.assigneeId) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }

    const task = await taskRepository.create({
      title: data.title.trim(),
      description: data.description?.trim(),
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      orderIndex: data.orderIndex || 0,
      projectId,
      creatorId,
      assigneeId: data.assigneeId || null,
    });

    const sanitized = sanitizeTask(task);

    // Activity log: TASK_CREATED
    try {
      await activityRepository.create({
        workspaceId: project.workspaceId,
        projectId,
        userId: creatorId,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: task.id,
        details: {
          taskKey: sanitized.taskKey,
          title: sanitized.title,
          status: sanitized.status,
          priority: sanitized.priority,
          assigneeId: sanitized.assigneeId,
        },
      });
    } catch (err) {
      console.warn('Failed to record activity log for task creation', err);
    }

    return sanitized;
  }

  public async listTasks(
    projectId: string,
    filters?: TaskFilterParams
  ): Promise<{ items: TaskSummary[]; pagination: PaginationMeta }> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 50));

    const { items, total } = await taskRepository.findByProject(projectId, {
      ...filters,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map(sanitizeTask),
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

  public async getTaskById(taskId: string): Promise<TaskSummary> {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    return sanitizeTask(task);
  }

  public async updateTask(
    taskId: string,
    userId: string,
    userRole: Role,
    data: UpdateTaskRequest
  ): Promise<TaskSummary> {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw new NotFoundError('Task not found');

    if ((data as Record<string, unknown>).projectId && (data as Record<string, unknown>).projectId !== existing.projectId) {
      throw new BadRequestError('Changing task parent project is not permitted');
    }

    const isCreator = existing.creatorId === userId;
    const isAssignee = existing.assigneeId === userId;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'OWNER';

    if (!isCreator && !isAssignee && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to edit this task. Only the task creator, assignee, project Admins, or Owners can edit this task.'
      );
    }

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const isMember = await projectRepository.findMember(existing.projectId, data.assigneeId);
      const project = await projectRepository.findById(existing.projectId);
      if (!isMember && project?.ownerId !== data.assigneeId) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }

    if (data.status && data.status !== existing.status) {
      if (!isValidStatusTransition(existing.status, data.status)) {
        throw new BadRequestError(
          `Invalid status transition from ${existing.status} to ${data.status}. Permitted transitions: ${VALID_STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`
        );
      }
    }

    const updated = await taskRepository.update(taskId, {
      title: data.title?.trim(),
      description: data.description !== undefined ? data.description : undefined,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      assigneeId: data.assigneeId !== undefined ? data.assigneeId : undefined,
      orderIndex: data.orderIndex,
    });

    const sanitized = sanitizeTask(updated);

    // Activity log: determine specific action
    try {
      let action: string = 'TASK_UPDATED';
      const details: Record<string, unknown> = {
        taskKey: sanitized.taskKey,
        title: sanitized.title,
      };

      if (data.status && data.status !== existing.status) {
        action = 'STATUS_CHANGED';
        details.oldStatus = existing.status;
        details.newStatus = data.status;
      } else if (data.priority && data.priority !== existing.priority) {
        action = 'PRIORITY_CHANGED';
        details.oldPriority = existing.priority;
        details.newPriority = data.priority;
      } else if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        action = 'ASSIGNEE_CHANGED';
        details.oldAssigneeId = existing.assigneeId;
        details.newAssigneeId = data.assigneeId;
      }

      await activityRepository.create({
        workspaceId: updated.project?.workspaceId,
        projectId: existing.projectId,
        userId,
        action,
        entityType: 'TASK',
        entityId: taskId,
        details,
      });
    } catch (err) {
      console.warn('Failed to record activity log for task update', err);
    }

    return sanitized;
  }

  public async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    orderIndex?: number,
    userId?: string,
    userRole?: Role
  ): Promise<TaskSummary> {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw new NotFoundError('Task not found');

    if (userId && userRole) {
      const isCreator = existing.creatorId === userId;
      const isAssignee = existing.assigneeId === userId;
      const isPrivileged = userRole === 'ADMIN' || userRole === 'OWNER';

      if (!isCreator && !isAssignee && !isPrivileged) {
        throw new ForbiddenError(
          'You do not have permission to change the status of this task. Only the task creator, assignee, project Admins, or Owners can update status.'
        );
      }
    }

    if (!isValidStatusTransition(existing.status, newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${existing.status} to ${newStatus}. Permitted transitions: ${VALID_STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`
      );
    }

    const updated = await taskRepository.updateStatus(taskId, newStatus, orderIndex);
    const sanitized = sanitizeTask(updated);

    if (userId) {
      try {
        await activityRepository.create({
          workspaceId: updated.project?.workspaceId,
          projectId: existing.projectId,
          userId,
          action: 'STATUS_CHANGED',
          entityType: 'TASK',
          entityId: taskId,
          details: {
            taskKey: sanitized.taskKey,
            title: sanitized.title,
            oldStatus: existing.status,
            newStatus,
          },
        });
      } catch (err) {
        console.warn('Failed to record activity log for status change', err);
      }
    }

    return sanitized;
  }

  public async deleteTask(taskId: string, userId: string, userRole: Role): Promise<void> {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw new NotFoundError('Task not found');

    const isCreator = existing.creatorId === userId;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'OWNER';

    if (!isCreator && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to delete this task. Only the task creator, project Admins, or Owners can delete tasks.'
      );
    }

    const projectKey = existing.project?.key || 'TASK';
    const taskKey = `${projectKey}-${existing.taskNumber}`;
    const workspaceId = existing.project?.workspaceId;

    await taskRepository.delete(taskId);

    // Record activity log with preserved details
    try {
      await activityRepository.create({
        workspaceId,
        projectId: existing.projectId,
        userId,
        action: 'TASK_DELETED',
        entityType: 'TASK',
        entityId: taskId,
        details: {
          taskKey,
          title: existing.title,
          status: existing.status,
          priority: existing.priority,
        },
      });
    } catch (err) {
      console.warn('Failed to record activity log for task deletion', err);
    }
  }

  public async getProjectAnalytics(projectId: string): Promise<ProjectAnalyticsSummary> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const tasks = await taskRepository.findAllByProject(projectId);
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const statusCounts: TaskStatusCounts = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    const priorityCounts: TaskPriorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    let completedTasks = 0;
    const overdueList: TaskWithRelations[] = [];
    const upcomingList: TaskWithRelations[] = [];

    for (const task of tasks) {
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      }
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      }

      if (task.status === 'DONE') {
        completedTasks++;
      } else {
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          if (due < now) {
            overdueList.push(task);
          } else if (due <= next7Days) {
            upcomingList.push(task);
          }
        }
      }
    }

    const totalTasks = tasks.length;
    const outstandingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

    // Sort overdue by date ascending (most overdue first)
    overdueList.sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0));
    // Sort upcoming by date ascending (closest due first)
    upcomingList.sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0));

    return {
      projectId: project.id,
      projectName: project.name,
      projectKey: project.key,
      totalTasks,
      completedTasks,
      outstandingTasks,
      completionRate,
      statusCounts,
      priorityCounts,
      overdueTasksCount: overdueList.length,
      upcomingTasksCount: upcomingList.length,
      overdueTasks: overdueList.slice(0, 10).map(sanitizeTask),
      upcomingTasks: upcomingList.slice(0, 10).map(sanitizeTask),
    };
  }

  public async getWorkspaceAnalytics(
    workspaceId: string,
    userId: string,
    userRole: Role
  ): Promise<WorkspaceAnalyticsSummary> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    // Access control: find projects accessible to this user
    let accessibleProjects = await projectRepository.findByWorkspace(workspaceId);
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      accessibleProjects = await projectRepository.findUserProjectsInWorkspace(workspaceId, userId);
    }

    const projectBreakdowns: WorkspaceAnalyticsSummary['projectBreakdowns'] = [];
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasksCount = 0;
    let upcomingTasksCount = 0;

    const statusCounts: TaskStatusCounts = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    const priorityCounts: TaskPriorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const project of accessibleProjects) {
      const tasks = await taskRepository.findAllByProject(project.id);
      let pCompleted = 0;
      let pOverdue = 0;

      for (const t of tasks) {
        totalTasks++;
        if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
        if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++;

        if (t.status === 'DONE') {
          completedTasks++;
          pCompleted++;
        } else if (t.dueDate) {
          const due = new Date(t.dueDate);
          if (due < now) {
            overdueTasksCount++;
            pOverdue++;
          } else if (due <= next7Days) {
            upcomingTasksCount++;
          }
        }
      }

      const pTotal = tasks.length;
      const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 1000) / 10 : 0;

      projectBreakdowns.push({
        id: project.id,
        name: project.name,
        key: project.key,
        totalTasks: pTotal,
        completedTasks: pCompleted,
        completionRate: pRate,
        overdueTasksCount: pOverdue,
      });
    }

    const outstandingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      totalProjects: accessibleProjects.length,
      totalTasks,
      completedTasks,
      outstandingTasks,
      completionRate,
      statusCounts,
      priorityCounts,
      overdueTasksCount,
      upcomingTasksCount,
      projectBreakdowns,
    };
  }
}

export const taskService = new TaskService();
