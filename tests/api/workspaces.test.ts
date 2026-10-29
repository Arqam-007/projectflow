import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/api/src/app.js';
import { MemoryUserRepository, setUserRepository } from '../../apps/api/src/repositories/user.repository.js';
import { MemoryWorkspaceRepository, setWorkspaceRepository } from '../../apps/api/src/repositories/workspace.repository.js';
import { MemoryProjectRepository, setProjectRepository } from '../../apps/api/src/repositories/project.repository.js';

describe('Workspaces & RBAC API Integration Tests', () => {
  let userRepo: MemoryUserRepository;
  let workspaceRepo: MemoryWorkspaceRepository;
  let projectRepo: MemoryProjectRepository;

  let ownerToken: string;
  let ownerUser: { id: string; email: string; name: string };
  let adminToken: string;
  let adminUser: { id: string; email: string; name: string };
  let memberToken: string;
  let memberUser: { id: string; email: string; name: string };
  let outsiderToken: string;

  beforeEach(async () => {
    userRepo = new MemoryUserRepository();
    workspaceRepo = new MemoryWorkspaceRepository();
    projectRepo = new MemoryProjectRepository();

    setUserRepository(userRepo);
    setWorkspaceRepository(workspaceRepo);
    setProjectRepository(projectRepo);

    // Register test users
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@projectflow.dev',
      password: 'Password123!',
      name: 'Workspace Owner',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUser = ownerRes.body.data.user;

    const adminRes = await request(app).post('/api/v1/auth/register').send({
      email: 'admin@projectflow.dev',
      password: 'Password123!',
      name: 'Workspace Admin',
    });
    adminToken = adminRes.body.data.accessToken;
    adminUser = adminRes.body.data.user;

    const memberRes = await request(app).post('/api/v1/auth/register').send({
      email: 'member@projectflow.dev',
      password: 'Password123!',
      name: 'Regular Member',
    });
    memberToken = memberRes.body.data.accessToken;
    memberUser = memberRes.body.data.user;

    const outsiderRes = await request(app).post('/api/v1/auth/register').send({
      email: 'outsider@projectflow.dev',
      password: 'Password123!',
      name: 'Outsider User',
    });
    outsiderToken = outsiderRes.body.data.accessToken;
  });

  describe('POST /api/v1/workspaces', () => {
    it('creates a workspace with valid data and assigns creator as OWNER', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Acme Corporation',
          slug: 'acme-corp',
          description: 'Primary engineering workspace',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Corporation');
      expect(res.body.data.slug).toBe('acme-corp');
      expect(res.body.data.ownerId).toBe(ownerUser.id);

      // Verify creator is automatically listed as OWNER in members
      const membersRes = await request(app)
        .get(`/api/v1/workspaces/${res.body.data.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersRes.status).toBe(200);
      expect(membersRes.body.data.length).toBe(1);
      expect(membersRes.body.data[0].role).toBe('OWNER');
      expect(membersRes.body.data[0].userId).toBe(ownerUser.id);
    });

    it('rejects duplicate slug with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Acme Corp', slug: 'acme-corp' });

      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Duplicate Acme', slug: 'acme-corp' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .send({ name: 'Secret Workspace' });

      expect(res.status).toBe(401);
    });
  });

  describe('Workspace Membership & RBAC', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const ws = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'FinTech Hub', slug: 'fintech-hub' });
      workspaceId = ws.body.data.id;

      // Add Admin
      await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: adminUser.email, role: 'ADMIN' });

      // Add Member
      await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberUser.email, role: 'MEMBER' });
    });

    it('allows workspace members to view workspace details', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('FinTech Hub');
      expect(res.body.data.currentUserRole).toBe('MEMBER');
    });

    it('denies outsider from viewing private workspace (anti-IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(404); // Returns 404 to avoid leaking existence
    });

    it('prevents adding duplicate member with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: adminUser.email, role: 'ADMIN' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('allows Owner and Admin to update workspace details, but denies Member', async () => {
      // Admin can update
      const adminUpdate = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated by Admin' });

      expect(adminUpdate.status).toBe(200);

      // Member cannot update (403 Forbidden)
      const memberUpdate = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ description: 'Tampered by Member' });

      expect(memberUpdate.status).toBe(403);
      expect(memberUpdate.body.error.code).toBe('FORBIDDEN');
    });

    it('prevents Admin from deleting workspace (only Owner can delete)', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Owner to delete workspace', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);

      // Verify it is gone
      const checkRes = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(checkRes.status).toBe(404);
    });

    it('prevents removing the last remaining workspace owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('only remaining workspace owner');
    });
  });
});
