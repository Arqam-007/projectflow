/**
 * ProjectFlow Database Seeding Script
 *
 * Populates PostgreSQL with realistic, idempotent development data:
 * - 4 users with distinct roles (Owner, Admin, Member, Viewer)
 * - 1 organization workspace ("Acme Engineering")
 * - 2 projects ("Core Platform" [CORE], "Mobile Application" [MOB])
 * - Realistic tasks across all 5 statuses and 4 priority levels
 * - Associated activity log audit trail
 *
 * Safety Constraints:
 * - Refuses to run if NODE_ENV === 'production' unless explicitly forced.
 * - Idempotent: Can be run multiple times safely without duplicate key violations.
 * - Preserves existing user password hashes if users already exist.
 */

import { PrismaClient, Role, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Documented default password for all seeded development users
const SEED_PASSWORD_PLAIN = 'Password123!';
const BCRYPT_SALT_ROUNDS = 12;

export async function seedDatabase(options?: { nodeEnv?: string; forceProdSeed?: boolean }) {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const forceProdSeed = options?.forceProdSeed ?? (process.env.FORCE_PROD_SEED === 'true');

  // Safety guard: Protect production databases from accidental seed runs
  if (nodeEnv === 'production' && !forceProdSeed) {
    console.error(
      '[SEED ABORTED] Database seeding is disabled in production environments. ' +
        'Set FORCE_PROD_SEED="true" if you explicitly intend to seed production.'
    );
    throw new Error('SEED_ABORTED_IN_PRODUCTION');
  }

  console.log('[ProjectFlow Seed] Starting database seeding...');
  const passwordHash = await bcrypt.hash(SEED_PASSWORD_PLAIN, BCRYPT_SALT_ROUNDS);

  // 1. Seed Users (Upsert by unique email to ensure idempotency)
  const userData = [
    {
      email: 'alex.owner@projectflow.local',
      name: 'Alex Rivera',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80',
    },
    {
      email: 'sam.admin@projectflow.local',
      name: 'Sam Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&q=80',
    },
    {
      email: 'jordan.member@projectflow.local',
      name: 'Jordan Taylor',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80',
    },
    {
      email: 'taylor.viewer@projectflow.local',
      name: 'Taylor Smith',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&q=80',
    },
  ];

  const users: Record<string, { id: string; email: string; name: string }> = {};

  for (const u of userData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      users[u.email] = existing;
      console.log(`[Seed] User exists: ${u.email}`);
    } else {
      const created = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash,
          avatarUrl: u.avatarUrl,
        },
      });
      users[u.email] = created;
      console.log(`[Seed] User created: ${u.email}`);
    }
  }

  const alex = users['alex.owner@projectflow.local'];
  const sam = users['sam.admin@projectflow.local'];
  const jordan = users['jordan.member@projectflow.local'];
  const taylor = users['taylor.viewer@projectflow.local'];

  // 2. Seed Workspace ("Acme Engineering")
  let workspace = await prisma.workspace.findUnique({
    where: { slug: 'acme-eng' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Engineering',
        slug: 'acme-eng',
        description: 'Primary engineering organization and cross-functional sprint teams',
        ownerId: alex.id,
      },
    });
    console.log('[Seed] Workspace created: Acme Engineering (acme-eng)');
  } else {
    console.log('[Seed] Workspace exists: Acme Engineering (acme-eng)');
  }

  // Workspace Memberships
  const workspaceMemberships = [
    { userId: alex.id, role: Role.OWNER },
    { userId: sam.id, role: Role.ADMIN },
    { userId: jordan.id, role: Role.MEMBER },
    { userId: taylor.id, role: Role.VIEWER },
  ];

  for (const m of workspaceMemberships) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: m.userId,
        },
      },
      update: { role: m.role },
      create: {
        workspaceId: workspace.id,
        userId: m.userId,
        role: m.role,
      },
    });
  }

  // 3. Seed Projects
  // Project A: Core Platform (CORE)
  let coreProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: 'CORE' },
  });

  if (!coreProject) {
    coreProject = await prisma.project.create({
      data: {
        name: 'Core Platform',
        key: 'CORE',
        description: 'Next-generation distributed workflow orchestration and core API services',
        status: ProjectStatus.ACTIVE,
        workspaceId: workspace.id,
        ownerId: alex.id,
      },
    });
    console.log('[Seed] Project created: Core Platform (CORE)');
  } else {
    console.log('[Seed] Project exists: Core Platform (CORE)');
  }

  // Project B: Mobile Application (MOB)
  let mobProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: 'MOB' },
  });

  if (!mobProject) {
    mobProject = await prisma.project.create({
      data: {
        name: 'Mobile Application',
        key: 'MOB',
        description: 'React Native mobile companion app for iOS and Android',
        status: ProjectStatus.ACTIVE,
        workspaceId: workspace.id,
        ownerId: sam.id,
      },
    });
    console.log('[Seed] Project created: Mobile Application (MOB)');
  } else {
    console.log('[Seed] Project exists: Mobile Application (MOB)');
  }

  // Project Memberships
  const coreMembers = [
    { projectId: coreProject.id, userId: alex.id, role: Role.OWNER },
    { projectId: coreProject.id, userId: sam.id, role: Role.ADMIN },
    { projectId: coreProject.id, userId: jordan.id, role: Role.MEMBER },
    { projectId: coreProject.id, userId: taylor.id, role: Role.VIEWER },
  ];

  for (const cm of coreMembers) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: cm.projectId,
          userId: cm.userId,
        },
      },
      update: { role: cm.role },
      create: {
        projectId: cm.projectId,
        userId: cm.userId,
        role: cm.role,
      },
    });
  }

  const mobMembers = [
    { projectId: mobProject.id, userId: sam.id, role: Role.OWNER },
    { projectId: mobProject.id, userId: jordan.id, role: Role.MEMBER },
  ];

  for (const mm of mobMembers) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: mm.projectId,
          userId: mm.userId,
        },
      },
      update: { role: mm.role },
      create: {
        projectId: mm.projectId,
        userId: mm.userId,
        role: mm.role,
      },
    });
  }

  // 4. Seed Tasks in Core Platform (CORE)
  const now = new Date();
  const pastDue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago (overdue)
  const upcomingSoon = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // tomorrow
  const upcomingSprint = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days out

  const coreTasks = [
    {
      taskNumber: 1,
      title: 'Architect distributed state store and database repository abstractions',
      description: 'Define clean repository contracts with dual-engine persistence (Prisma PostgreSQL and sandbox memory adapters).',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      creatorId: alex.id,
      assigneeId: alex.id,
      dueDate: pastDue,
      orderIndex: 0,
    },
    {
      taskNumber: 2,
      title: 'Implement JWT authentication guards and sliding-window rate limiting',
      description: 'Enforce stateless JWT validation, bcrypt password hashing, tokenVersion invalidation, and brute-force protection.',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      creatorId: alex.id,
      assigneeId: sam.id,
      dueDate: pastDue,
      orderIndex: 1,
    },
    {
      taskNumber: 3,
      title: 'Build interactive Kanban board and status transition state machine',
      description: 'Implement drag-and-drop board with strict backend validation preventing arbitrary workflow state jumps.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      creatorId: sam.id,
      assigneeId: jordan.id,
      dueDate: upcomingSprint,
      orderIndex: 0,
    },
    {
      taskNumber: 4,
      title: 'PostgreSQL concurrency row-locking audit and taskNumber uniqueness',
      description: 'Verify SELECT FOR UPDATE project row locking under high concurrency to prevent duplicate task keys.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.URGENT,
      creatorId: alex.id,
      assigneeId: sam.id,
      dueDate: upcomingSoon,
      orderIndex: 0,
    },
    {
      taskNumber: 5,
      title: 'Refactor executive analytics aggregations and date boundaries',
      description: 'Compute status distributions, completion rates, and strict overdue checks excluding completed items.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      creatorId: sam.id,
      assigneeId: jordan.id,
      dueDate: upcomingSprint,
      orderIndex: 0,
    },
    {
      taskNumber: 6,
      title: 'Evaluate background asynchronous worker queues for email notifications',
      description: 'Assess Redis/BullMQ or native PostgreSQL LISTEN/NOTIFY patterns for event-driven asynchronous processing.',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.LOW,
      creatorId: alex.id,
      assigneeId: null,
      dueDate: null,
      orderIndex: 0,
    },
    {
      taskNumber: 7,
      title: 'Audit compliance with past-due operational SLA boundaries',
      description: 'Demonstrates overdue task calculation and executive dashboard attention callouts.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      creatorId: alex.id,
      assigneeId: jordan.id,
      dueDate: pastDue,
      orderIndex: 1,
    },
  ];

  for (const t of coreTasks) {
    const existing = await prisma.task.findUnique({
      where: {
        projectId_taskNumber: {
          projectId: coreProject.id,
          taskNumber: t.taskNumber,
        },
      },
    });

    if (!existing) {
      const task = await prisma.task.create({
        data: {
          projectId: coreProject.id,
          taskNumber: t.taskNumber,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          creatorId: t.creatorId,
          assigneeId: t.assigneeId,
          dueDate: t.dueDate,
          orderIndex: t.orderIndex,
        },
      });

      // Seed corresponding audit trail entry
      await prisma.activityLog.create({
        data: {
          projectId: coreProject.id,
          workspaceId: workspace.id,
          userId: t.creatorId,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: task.id,
          details: {
            taskNumber: t.taskNumber,
            key: `CORE-${t.taskNumber}`,
            title: t.title,
            status: t.status,
            priority: t.priority,
          },
        },
      });
      console.log(`[Seed] Task created: CORE-${t.taskNumber}`);
    } else {
      console.log(`[Seed] Task exists: CORE-${t.taskNumber}`);
    }
  }

  // 5. Seed Tasks in Mobile Application (MOB)
  const mobTasks = [
    {
      taskNumber: 1,
      title: 'Setup Expo push notification channels and APNs/FCM credentials',
      description: 'Configure mobile push notification routing for assigned task reminders.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      creatorId: sam.id,
      assigneeId: sam.id,
      dueDate: upcomingSprint,
      orderIndex: 0,
    },
    {
      taskNumber: 2,
      title: 'Dark mode color token palette refinement in Tailwind theme',
      description: 'Ensure slate-900 contrast ratios satisfy WCAG AAA standards on OLED screens.',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      creatorId: sam.id,
      assigneeId: jordan.id,
      dueDate: pastDue,
      orderIndex: 0,
    },
  ];

  for (const mt of mobTasks) {
    const existing = await prisma.task.findUnique({
      where: {
        projectId_taskNumber: {
          projectId: mobProject.id,
          taskNumber: mt.taskNumber,
        },
      },
    });

    if (!existing) {
      const task = await prisma.task.create({
        data: {
          projectId: mobProject.id,
          taskNumber: mt.taskNumber,
          title: mt.title,
          description: mt.description,
          status: mt.status,
          priority: mt.priority,
          creatorId: mt.creatorId,
          assigneeId: mt.assigneeId,
          dueDate: mt.dueDate,
          orderIndex: mt.orderIndex,
        },
      });

      await prisma.activityLog.create({
        data: {
          projectId: mobProject.id,
          workspaceId: workspace.id,
          userId: mt.creatorId,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: task.id,
          details: {
            taskNumber: mt.taskNumber,
            key: `MOB-${mt.taskNumber}`,
            title: mt.title,
          },
        },
      });
      console.log(`[Seed] Task created: MOB-${mt.taskNumber}`);
    } else {
      console.log(`[Seed] Task exists: MOB-${mt.taskNumber}`);
    }
  }

  console.log('\n=============================================================');
  console.log(' [ProjectFlow] Database Seeding Completed Successfully');
  console.log('=============================================================');
  console.log(' Available Seeded Test Accounts (Password: Password123!):');
  console.log('  1. alex.owner@projectflow.local   (Role: Workspace & Project OWNER)');
  console.log('  2. sam.admin@projectflow.local     (Role: ADMIN)');
  console.log('  3. jordan.member@projectflow.local (Role: MEMBER)');
  console.log('  4. taylor.viewer@projectflow.local (Role: VIEWER)');
  console.log(' Sample Workspace: Acme Engineering (slug: acme-eng)');
  console.log(' Sample Projects:  Core Platform (CORE), Mobile Application (MOB)');
  console.log('=============================================================\n');
}

// Direct CLI invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .catch((err) => {
      console.error('[ProjectFlow Seed Error]', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
