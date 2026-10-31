import type { Response, NextFunction } from 'express';
import type { AuthorizedRequest } from '../middleware/rbac.js';
import { activityService } from '../services/activity.service.js';

export async function getProjectActivitiesHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const action = req.query.action as string | undefined;

    const { items, pagination } = await activityService.getProjectActivities(
      req.params.projectId,
      { page, limit, action }
    );

    res.status(200).json({
      success: true,
      data: items,
      pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceActivitiesHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const action = req.query.action as string | undefined;

    const { items, pagination } = await activityService.getWorkspaceActivities(
      req.params.workspaceId,
      { page, limit, action }
    );

    res.status(200).json({
      success: true,
      data: items,
      pagination,
    });
  } catch (error) {
    next(error);
  }
}
