import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../apps/api/src/app.js';
import { userRepository, MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { config } from '../../apps/api/src/config/index.js';

describe('Authentication API Integration Tests', () => {
  let memoryRepo: MemoryUserRepository;

  beforeEach(() => {
    // Reset repository before each test to guarantee test isolation
    memoryRepo = new MemoryUserRepository();
    setUserRepository(memoryRepo);
  });

  const validUser = {
    email: 'developer@projectflow.dev',
    password: 'Password123!',
    name: 'Senior Architect',
  };

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new user with valid input and hashes password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user).toHaveProperty('createdAt');

      // Security requirement: Ensure password hash is NEVER leaked in API response
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('password');

      // JWT access token returned
      expect(res.body.data).toHaveProperty('accessToken');
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data).toHaveProperty('expiresIn');
    });

    it('returns 409 Conflict when attempting to register a duplicate email', async () => {
      // First registration
      await request(app).post('/api/v1/auth/register').send(validUser);

      // Duplicate registration attempt (with case variation to verify normalization)
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'DEVELOPER@projectflow.dev',
          password: 'AnotherPassword456!',
          name: 'Clone User',
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });

    it('returns 400 Validation Error when password fails strength criteria', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@projectflow.dev',
          password: 'short', // < 8 characters
          name: 'Weak Pass',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('returns 400 Validation Error for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Invalid Email',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('successfully logs in with valid credentials and issues JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('returns 401 Unauthorized for incorrect password without leaking hints', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 401 Unauthorized for non-existent email with identical safe message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@projectflow.dev',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('Protected Routes & Token Verification', () => {
    let authToken: string;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
      authToken = registerRes.body.data.accessToken;
    });

    it('allows access to GET /api/v1/auth/me with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('rejects unauthenticated requests to GET /api/v1/auth/me with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(res.body.error.message).toContain('Authentication token is required');
    });

    it('rejects requests with malformed Authorization header with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic 123456');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Format must be: Bearer <token>');
    });

    it('rejects expired tokens with 401 and specific expiration error', async () => {
      // Craft an expired JWT signed with the test secret
      const expiredToken = jwt.sign(
        { userId: 'test-user', email: 'test@example.com', tokenVersion: 0 },
        config.JWT_SECRET,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('expired');
    });

    it('rejects tampered or invalid JWT signatures with 401', async () => {
      const tamperedToken = authToken + 'tampered';

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid authentication token');
    });

    it('invalidates token upon logout so subsequent calls return 401', async () => {
      // Logout using the valid token
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toContain('logged out');

      // Attempt to access protected route with the invalidated token
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.message).toMatch(/(revoked|no longer valid)/i);
    });
  });
});
