import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.issues,
        timestamp,
      },
    });
    return;
  }

  // Handle Express body-parser SyntaxError (e.g., malformed JSON)
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload in request body',
        timestamp,
      },
    });
    return;
  }

  // Handle HTTP errors with client status code (e.g., 413 Payload Too Large)
  if (err && typeof err === 'object' && ('status' in err || 'statusCode' in err)) {
    const status = Number((err as { status?: number; statusCode?: number }).status || (err as { statusCode?: number }).statusCode);
    if (status >= 400 && status < 500) {
      res.status(status).json({
        success: false,
        error: {
          code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
          message: (err as { message?: string }).message || 'Invalid client request',
          timestamp,
        },
      });
      return;
    }
  }

  // Fallback for unhandled unexpected exceptions
  console.error('[UNHANDLED EXCEPTION]', {
    path: req.originalUrl,
    method: req.method,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : (err instanceof Error ? err.message : 'Unknown internal error'),
      timestamp,
    },
  });
}
