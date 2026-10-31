import { PrismaClient, type ActivityLog as PrismaActivityLog } from '@prisma/client';
import { config } from '../config/index.js';
import { userRepository } from './user.repository.js';
import { projectRepository } from './project.repository.js';

export type ActivityRecord = PrismaActivityLog;

export interface ActivityUserData {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ActivityProjectData {
  id: string;
  name: string;
  key: string;
}

export interface ActivityWithRelations extends ActivityRecord {
  user: ActivityUserData;
  project?: ActivityProjectData;
}

export interface CreateActivityData {
  workspaceId?: string | null;
  projectId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
}

export interface ActivityQueryOptions {
  limit?: number;
  page?: number;
  action?: string;
}

export interface IActivityRepository {
  create(data: CreateActivityData): Promise<ActivityWithRelations>;
  findByProject(
    projectId: string,
    options?: ActivityQueryOptions
  ): Promise<{ items: ActivityWithRelations[]; total: number }>;
  findByWorkspace(
    workspaceId: string,
    options?: ActivityQueryOptions
  ): Promise<{ items: ActivityWithRelations[]; total: number }>;
  clear?(): Promise<void>;
}

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'jwt',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'credential',
  'authorization',
  'authheader',
  'auth_header',
  'bearer',
  'cookie',
  'sessionid',
  'session_id',
];

// Ensure sensitive values are never logged in activity details (deep recursive sanitization)
export function sanitizeActivityDetails(
  details?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!details || typeof details !== 'object') return null;

  function sanitizeValue(val: unknown): unknown {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      return val.map((item) => sanitizeValue(item));
    }
    if (typeof val === 'object' && !(val instanceof Date)) {
      const obj = val as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        const normalized = k.toLowerCase().replace(/[-_]/g, '');
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => {
          const normPattern = pattern.replace(/[-_]/g, '');
          return normalized.includes(normPattern);
        });
        if (!isSensitive) {
          cleaned[k] = sanitizeValue(v);
        }
      }
      return cleaned;
    }
    return val;
  }

  return sanitizeValue(details) as Record<string, unknown>;
}

export class PrismaActivityRepository implements IActivityRepository {
  private prisma: PrismaClient;
  private fallbackMemoryRepo = new MemoryActivityRepository();
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
        '[POSTGRES ADVISORY] PostgreSQL at localhost:5432 unreachable. Sandbox preview is active for activity logs.'
      );
      this.hasLoggedFallback = true;
    }
  }

  public async create(data: CreateActivityData): Promise<ActivityWithRelations> {
    try {
      const sanitizedDetails = sanitizeActivityDetails(data.details);

      const record = await this.prisma.activityLog.create({
        data: {
          workspaceId: data.workspaceId || null,
          projectId: data.projectId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          details: sanitizedDetails ? JSON.parse(JSON.stringify(sanitizedDetails)) : undefined,
        },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true, key: true },
          },
        },
      });

      return record as ActivityWithRelations;
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.create(data);
      }
      throw err;
    }
  }

  public async findByProject(
    projectId: string,
    options: ActivityQueryOptions = {}
  ): Promise<{ items: ActivityWithRelations[]; total: number }> {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const page = Math.max(1, options.page || 1);
    const skip = (page - 1) * limit;

    try {
      const where: { projectId: string; action?: string } = { projectId };
      if (options.action) {
        where.action = options.action;
      }

      const [total, items] = await Promise.all([
        this.prisma.activityLog.count({ where }),
        this.prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
            project: { select: { id: true, name: true, key: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        items: items as ActivityWithRelations[],
        total,
      };
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findByProject(projectId, options);
      }
      throw err;
    }
  }

  public async findByWorkspace(
    workspaceId: string,
    options: ActivityQueryOptions = {}
  ): Promise<{ items: ActivityWithRelations[]; total: number }> {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const page = Math.max(1, options.page || 1);
    const skip = (page - 1) * limit;

    try {
      const where: { workspaceId: string; action?: string } = { workspaceId };
      if (options.action) {
        where.action = options.action;
      }

      const [total, items] = await Promise.all([
        this.prisma.activityLog.count({ where }),
        this.prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
            project: { select: { id: true, name: true, key: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        items: items as ActivityWithRelations[],
        total,
      };
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.handleDbError(err);
        return this.fallbackMemoryRepo.findByWorkspace(workspaceId, options);
      }
      throw err;
    }
  }
}

export class MemoryActivityRepository implements IActivityRepository {
  private logs: ActivityRecord[] = [];

  private async populateRelations(record: ActivityRecord): Promise<ActivityWithRelations> {
    const user = await userRepository.findById(record.userId);
    const project = await projectRepository.findById(record.projectId);

    return {
      ...record,
      user: user
        ? { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }
        : { id: record.userId, email: 'unknown@example.com', name: 'User', avatarUrl: null },
      project: project
        ? { id: project.id, name: project.name, key: project.key }
        : undefined,
    };
  }

  public async create(data: CreateActivityData): Promise<ActivityWithRelations> {
    const id = `act_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const sanitizedDetails = sanitizeActivityDetails(data.details);

    const record: ActivityRecord = {
      id,
      workspaceId: data.workspaceId || null,
      projectId: data.projectId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: sanitizedDetails ? JSON.parse(JSON.stringify(sanitizedDetails)) : null,
      createdAt: new Date(),
    };

    this.logs.unshift(record);
    return this.populateRelations(record);
  }

  public async findByProject(
    projectId: string,
    options: ActivityQueryOptions = {}
  ): Promise<{ items: ActivityWithRelations[]; total: number }> {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const page = Math.max(1, options.page || 1);
    const skip = (page - 1) * limit;

    const filtered = this.logs.filter((l) => {
      if (l.projectId !== projectId) return false;
      if (options.action && l.action !== options.action) return false;
      return true;
    });

    const total = filtered.length;
    const pageItems = filtered.slice(skip, skip + limit);
    const items = await Promise.all(pageItems.map((r) => this.populateRelations(r)));

    return { items, total };
  }

  public async findByWorkspace(
    workspaceId: string,
    options: ActivityQueryOptions = {}
  ): Promise<{ items: ActivityWithRelations[]; total: number }> {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const page = Math.max(1, options.page || 1);
    const skip = (page - 1) * limit;

    const filtered = this.logs.filter((l) => {
      if (l.workspaceId !== workspaceId) return false;
      if (options.action && l.action !== options.action) return false;
      return true;
    });

    const total = filtered.length;
    const pageItems = filtered.slice(skip, skip + limit);
    const items = await Promise.all(pageItems.map((r) => this.populateRelations(r)));

    return { items, total };
  }

  public async clear(): Promise<void> {
    this.logs = [];
  }
}

const usePrisma = Boolean(
  config.NODE_ENV !== 'test' &&
  config.DATABASE_URL &&
  config.DATABASE_URL.startsWith('postgresql://')
);

export let activityRepository: IActivityRepository = usePrisma
  ? new PrismaActivityRepository()
  : new MemoryActivityRepository();

export function setActivityRepository(repo: IActivityRepository): void {
  activityRepository = repo;
}
