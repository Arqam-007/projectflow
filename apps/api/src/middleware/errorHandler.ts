import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

/**
 * Redacts database credentials, passwords, JWT tokens, and sensitive headers
 * from logs, error messages, and stack traces.
 */
export function sanitizeLogText(text: string): string {
  if (!text) return text;
  return text
    // Redact database credentials in connection URLs (postgresql://user:pass@host or postgres://)
    .replace(/(postgres(?:ql)?:\/\/)([^:@\s]+):([^@\s]+)@([^\s"'`]+)/gi, '$1$2:***@$4')
    .replace(/(postgres(?:ql)?:\/\/:)([^@\s]+)@([^\s"'`]+)/gi, '$1***@$3')
    // Redact Bearer JWT tokens
    .replace(/(Bearer\s+)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/gi, '$1[REDACTED_JWT]')
    // Redact raw JWT tokens
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.?[A-Za-z0-9-_.+/=]*/g, '[REDACTED_JWT]')
    // Redact password fields in JSON or key-value parameters
    .replace(/(["']?password["']?\s*[:=]\s*["']?)([^"'&\s\\]+)(["']?)/gi, '$1***$3');
}

export interface SafeErrorLogDetails {
  name: string;
  message: string;
  code?: string | number;
  prismaCode?: string;
  clientVersion?: string;
  meta?: unknown;
  stack?: string;
}

export function extractSafeErrorDetails(err: unknown): SafeErrorLogDetails {
  const isErr = err instanceof Error;
  const rawObj = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>;

  const name = isErr ? err.name : typeof rawObj.name === 'string' ? rawObj.name : 'UnknownError';
  const rawMessage = isErr ? err.message : typeof rawObj.message === 'string' ? rawObj.message : String(err);
  const message = sanitizeLogText(rawMessage);

  const rawCode = rawObj.code;
  const code = typeof rawCode === 'string' || typeof rawCode === 'number' ? rawCode : undefined;

  // Detect Prisma error code (e.g. P1001, P2002, P2021)
  const prismaCode =
    typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode)
      ? rawCode
      : typeof rawObj.errorCode === 'string' && /^P\d{4}$/.test(rawObj.errorCode)
      ? rawObj.errorCode
      : undefined;

  const clientVersion = typeof rawObj.clientVersion === 'string' ? rawObj.clientVersion : undefined;

  let meta: unknown = undefined;
  if (rawObj.meta && typeof rawObj.meta === 'object') {
    try {
      meta = JSON.parse(sanitizeLogText(JSON.stringify(rawObj.meta)));
    } catch {
      meta = undefined;
    }
  }

  const stack = isErr && err.stack ? sanitizeLogText(err.stack) : undefined;

  return {
    name,
    message,
    code,
    prismaCode,
    clientVersion,
    meta,
    stack,
  };
}

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

  // Handle Prisma Unique Constraint violation (P2002) as 409 Conflict
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
    const safeError = extractSafeErrorDetails(err);
    res.locals.errorDetails = safeError;
    const meta = (err as { meta?: { target?: string[] } }).meta;
    const field = meta?.target?.join(', ') || 'resource';

    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `An account or record with this ${field} already exists`,
        timestamp,
      },
    });
    return;
  }

  // Fallback for unhandled unexpected exceptions:
  // Capture name, message, stack, and Prisma code without logging sensitive secrets
  const safeError = extractSafeErrorDetails(err);
  res.locals.errorDetails = safeError;

  const requestId = (req.headers['x-request-id'] as string) || req.get('x-request-id') || 'unknown';

  // Log single-line structured JSON to stderr for Render/Cloud logging
  const logPayload = {
    timestamp,
    level: 'ERROR',
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    error: {
      name: safeError.name,
      message: safeError.message,
      code: safeError.code,
      prismaCode: safeError.prismaCode,
      clientVersion: safeError.clientVersion,
      meta: safeError.meta,
      stack: safeError.stack,
    },
  };

  console.error('[SERVER EXCEPTION]', JSON.stringify(logPayload));

  // Maintain existing public error response contract without leaking internal error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : safeError.message,
      timestamp,
    },
  });
}
