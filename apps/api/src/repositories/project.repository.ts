import { PrismaClient, type Project as PrismaProject, type ProjectMember as PrismaProjectMember, type Role, type ProjectStatus } from '@prisma/client';
import { config } from '../config/index.js';
import { userRepository } from './user.repository.js';

export type ProjectRecord = PrismaProject;
export type ProjectMemberRecord = PrismaProjectMember;

export interface ProjectMemberWithUser extends ProjectMemberRecord {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
}

export interface IProjectRepository {
  create(data: { name: string; key: string; description?: string; status?: ProjectStatus; workspaceId: string; ownerId: string }): Promise<ProjectRecord>;
  findById(id: string): Promise<ProjectRecord | null>;
  findByWorkspace(workspaceId: string): Promise<ProjectRecord[]>;
  findUserProjectsInWorkspace(workspaceId: string, userId: string): Promise<ProjectRecord[]>;
  update(id: string, data: { name?: string; description?: string; status?: ProjectStatus }): Promise<ProjectRecord>;
  delete(id: string): Promise<void>;
  addMember(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord>;
  findMember(projectId: string, userId: string): Promise<ProjectMemberRecord | null>;
  updateMemberRole(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord>;
  removeMember(projectId: string, userId: string): Promise<void>;
  listMembers(projectId: string): Promise<ProjectMemberWithUser[]>;
  countOwnerMembers(projectId: string): Promise<number>;
  clear?(): Promise<void>;
}

export class PrismaProjectRepository implements IProjectRepository {
  private prisma: PrismaClient;
  private fallbackMemoryRepo = new MemoryProjectRepository();
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
        '[POSTGRES ADVISORY] PostgreSQL at localhost:5432 unreachable. Using in-memory project store for sandbox preview.'
      );
      this.hasLoggedFallback = true;
    }
  }

  public async create(data: { name: string; key: string; description?: string; status?: ProjectStatus; workspaceId: string; ownerId: string }): Promise<ProjectRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: data.name,
            key: data.key.toUpperCase(),
            description: data.description,
            status: data.status || 'ACTIVE',
            workspaceId: data.workspaceId,
            ownerId: data.ownerId,
          },
        });

        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: data.ownerId,
            role: 'OWNER',
          },
        });

        return project;
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.create(data);
      }
      throw err;
    }
  }

  public async findById(id: string): Promise<ProjectRecord | null> {
    try {
      return await this.prisma.project.findUnique({
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

  public async findByWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    try {
      return await this.prisma.project.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findByWorkspace(workspaceId);
      }
      throw err;
    }
  }

  public async findUserProjectsInWorkspace(workspaceId: string, userId: string): Promise<ProjectRecord[]> {
    try {
      return await this.prisma.project.findMany({
        where: {
          workspaceId,
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
        return this.fallbackMemoryRepo.findUserProjectsInWorkspace(workspaceId, userId);
      }
      throw err;
    }
  }

  public async update(id: string, data: { name?: string; description?: string; status?: ProjectStatus }): Promise<ProjectRecord> {
    try {
      return await this.prisma.project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          status: data.status,
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
      await this.prisma.project.delete({
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

  public async addMember(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord> {
    try {
      return await this.prisma.projectMember.create({
        data: {
          projectId,
          userId,
          role,
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.addMember(projectId, userId, role);
      }
      throw err;
    }
  }

  public async findMember(projectId: string, userId: string): Promise<ProjectMemberRecord | null> {
    try {
      return await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.findMember(projectId, userId);
      }
      throw err;
    }
  }

  public async updateMemberRole(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord> {
    try {
      return await this.prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        data: { role },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.updateMemberRole(projectId, userId, role);
      }
      throw err;
    }
  }

  public async removeMember(projectId: string, userId: string): Promise<void> {
    try {
      await this.prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.removeMember(projectId, userId);
      }
      throw err;
    }
  }

  public async listMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
    try {
      const records = await this.prisma.projectMember.findMany({
        where: { projectId },
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
      return records as ProjectMemberWithUser[];
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.listMembers(projectId);
      }
      throw err;
    }
  }

  public async countOwnerMembers(projectId: string): Promise<number> {
    try {
      return await this.prisma.projectMember.count({
        where: {
          projectId,
          role: 'OWNER',
        },
      });
    } catch (err) {
      if (this.isConnectionError(err)) {
        this.notifyFallback();
        return this.fallbackMemoryRepo.countOwnerMembers(projectId);
      }
      throw err;
    }
  }
}

export class MemoryProjectRepository implements IProjectRepository {
  private projects = new Map<string, ProjectRecord>();
  private members = new Map<string, ProjectMemberRecord>(); // `${projectId}:${userId}`

  public async create(data: { name: string; key: string; description?: string; status?: ProjectStatus; workspaceId: string; ownerId: string }): Promise<ProjectRecord> {
    const id = `prj_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const project: ProjectRecord = {
      id,
      name: data.name,
      key: data.key.toUpperCase(),
      description: data.description || null,
      status: data.status || 'ACTIVE',
      workspaceId: data.workspaceId,
      ownerId: data.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);

    // Add owner as project member
    const memberId = `prm_${Math.random().toString(36).substring(2, 10)}`;
    const member: ProjectMemberRecord = {
      id: memberId,
      projectId: id,
      userId: data.ownerId,
      role: 'OWNER',
      joinedAt: new Date(),
    };
    this.members.set(`${id}:${data.ownerId}`, member);

    return { ...project };
  }

  public async findById(id: string): Promise<ProjectRecord | null> {
    const p = this.projects.get(id);
    return p ? { ...p } : null;
  }

  public async findByWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    const list: ProjectRecord[] = [];
    for (const p of this.projects.values()) {
      if (p.workspaceId === workspaceId) {
        list.push({ ...p });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findUserProjectsInWorkspace(workspaceId: string, userId: string): Promise<ProjectRecord[]> {
    const accessibleProjectIds = new Set<string>();
    for (const member of this.members.values()) {
      if (member.userId === userId) {
        accessibleProjectIds.add(member.projectId);
      }
    }

    const list: ProjectRecord[] = [];
    for (const p of this.projects.values()) {
      if (p.workspaceId === workspaceId && (p.ownerId === userId || accessibleProjectIds.has(p.id))) {
        list.push({ ...p });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async update(id: string, data: { name?: string; description?: string; status?: ProjectStatus }): Promise<ProjectRecord> {
    const p = this.projects.get(id);
    if (!p) throw new Error(`Project ${id} not found`);
    if (data.name !== undefined) p.name = data.name;
    if (data.description !== undefined) p.description = data.description || null;
    if (data.status !== undefined) p.status = data.status;
    p.updatedAt = new Date();
    this.projects.set(id, p);
    return { ...p };
  }

  public async delete(id: string): Promise<void> {
    this.projects.delete(id);
    for (const [key, member] of this.members.entries()) {
      if (member.projectId === id) {
        this.members.delete(key);
      }
    }
  }

  public async addMember(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord> {
    const memberId = `prm_${Math.random().toString(36).substring(2, 10)}`;
    const member: ProjectMemberRecord = {
      id: memberId,
      projectId,
      userId,
      role,
      joinedAt: new Date(),
    };
    this.members.set(`${projectId}:${userId}`, member);
    return { ...member };
  }

  public async findMember(projectId: string, userId: string): Promise<ProjectMemberRecord | null> {
    const member = this.members.get(`${projectId}:${userId}`);
    return member ? { ...member } : null;
  }

  public async updateMemberRole(projectId: string, userId: string, role: Role): Promise<ProjectMemberRecord> {
    const member = this.members.get(`${projectId}:${userId}`);
    if (!member) throw new Error('Member not found');
    member.role = role;
    this.members.set(`${projectId}:${userId}`, member);
    return { ...member };
  }

  public async removeMember(projectId: string, userId: string): Promise<void> {
    this.members.delete(`${projectId}:${userId}`);
  }

  public async listMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
    const list: ProjectMemberWithUser[] = [];
    for (const member of this.members.values()) {
      if (member.projectId === projectId) {
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

  public async countOwnerMembers(projectId: string): Promise<number> {
    let count = 0;
    for (const member of this.members.values()) {
      if (member.projectId === projectId && member.role === 'OWNER') {
        count += 1;
      }
    }
    return count;
  }

  public async clear(): Promise<void> {
    this.projects.clear();
    this.members.clear();
  }
}

const usePrisma = Boolean(
  config.NODE_ENV !== 'test' &&
  config.DATABASE_URL &&
  config.DATABASE_URL.startsWith('postgresql://')
);

export let projectRepository: IProjectRepository = usePrisma
  ? new PrismaProjectRepository()
  : new MemoryProjectRepository();

export function setProjectRepository(repo: IProjectRepository): void {
  projectRepository = repo;
}
