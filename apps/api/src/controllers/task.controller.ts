import type { Response, NextFunction } from 'express';
import type { AuthorizedRequest } from '../middleware/rbac.js';
import { taskService } from '../services/task.service.js';
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
  TaskFilterParams,
} from '../../../../packages/shared/src/types.js';

export async function createTaskHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: CreateTaskRequest = req.body;
    const task = await taskService.createTask(
      req.params.projectId,
      req.user!.id,
      payload
    );

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function listProjectTasksHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawStatus = req.query.status;
    let statusFilter: TaskFilterParams['status'];
    if (typeof rawStatus === 'string') {
      statusFilter = rawStatus.includes(',') ? (rawStatus.split(',').map((s) => s.trim()) as any) : (rawStatus as any);
    } else if (Array.isArray(rawStatus)) {
      statusFilter = rawStatus as any;
    }

    const rawPriority = req.query.priority;
    let priorityFilter: TaskFilterParams['priority'];
    if (typeof rawPriority === 'string') {
      priorityFilter = rawPriority.includes(',') ? (rawPriority.split(',').map((p) => p.trim()) as any) : (rawPriority as any);
    } else if (Array.isArray(rawPriority)) {
      priorityFilter = rawPriority as any;
    }

    const filters: TaskFilterParams = {
      status: statusFilter,
      priority: priorityFilter,
      assigneeId: req.query.assigneeId as string,
      search: req.query.search as string,
      dueDateFrom: req.query.dueDateFrom as string,
      dueDateTo: req.query.dueDateTo as string,
      overdueOnly:
        String(req.query.overdueOnly) === 'true' ||
        String(req.query.overdueOnly) === '1',
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const { items, pagination } = await taskService.listTasks(req.params.projectId, filters);

    res.status(200).json({
      success: true,
      data: items,
      pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.getTaskById(req.params.taskId);

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateTaskRequest = req.body;
    const task = await taskService.updateTask(
      req.params.taskId,
      req.user!.id,
      req.projectRole!,
      payload
    );

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatusHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateTaskStatusRequest = req.body;
    const task = await taskService.updateTaskStatus(
      req.params.taskId,
      payload.status,
      payload.orderIndex,
      req.user!.id,
      req.projectRole!
    );

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await taskService.deleteTask(
      req.params.taskId,
      req.user!.id,
      req.projectRole!
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Task successfully deleted',
      },
    });
  } catch (error) {
    next(error);
  }
}
