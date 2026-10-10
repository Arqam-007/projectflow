import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service.js';
import { userRepository, type UserRecord } from '../repositories/user.repository.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  token?: string;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next(new UnauthorizedError('Authentication token is required'));
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    next(new UnauthorizedError('Invalid authorization format. Format must be: Bearer <token>'));
    return;
  }

  const token = parts[1];

  try {
    const payload = tokenService.verifyToken(token);

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      next(new UnauthorizedError('User account no longer exists'));
      return;
    }

    // Check token version against user database record for revocation
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      next(new UnauthorizedError('Token is no longer valid. Please sign in again.'));
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}
