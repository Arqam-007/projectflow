import type { Role, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';
import { fallbackMemoryUserRepo, type UserRecord } from '../repositories/user.repository.js';
import { fallbackMemoryWorkspaceRepo, type WorkspaceRecord, type WorkspaceMemberRecord } from '../repositories/workspace.repository.js';
import { fallbackMemoryProjectRepo, type ProjectRecord, type ProjectMemberRecord } from '../repositories/project.repository.js';
import { fallbackMemoryTaskRepo, type TaskRecord } from '../repositories/task.repository.js';
import { fallbackMemoryActivityRepo, type ActivityRecord } from '../repositories/activity.repository.js';

// Precomputed bcrypt hash for 'Password123!' with 10 salt rounds
const PASSWORD_HASH = '$2b$10$2wkiAs7yJPb/zIzuJdzMKuW5wi7wbRrLVYtZGYrHZyf1HSmoQvQT2';

let isSeeded = false;

export async function seedSandboxMemory(): Promise<void> {
  if (isSeeded) return;
  isSeeded = true;

  console.log('[ProjectFlow Sandbox] Populating in-memory development store with seed data...');

  const now = new Date();

  // 1. Seed 4 Users (matching Milestone 6 specifications)
  const users: UserRecord[] = [
    {
      id: 'usr_alex_owner',
      email: 'alex.owner@projectflow.local',
      name: 'Alex Rivera',
      passwordHash: PASSWORD_HASH,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80',
      tokenVersion: 0,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: now,
    },
    {
      id: 'usr_sam_admin',
      email: 'sam.admin@projectflow.local',
      name: 'Sam Chen',
      passwordHash: PASSWORD_HASH,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&q=80',
      tokenVersion: 0,
      createdAt: new Date(Date.now() - 25 * 86400000),
      updatedAt: now,
    },
    {
      id: 'usr_jordan_member',
      email: 'jordan.member@projectflow.local',
      name: 'Jordan Taylor',
      passwordHash: PASSWORD_HASH,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80',
      tokenVersion: 0,
      createdAt: new Date(Date.now() - 20 * 86400000),
      updatedAt: now,
    },
    {
      id: 'usr_taylor_viewer',
      email: 'taylor.viewer@projectflow.local',
      name: 'Taylor Smith',
      passwordHash: PASSWORD_HASH,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&q=80',
      tokenVersion: 0,
      createdAt: new Date(Date.now() - 15 * 86400000),
      updatedAt: now,
    },
  ];

  for (const u of users) {
    fallbackMemoryUserRepo.seedUser(u);
  }

  // 2. Seed Acme Engineering Workspace
  const workspaceId = 'ws_default_preview';
  const workspace: WorkspaceRecord = {
    id: workspaceId,
    name: 'Acme Engineering',
    slug: 'acme-engineering',
    description: 'Enterprise workflow systems and cloud infrastructure engineering',
    ownerId: 'usr_alex_owner',
    createdAt: new Date(Date.now() - 30 * 86400000),
    updatedAt: now,
  };

  const wsMembers: WorkspaceMemberRecord[] = [
    { id: 'wsm_1', workspaceId, userId: 'usr_alex_owner', role: 'OWNER' as Role, joinedAt: new Date(Date.now() - 30 * 86400000) },
    { id: 'wsm_2', workspaceId, userId: 'usr_sam_admin', role: 'ADMIN' as Role, joinedAt: new Date(Date.now() - 25 * 86400000) },
    { id: 'wsm_3', workspaceId, userId: 'usr_jordan_member', role: 'MEMBER' as Role, joinedAt: new Date(Date.now() - 20 * 86400000) },
    { id: 'wsm_4', workspaceId, userId: 'usr_taylor_viewer', role: 'VIEWER' as Role, joinedAt: new Date(Date.now() - 15 * 86400000) },
  ];

  fallbackMemoryWorkspaceRepo.seedWorkspace(workspace, wsMembers);

  // 3. Seed Projects (Core Platform & Mobile App)
  const coreProjectId = 'prj_core_platform';
  const coreProject: ProjectRecord = {
    id: coreProjectId,
    name: 'Core Platform',
    key: 'CORE',
    description: 'Distributed microservices, authentication security, and real-time event pipeline',
    status: 'ACTIVE' as ProjectStatus,
    workspaceId,
    ownerId: 'usr_alex_owner',
    createdAt: new Date(Date.now() - 28 * 86400000),
    updatedAt: now,
  };

  const mobProjectId = 'prj_mobile_app';
  const mobProject: ProjectRecord = {
    id: mobProjectId,
    name: 'Mobile Application',
    key: 'MOB',
    description: 'Native cross-platform mobile client for workflow execution and offline sync',
    status: 'ACTIVE' as ProjectStatus,
    workspaceId,
    ownerId: 'usr_alex_owner',
    createdAt: new Date(Date.now() - 20 * 86400000),
    updatedAt: now,
  };

  const projectMembersList: ProjectMemberRecord[] = [
    { id: 'prm_1', projectId: coreProjectId, userId: 'usr_alex_owner', role: 'OWNER' as Role, joinedAt: now },
    { id: 'prm_2', projectId: coreProjectId, userId: 'usr_sam_admin', role: 'ADMIN' as Role, joinedAt: now },
    { id: 'prm_3', projectId: coreProjectId, userId: 'usr_jordan_member', role: 'MEMBER' as Role, joinedAt: now },
    { id: 'prm_4', projectId: coreProjectId, userId: 'usr_taylor_viewer', role: 'VIEWER' as Role, joinedAt: now },
    { id: 'prm_5', projectId: mobProjectId, userId: 'usr_alex_owner', role: 'OWNER' as Role, joinedAt: now },
    { id: 'prm_6', projectId: mobProjectId, userId: 'usr_sam_admin', role: 'ADMIN' as Role, joinedAt: now },
    { id: 'prm_7', projectId: mobProjectId, userId: 'usr_jordan_member', role: 'MEMBER' as Role, joinedAt: now },
  ];

  fallbackMemoryProjectRepo.seedProject(coreProject, projectMembersList.filter(m => m.projectId === coreProjectId));
  fallbackMemoryProjectRepo.seedProject(mobProject, projectMembersList.filter(m => m.projectId === mobProjectId));

  // 4. Seed Tasks across all 5 statuses
  const tasks: TaskRecord[] = [
    {
      id: 'tsk_core_1',
      taskNumber: 1,
      title: 'Configure distributed rate-limiter with Redis fallback',
      description: 'Implement token-bucket algorithm with consistent 429 Retry-After headers across all auth endpoints.',
      status: 'DONE' as TaskStatus,
      priority: 'HIGH' as TaskPriority,
      dueDate: new Date(Date.now() - 2 * 86400000),
      orderIndex: 0,
      projectId: coreProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_alex_owner',
      createdAt: new Date(Date.now() - 10 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_core_2',
      taskNumber: 2,
      title: 'Implement structured logging with request correlation IDs',
      description: 'Emit JSON logs with X-Request-ID propagation to trace distributed requests across microservices.',
      status: 'IN_REVIEW' as TaskStatus,
      priority: 'MEDIUM' as TaskPriority,
      dueDate: new Date(Date.now() + 3 * 86400000),
      orderIndex: 0,
      projectId: coreProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_sam_admin',
      createdAt: new Date(Date.now() - 8 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_core_3',
      taskNumber: 3,
      title: 'Automate PostgreSQL migration health checks in CI pipeline',
      description: 'Run Prisma test deploy migrations and verify foreign-key cascade integrity before deploying image.',
      status: 'IN_PROGRESS' as TaskStatus,
      priority: 'URGENT' as TaskPriority,
      dueDate: new Date(Date.now() + 1 * 86400000),
      orderIndex: 0,
      projectId: coreProjectId,
      creatorId: 'usr_sam_admin',
      assigneeId: 'usr_jordan_member',
      createdAt: new Date(Date.now() - 5 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_core_4',
      taskNumber: 4,
      title: 'Design interactive Kanban board transitions & drag-and-drop',
      description: 'Build responsive 4-column board with optimistic UI updates and state transition enforcement.',
      status: 'TODO' as TaskStatus,
      priority: 'MEDIUM' as TaskPriority,
      dueDate: new Date(Date.now() + 5 * 86400000),
      orderIndex: 0,
      projectId: coreProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_jordan_member',
      createdAt: new Date(Date.now() - 4 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_core_5',
      taskNumber: 5,
      title: 'Audit role-based access control matrix across workspace scopes',
      description: 'Verify Owner, Admin, Member, and Viewer permissions with unit and integration test coverage.',
      status: 'TODO' as TaskStatus,
      priority: 'HIGH' as TaskPriority,
      dueDate: new Date(Date.now() + 7 * 86400000),
      orderIndex: 1,
      projectId: coreProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_alex_owner',
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_core_6',
      taskNumber: 6,
      title: 'Benchmark database index query latency under heavy write volume',
      description: 'Analyze composite index performance on (projectId, taskNumber) and (workspaceId, createdAt).',
      status: 'BACKLOG' as TaskStatus,
      priority: 'LOW' as TaskPriority,
      dueDate: null,
      orderIndex: 0,
      projectId: coreProjectId,
      creatorId: 'usr_sam_admin',
      assigneeId: 'usr_sam_admin',
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: now,
    },
    // Mobile tasks
    {
      id: 'tsk_mob_1',
      taskNumber: 1,
      title: 'Implement offline SQLite cache and sync coordinator',
      description: 'Sync local delta mutations with server activities via exponential backoff reconnects.',
      status: 'IN_PROGRESS' as TaskStatus,
      priority: 'HIGH' as TaskPriority,
      dueDate: new Date(Date.now() + 4 * 86400000),
      orderIndex: 0,
      projectId: mobProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_jordan_member',
      createdAt: new Date(Date.now() - 7 * 86400000),
      updatedAt: now,
    },
    {
      id: 'tsk_mob_2',
      taskNumber: 2,
      title: 'Authenticate users via biometrics and refresh tokens',
      description: 'Store securely in iOS Keychain and Android Keystore with 15m access token rotation.',
      status: 'TODO' as TaskStatus,
      priority: 'MEDIUM' as TaskPriority,
      dueDate: new Date(Date.now() + 9 * 86400000),
      orderIndex: 0,
      projectId: mobProjectId,
      creatorId: 'usr_alex_owner',
      assigneeId: 'usr_sam_admin',
      createdAt: new Date(Date.now() - 5 * 86400000),
      updatedAt: now,
    },
  ];

  for (const t of tasks) {
    fallbackMemoryTaskRepo.seedTask(t);
  }

  // 5. Seed Activities for Audit Trail
  const activities: ActivityRecord[] = [
    {
      id: 'act_1',
      workspaceId,
      projectId: coreProjectId,
      userId: 'usr_alex_owner',
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: 'tsk_core_5',
      details: { title: 'Audit role-based access control matrix across workspace scopes', priority: 'HIGH' },
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: 'act_2',
      workspaceId,
      projectId: coreProjectId,
      userId: 'usr_sam_admin',
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: 'tsk_core_3',
      details: { fromStatus: 'TODO', toStatus: 'IN_PROGRESS', title: 'Automate PostgreSQL migration health checks in CI pipeline' },
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 'act_3',
      workspaceId,
      projectId: coreProjectId,
      userId: 'usr_alex_owner',
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: 'tsk_core_1',
      details: { fromStatus: 'IN_REVIEW', toStatus: 'DONE', title: 'Configure distributed rate-limiter with Redis fallback' },
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 'act_4',
      workspaceId,
      projectId: mobProjectId,
      userId: 'usr_jordan_member',
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: 'tsk_mob_1',
      details: { title: 'Implement offline SQLite cache and sync coordinator', priority: 'HIGH' },
      createdAt: new Date(Date.now() - 7 * 86400000),
    },
  ];

  for (const a of activities) {
    fallbackMemoryActivityRepo.seedActivity(a);
  }

  console.log('[ProjectFlow Sandbox] In-memory store successfully initialized with seed data.');
}
