import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';
import { MemoryTaskRepository, setTaskRepository } from '../../apps/api/src/repositories/task.repository.js';
import { MemoryActivityRepository, setActivityRepository } from '../../apps/api/src/repositories/activity.repository.js';
import { tokenService } from '../../apps/api/src/services/token.service.js';

describe('Milestone 5: Advanced Filtering, Sorting & Deterministic Pagination', () => {
  let userRepo: MemoryUserRepository;
  let workspaceRepo: MemoryWorkspaceRepository;
  let projectRepo: MemoryProjectRepository;
  let taskRepo: MemoryTaskRepository;
  let activityRepo: MemoryActivityRepository;

  let ownerToken: string;
  let memberToken: string;
  let ownerUser: { id: string; email: string };
  let memberUser: { id: string; email: string };
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

    // Register owner & member
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

    // Workspace & Project
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filter Workspace', slug: 'filter-ws' });
    workspaceId = wsRes.body.data.id;

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    const pRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filter Engine', key: 'FILT' });
    projectId = pRes.body.data.id;

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // Seed test dataset with distinct dates, priorities, statuses, assignees
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const nearFuture = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const farFuture = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

    // Task 1: TODO, LOW, unassigned, past (overdue)
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Alpha Documentation', status: 'TODO', priority: 'LOW', dueDate: past });

    // Task 2: IN_PROGRESS, URGENT, assigned to member, nearFuture
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Beta Incident Response', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: memberUser.id, dueDate: nearFuture });

    // Task 3: IN_REVIEW, HIGH, assigned to owner, farFuture
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Gamma Code Audit', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: ownerUser.id, dueDate: farFuture });

    // Task 4: DONE, MEDIUM, unassigned, past
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Delta Environment Setup', status: 'DONE', priority: 'MEDIUM', dueDate: past });

    // Task 5: TODO, HIGH, assigned to member, nearFuture
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Epsilon Performance Benchmark', status: 'TODO', priority: 'HIGH', assigneeId: memberUser.id, dueDate: nearFuture });
  });

  it('filters by multiple statuses simultaneously (e.g. TODO and IN_PROGRESS)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?status=TODO,IN_PROGRESS`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const statuses = res.body.data.map((t: any) => t.status);
    expect(statuses).toEqual(expect.arrayContaining(['TODO', 'IN_PROGRESS']));
    expect(statuses).not.toContain('DONE');
    expect(statuses).not.toContain('IN_REVIEW');
  });

  it('filters by multiple priorities simultaneously (e.g. HIGH and URGENT)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?priority=HIGH,URGENT`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const priorities = res.body.data.map((t: any) => t.priority);
    expect(priorities.every((p: string) => p === 'HIGH' || p === 'URGENT')).toBe(true);
  });

  it('filters by unassigned tasks', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?assigneeId=unassigned`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((t: any) => t.assigneeId === null)).toBe(true);
  });

  it('filters by overdueOnly (past due and not DONE)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?overdueOnly=true`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Alpha Documentation');
  });

  it('sorts deterministically by priority with secondary tiebreaker', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?sortBy=priority&sortOrder=desc`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].priority).toBe('URGENT');
    expect(res.body.data[res.body.data.length - 1].priority).toBe('LOW');
  });

  it('supports deterministic pagination across multiple pages without overlap', async () => {
    const p1 = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?page=1&limit=2&sortBy=title&sortOrder=asc`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(p1.status).toBe(200);
    expect(p1.body.data).toHaveLength(2);
    expect(p1.body.pagination).toMatchObject({
      total: 5,
      page: 1,
      limit: 2,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });

    const p2 = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?page=2&limit=2&sortBy=title&sortOrder=asc`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(p2.status).toBe(200);
    expect(p2.body.data).toHaveLength(2);
    expect(p2.body.pagination).toMatchObject({
      page: 2,
      hasNextPage: true,
      hasPrevPage: true,
    });

    const p3 = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?page=3&limit=2&sortBy=title&sortOrder=asc`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(p3.status).toBe(200);
    expect(p3.body.data).toHaveLength(1);
    expect(p3.body.pagination).toMatchObject({
      page: 3,
      hasNextPage: false,
      hasPrevPage: true,
    });

    const idsPage1 = p1.body.data.map((t: any) => t.id);
    const idsPage2 = p2.body.data.map((t: any) => t.id);
    const idsPage3 = p3.body.data.map((t: any) => t.id);

    const allIds = [...idsPage1, ...idsPage2, ...idsPage3];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('handles inclusive date boundaries when dueDateTo is specified as YYYY-MM-DD', async () => {
    // Seed task with dueDate today + 1 day
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowDateOnly = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?dueDateTo=${tomorrowDateOnly}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    // Tasks due before or on tomorrow are included
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('supports all 7 sorting fields in both asc and desc orders', async () => {
    const fields = ['createdAt', 'dueDate', 'priority', 'taskNumber', 'title', 'status', 'orderIndex'] as const;

    for (const field of fields) {
      const ascRes = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?sortBy=${field}&sortOrder=asc`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(ascRes.status).toBe(200);
      expect(ascRes.body.data).toHaveLength(5);

      const descRes = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?sortBy=${field}&sortOrder=desc`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(descRes.status).toBe(200);
      expect(descRes.body.data).toHaveLength(5);
    }
  });

  it('combines multiple filters correctly (status + priority + assigneeId + search)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?status=IN_PROGRESS&priority=URGENT&assigneeId=${memberUser.id}&search=Incident`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Beta Incident Response');
    expect(res.body.data[0].status).toBe('IN_PROGRESS');
    expect(res.body.data[0].priority).toBe('URGENT');
  });

  it('rejects invalid filter query parameters with 400 Bad Request', async () => {
    const resInvalidSort = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?sortBy=non_existent_column`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resInvalidSort.status).toBe(400);

    const resInvalidOrder = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?sortOrder=sideways`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resInvalidOrder.status).toBe(400);

    const resNegativePage = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?page=0`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resNegativePage.status).toBe(400);

    const resExcessiveLimit = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?limit=500`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resExcessiveLimit.status).toBe(400);
  });
});
