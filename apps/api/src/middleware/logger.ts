import type { Request, Response, NextFunction } from 'express';

export function structuredLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const requestId = Math.random().toString(36).substring(2, 10);
  req.headers['x-request-id'] = req.headers['x-request-id'] || requestId;

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number((end - start) / 1_000_000n);

    // Suppress healthcheck polling spam in production if desired, but log structured in development
    const logPayload = {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      userAgent: req.get('user-agent') || 'unknown',
    };

    if (res.statusCode >= 500) {
      console.error('[HTTP ERROR]', JSON.stringify(logPayload));
    } else if (res.statusCode >= 400) {
      console.warn('[HTTP WARN]', JSON.stringify(logPayload));
    } else {
      console.log('[HTTP INFO]', JSON.stringify(logPayload));
    }
  });

  next();
}
