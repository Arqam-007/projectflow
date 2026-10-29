import type { Role } from '@prisma/client';
import { projectRepository, type ProjectRecord, type ProjectMemberWithUser } from '../repositories/project.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
  ProjectSummary,
  ProjectMemberSummary,
} from '../../../../packages/shared/src/types.js';

export function sanitizeProject(p: ProjectRecord): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    key: p.key,
    description: p.description,
    status: p.status,
    workspaceId: p.workspaceId,
    ownerId: p.ownerId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function sanitizeProjectMember(m: ProjectMemberWithUser): ProjectMemberSummary {
  return {
    id: m.id,
    projectId: m.projectId,
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

export class ProjectService {
  public async createProject(
    workspaceId: string,
    userId: string,
    data: CreateProjectRequest
  ): Promise<ProjectSummary> {
    const key = data.key.trim().toUpperCase();

    // Verify key uniqueness within the workspace
    const existingProjects = await projectRepository.findByWorkspace(workspaceId);
    if (existingProjects.some((p) => p.key === key)) {
      throw new ConflictError(`Project with key "${key}" already exists in this workspace.`);
    }

    const project = await projectRepository.create({
      name: data.name.trim(),
      key,
      description: data.description?.trim(),
      status: data.status || 'ACTIVE',
      workspaceId,
      ownerId: userId,
    });

    return sanitizeProject(project);
  }

  public async listWorkspaceProjects(workspaceId: string, userId: string): Promise<ProjectSummary[]> {
    const projects = await projectRepository.findUserProjectsInWorkspace(workspaceId, userId);
    return projects.map(sanitizeProject);
  }

  public async getProjectById(projectId: string): Promise<ProjectSummary> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    return sanitizeProject(project);
  }

  public async updateProject(projectId: string, data: UpdateProjectRequest): Promise<ProjectSummary> {
    const project = await projectRepository.update(projectId, {
      name: data.name?.trim(),
      description: data.description !== undefined ? data.description.trim() : undefined,
      status: data.status,
    });
    return sanitizeProject(project);
  }

  public async deleteProject(projectId: string): Promise<void> {
    await projectRepository.delete(projectId);
  }

  public async listMembers(projectId: string): Promise<ProjectMemberSummary[]> {
    const members = await projectRepository.listMembers(projectId);
    return members.map(sanitizeProjectMember);
  }

  public async addMember(
    projectId: string,
    data: AddMemberRequest,
    requesterRole: Role
  ): Promise<ProjectMemberSummary> {
    const normalizedEmail = data.email.trim().toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundError(`No registered user found with email "${normalizedEmail}"`);
    }

    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    // Cross-workspace integrity: ensure user is a member of the parent workspace
    let wsMember = await workspaceRepository.findMember(project.workspaceId, user.id);
    if (!wsMember) {
      // Add user to the parent workspace as MEMBER to preserve tenant hierarchy
      await workspaceRepository.addMember(project.workspaceId, user.id, 'MEMBER');
    }

    // Check duplicate project membership
    const existingMember = await projectRepository.findMember(projectId, user.id);
    if (existingMember) {
      throw new ConflictError(`User ${user.name} is already a member of this project with role "${existingMember.role}"`);
    }

    // RBAC: Admins can only assign MEMBER or VIEWER
    if (requesterRole === 'ADMIN' && (data.role === 'OWNER' || data.role === 'ADMIN')) {
      throw new ForbiddenError('Project Admins can only add Members or Viewers.');
    }

    const createdMember = await projectRepository.addMember(projectId, user.id, data.role);

    return {
      id: createdMember.id,
      projectId: createdMember.projectId,
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
    projectId: string,
    targetUserId: string,
    newRole: Role,
    requesterRole: Role,
    requesterId: string
  ): Promise<ProjectMemberSummary> {
    const targetMember = await projectRepository.findMember(projectId, targetUserId);
    if (!targetMember) {
      throw new NotFoundError('Member not found in project');
    }

    if (requesterRole === 'ADMIN') {
      if (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN') {
        throw new ForbiddenError('Admins cannot change roles of other Admins or Owners.');
      }
      if (newRole === 'OWNER' || newRole === 'ADMIN') {
        throw new ForbiddenError('Admins cannot promote users to Admin or Owner.');
      }
    }

    // Cannot demote last remaining project owner
    if (targetMember.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await projectRepository.countOwnerMembers(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot demote the only remaining project owner. Designate another Owner first.');
      }
    }

    const updated = await projectRepository.updateMemberRole(projectId, targetUserId, newRole);
    const user = await userRepository.findById(targetUserId);

    return {
      id: updated.id,
      projectId: updated.projectId,
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
    projectId: string,
    targetUserId: string,
    requesterRole: Role,
    requesterId: string
  ): Promise<void> {
    const targetMember = await projectRepository.findMember(projectId, targetUserId);
    if (!targetMember) {
      throw new NotFoundError('Member not found in project');
    }

    const isSelf = targetUserId === requesterId;

    if (!isSelf && requesterRole === 'MEMBER') {
      throw new ForbiddenError('Members cannot remove other project members.');
    }

    if (!isSelf && requesterRole === 'ADMIN' && (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN')) {
      throw new ForbiddenError('Admins cannot remove Owners or fellow Admins.');
    }

    if (targetMember.role === 'OWNER') {
      const ownerCount = await projectRepository.countOwnerMembers(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the only remaining project owner.');
      }
    }

    await projectRepository.removeMember(projectId, targetUserId);
  }
}

export const projectService = new ProjectService();
