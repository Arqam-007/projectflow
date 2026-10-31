import { PrismaClient, type Task as PrismaTask, type TaskStatus, type TaskPriority } from '@prisma/client';
import { config } from '../config/index.js';
import { userRepository } from './user.repository.js';
import { projectRepository } from './project.repository.js';

export type TaskRecord = PrismaTask;

export interface TaskUserData {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface TaskProjectData {
  id: string;
  name: string;
  key: string;
  workspaceId: string;
}

export interface TaskWithRelations extends TaskRecord {
  creator: TaskUserData;
  assignee: TaskUserData | null;
  project?: TaskProjectData;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  orderIndex?: number;
  projectId: string;
  creatorId: string;
  assigneeId?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  assigneeId?: string | null;
  orderIndex?: number;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigneeId?: string; // user ID or 'unassigned'
  search?: string;
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  overdueOnly?: boolean;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'taskNumber' | 'title' | 'status' | 'orderIndex';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TaskQueryResult {
  items: TaskWithRelations[];
  total: number;
}

export interface ITaskRepository {
  create(data: CreateTaskData): Promise<TaskWithRelations>;
  findById(id: string): Promise<TaskWithRelations | null>;
  findByProject(projectId: string, filters?: TaskFilters): Promise<TaskQueryResult>;
  findAllByProject(projectId: string): Promise<TaskWithRelations[]>;
  findByWorkspace(workspaceId: string): Promise<TaskWithRelations[]>;
  update(id: string, data: UpdateTaskData): Promise<TaskWithRelations>;
  updateStatus(id: string, status: TaskStatus, orderIndex?: number): Promise<TaskWithRelations>;
  delete(id: string): Promise<void>;
  getNextTaskNumber(projectId: string): Promise<number>;
  clear?(): Promise<void>;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export class PrismaTaskRepository implements ITaskRepository {
  private prisma: PrismaClient;
  private fallbackMemoryRepo = new MemoryTaskRepository();
  private hasLoggedFallback = false;

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || new PrismaClient();
  }

  private isConnectionError(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err);
    return (
      msg.includes("Can't reach database server") ||
      msg.includes('P1001') ||
      msg.includes('ConnectionRefused') ||
      msg.includes('ECONNREFUSED')
    );
  }

  private handleDbError(err: unknown) {
    if (process.env.STRICT_POSTGRES === 'true' || config.NODE_ENV === 'production') {
      throw err;
    }
    if (!this.hasLoggedFallback) {
      console.warn(
        '[POSTGRES ADVISORY] PostgreSQL at localhost:5432 unreachable. Sandbox preview is active. Run `docker compose up -d` locally for persistent PostgreSQL.'
      );
      this.hasLoggedFallback = true;
    }
  }

  public async getNextTaskNumber(projectId: string): Promise<number> {
    try {
      const count = await this.prisma.task.count({
        where: { projectId },
      });
      return count + 1;
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.getNextTaskNumber(projectId);
      }
      throw err;
    }
  }

