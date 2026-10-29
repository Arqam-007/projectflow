import type { Response, NextFunction } from 'express';
import type { AuthorizedRequest } from '../middleware/rbac.js';
import { workspaceService } from '../services/workspace.service.js';
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest, AddMemberRequest, UpdateRoleRequest } from '../../../../packages/shared/src/types.js';

export async function createWorkspaceHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: CreateWorkspaceRequest = req.body;
    const workspace = await workspaceService.createWorkspace(req.user!.id, payload);

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkspacesHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaces = await workspaceService.listUserWorkspaces(req.user!.id);

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId);

    res.status(200).json({
      success: true,
      data: {
        ...workspace,
        currentUserRole: req.workspaceRole,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspaceHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateWorkspaceRequest = req.body;
    const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, payload);

    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspaceHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await workspaceService.deleteWorkspace(req.params.workspaceId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Workspace successfully deleted',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkspaceMembersHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const members = await workspaceService.listMembers(req.params.workspaceId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

export async function addWorkspaceMemberHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: AddMemberRequest = req.body;
    const member = await workspaceService.addMember(req.params.workspaceId, payload, req.workspaceRole!);

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspaceMemberRoleHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload: UpdateRoleRequest = req.body;
    const member = await workspaceService.updateMemberRole(
      req.params.workspaceId,
      req.params.userId,
      payload.role,
      req.workspaceRole!,
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

export async function removeWorkspaceMemberHandler(
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await workspaceService.removeMember(
      req.params.workspaceId,
      req.params.userId,
      req.workspaceRole!,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Member removed from workspace successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}
