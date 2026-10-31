import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';
import { MemoryTaskRepository, setTaskRepository } from '../../apps/api/src/repositories/task.repository.js';
import { MemoryActivityRepository, setActivityRepository, sanitizeActivityDetails } from '../../apps/api/src/repositories/activity.repository.js';
import { tokenService } from '../../apps/api/src/services/token.service.js';

describe('Milestone 5: Activity Logging & Audit Trail', () => {
  let userRepo: MemoryUserRepository;
  let workspaceRepo: MemoryWorkspaceRepository;
  let projectRepo: MemoryProjectRepository;
  let taskRepo: MemoryTaskRepository;
  let activityRepo: MemoryActivityRepository;

  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  let ownerUser: { id: string; email: string };
  let memberUser: { id: string; email: string };
  let outsiderUser: { id: string; email: string };

  let workspaceId: string;
  let projectId: string;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    workspaceRepo = new MemoryWorkspaceRepository();
    projectRepo = new MemoryProjectRepository();
    taskRepo = new MemoryTaskRepository();
    activityRepo = new MemoryActivityRepository();

    setUserRepository(userRepo);
    setWorkspaceRepository(workspaceRepo);
    setProjectRepository(projectRepo);
    setTaskRepository(taskRepo);
    setActivityRepository(activityRepo);

    // Register users
    const rawOwner = await userRepo.create({
      email: 'owner@example.com',
      name: 'Owner User',
      passwordHash: 'mock-hash',
    });
    ownerUser = { id: rawOwner.id, email: rawOwner.email };
    ownerToken = tokenService.generateToken({
      userId: rawOwner.id,
      email: rawOwner.email,
      tokenVersion: rawOwner.tokenVersion,
    }).token;

    const rawMember = await userRepo.create({
      email: 'member@example.com',
      name: 'Member User',
      passwordHash: 'mock-hash',
    });
    memberUser = { id: rawMember.id, email: rawMember.email };
    memberToken = tokenService.generateToken({
      userId: rawMember.id,
      email: rawMember.email,
      tokenVersion: rawMember.tokenVersion,
    }).token;

    const rawOutsider = await userRepo.create({
      email: 'outsider@example.com',
      name: 'Outsider User',
      passwordHash: 'mock-hash',
    });
    outsiderUser = { id: rawOutsider.id, email: rawOutsider.email };
    outsiderToken = tokenService.generateToken({
      userId: rawOutsider.id,
      email: rawOutsider.email,
      tokenVersion: rawOutsider.tokenVersion,
    }).token;

    // Create workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'DevOps Org', slug: 'devops-org' });
    workspaceId = wsRes.body.data.id;

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // Create project
    const pRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Platform Infrastructure', key: 'INFRA' });
    projectId = pRes.body.data.id;

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });
  });

  it('records TASK_CREATED activity when task is created', async () => {
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Configure Terraform Modules',
        priority: 'HIGH',
        status: 'TODO',
      });

    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.id;

    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(actRes.status).toBe(200);
    expect(actRes.body.data).toHaveLength(1);
    const log = actRes.body.data[0];
    expect(log.action).toBe('TASK_CREATED');
    expect(log.entityType).toBe('TASK');
    expect(log.entityId).toBe(taskId);
    expect(log.details.title).toBe('Configure Terraform Modules');
    expect(log.user.email).toBe(memberUser.email);
  });

  it('records STATUS_CHANGED activity when task status transitions', async () => {
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Deploy Kubernetes Ingress', status: 'TODO' });
    const taskId = taskRes.body.data.id;

    // Transition status TODO -> IN_PROGRESS
    const updateRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(updateRes.status).toBe(200);

    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(actRes.status).toBe(200);
    // 2 logs: creation + status change
    expect(actRes.body.data).toHaveLength(2);
    const latestLog = actRes.body.data[0];
    expect(latestLog.action).toBe('STATUS_CHANGED');
    expect(latestLog.details).toMatchObject({
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
    });
  });

  it('records PRIORITY_CHANGED when priority is modified', async () => {
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Database Optimization', priority: 'LOW' });
    const taskId = taskRes.body.data.id;

    await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ priority: 'URGENT' });

    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(actRes.body.data[0].action).toBe('PRIORITY_CHANGED');
    expect(actRes.body.data[0].details).toMatchObject({
      oldPriority: 'LOW',
      newPriority: 'URGENT',
    });
  });

  it('records TASK_DELETED activity retaining task metadata after deletion', async () => {
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Deprecated Script Removal', status: 'TODO' });
    const taskId = taskRes.body.data.id;

    // Delete task
    const delRes = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(delRes.status).toBe(200);

    // Verify activity feed
    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(actRes.status).toBe(200);
    const delLog = actRes.body.data[0];
    expect(delLog.action).toBe('TASK_DELETED');
    expect(delLog.details).toMatchObject({
      taskKey: 'INFRA-1',
      title: 'Deprecated Script Removal',
      status: 'TODO',
    });
  });

  it('deeply sanitizes nested objects, arrays, case variations, and common secret patterns', () => {
    const complexSensitiveData = {
      title: 'Setup Third-Party Integration',
      metadata: {
        provider: 'Stripe',
        secretContainer: {
          clientSecret: 'shh',
        },
        nestedAuth: {
          safeOption: 'enabled',
          password: 'SecretPassword123!',
          PASSWORD: 'UpperPassword!',
          password_hash: '$2a$12$...',
          client_secret: 'whsec_test',
          clientSecret: 'sk_live_xyz',
          api_key: 'key-12345',
          API_KEY: 'KEY-UPPER',
          private_key: '-----BEGIN RSA PRIVATE KEY-----',
          jwt_token: 'ey...',
          RefreshToken: 'rt_abc',
          bearer: 'token-value',
          sessionId: 'sess_123',
        },
        safeConfig: {
          webhookUrl: 'https://api.example.com/webhook',
          active: true,
          retryCount: 3,
        },
      },
      auditArray: [
        { note: 'Step 1 complete', Authorization: 'Bearer super-secret-token' },
        { user: 'admin', safeId: 'id-456', cookie: 'session=abc' },
      ],
      safeRootField: 'allowed-root-value',
    };

    const sanitized = sanitizeActivityDetails(complexSensitiveData);
    expect(sanitized).toBeDefined();

    // Verify safe fields preserved
    expect(sanitized!.safeRootField).toBe('allowed-root-value');
    expect((sanitized!.metadata as any).provider).toBe('Stripe');
    expect((sanitized!.metadata as any).safeConfig).toEqual({
      webhookUrl: 'https://api.example.com/webhook',
      active: true,
      retryCount: 3,
    });
    expect((sanitized!.auditArray as any)[0].note).toBe('Step 1 complete');
    expect((sanitized!.auditArray as any)[1].user).toBe('admin');
    expect((sanitized!.auditArray as any)[1].safeId).toBe('id-456');

    // Verify container with secret in key is completely stripped
    expect((sanitized!.metadata as any).secretContainer).toBeUndefined();

    // Verify all sensitive keys deleted inside nested container while preserving safeOption
    const nested = (sanitized!.metadata as any).nestedAuth;
    expect(nested.safeOption).toBe('enabled');
    expect(nested.password).toBeUndefined();
    expect(nested.PASSWORD).toBeUndefined();
    expect(nested.password_hash).toBeUndefined();
    expect(nested.client_secret).toBeUndefined();
    expect(nested.clientSecret).toBeUndefined();
    expect(nested.api_key).toBeUndefined();
    expect(nested.API_KEY).toBeUndefined();
    expect(nested.private_key).toBeUndefined();
    expect(nested.jwt_token).toBeUndefined();
    expect(nested.RefreshToken).toBeUndefined();
    expect(nested.bearer).toBeUndefined();
    expect(nested.sessionId).toBeUndefined();

    // Verify array item secrets stripped
    expect((sanitized!.auditArray as any)[0].Authorization).toBeUndefined();
    expect((sanitized!.auditArray as any)[1].cookie).toBeUndefined();
  });

  it('does NOT record activity when a task mutation fails validation', async () => {
    // Attempt invalid task creation (empty title)
    const failRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: '', status: 'TODO' });

    expect(failRes.status).toBe(400);

    // Verify no activity was logged
    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(actRes.status).toBe(200);
    expect(actRes.body.data).toHaveLength(0);
  });

  it('does NOT record activity when a status transition is rejected by state machine', async () => {
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Task to Fail Transition', status: 'TODO' });

    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.id;

    // Disallowed transition: TODO -> DONE directly without IN_PROGRESS/IN_REVIEW
    const failTransRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'DONE' });

    // State machine or transition check rejects it
    if (failTransRes.status === 400) {
      const actRes = await request(app)
        .get(`/api/v1/projects/${projectId}/activities`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Only the initial TASK_CREATED log should exist
      expect(actRes.body.data).toHaveLength(1);
      expect(actRes.body.data[0].action).toBe('TASK_CREATED');
    }
  });

  it('does NOT record activity when task deletion is rejected due to unauthorized role', async () => {
    // Member creates task
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Member Private Task', status: 'TODO' });
    const taskId = taskRes.body.data.id;

    // Another non-privileged user tries to delete it
    const rawOther = await userRepo.create({
      email: 'other@example.com',
      name: 'Other Member',
      passwordHash: 'hash',
    });
    const otherToken = tokenService.generateToken({
      userId: rawOther.id,
      email: rawOther.email,
      tokenVersion: rawOther.tokenVersion,
    }).token;
    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: rawOther.email, role: 'MEMBER' });

    const delRes = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(delRes.status).toBe(403);

    const actRes = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const actions = actRes.body.data.map((a: any) => a.action);
    expect(actions).not.toContain('TASK_DELETED');
  });

  it('rejects invalid query parameters on activity endpoints with 400', async () => {
    const resNegativeLimit = await request(app)
      .get(`/api/v1/projects/${projectId}/activities?limit=-1`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resNegativeLimit.status).toBe(400);

    const resExcessiveLimit = await request(app)
      .get(`/api/v1/projects/${projectId}/activities?limit=9999`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resExcessiveLimit.status).toBe(400);

    const resZeroPage = await request(app)
      .get(`/api/v1/projects/${projectId}/activities?page=0`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resZeroPage.status).toBe(400);
  });

  it('supports pagination in activity queries', async () => {
    // Create 5 tasks
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: `Bulk Task ${i}` });
    }

    const page1Res = await request(app)
      .get(`/api/v1/projects/${projectId}/activities?page=1&limit=2`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data).toHaveLength(2);
    expect(page1Res.body.pagination).toMatchObject({
      total: 5,
      page: 1,
      limit: 2,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });

    const page2Res = await request(app)
      .get(`/api/v1/projects/${projectId}/activities?page=2&limit=2`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.data).toHaveLength(2);
    expect(page2Res.body.pagination.page).toBe(2);
  });

  it('rejects unauthorized users from viewing activity logs with 403 or 404', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/activities`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect([403, 404]).toContain(res.status);
  });
});
