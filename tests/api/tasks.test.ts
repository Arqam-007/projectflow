import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';
import { MemoryTaskRepository, setTaskRepository } from '../../apps/api/src/repositories/task.repository.js';
import { tokenService } from '../../apps/api/src/services/token.service.js';

describe('Task Management, Concurrency, RBAC & State Machine Integration Tests', () => {
  let userRepo: MemoryUserRepository;
  let workspaceRepo: MemoryWorkspaceRepository;
  let projectRepo: MemoryProjectRepository;
  let taskRepo: MemoryTaskRepository;

  let ownerToken: string;
  let ownerUser: { id: string; email: string; name: string };
  let adminToken: string;
  let adminUser: { id: string; email: string; name: string };
  let memberToken: string;
  let memberUser: { id: string; email: string; name: string };
  let secondMemberToken: string;
  let secondMemberUser: { id: string; email: string; name: string };
  let viewerToken: string;
  let viewerUser: { id: string; email: string; name: string };
  let outsiderToken: string;
  let outsiderUser: { id: string; email: string; name: string };

  let workspaceId: string;
  let projectId: string;
  let secondProjectId: string;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    workspaceRepo = new MemoryWorkspaceRepository();
    projectRepo = new MemoryProjectRepository();
    taskRepo = new MemoryTaskRepository();

    setUserRepository(userRepo);
    setWorkspaceRepository(workspaceRepo);
    setProjectRepository(projectRepo);
    setTaskRepository(taskRepo);

    // 1. Workspace & Project Owner
    const rawOwner = await userRepo.create({
      email: 'owner@projectflow.dev',
      name: 'Project Owner',
      passwordHash: 'mock-hash',
    });
    ownerUser = { id: rawOwner.id, email: rawOwner.email, name: rawOwner.name };
    ownerToken = tokenService.generateToken({ userId: rawOwner.id, email: rawOwner.email, tokenVersion: rawOwner.tokenVersion }).token;

    // 2. Project Admin
    const rawAdmin = await userRepo.create({
      email: 'admin@projectflow.dev',
      name: 'Project Admin',
      passwordHash: 'mock-hash',
    });
    adminUser = { id: rawAdmin.id, email: rawAdmin.email, name: rawAdmin.name };
    adminToken = tokenService.generateToken({ userId: rawAdmin.id, email: rawAdmin.email, tokenVersion: rawAdmin.tokenVersion }).token;

    // 3. Project Member 1
    const rawMember = await userRepo.create({
      email: 'member@projectflow.dev',
      name: 'Project Member',
      passwordHash: 'mock-hash',
    });
    memberUser = { id: rawMember.id, email: rawMember.email, name: rawMember.name };
    memberToken = tokenService.generateToken({ userId: rawMember.id, email: rawMember.email, tokenVersion: rawMember.tokenVersion }).token;

    // 4. Project Member 2 (to test inter-member authorization boundaries)
    const rawSecondMember = await userRepo.create({
      email: 'member2@projectflow.dev',
      name: 'Second Project Member',
      passwordHash: 'mock-hash',
    });
    secondMemberUser = { id: rawSecondMember.id, email: rawSecondMember.email, name: rawSecondMember.name };
    secondMemberToken = tokenService.generateToken({ userId: rawSecondMember.id, email: rawSecondMember.email, tokenVersion: rawSecondMember.tokenVersion }).token;

    // 5. Project Viewer
    const rawViewer = await userRepo.create({
      email: 'viewer@projectflow.dev',
      name: 'Project Viewer',
      passwordHash: 'mock-hash',
    });
    viewerUser = { id: rawViewer.id, email: rawViewer.email, name: rawViewer.name };
    viewerToken = tokenService.generateToken({ userId: rawViewer.id, email: rawViewer.email, tokenVersion: rawViewer.tokenVersion }).token;

    // 6. Outsider (Non-member)
    const rawOutsider = await userRepo.create({
      email: 'outsider@projectflow.dev',
      name: 'Outsider User',
      passwordHash: 'mock-hash',
    });
    outsiderUser = { id: rawOutsider.id, email: rawOutsider.email, name: rawOutsider.name };
    outsiderToken = tokenService.generateToken({ userId: rawOutsider.id, email: rawOutsider.email, tokenVersion: rawOutsider.tokenVersion }).token;

    // Create primary workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Alpha Studio', slug: 'alpha-studio' });
    workspaceId = wsRes.body.data.id;

    // Add users to workspace
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: adminUser.email, role: 'ADMIN' });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: secondMemberUser.email, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: viewerUser.email, role: 'VIEWER' });

    // Create primary project
    const projRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Core Platform', key: 'CORE', description: 'Core application development' });
    projectId = projRes.body.data.id;

    // Add members to project
    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: adminUser.email, role: 'ADMIN' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: secondMemberUser.email, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: viewerUser.email, role: 'VIEWER' });

    // Create second isolated project
    const secondProjRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mobile App', key: 'MOB', description: 'iOS and Android client' });
    secondProjectId = secondProjRes.body.data.id;
  });

  describe('Task Numbering & Concurrency', () => {
    it('ensures concurrent task creation generates strictly unique, sequential task keys without collisions', async () => {
      // Dispatch 8 concurrent task creation requests simultaneously
      const taskCreationPromises = Array.from({ length: 8 }, (_, i) =>
        request(app)
          .post(`/api/v1/projects/${projectId}/tasks`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: `Concurrent Task ${i + 1}`,
            priority: 'MEDIUM',
            status: 'TODO',
          })
      );

      const responses = await Promise.all(taskCreationPromises);

      // Verify all 8 succeeded with 201 Created
      for (const res of responses) {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      }

      // Collect all task numbers and task keys
      const taskNumbers = responses.map((r) => r.body.data.taskNumber);
      const taskKeys = responses.map((r) => r.body.data.taskKey);

      // Assert all numbers and keys are unique
      const uniqueNumbers = new Set(taskNumbers);
      const uniqueKeys = new Set(taskKeys);

      expect(uniqueNumbers.size).toBe(8);
      expect(uniqueKeys.size).toBe(8);

      // Verify the task numbers are 1 through 8
      const sortedNumbers = [...taskNumbers].sort((a, b) => a - b);
      expect(sortedNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      // Verify keys follow project key prefix
      expect(taskKeys.every((k) => k.startsWith('CORE-'))).toBe(true);
    });
  });

  describe('Task Creation & Assignment', () => {
    it('creates a task with valid data and auto-generates task key', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Design Authentication Architecture',
          description: 'Document JWT refresh and RBAC rules',
          priority: 'HIGH',
          status: 'TODO',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: 'Design Authentication Architecture',
        status: 'TODO',
        priority: 'HIGH',
        projectId,
        creatorId: memberUser.id,
      });
      expect(res.body.data.taskKey).toBe('CORE-1');
      expect(res.body.data.taskNumber).toBe(1);
      expect(res.body.data.creator.name).toBe('Project Member');
    });

    it('assigns task to a valid project member', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Setup Redis Caching',
          assigneeId: memberUser.id,
          priority: 'MEDIUM',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assigneeId).toBe(memberUser.id);
      expect(res.body.data.assignee.email).toBe(memberUser.email);
    });

    it('rejects assigning task to an outsider who is not a project member', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Unauthorized Task Assignment',
          assigneeId: outsiderUser.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('active member of this project');
    });

    it('denies task creation to project VIEWERS with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Viewer Attempting Task Creation',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies task creation to users outside the project with 404 (Anti-IDOR)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          title: 'Outsider Task',
        });

      expect(res.status).toBe(404);
    });

    it('rejects invalid task payload with missing title', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          description: 'No title provided',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Task Listing, Search & Combined Filters', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Task Alpha Frontend', priority: 'LOW', status: 'TODO' });

      await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Task Beta Backend API', priority: 'HIGH', status: 'IN_PROGRESS', assigneeId: memberUser.id });

      await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Task Gamma Database Migration', priority: 'HIGH', status: 'DONE' });
    });

    it('lists all tasks for authorized project members and viewers', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('filters tasks by status', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?status=IN_PROGRESS`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Task Beta Backend API');
    });

    it('filters tasks by priority', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?priority=HIGH`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters tasks by assigneeId', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?assigneeId=${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Task Beta Backend API');
    });

    it('applies combined filters (priority + search query)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?priority=HIGH&search=Backend`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Task Beta Backend API');
    });
  });

  describe('Status Transitions & Validation', () => {
    let taskId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Lifecycle Task', status: 'TODO', priority: 'MEDIUM', assigneeId: memberUser.id });
      taskId = res.body.data.id;
    });

    it('permits valid transition from TODO -> IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('permits valid sequence TODO -> IN_PROGRESS -> IN_REVIEW -> DONE -> IN_PROGRESS', async () => {
      const step1 = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(step1.status).toBe(200);
      expect(step1.body.data.status).toBe('IN_PROGRESS');

      const step2 = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'IN_REVIEW' });
      expect(step2.status).toBe(200);
      expect(step2.body.data.status).toBe('IN_REVIEW');

      const step3 = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'DONE' });
      expect(step3.status).toBe(200);
      expect(step3.body.data.status).toBe('DONE');

      const step4 = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(step4.status).toBe(200);
      expect(step4.body.data.status).toBe('IN_PROGRESS');
    });

    it('rejects invalid status transitions (e.g. BACKLOG -> DONE)', async () => {
      const backlogRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Backlog Item', status: 'BACKLOG' });
      const backlogId = backlogRes.body.data.id;

      const invalidRes = await request(app)
        .patch(`/api/v1/tasks/${backlogId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'DONE' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.success).toBe(false);
      expect(invalidRes.body.error.message).toContain('Invalid status transition');
    });

    it('forbids another regular MEMBER from transitioning status of a task they did not create or get assigned to', async () => {
      // memberUser created taskId; secondMemberUser attempts to change status
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${secondMemberToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('You do not have permission to change the status of this task');
    });

    it('rejects status change attempts by VIEWERS', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(403);
    });
  });

  describe('Task Editing, Reassignment & RBAC Boundaries', () => {
    let memberTaskId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Member Created Task', description: 'Original Description', priority: 'LOW' });
      memberTaskId = res.body.data.id;
    });

    it('fetches task details with creator and project info', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(memberTaskId);
      expect(res.body.data.title).toBe('Member Created Task');
      expect(res.body.data.creator.email).toBe(memberUser.email);
    });

    it('allows task creator to edit own task and reassign it to another member', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Updated Title by Creator',
          priority: 'URGENT',
          assigneeId: secondMemberUser.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title by Creator');
      expect(res.body.data.priority).toBe('URGENT');
      expect(res.body.data.assigneeId).toBe(secondMemberUser.id);
    });

    it('allows assigned member to edit their assigned task', async () => {
      // Reassign to secondMember
      await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ assigneeId: secondMemberUser.id });

      // secondMember edits the task
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${secondMemberToken}`)
        .send({ title: 'Updated by Assignee', description: 'Assignee notes added' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated by Assignee');
    });

    it('forbids an unassigned non-creator MEMBER from editing another member\'s task', async () => {
      // secondMemberUser attempts to edit memberUser's task
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${secondMemberToken}`)
        .send({ title: 'Tampered Title' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('You do not have permission to edit this task');
    });

    it('allows project ADMIN to edit any task in project', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Edited Task' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Admin Edited Task');
    });

    it('allows project OWNER to edit any task in project', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Owner Edited Task' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Owner Edited Task');
    });

    it('rejects attempts to change a task parent project', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          projectId: secondProjectId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Changing task parent project is not permitted');
    });

    it('rejects updating assignee to a non-project member', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${memberTaskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          assigneeId: outsiderUser.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('active member of this project');
    });
  });

  describe('Task Deletion & Role Permissions', () => {
    it('allows task creator to delete their own task', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Task to be deleted by creator' });
      const taskId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify task is gone
      const getRes = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.status).toBe(404);
    });

    it('allows project ADMIN or OWNER to delete a task created by another user', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Member Task' });
      const taskId = createRes.body.data.id;

      // Project Admin deletes member's task
      const adminDeleteRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDeleteRes.status).toBe(200);
      expect(adminDeleteRes.body.success).toBe(true);
    });

    it('forbids a regular MEMBER from deleting another member\'s task', async () => {
      // Owner creates task
      const createRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Owner Task' });
      const taskId = createRes.body.data.id;

      // Regular Member attempts deletion
      const deleteRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error.message).toContain('Only the task creator');
    });

    it('forbids a VIEWER from deleting tasks', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Task' });
      const taskId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(deleteRes.status).toBe(403);
    });
  });

  describe('Cross-Project & Cross-Workspace Isolation', () => {
    it('prevents accessing tasks from another project without permission (Anti-IDOR)', async () => {
      // Create task in second project
      const createRes = await request(app)
        .post(`/api/v1/projects/${secondProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Mobile Client Task' });
      const secondTaskId = createRes.body.data.id;

      // Outsider (not in second project) tries to access
      const accessRes = await request(app)
        .get(`/api/v1/tasks/${secondTaskId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(accessRes.status).toBe(404);
    });
  });
});
