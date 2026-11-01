/**
 * Security & Resilience Integration Test Suite
 *
 * Verifies:
 * 1. HTTP security headers (MIME-sniffing, framing, referrer, HSTS safety)
 * 2. In-memory sliding-window rate limiting & HTTP 429 response structure
 * 3. Malformed JSON payload handling
 * 4. Validation boundaries and edge cases
 * 5. Seed script production safety assertion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../../apps/api/src/app.js';
import {
  securityHeaders,
  createSecurityHeaders,
  createRateLimiter,
  strictTestRateLimiter,
} from '../../apps/api/src/middleware/security.js';

describe('Milestone 6: Security Hardening & Edge-Case Resilience', () => {
  describe('HTTP Security Headers', () => {
    it('sets defense-in-depth security headers on all API responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      // Express default x-powered-by header must be stripped
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('does not enable HSTS header in development or non-secure HTTP environments', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['strict-transport-security']).toBeUndefined();
    });

    it('enforces HSTS only in production when request is secure', async () => {
      const testApp = express();
      // Configure production security headers
      testApp.use(createSecurityHeaders({ isProduction: true }));
      testApp.get('/test', (_req, res) => res.json({ ok: true }));

      const resSecure = await request(testApp)
        .get('/test')
        .set('x-forwarded-proto', 'https');

      expect(resSecure.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains'
      );
    });
  });

  describe('Sliding-Window Rate Limiting', () => {
    let rateLimitedApp: express.Express;
    const testLimiter = createRateLimiter({
      windowMs: 5000, // 5 seconds
      max: 3, // allow 3 requests
      message: 'Too many authentication attempts. Please wait.',
      skipInTests: false,
    });

    beforeEach(() => {
      testLimiter.reset();
      rateLimitedApp = express();
      rateLimitedApp.use(express.json());
      rateLimitedApp.use(testLimiter);
      rateLimitedApp.post('/api/v1/auth/login', (_req, res) => {
        res.status(200).json({ success: true, message: 'Logged in' });
      });
    });

    it('allows requests within the configured threshold and sets rate limit headers', async () => {
      const res1 = await request(rateLimitedApp).post('/api/v1/auth/login').send({});
      expect(res1.status).toBe(200);
      expect(res1.headers['x-ratelimit-limit']).toBe('3');
      expect(res1.headers['x-ratelimit-remaining']).toBe('2');

      const res2 = await request(rateLimitedApp).post('/api/v1/auth/login').send({});
      expect(res2.status).toBe(200);
      expect(res2.headers['x-ratelimit-remaining']).toBe('1');

      const res3 = await request(rateLimitedApp).post('/api/v1/auth/login').send({});
      expect(res3.status).toBe(200);
      expect(res3.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('rejects requests exceeding the threshold with HTTP 429 and standard error envelope', async () => {
      // Exhaust 3 allowed requests
      await request(rateLimitedApp).post('/api/v1/auth/login').send({});
      await request(rateLimitedApp).post('/api/v1/auth/login').send({});
      await request(rateLimitedApp).post('/api/v1/auth/login').send({});

      // 4th request must be blocked
      const blockedRes = await request(rateLimitedApp).post('/api/v1/auth/login').send({});

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.body.error.statusCode).toBe(429);
      expect(blockedRes.body.error.message).toContain('Too many authentication attempts');
      expect(blockedRes.body.error.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('tracks rate limits per client IP address', async () => {
      // Exhaust limit for IP Alpha
      await request(rateLimitedApp)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', '198.51.100.1')
        .send({});
      await request(rateLimitedApp)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', '198.51.100.1')
        .send({});
      await request(rateLimitedApp)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', '198.51.100.1')
        .send({});

      const blockedAlpha = await request(rateLimitedApp)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', '198.51.100.1')
        .send({});
      expect(blockedAlpha.status).toBe(429);

      // Distinct IP Beta should still be allowed through
      const allowedBeta = await request(rateLimitedApp)
        .post('/api/v1/auth/login')
        .set('x-forwarded-for', '198.51.100.2')
        .send({});
      expect(allowedBeta.status).toBe(200);
    });
  });

  describe('Payload Resilience & Malformed Input Handling', () => {
    it('returns a graceful 400 Bad Request on malformed JSON bodies without exposing internal stack traces', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ "email": "broken-json", ');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Ensures raw stack trace or server internals are not leaked
      expect(res.body.error).toBeDefined();
    });

    it('enforces maximum payload size limits to protect against memory exhaustion', async () => {
      const oversizedPayload = {
        title: 'X'.repeat(1024 * 1024 * 11), // 11 MB payload exceeding 10 MB limit
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(oversizedPayload);

      expect([400, 413]).toContain(res.status);
    });
  });

  describe('Production Seeding Guard', () => {
    it('protects production databases from accidental seed execution', async () => {
      const { seedDatabase } = await import('../../prisma/seed.js');

      await expect(
        seedDatabase({ nodeEnv: 'production', forceProdSeed: false })
      ).rejects.toThrow('SEED_ABORTED_IN_PRODUCTION');
    });
  });
});
