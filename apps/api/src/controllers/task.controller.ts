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
    const filters: TaskFilterParams = {
      status: req.query.status as TaskFilterParams['status'],
      priority: req.query.priority as TaskFilterParams['priority'],
      assigneeId: req.query.assigneeId as string,
      search: req.query.search as string,
    };

    const tasks = await taskService.listTasks(req.params.projectId, filters);

    res.status(200).json({
      success: true,
      data: tasks,
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
      payload.orderIndex
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
