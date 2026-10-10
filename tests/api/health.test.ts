import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';

describe('API Health Endpoints', () => {
  it('GET /api/v1/health should return 200 with structured health data', async () => {
    const res = await request(app).get('/api/v1/health?checkDb=false');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('serverTime');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.database).toHaveProperty('provider', 'postgresql');
  });

  it('GET /api/v1/nonexistent should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('timestamp');
  });
});
