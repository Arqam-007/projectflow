import { PrismaClient, type Workspace as PrismaWorkspace, type WorkspaceMember as PrismaWorkspaceMember, type Role } from '@prisma/client';
import { config } from '../config/index.js';
import { userRepository } from './user.repository.js';

export type WorkspaceRecord = PrismaWorkspace;
export type WorkspaceMemberRecord = PrismaWorkspaceMember;

export interface WorkspaceMemberWithUser extends WorkspaceMemberRecord {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
}

export interface IWorkspaceRepository {
  create(data: { name: string; slug: string; description?: string; ownerId: string }): Promise<WorkspaceRecord>;
  findById(id: string): Promise<WorkspaceRecord | null>;
  findBySlug(slug: string): Promise<WorkspaceRecord | null>;
  findUserWorkspaces(userId: string): Promise<WorkspaceRecord[]>;
  update(id: string, data: { name?: string; description?: string }): Promise<WorkspaceRecord>;
  delete(id: string): Promise<void>;
  addMember(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord>;
  findMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRecord | null>;
  updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  listMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]>;
  countOwnerMembers(workspaceId: string): Promise<number>;
  clear?(): Promise<void>;
}

export class PrismaWorkspaceRepository implements IWorkspaceRepository {
  private prisma: PrismaClient;
  private fallbackMemoryRepo = new MemoryWorkspaceRepository();
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

  private notifyFallback(err?: unknown) {
    if (process.env.STRICT_POSTGRES === 'true' || config.NODE_ENV === 'production') {
      throw err || new Error('Database connection failed');
    }
    if (!this.hasLoggedFallback) {
      console.warn(
        '[POSTGRES ADVISORY] PostgreSQL at localhost:5432 unreachable. Using in-memory workspace store for sandbox preview.'
      );
      this.hasLoggedFallback = true;
    }
  }

  public async create(data: { name: string; slug: string; description?: string; ownerId: string }): Promise<WorkspaceRecord> {
    try {
      // Transactional creation: workspace + owner member
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            ownerId: data.ownerId,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: data.ownerId,
            role: 'OWNER',
          },
        });

        return workspace;
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.create(data);
      }
      throw err;
    }
  }

  public async findById(id: string): Promise<WorkspaceRecord | null> {
    try {
      return await this.prisma.workspace.findUnique({
        where: { id },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findById(id);
      }
      throw err;
    }
  }

  public async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    try {
      return await this.prisma.workspace.findUnique({
        where: { slug: slug.toLowerCase() },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findBySlug(slug);
      }
      throw err;
    }
  }

  public async findUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    try {
      return await this.prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findUserWorkspaces(userId);
      }
      throw err;
    }
  }

  public async update(id: string, data: { name?: string; description?: string }): Promise<WorkspaceRecord> {
    try {
      return await this.prisma.workspace.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.update(id, data);
      }
      throw err;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.prisma.workspace.delete({
        where: { id },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.delete(id);
      }
      throw err;
    }
  }

  public async addMember(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord> {
    try {
      return await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role,
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.addMember(workspaceId, userId, role);
      }
      throw err;
    }
  }

  public async findMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRecord | null> {
    try {
      return await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findMember(workspaceId, userId);
      }
      throw err;
    }
  }

  public async updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord> {
    try {
      return await this.prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        data: { role },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.updateMemberRole(workspaceId, userId, role);
      }
      throw err;
    }
  }

  public async removeMember(workspaceId: string, userId: string): Promise<void> {
    try {
      await this.prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.removeMember(workspaceId, userId);
      }
      throw err;
    }
  }

  public async listMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
    try {
      const records = await this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });
      return records as WorkspaceMemberWithUser[];
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.listMembers(workspaceId);
      }
      throw err;
    }
  }

  public async countOwnerMembers(workspaceId: string): Promise<number> {
    try {
      return await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: 'OWNER',
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.countOwnerMembers(workspaceId);
      }
      throw err;
    }
  }
}

export class MemoryWorkspaceRepository implements IWorkspaceRepository {
  private workspaces = new Map<string, WorkspaceRecord>();
  private members = new Map<string, WorkspaceMemberRecord>(); // key: `${workspaceId}:${userId}`

