export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserSummary;
  accessToken: string;
  expiresIn: string;
}

export interface JwtAuthPayload {
  userId: string;
  email: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    members: number;
  };
}

export interface WorkspaceMemberSummary {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: UserSummary;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  workspaceId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    tasks: number;
  };
}

export interface ProjectMemberSummary {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: UserSummary;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  email: string;
  role: Role;
}

export interface UpdateRoleRequest {
  role: Role;
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  description?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface TaskSummary {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  orderIndex: number;
  projectId: string;
  creatorId: string;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  serverTime: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  database: {
    configured: boolean;
    provider: 'postgresql';
    connected: boolean;
    message: string;
  };
}
