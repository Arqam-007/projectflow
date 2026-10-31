import type { Response, NextFunction } from 'express';
import type { AuthorizedRequest } from '../middleware/rbac.js';
import { taskService } from '../services/task.service.js';

export async function getProjectAnalyticsHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const analytics = await taskService.getProjectAnalytics(req.params.projectId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceAnalyticsHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const analytics = await taskService.getWorkspaceAnalytics(
      req.params.workspaceId,
      req.user!.id,
      req.workspaceRole!
    );

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
}