  public async create(data: { name: string; slug: string; description?: string; ownerId: string }): Promise<WorkspaceRecord> {
    const id = `ws_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const workspace: WorkspaceRecord = {
      id,
      name: data.name,
      slug: data.slug.toLowerCase(),
      description: data.description || null,
      ownerId: data.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workspaces.set(id, workspace);

    // Add owner as workspace member
    const memberId = `wsm_${Math.random().toString(36).substring(2, 10)}`;
    const member: WorkspaceMemberRecord = {
      id: memberId,
      workspaceId: id,
      userId: data.ownerId,
      role: 'OWNER',
      joinedAt: new Date(),
    };
    this.members.set(`${id}:${data.ownerId}`, member);

    return { ...workspace };
  }

  public async findById(id: string): Promise<WorkspaceRecord | null> {
    const ws = this.workspaces.get(id);
    return ws ? { ...ws } : null;
  }

  public async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    const normalized = slug.toLowerCase();
    for (const ws of this.workspaces.values()) {
      if (ws.slug === normalized) return { ...ws };
    }
    return null;
  }

  public async findUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    const accessibleWorkspaceIds = new Set<string>();

    for (const [key, member] of this.members.entries()) {
      if (member.userId === userId) {
        accessibleWorkspaceIds.add(member.workspaceId);
      }
    }

    const list: WorkspaceRecord[] = [];
    for (const ws of this.workspaces.values()) {
      if (ws.ownerId === userId || accessibleWorkspaceIds.has(ws.id)) {
        list.push({ ...ws });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async update(id: string, data: { name?: string; description?: string }): Promise<WorkspaceRecord> {
    const ws = this.workspaces.get(id);
    if (!ws) throw new Error(`Workspace ${id} not found`);
    if (data.name !== undefined) ws.name = data.name;
    if (data.description !== undefined) ws.description = data.description || null;
    ws.updatedAt = new Date();
    this.workspaces.set(id, ws);
    return { ...ws };
  }

  public async delete(id: string): Promise<void> {
    this.workspaces.delete(id);
    for (const [key, member] of this.members.entries()) {
      if (member.workspaceId === id) {
        this.members.delete(key);
      }
    }
  }

  public async addMember(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord> {
    const memberId = `wsm_${Math.random().toString(36).substring(2, 10)}`;
    const member: WorkspaceMemberRecord = {
      id: memberId,
      workspaceId,
      userId,
      role,
      joinedAt: new Date(),
    };
    this.members.set(`${workspaceId}:${userId}`, member);
    return { ...member };
  }

  public async findMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRecord | null> {
    const member = this.members.get(`${workspaceId}:${userId}`);
    return member ? { ...member } : null;
  }

  public async updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMemberRecord> {
    const member = this.members.get(`${workspaceId}:${userId}`);
    if (!member) throw new Error('Member not found');
    member.role = role;
    this.members.set(`${workspaceId}:${userId}`, member);
    return { ...member };
  }

  public async removeMember(workspaceId: string, userId: string): Promise<void> {
    this.members.delete(`${workspaceId}:${userId}`);
  }

  public async listMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
    const list: WorkspaceMemberWithUser[] = [];
    for (const member of this.members.values()) {
      if (member.workspaceId === workspaceId) {
        const user = await userRepository.findById(member.userId);
        list.push({
          ...member,
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
              }
            : {
                id: member.userId,
                email: 'user@example.com',
                name: 'User',
                avatarUrl: null,
                createdAt: new Date(),
              },
        });
      }
    }
    return list.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  }

  public async countOwnerMembers(workspaceId: string): Promise<number> {
    let count = 0;
    for (const member of this.members.values()) {
      if (member.workspaceId === workspaceId && member.role === 'OWNER') {
        count += 1;
      }
    }
    return count;
  }

  public async clear(): Promise<void> {
    this.workspaces.clear();
    this.members.clear();
  }
}

const usePrisma = Boolean(
  config.NODE_ENV !== 'test' &&
  config.DATABASE_URL &&
  config.DATABASE_URL.startsWith('postgresql://')
);

export let workspaceRepository: IWorkspaceRepository = usePrisma
  ? new PrismaWorkspaceRepository()
  : new MemoryWorkspaceRepository();

export function setWorkspaceRepository(repo: IWorkspaceRepository): void {
  workspaceRepository = repo;
}
