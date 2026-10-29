import type { Role } from '@prisma/client';
import { workspaceRepository, type WorkspaceRecord, type WorkspaceMemberWithUser } from '../repositories/workspace.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddMemberRequest,
  WorkspaceSummary,
  WorkspaceMemberSummary,
} from '../../../../packages/shared/src/types.js';

export function sanitizeWorkspace(ws: WorkspaceRecord): WorkspaceSummary {
  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    description: ws.description,
    ownerId: ws.ownerId,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

export function sanitizeWorkspaceMember(m: WorkspaceMemberWithUser): WorkspaceMemberSummary {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    user: {
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      createdAt: m.user.createdAt.toISOString(),
    },
  };
}

export class WorkspaceService {
  public async createWorkspace(userId: string, data: CreateWorkspaceRequest): Promise<WorkspaceSummary> {
    const rawSlug = data.slug
      ? data.slug.trim().toLowerCase()
      : data.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

    const finalSlug = rawSlug.length >= 2 ? rawSlug : `ws-${Math.random().toString(36).substring(2, 7)}`;

    // Check slug collision
    const existing = await workspaceRepository.findBySlug(finalSlug);
    if (existing) {
      throw new ConflictError(`Workspace slug "${finalSlug}" is already taken. Please choose a unique slug.`);
    }

    const workspace = await workspaceRepository.create({
      name: data.name.trim(),
      slug: finalSlug,
      description: data.description?.trim(),
      ownerId: userId,
    });

    return sanitizeWorkspace(workspace);
  }

  public async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const list = await workspaceRepository.findUserWorkspaces(userId);
    return list.map(sanitizeWorkspace);
  }

  public async getWorkspaceById(workspaceId: string): Promise<WorkspaceSummary> {
    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw new NotFoundError('Workspace not found');
    return sanitizeWorkspace(ws);
  }

  public async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest): Promise<WorkspaceSummary> {
    const ws = await workspaceRepository.update(workspaceId, {
      name: data.name?.trim(),
      description: data.description !== undefined ? data.description.trim() : undefined,
    });
    return sanitizeWorkspace(ws);
  }

  public async deleteWorkspace(workspaceId: string): Promise<void> {
    await workspaceRepository.delete(workspaceId);
  }

  public async listMembers(workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    const members = await workspaceRepository.listMembers(workspaceId);
    return members.map(sanitizeWorkspaceMember);
  }

  public async addMember(
    workspaceId: string,
    data: AddMemberRequest,
    requesterRole: Role
  ): Promise<WorkspaceMemberSummary> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Verify user exists in the system
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundError(`No registered user found with email "${normalizedEmail}"`);
    }

    // Prevent duplicate membership
    const existingMember = await workspaceRepository.findMember(workspaceId, user.id);
    if (existingMember) {
      throw new ConflictError(`User ${user.name} is already a member of this workspace with role "${existingMember.role}"`);
    }

    // RBAC: Admins can only assign MEMBER or VIEWER
    if (requesterRole === 'ADMIN' && (data.role === 'OWNER' || data.role === 'ADMIN')) {
      throw new ForbiddenError('Workspace Admins can only invite Members or Viewers. Only Owners can assign Admin or Owner roles.');
    }

    const createdMember = await workspaceRepository.addMember(workspaceId, user.id, data.role);

    return {
      id: createdMember.id,
      workspaceId: createdMember.workspaceId,
      userId: createdMember.userId,
      role: createdMember.role,
      joinedAt: createdMember.joinedAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  public async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: Role,
    requesterRole: Role,
    requesterId: string
  ): Promise<WorkspaceMemberSummary> {
    const targetMember = await workspaceRepository.findMember(workspaceId, targetUserId);
    if (!targetMember) {
      throw new NotFoundError('Member not found in workspace');
    }

    // Role safety rules:
    if (requesterRole === 'ADMIN') {
      if (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN') {
        throw new ForbiddenError('Admins cannot change roles of other Admins or Owners.');
      }
      if (newRole === 'OWNER' || newRole === 'ADMIN') {
        throw new ForbiddenError('Admins cannot promote users to Admin or Owner.');
      }
    }

    // Cannot demote last remaining owner
    if (targetMember.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await workspaceRepository.countOwnerMembers(workspaceId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot demote the only remaining workspace owner. Please designate another Owner first.');
      }
    }

    const updated = await workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole);
    const user = await userRepository.findById(targetUserId);

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      role: updated.role,
      joinedAt: updated.joinedAt.toISOString(),
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString(),
          }
        : {
            id: targetUserId,
            email: 'unknown@example.com',
            name: 'User',
            avatarUrl: null,
            createdAt: new Date().toISOString(),
          },
    };
  }

  public async removeMember(
    workspaceId: string,
    targetUserId: string,
    requesterRole: Role,
    requesterId: string
  ): Promise<void> {
    const targetMember = await workspaceRepository.findMember(workspaceId, targetUserId);
    if (!targetMember) {
      throw new NotFoundError('Member not found in workspace');
    }

    // If removing oneself (leaving workspace)
    const isSelf = targetUserId === requesterId;

    if (!isSelf && requesterRole === 'MEMBER') {
      throw new ForbiddenError('Members cannot remove other members.');
    }

    if (!isSelf && requesterRole === 'ADMIN' && (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN')) {
      throw new ForbiddenError('Admins cannot remove Owners or fellow Admins.');
    }

    // Cannot remove last remaining owner
    if (targetMember.role === 'OWNER') {
      const ownerCount = await workspaceRepository.countOwnerMembers(workspaceId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the only remaining workspace owner. Transfer ownership or assign another Owner first.');
      }
    }

    await workspaceRepository.removeMember(workspaceId, targetUserId);
  }
}

export const workspaceService = new WorkspaceService();
