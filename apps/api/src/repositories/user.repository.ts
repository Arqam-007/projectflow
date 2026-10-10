import { PrismaClient, type User as PrismaUser } from '@prisma/client';
import { config } from '../config/index.js';

export type UserRecord = PrismaUser;

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  incrementTokenVersion(id: string): Promise<UserRecord>;
  clear?(): Promise<void>;
}

export class PrismaUserRepository implements IUserRepository {
  private prisma: PrismaClient;
  private fallbackMemoryRepo = new MemoryUserRepository();
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

  private notifyFallback(err: unknown) {
    if (!this.hasLoggedFallback) {
      console.warn(
        '[POSTGRES ADVISORY] PostgreSQL at localhost:5432 unreachable (Sandbox preview environment). Operating in standalone memory mode until local PostgreSQL container is running via `docker compose up -d`.'
      );
      this.hasLoggedFallback = true;
    }
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback(err);
        return this.fallbackMemoryRepo.findByEmail(email);
      }
      throw err;
    }
  }

  public async findById(id: string): Promise<UserRecord | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback(err);
        return this.fallbackMemoryRepo.findById(id);
      }
      throw err;
    }
  }

  public async create(data: CreateUserData): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash: data.passwordHash,
          tokenVersion: 0,
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback(err);
        return this.fallbackMemoryRepo.create(data);
      }
      throw err;
    }
  }

  public async incrementTokenVersion(id: string): Promise<UserRecord> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback(err);
        return this.fallbackMemoryRepo.incrementTokenVersion(id);
      }
      throw err;
    }
  }
}

export class MemoryUserRepository implements IUserRepository {
  private users = new Map<string, UserRecord>();

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async create(data: CreateUserData): Promise<UserRecord> {
    const id = `usr_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const user: UserRecord = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return { ...user };
  }

  public async incrementTokenVersion(id: string): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found in memory store`);
    }
    user.tokenVersion += 1;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return { ...user };
  }

  public async clear(): Promise<void> {
    this.users.clear();
  }
}

// In test environment or if DATABASE_URL is not set/reachable, default to in-memory repository to guarantee fast, deterministic tests
const usePrisma = Boolean(
  config.NODE_ENV !== 'test' &&
  config.DATABASE_URL &&
  config.DATABASE_URL.startsWith('postgresql://')
);

export let userRepository: IUserRepository = usePrisma
  ? new PrismaUserRepository()
  : new MemoryUserRepository();

export function setUserRepository(repo: IUserRepository): void {
  userRepository = repo;
}
