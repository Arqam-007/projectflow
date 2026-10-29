import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';

describe('Project Management & Membership API Integration Tests', () => {
  let userRepo: MemoryUserRepository;
  let workspaceRepo: MemoryWorkspaceRepository;
  let projectRepo: MemoryProjectRepository;

  let ownerToken: string;
  let ownerUser: { id: string; email: string; name: string };
  let memberToken: string;
  let memberUser: { id: string; email: string; name: string };
  let outsiderToken: string;

  let workspaceId: string;
  let secondWorkspaceId: string;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    workspaceRepo = new MemoryWorkspaceRepository();
    projectRepo = new MemoryProjectRepository();

    setUserRepository(userRepo);
    setWorkspaceRepository(workspaceRepo);
    setProjectRepository(projectRepo);

    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'p_owner@projectflow.dev',
      password: 'Password123!',
      name: 'Project Owner',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUser = ownerRes.body.data.user;

    const memberRes = await request(app).post('/api/v1/auth/register').send({
      email: 'p_member@projectflow.dev',
      password: 'Password123!',
      name: 'Project Member',
    });
    memberToken = memberRes.body.data.accessToken;
    memberUser = memberRes.body.data.user;

    const outsiderRes = await request(app).post('/api/v1/auth/register').send({
      email: 'p_outsider@projectflow.dev',
      password: 'Password123!',
      name: 'Project Outsider',
    });
    outsiderToken = outsiderRes.body.data.accessToken;

    // Create primary workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Alpha Studio', slug: 'alpha-studio' });
    workspaceId = wsRes.body.data.id;

    // Add member to primary workspace
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // Create second isolated workspace
    const secondWs = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ name: 'Beta Labs', slug: 'beta-labs' });
    secondWorkspaceId = secondWs.body.data.id;
  });

  describe('Project CRUD in Workspace', () => {
    it('creates project with uppercase key and assigns creator as project OWNER', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Mobile Banking App',
          key: 'mba',
          description: 'Next-gen iOS & Android app',
          status: 'ACTIVE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Mobile Banking App');
      expect(res.body.data.key).toBe('MBA');
      expect(res.body.data.workspaceId).toBe(workspaceId);
      expect(res.body.data.ownerId).toBe(ownerUser.id);

      // Verify creator is listed as OWNER in project members
      const membersRes = await request(app)
        .get(`/api/v1/projects/${res.body.data.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersRes.status).toBe(200);
      expect(membersRes.body.data[0].role).toBe('OWNER');
    });

    it('prevents duplicate project keys within the same workspace', async () => {
      await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Project One', key: 'PRJ' });

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Project Two', key: 'PRJ' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('denies outsider from creating project in another workspace', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ name: 'Hacked Project', key: 'HCK' });

      expect(res.status).toBe(404); // Not found for unauthorized workspace
    });
  });

  describe('Project Membership & Access Control', () => {
    let projectId: string;

    beforeEach(async () => {
      const p = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Cloud Infrastructure', key: 'INFRA' });
      projectId = p.body.data.id;

      // Add member to project with role MEMBER
      await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberUser.email, role: 'MEMBER' });
    });

    it('allows project member to view project details', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('INFRA');
      expect(res.body.data.currentUserRole).toBe('MEMBER');
    });

    it('denies member from updating project status (only Owner and Admin)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'ARCHIVED' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Owner to update project details', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Cloud Infra & DevOps', status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Cloud Infra & DevOps');
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('prevents non-owner from deleting project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('allows Owner to delete project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('deleted');

      const check = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(check.status).toBe(404);
    });

    it('prevents cross-workspace IDOR access', async () => {
      // Outsider belongs to secondWorkspaceId, trying to view projectId in workspaceId
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(404);
    });

    it('prevents removing the last remaining project owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('only remaining project owner');
    });
  });
});
