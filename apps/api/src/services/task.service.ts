import type { TaskStatus, Role } from '@prisma/client';
import { taskRepository, type TaskWithRelations } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilterParams,
  TaskSummary,
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

    // Cross-project / cross-workspace assignment verification:
    // Assignee must be an active member of this project
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

    return sanitizeTask(task);
  }

  public async listTasks(projectId: string, filters?: TaskFilterParams): Promise<TaskSummary[]> {
    const tasks = await taskRepository.findByProject(projectId, filters);
    return tasks.map(sanitizeTask);
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

    // Prevent changing task parent project / workspace
    if ((data as Record<string, unknown>).projectId && (data as Record<string, unknown>).projectId !== existing.projectId) {
      throw new BadRequestError('Changing task parent project is not permitted');
    }

    // Role-Based Access Control:
    // OWNER and ADMIN can edit any task in the project.
    // MEMBER can only edit tasks that they created or are assigned to.
    const isCreator = existing.creatorId === userId;
    const isAssignee = existing.assigneeId === userId;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'OWNER';

    if (!isCreator && !isAssignee && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to edit this task. Only the task creator, assignee, project Admins, or Owners can edit this task.'
      );
    }

    // Assignee membership validation
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const isMember = await projectRepository.findMember(existing.projectId, data.assigneeId);
      const project = await projectRepository.findById(existing.projectId);
      if (!isMember && project?.ownerId !== data.assigneeId) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }

    // Status transition validation
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

    return sanitizeTask(updated);
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

    // Role-Based Access Control:
    // OWNER and ADMIN can transition any task in the project.
    // MEMBER can transition their own tasks (created or assigned).
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
    return sanitizeTask(updated);
  }

  public async deleteTask(taskId: string, userId: string, userRole: Role): Promise<void> {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw new NotFoundError('Task not found');

    // RBAC: Can only be deleted by task creator, project Admin, or project Owner
    const isCreator = existing.creatorId === userId;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'OWNER';

    if (!isCreator && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to delete this task. Only the task creator, project Admins, or Owners can delete tasks.'
      );
    }

    await taskRepository.delete(taskId);
  }
}

export const taskService = new TaskService();
