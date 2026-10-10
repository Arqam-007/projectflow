import type { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';

export async function getHealthHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const checkDb = req.query.checkDb !== 'false';
    const health = await healthService.getHealth(checkDb);

    res.status(health.status === 'unhealthy' ? 503 : 200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
}
