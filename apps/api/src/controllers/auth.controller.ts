import type { Response, NextFunction } from 'express';
import { authService, sanitizeUser } from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { RegisterRequest, LoginRequest } from '../../../../packages/shared/src/types.js';

export async function registerHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: RegisterRequest = req.body;
    const result = await authService.register(payload);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: LoginRequest = req.body;
    const result = await authService.login(payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user) {
      await authService.logout(req.user.id, req.token);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Successfully logged out and invalidated session token',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
}