  public async create(data: CreateTaskData): Promise<TaskWithRelations> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "projects" WHERE id = ${data.projectId} FOR UPDATE`;

        const aggregate = await tx.task.aggregate({
          where: { projectId: data.projectId },
          _max: { taskNumber: true },
        });
        const taskNumber = (aggregate._max.taskNumber ?? 0) + 1;

        const task = await tx.task.create({
          data: {
            taskNumber,
            title: data.title,
            description: data.description || null,
            status: data.status || 'TODO',
            priority: data.priority || 'MEDIUM',
            dueDate: data.dueDate || null,
            orderIndex: data.orderIndex || 0,
            projectId: data.projectId,
            creatorId: data.creatorId,
            assigneeId: data.assigneeId || null,
          },
          include: {
            creator: {
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
            assignee: {
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
            project: {
              select: { id: true, name: true, key: true, workspaceId: true },
            },
          },
        });

        return task as TaskWithRelations;
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.create(data);
      }
      throw err;
    }
  }

  public async findById(id: string): Promise<TaskWithRelations | null> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          creator: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          assignee: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true, key: true, workspaceId: true },
          },
        },
      });

      return task as TaskWithRelations | null;
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findById(id);
      }
      throw err;
    }
  }

  public async findAllByProject(projectId: string): Promise<TaskWithRelations[]> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: { projectId },
        include: {
          creator: { select: { id: true, email: true, name: true, avatarUrl: true } },
          assignee: { select: { id: true, email: true, name: true, avatarUrl: true } },
          project: { select: { id: true, name: true, key: true, workspaceId: true } },
        },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      });
      return tasks as TaskWithRelations[];
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findAllByProject(projectId);
      }
      throw err;
    }
  }

  public async findByWorkspace(workspaceId: string): Promise<TaskWithRelations[]> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          project: {
            workspaceId,
          },
        },
        include: {
          creator: { select: { id: true, email: true, name: true, avatarUrl: true } },
          assignee: { select: { id: true, email: true, name: true, avatarUrl: true } },
          project: { select: { id: true, name: true, key: true, workspaceId: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
      return tasks as TaskWithRelations[];
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findByWorkspace(workspaceId);
      }
      throw err;
    }
  }

  public async findByProject(projectId: string, filters?: TaskFilters): Promise<TaskQueryResult> {
    try {
      const where: Record<string, unknown> = { projectId };

      // Status filter (single or array)
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          where.status = { in: filters.status };
        } else {
          where.status = filters.status;
        }
      }

      // Priority filter (single or array)
      if (filters?.priority) {
        if (Array.isArray(filters.priority)) {
          where.priority = { in: filters.priority };
        } else {
          where.priority = filters.priority;
        }
      }

      // Assignee filter
      if (filters?.assigneeId) {
        if (filters.assigneeId === 'unassigned') {
          where.assigneeId = null;
        } else {
          where.assigneeId = filters.assigneeId;
        }
      }

      // Search filter
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Due date range filter
      if (filters?.dueDateFrom || filters?.dueDateTo) {
        const dateFilter: Record<string, Date> = {};
        if (filters.dueDateFrom) {
          dateFilter.gte = new Date(filters.dueDateFrom);
        }
        if (filters.dueDateTo) {
          if (filters.dueDateTo instanceof Date) {
            dateFilter.lte = filters.dueDateTo;
          } else {
            const rawTo = String(filters.dueDateTo).trim();
            dateFilter.lte = /^\d{4}-\d{2}-\d{2}$/.test(rawTo)
              ? new Date(`${rawTo}T23:59:59.999Z`)
              : new Date(rawTo);
          }
        }
        where.dueDate = dateFilter;
      }

      // Overdue only filter
      if (filters?.overdueOnly) {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'DONE' };
      }

      // Sorting
      const sortField = filters?.sortBy || 'createdAt';
      const sortDirection = filters?.sortOrder || 'desc';

      // Always include a secondary tiebreaker for deterministic pagination
      const orderBy: Record<string, 'asc' | 'desc'>[] = [
        { [sortField]: sortDirection },
        { id: 'asc' },
      ];

      // Pagination
      const page = Math.max(1, filters?.page || 1);
      const limit = Math.max(1, Math.min(100, filters?.limit || 50));
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        this.prisma.task.count({ where }),
        this.prisma.task.findMany({
          where,
          include: {
            creator: { select: { id: true, email: true, name: true, avatarUrl: true } },
            assignee: { select: { id: true, email: true, name: true, avatarUrl: true } },
            project: { select: { id: true, name: true, key: true, workspaceId: true } },
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      return {
        items: items as TaskWithRelations[],
        total,
      };
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findByProject(projectId, filters);
      }
      throw err;
    }
  }

  public async update(id: string, data: UpdateTaskData): Promise<TaskWithRelations> {
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          orderIndex: data.orderIndex,
        },
        include: {
          creator: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          assignee: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true, key: true, workspaceId: true },
          },
        },
      });

      return task as TaskWithRelations;
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.update(id, data);
      }
      throw err;
    }
  }

  public async updateStatus(id: string, status: TaskStatus, orderIndex?: number): Promise<TaskWithRelations> {
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: {
          status,
          ...(orderIndex !== undefined ? { orderIndex } : {}),
        },
        include: {
          creator: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          assignee: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true, key: true, workspaceId: true },
          },
        },
      });

      return task as TaskWithRelations;
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.updateStatus(id, status, orderIndex);
      }
      throw err;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({
        where: { id },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.delete(id);
      }
      throw err;
    }
  }
}

export class MemoryTaskRepository implements ITaskRepository {
  private tasks = new Map<string, TaskRecord>();
  private projectTaskCounters = new Map<string, number>();
  private projectLocks = new Map<string, Promise<void>>();

  private async acquireLock(projectId: string): Promise<() => void> {
    while (this.projectLocks.has(projectId)) {
      await this.projectLocks.get(projectId);
    }
    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = () => {
        this.projectLocks.delete(projectId);
        resolve();
      };
    });
    this.projectLocks.set(projectId, lockPromise);
    return release!;
  }

  public async getNextTaskNumber(projectId: string): Promise<number> {
    const current = this.projectTaskCounters.get(projectId) || 0;
    const next = current + 1;
    this.projectTaskCounters.set(projectId, next);
    return next;
  }

  private async populateRelations(record: TaskRecord): Promise<TaskWithRelations> {
    const creatorUser = await userRepository.findById(record.creatorId);
    const assigneeUser = record.assigneeId ? await userRepository.findById(record.assigneeId) : null;
    const project = await projectRepository.findById(record.projectId);

    return {
      ...record,
      creator: creatorUser
        ? { id: creatorUser.id, email: creatorUser.email, name: creatorUser.name, avatarUrl: creatorUser.avatarUrl }
        : { id: record.creatorId, email: 'creator@example.com', name: 'Creator', avatarUrl: null },
      assignee: assigneeUser
        ? { id: assigneeUser.id, email: assigneeUser.email, name: assigneeUser.name, avatarUrl: assigneeUser.avatarUrl }
        : null,
      project: project
        ? { id: project.id, name: project.name, key: project.key, workspaceId: project.workspaceId }
        : undefined,
    };
  }

  public async create(data: CreateTaskData): Promise<TaskWithRelations> {
    const releaseLock = await this.acquireLock(data.projectId);
    try {
      const current = this.projectTaskCounters.get(data.projectId) || 0;
      const taskNumber = current + 1;
      this.projectTaskCounters.set(data.projectId, taskNumber);

      for (const t of this.tasks.values()) {
        if (t.projectId === data.projectId && t.taskNumber === taskNumber) {
          throw new Error('Unique constraint failed on the fields: (projectId, taskNumber)');
        }
      }

      const id = `tsk_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      const task: TaskRecord = {
        id,
        taskNumber,
        title: data.title,
        description: data.description || null,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate || null,
        orderIndex: data.orderIndex || 0,
        projectId: data.projectId,
        creatorId: data.creatorId,
        assigneeId: data.assigneeId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.tasks.set(id, task);
      return this.populateRelations(task);
    } finally {
      releaseLock();
    }
  }

  public async findById(id: string): Promise<TaskWithRelations | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return this.populateRelations(task);
  }

  public async findAllByProject(projectId: string): Promise<TaskWithRelations[]> {
    const list: TaskWithRelations[] = [];
    for (const task of this.tasks.values()) {
      if (task.projectId === projectId) {
        list.push(await this.populateRelations(task));
      }
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex || b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findByWorkspace(workspaceId: string): Promise<TaskWithRelations[]> {
    const list: TaskWithRelations[] = [];
    for (const task of this.tasks.values()) {
      const project = await projectRepository.findById(task.projectId);
      if (project && project.workspaceId === workspaceId) {
        list.push(await this.populateRelations(task));
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findByProject(projectId: string, filters?: TaskFilters): Promise<TaskQueryResult> {
    let list: TaskRecord[] = [];

    const now = new Date();

    for (const task of this.tasks.values()) {
      if (task.projectId !== projectId) continue;

      // Status filter (single or array)
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        if (!statuses.includes(task.status)) continue;
      }

      // Priority filter (single or array)
      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        if (!priorities.includes(task.priority)) continue;
      }

      // Assignee filter
      if (filters?.assigneeId) {
        if (filters.assigneeId === 'unassigned') {
          if (task.assigneeId !== null) continue;
        } else if (task.assigneeId !== filters.assigneeId) {
          continue;
        }
      }

      // Search filter
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) continue;
      }

      // Due date range
      if (filters?.dueDateFrom && (!task.dueDate || new Date(task.dueDate) < new Date(filters.dueDateFrom))) {
        continue;
      }
      if (filters?.dueDateTo) {
        let toLimit: Date;
        if (filters.dueDateTo instanceof Date) {
          toLimit = filters.dueDateTo;
        } else {
          const rawTo = String(filters.dueDateTo).trim();
          toLimit = /^\d{4}-\d{2}-\d{2}$/.test(rawTo)
            ? new Date(`${rawTo}T23:59:59.999Z`)
            : new Date(rawTo);
        }
        if (!task.dueDate || new Date(task.dueDate) > toLimit) {
          continue;
        }
      }

      // Overdue filter
      if (filters?.overdueOnly) {
        if (!task.dueDate || new Date(task.dueDate) >= now || task.status === 'DONE') {
          continue;
        }
      }

      list.push(task);
    }

    // Sorting
    const sortField = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';
    const factor = sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'priority': {
          const valA = PRIORITY_ORDER[a.priority] || 0;
          const valB = PRIORITY_ORDER[b.priority] || 0;
          comparison = (valA - valB) * factor;
          break;
        }
        case 'dueDate': {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          comparison = (timeA - timeB) * factor;
          break;
        }
        case 'taskNumber': {
          comparison = (a.taskNumber - b.taskNumber) * factor;
          break;
        }
        case 'title': {
          comparison = a.title.localeCompare(b.title) * factor;
          break;
        }
        case 'status': {
          comparison = a.status.localeCompare(b.status) * factor;
          break;
        }
        case 'orderIndex': {
          comparison = (a.orderIndex - b.orderIndex) * factor;
          break;
        }
        case 'createdAt':
        default: {
          comparison = (a.createdAt.getTime() - b.createdAt.getTime()) * factor;
          break;
        }
      }

      if (comparison !== 0) return comparison;
      // Stable tiebreaker
      return a.id.localeCompare(b.id);
    });

    const total = list.length;
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 50));
    const skip = (page - 1) * limit;

    const paged = list.slice(skip, skip + limit);
    const items = await Promise.all(paged.map((t) => this.populateRelations(t)));

    return { items, total };
  }

  public async update(id: string, data: UpdateTaskData): Promise<TaskWithRelations> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.status !== undefined) task.status = data.status;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.dueDate !== undefined) task.dueDate = data.dueDate;
    if (data.assigneeId !== undefined) task.assigneeId = data.assigneeId;
    if (data.orderIndex !== undefined) task.orderIndex = data.orderIndex;
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    return this.populateRelations(task);
  }

  public async updateStatus(id: string, status: TaskStatus, orderIndex?: number): Promise<TaskWithRelations> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);

    task.status = status;
    if (orderIndex !== undefined) task.orderIndex = orderIndex;
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    return this.populateRelations(task);
  }

  public async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  public async clear(): Promise<void> {
    this.tasks.clear();
    this.projectTaskCounters.clear();
  }
}

const usePrisma = Boolean(
  config.NODE_ENV !== 'test' &&
  config.DATABASE_URL &&
  config.DATABASE_URL.startsWith('postgresql://')
);

export let taskRepository: ITaskRepository = usePrisma
  ? new PrismaTaskRepository()
  : new MemoryTaskRepository();

export function setTaskRepository(repo: ITaskRepository): void {
  taskRepository = repo;
}
