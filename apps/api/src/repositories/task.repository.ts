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
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

export interface ITaskRepository {
  create(data: CreateTaskData): Promise<TaskWithRelations>;
  findById(id: string): Promise<TaskWithRelations | null>;
  findByProject(projectId: string, filters?: TaskFilters): Promise<TaskWithRelations[]>;
  update(id: string, data: UpdateTaskData): Promise<TaskWithRelations>;
  updateStatus(id: string, status: TaskStatus, orderIndex?: number): Promise<TaskWithRelations>;
  delete(id: string): Promise<void>;
  getNextTaskNumber(projectId: string): Promise<number>;
  clear?(): Promise<void>;
}

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
    // In strict PostgreSQL mode or production, NEVER silently fall back
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
      const taskNumber = await this.getNextTaskNumber(data.projectId);

      const task = await this.prisma.task.create({
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

  public async findByProject(projectId: string, filters?: TaskFilters): Promise<TaskWithRelations[]> {
    try {
      const where: Record<string, unknown> = { projectId };

      if (filters?.status) where.status = filters.status;
      if (filters?.priority) where.priority = filters.priority;
      if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const tasks = await this.prisma.task.findMany({
        where,
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
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      });

      return tasks as TaskWithRelations[];
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
    const id = `tsk_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const taskNumber = await this.getNextTaskNumber(data.projectId);

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
  }

  public async findById(id: string): Promise<TaskWithRelations | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return this.populateRelations(task);
  }

  public async findByProject(projectId: string, filters?: TaskFilters): Promise<TaskWithRelations[]> {
    const list: TaskWithRelations[] = [];

    for (const task of this.tasks.values()) {
      if (task.projectId !== projectId) continue;

      if (filters?.status && task.status !== filters.status) continue;
      if (filters?.priority && task.priority !== filters.priority) continue;
      if (filters?.assigneeId && task.assigneeId !== filters.assigneeId) continue;
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) continue;
      }

      list.push(await this.populateRelations(task));
    }

    return list.sort((a, b) => a.orderIndex - b.orderIndex || b.createdAt.getTime() - a.createdAt.getTime());
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
