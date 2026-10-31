/**
 * Real PostgreSQL Integration Test Suite
 *
 * Requirements:
 * - Runs exclusively against a dedicated test database (TEST_DATABASE_URL).
 * - Never modifies development or production databases.
 * - Fails clearly when PostgreSQL is unavailable without falling back to memory.
 * - Covers persistence, concurrency, atomic activity logging, foreign key cascades,
 *   analytics/filtering, and tenant isolation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, TaskStatus, TaskPriority, Role } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/projectflow_test?schema=public';

// Strict safety check: Must NEVER run against non-test databases!
if (!testDbUrl.includes('test')) {
  throw new Error(
    `[SAFETY CHECK FAILED] Refusing to run integration tests against non-test database: ${testDbUrl}`
  );
}

describe('PostgreSQL Real Integration Tests', () => {
  let prisma: PrismaClient;
  let isConnected = false;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
      log: ['error'],
    });

    try {
      // Direct raw query to verify PostgreSQL connectivity
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1 as connected`;
      isConnected = true;
    } catch (err) {
      throw new Error(
        `[POSTGRES UNAVAILABLE] Could not connect to PostgreSQL test database at "${testDbUrl}". ` +
          `PostgreSQL integration tests require a live database. ` +
          `To run locally: ensure Docker is running ('docker compose up -d') and run 'npm run prisma:test:deploy'. ` +
          `Original error: ${(err as Error).message}`
      );
    }
  });

  afterAll(async () => {
    if (prisma) {
      if (isConnected) {
        // Clean up test tables in reverse dependency order
        try {
          await prisma.activityLog.deleteMany({});
          await prisma.task.deleteMany({});
          await prisma.projectMember.deleteMany({});
          await prisma.project.deleteMany({});
          await prisma.workspaceMember.deleteMany({});
          await prisma.workspace.deleteMany({});
          await prisma.user.deleteMany({});
        } catch {
          // Ignore cleanup errors during shutdown
        }
      }
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clear test database tables before each test for complete test isolation
    await prisma.activityLog.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('1. verifies task persistence across client recreation (server restart simulation)', async () => {
    // Phase 1: Insert records with client instance 1
    const user = await prisma.user.create({
      data: {
        email: 'restart-test@projectflow.local',
        name: 'Restart Tester',
        passwordHash: 'argon2-or-bcrypt-hash-sample',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Restart WS',
        slug: 'restart-ws',
        ownerId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Persistence Project',
        key: 'PERSIST',
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });

    const createdTask = await prisma.task.create({
      data: {
        taskNumber: 1,
        title: 'Persisted Task across Restarts',
        description: 'Verifying data remains in PostgreSQL',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        projectId: project.id,
        creatorId: user.id,
        dueDate: new Date('2026-12-31T23:59:59.000Z'),
      },
    });

    // Simulate server shutdown: disconnect client 1
    await prisma.$disconnect();

    // Phase 2: Simulate server boot: initialize fresh client instance 2
    const freshPrisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });

    try {
      const retrievedTask = await freshPrisma.task.findUnique({
        where: { id: createdTask.id },
        include: { project: true, creator: true },
      });

      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask?.title).toBe('Persisted Task across Restarts');
      expect(retrievedTask?.taskNumber).toBe(1);
      expect(retrievedTask?.priority).toBe(TaskPriority.HIGH);
      expect(retrievedTask?.project.key).toBe('PERSIST');
      expect(retrievedTask?.creator.email).toBe('restart-test@projectflow.local');
    } finally {
      await freshPrisma.$disconnect();
      // Reconnect original client for subsequent tests
      await prisma.$connect();
    }
  });

  it('2. guarantees concurrent task creation produces unique, sequential task numbers', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'concurrency@projectflow.local',
        name: 'Concurrency Tester',
        passwordHash: 'dummy-hash',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Concurrency WS',
        slug: 'concurrency-ws',
        ownerId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Concurrency Project',
        key: 'CONC',
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });

    // Simulate 5 concurrent task creations using the ProjectFlow row-lock transaction strategy
    const createTaskConcurrently = async (title: string) => {
      return prisma.$transaction(async (tx) => {
        // Lock the parent project row to serialize taskNumber generation
        await tx.$executeRaw`SELECT id FROM "projects" WHERE id = ${project.id} FOR UPDATE`;

        const count = await tx.task.count({
          where: { projectId: project.id },
        });
        const nextNumber = count + 1;

        return tx.task.create({
          data: {
            taskNumber: nextNumber,
            title,
            projectId: project.id,
            creatorId: user.id,
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
          },
        });
      });
    };

    const taskTitles = ['Task Alpha', 'Task Beta', 'Task Gamma', 'Task Delta', 'Task Epsilon'];
    const results = await Promise.all(taskTitles.map((t) => createTaskConcurrently(t)));

    const generatedNumbers = results.map((t) => t.taskNumber).sort((a, b) => a - b);
    expect(generatedNumbers).toEqual([1, 2, 3, 4, 5]);

    // Verify composite unique constraint @@unique([projectId, taskNumber]) at PostgreSQL level
    let duplicateRejected = false;
    try {
      await prisma.task.create({
        data: {
          taskNumber: 1, // Intentional duplicate
          title: 'Duplicate Collision Task',
          projectId: project.id,
          creatorId: user.id,
        },
      });
    } catch (err: unknown) {
      duplicateRejected = true;
      // Prisma P2002 corresponds to PostgreSQL unique violation (code 23505)
      expect(String(err)).toContain('Unique constraint failed');
    }
    expect(duplicateRejected).toBe(true);
  });

  it('3. verifies atomic activity-log persistence and transaction rollback', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'activity@projectflow.local',
        name: 'Activity Tester',
        passwordHash: 'dummy-hash',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Activity WS',
        slug: 'activity-ws',
        ownerId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Activity Project',
        key: 'ACT',
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });

    // Successful atomic operation: task + activity log
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          taskNumber: 1,
          title: 'Audited Task',
          projectId: project.id,
          creatorId: user.id,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: project.id,
          workspaceId: workspace.id,
          userId: user.id,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: task.id,
          details: {
            taskNumber: 1,
            title: 'Audited Task',
            // Sensitive fields stripped
          },
        },
      });
    });

    const savedLog = await prisma.activityLog.findFirst({
      where: { projectId: project.id },
    });
    expect(savedLog).not.toBeNull();
    expect(savedLog?.action).toBe('TASK_CREATED');
    expect(savedLog?.workspaceId).toBe(workspace.id);

    // Rollback test: If a subsequent step in transaction throws, neither task nor log is saved
    let txFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const abortedTask = await tx.task.create({
          data: {
            taskNumber: 2,
            title: 'Will Be Rolled Back',
            projectId: project.id,
            creatorId: user.id,
          },
        });

        await tx.activityLog.create({
          data: {
            projectId: project.id,
            workspaceId: workspace.id,
            userId: user.id,
            action: 'TASK_CREATED',
            entityType: 'TASK',
            entityId: abortedTask.id,
            details: { title: 'Will Be Rolled Back' },
          },
        });

        // Intentional failure simulating validation or system crash
        throw new Error('Simulated transaction abortion');
      });
    } catch {
      txFailed = true;
    }

    expect(txFailed).toBe(true);

    // Verify task 2 was NOT persisted
    const rolledBackTask = await prisma.task.findFirst({
      where: { projectId: project.id, taskNumber: 2 },
    });
    expect(rolledBackTask).toBeNull();

    // Verify no second activity log was persisted
    const totalLogs = await prisma.activityLog.count({
      where: { projectId: project.id },
    });
    expect(totalLogs).toBe(1);
  });

  it('4. enforces foreign-key integrity, restrict rules, and cascade deletions', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'fk-test@projectflow.local',
        name: 'FK Tester',
        passwordHash: 'dummy-hash',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Cascade WS',
        slug: 'cascade-ws',
        ownerId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Cascade Project',
        key: 'CAS',
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });

    const task = await prisma.task.create({
      data: {
        taskNumber: 1,
        title: 'Cascade Task',
        projectId: project.id,
        creatorId: user.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        workspaceId: workspace.id,
        userId: user.id,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: task.id,
      },
    });

    // 4a. Foreign Key Constraint: Inserting task with invalid projectId fails
    let invalidFkCaught = false;
    try {
      await prisma.task.create({
        data: {
          taskNumber: 99,
          title: 'Orphan Task',
          projectId: 'non-existent-project-id',
          creatorId: user.id,
        },
      });
    } catch (err: unknown) {
      invalidFkCaught = true;
      expect(String(err)).toContain('Foreign key constraint failed');
    }
    expect(invalidFkCaught).toBe(true);

    // 4b. Restrict Constraint: Deleting creator user is prevented by ON DELETE RESTRICT
    let restrictCaught = false;
    try {
      await prisma.user.delete({
        where: { id: user.id },
      });
    } catch (err: unknown) {
      restrictCaught = true;
      expect(String(err)).toContain('Foreign key constraint failed');
    }
    expect(restrictCaught).toBe(true);

    // 4c. Cascade Delete: Deleting workspace cascades down to project, tasks, and activity logs
    await prisma.workspace.delete({
      where: { id: workspace.id },
    });

    const remainingProjects = await prisma.project.count({ where: { id: project.id } });
    const remainingTasks = await prisma.task.count({ where: { id: task.id } });
    const remainingLogs = await prisma.activityLog.count({ where: { projectId: project.id } });

    expect(remainingProjects).toBe(0);
    expect(remainingTasks).toBe(0);
    expect(remainingLogs).toBe(0);
  });

  it('5. performs analytics calculations and advanced filtering against actual PostgreSQL', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'analytics@projectflow.local',
        name: 'Analytics Tester',
        passwordHash: 'dummy-hash',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Analytics WS',
        slug: 'analytics-ws',
        ownerId: user.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'Analytics Project',
        key: 'ANL',
        workspaceId: workspace.id,
        ownerId: user.id,
      },
    });

    // Create 4 distinct tasks
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future

    // Task 1: TODO, HIGH priority, overdue
    await prisma.task.create({
      data: {
        taskNumber: 1,
        title: 'Task 1 - Urgent Todo',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: pastDate,
        projectId: project.id,
        creatorId: user.id,
      },
    });

    // Task 2: IN_PROGRESS, MEDIUM priority, upcoming
    await prisma.task.create({
      data: {
        taskNumber: 2,
        title: 'Task 2 - In Flight',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: futureDate,
        projectId: project.id,
        creatorId: user.id,
      },
    });

    // Task 3: DONE, LOW priority, past due date (should NOT count as overdue!)
    await prisma.task.create({
      data: {
        taskNumber: 3,
        title: 'Task 3 - Finished Past Due',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        dueDate: pastDate,
        projectId: project.id,
        creatorId: user.id,
      },
    });

    // Task 4: DONE, HIGH priority, future due date
    await prisma.task.create({
      data: {
        taskNumber: 4,
        title: 'Task 4 - Finished Ahead',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: futureDate,
        projectId: project.id,
        creatorId: user.id,
      },
    });

    // Database Aggregation: Group by Status
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: project.id },
      _count: { _all: true },
    });

    const countsMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count._all])
    );

    expect(countsMap[TaskStatus.TODO]).toBe(1);
    expect(countsMap[TaskStatus.IN_PROGRESS]).toBe(1);
    expect(countsMap[TaskStatus.DONE]).toBe(2);

    const totalTasks = await prisma.task.count({ where: { projectId: project.id } });
    const completedTasks = countsMap[TaskStatus.DONE] || 0;
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    expect(completionRate).toBe(50); // 2 of 4 = 50%

    // Overdue query against PostgreSQL: status != DONE AND dueDate < now
    const overdueCount = await prisma.task.count({
      where: {
        projectId: project.id,
        status: { not: TaskStatus.DONE },
        dueDate: { lt: new Date() },
      },
    });
    // Crucial check: Only Task 1 is overdue; Task 3 is DONE so excluded!
    expect(overdueCount).toBe(1);

    // Advanced filtering: Filter by priority = HIGH
    const highTasks = await prisma.task.findMany({
      where: { projectId: project.id, priority: TaskPriority.HIGH },
      orderBy: [{ taskNumber: 'asc' }, { id: 'asc' }],
    });
    expect(highTasks.length).toBe(2);
    expect(highTasks[0].taskNumber).toBe(1);
    expect(highTasks[1].taskNumber).toBe(4);
  });

  it('6. verifies multi-tenant workspace and project isolation', async () => {
    const user1 = await prisma.user.create({
      data: {
        email: 'tenant1@projectflow.local',
        name: 'Tenant 1',
        passwordHash: 'dummy-hash',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'tenant2@projectflow.local',
        name: 'Tenant 2',
        passwordHash: 'dummy-hash',
      },
    });

    // Workspace 1
    const ws1 = await prisma.workspace.create({
      data: { name: 'WS 1', slug: 'ws-1', ownerId: user1.id },
    });
    const prj1 = await prisma.project.create({
      data: { name: 'Prj 1', key: 'P1', workspaceId: ws1.id, ownerId: user1.id },
    });
    await prisma.task.create({
      data: {
        taskNumber: 1,
        title: 'Secret Task WS1',
        projectId: prj1.id,
        creatorId: user1.id,
      },
    });

    // Workspace 2
    const ws2 = await prisma.workspace.create({
      data: { name: 'WS 2', slug: 'ws-2', ownerId: user2.id },
    });
    const prj2 = await prisma.project.create({
      data: { name: 'Prj 2', key: 'P2', workspaceId: ws2.id, ownerId: user2.id },
    });
    await prisma.task.create({
      data: {
        taskNumber: 1,
        title: 'Secret Task WS2',
        projectId: prj2.id,
        creatorId: user2.id,
      },
    });

    // Scoped query for WS1 tasks
    const ws1Tasks = await prisma.task.findMany({
      where: {
        project: {
          workspaceId: ws1.id,
        },
      },
    });

    expect(ws1Tasks.length).toBe(1);
    expect(ws1Tasks[0].title).toBe('Secret Task WS1');
    expect(ws1Tasks[0].title).not.toContain('WS2');
  });
});
