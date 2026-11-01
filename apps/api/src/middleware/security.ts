/**
 * Security Middleware Suite for ProjectFlow
 *
 * Implements:
 * 1. HTTP Security Headers (defense against MIME sniffing, clickjacking, referrer leakage)
 * 2. In-Memory Sliding-Window Rate Limiting for Authentication Endpoints
 *
 * NOTE ON MULTI-INSTANCE PRODUCTION DEPLOYMENTS:
 * The included sliding-window rate limiter uses an in-memory Map store. This is ideal for
 * single-container deployments and automated test execution. For distributed, multi-instance,
 * or serverless clusters, replace the memory store with a shared cache such as Redis.
 */

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * Applies defense-in-depth HTTP security headers to all incoming responses.
 */
export interface SecurityHeadersOptions {
  isProduction?: boolean;
}

export function createSecurityHeaders(options?: SecurityHeadersOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const isProd = options?.isProduction ?? (config.NODE_ENV === 'production');

    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking via unauthorized framing while allowing same-origin embedding
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Modern browsers: disable legacy XSS auditor which could introduce vulnerabilities
    res.setHeader('X-XSS-Protection', '0');

    // Control referrer information sent with outbound requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Strict-Transport-Security (HSTS): Enforce HTTPS strictly ONLY in production over secure connections
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (isProd && isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Safe Content-Security-Policy that does not break Vite SPA or client rendering
    if (isProd) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' http: https: ws: wss:;"
      );
    }

    next();
  };
}

export const securityHeaders = createSecurityHeaders();

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipInTests?: boolean;
}

/**
 * Creates an in-memory sliding-window rate limiter middleware.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipInTests = false,
  } = options;

  // In-memory record tracking: IP address -> list of request timestamps
  const hits = new Map<string, RateLimitRecord>();

  // Periodic cleanup of expired records every 60 seconds
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60000));

  // Allow the node process to exit gracefully without waiting for cleanup timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    // Automatically bypass for general test suites to allow rapid integration testing
    if (
      skipInTests &&
      (process.env.VITEST === 'true' ||
        process.env.NODE_ENV === 'test' ||
        config.NODE_ENV === 'test' ||
        process.env.DISABLE_RATE_LIMIT === 'true')
    ) {
      return next();
    }

    // Resolve client IP (supporting reverse proxies via X-Forwarded-For)
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    let record = hits.get(ip);
    if (!record) {
      record = { timestamps: [] };
      hits.set(ip, record);
    }

    // Retain only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const remaining = Math.max(0, max - record.timestamps.length);
    const resetSeconds = Math.ceil(
      record.timestamps.length > 0
        ? Math.max(0, windowMs - (now - record.timestamps[0])) / 1000
        : windowMs / 1000
    );

    // Standard rate limit response headers (RFC 6585 & IETF draft)
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1));
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.timestamps.length >= max) {
      res.setHeader('Retry-After', resetSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          statusCode: 429,
          retryAfterSeconds: resetSeconds,
        },
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };

  // Expose reset mechanism for testing suites
  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

/**
 * Pre-configured rate limiters for ProjectFlow:
 * - authRateLimiter: 20 attempts per 15-minute window for login / registration
 * - strictAuthLimiter: 5 attempts per 60 seconds (for testing or strict endpoints)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per 15m
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  skipInTests: true,
});

export const strictTestRateLimiter = createRateLimiter({
  windowMs: 10 * 1000, // 10 seconds
  max: 3, // 3 requests
  message: 'Too many attempts. Rate limit exceeded.',
  skipInTests: false,
});
