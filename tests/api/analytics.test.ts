import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';
import { MemoryTaskRepository, setTaskRepository } from '../../apps/api/src/repositories/task.repository.js';
import { MemoryActivityRepository, setActivityRepository } from '../../apps/api/src/repositories/activity.repository.js';
import { tokenService } from '../../apps/api/src/services/token.service.js';

describe('Milestone 5: Dashboard Analytics & Task Statistics', () => {
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
  let secondProjectId: string;

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

    // 1. Create Users
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

    // 2. Create workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Acme Workspace', slug: 'acme-ws' });
    workspaceId = wsRes.body.data.id;

    // Add member to workspace
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // 3. Create project 1
    const p1Res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Core Engine', key: 'CORE' });
    projectId = p1Res.body.data.id;

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // 4. Create project 2
    const p2Res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mobile Client', key: 'MOB' });
    secondProjectId = p2Res.body.data.id;

    // Seed tasks in Project 1:
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const upcomingDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const distantDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Task 1: Overdue, HIGH, TODO
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Fix Critical CVE',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: pastDate,
      });

    // Task 2: Upcoming, URGENT, IN_PROGRESS
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Deploy Production Hotfix',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: upcomingDate,
        assigneeId: memberUser.id,
      });

    // Task 3: Completed (DONE), LOW, was past due but status is DONE
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Write Initial Specs',
        status: 'DONE',
        priority: 'LOW',
        dueDate: pastDate,
      });

    // Task 4: Distant future, MEDIUM, IN_REVIEW
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Prepare Annual Audit',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        dueDate: distantDate,
      });

    // Seed 1 completed task in Project 2
    await request(app)
      .post(`/api/v1/projects/${secondProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Setup React Native',
        status: 'DONE',
        priority: 'MEDIUM',
      });
  });

  describe('GET /api/v1/projects/:projectId/analytics', () => {
    it('computes accurate project metrics, distributions, and overdue/upcoming counts', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/analytics`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.data;
      expect(stats.projectId).toBe(projectId);
      expect(stats.projectName).toBe('Core Engine');
      expect(stats.projectKey).toBe('CORE');
      expect(stats.totalTasks).toBe(4);
      expect(stats.completedTasks).toBe(1);
      expect(stats.outstandingTasks).toBe(3);
      expect(stats.completionRate).toBe(25);

      expect(stats.statusCounts).toEqual({
        BACKLOG: 0,
        TODO: 1,
        IN_PROGRESS: 1,
        IN_REVIEW: 1,
        DONE: 1,
      });

      expect(stats.priorityCounts).toEqual({
        LOW: 1,
        MEDIUM: 1,
        HIGH: 1,
        URGENT: 1,
      });

      // Overdue: Only Task 1 (Task 3 is DONE so not overdue)
      expect(stats.overdueTasksCount).toBe(1);
      expect(stats.overdueTasks).toHaveLength(1);
      expect(stats.overdueTasks[0].title).toBe('Fix Critical CVE');

      // Upcoming (next 7 days): Only Task 2
      expect(stats.upcomingTasksCount).toBe(1);
      expect(stats.upcomingTasks).toHaveLength(1);
      expect(stats.upcomingTasks[0].title).toBe('Deploy Production Hotfix');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(`/api/v1/projects/${projectId}/analytics`);
      expect(res.status).toBe(401);
    });

    it('computes accurate analytics for an empty project without division by zero', async () => {
      // Create empty project
      const emptyRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Empty Project', key: 'EMPTY' });
      const emptyProjectId = emptyRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/projects/${emptyProjectId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        totalTasks: 0,
        completedTasks: 0,
        outstandingTasks: 0,
        completionRate: 0,
        overdueTasksCount: 0,
        upcomingTasksCount: 0,
      });
      expect(res.body.data.overdueTasks).toHaveLength(0);
      expect(res.body.data.upcomingTasks).toHaveLength(0);
    });

    it('strictly excludes completed (DONE) tasks from overdue count even with past due date', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const overdueTitles = res.body.data.overdueTasks.map((t: any) => t.title);
      expect(overdueTitles).not.toContain('Write Initial Specs');
      expect(res.body.data.overdueTasksCount).toBe(1);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/v1/projects/non-existent-proj-id/analytics')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId/analytics', () => {
    it('aggregates multi-project metrics and provides individual project breakdowns', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const wsStats = res.body.data;
      expect(wsStats.workspaceId).toBe(workspaceId);
      expect(wsStats.workspaceName).toBe('Acme Workspace');
      expect(wsStats.totalProjects).toBe(2);
      expect(wsStats.totalTasks).toBe(5);
      expect(wsStats.completedTasks).toBe(2);
      expect(wsStats.outstandingTasks).toBe(3);
      expect(wsStats.completionRate).toBe(40);
      expect(wsStats.overdueTasksCount).toBe(1);
      expect(wsStats.upcomingTasksCount).toBe(1);

      expect(wsStats.projectBreakdowns).toHaveLength(2);
      const coreBreakdown = wsStats.projectBreakdowns.find((p: any) => p.key === 'CORE');
      expect(coreBreakdown).toMatchObject({
        name: 'Core Engine',
        totalTasks: 4,
        completedTasks: 1,
        completionRate: 25,
        overdueTasksCount: 1,
      });

      const mobBreakdown = wsStats.projectBreakdowns.find((p: any) => p.key === 'MOB');
      expect(mobBreakdown).toMatchObject({
        name: 'Mobile Client',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: 100,
        overdueTasksCount: 0,
      });
    });

    it('scopes project breakdowns to only projects the user has access to', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      const wsStats = res.body.data;
      expect(wsStats.totalProjects).toBe(1);
      expect(wsStats.projectBreakdowns).toHaveLength(1);
      expect(wsStats.projectBreakdowns[0].key).toBe('CORE');
    });

    it('rejects outsider without workspace membership with 403 or 404', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/analytics`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});
