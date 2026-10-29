import type { Response, NextFunction } from 'express';
import type { AuthorizedRequest } from '../middleware/rbac.js';
import { projectService } from '../services/project.service.js';
import type { CreateProjectRequest, UpdateProjectRequest, AddMemberRequest, UpdateRoleRequest } from '../../../../packages/shared/src/types.js';

export async function createProjectHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: CreateProjectRequest = req.body;
    const project = await projectService.createProject(
      req.params.workspaceId,
      req.user!.id,
      payload
    );

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkspaceProjectsHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await projectService.listWorkspaceProjects(
      req.params.workspaceId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await projectService.getProjectById(req.params.projectId);

    res.status(200).json({
      success: true,
      data: {
        ...project,
        currentUserRole: req.projectRole,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProjectHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateProjectRequest = req.body;
    const project = await projectService.updateProject(req.params.projectId, payload);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProjectHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await projectService.deleteProject(req.params.projectId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Project successfully deleted',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listProjectMembersHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const members = await projectService.listMembers(req.params.projectId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

export async function addProjectMemberHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: AddMemberRequest = req.body;
    const member = await projectService.addMember(req.params.projectId, payload, req.projectRole!);

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProjectMemberRoleHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateRoleRequest = req.body;
    const member = await projectService.updateMemberRole(
      req.params.projectId,
      req.params.userId,
      payload.role,
      req.projectRole!,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeProjectMemberHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await projectService.removeMember(
      req.params.projectId,
      req.params.userId,
      req.projectRole!,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Member removed from project successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}
