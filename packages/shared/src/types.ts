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
  taskNumber: number;
  taskKey?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  orderIndex: number;
  projectId: string;
  creatorId: string;
  assigneeId?: string | null;
  creator?: UserSummary;
  assignee?: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  orderIndex?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  orderIndex?: number;
  projectId?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  orderIndex?: number;
}

export interface TaskFilterParams {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigneeId?: string; // user ID or 'unassigned'
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdueOnly?: boolean;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'taskNumber' | 'title' | 'status' | 'orderIndex';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'TASK_DELETED'
  | 'PROJECT_CREATED'
  | 'MEMBER_INVITED'
  | 'MEMBER_REMOVED'
  | 'ROLE_UPDATED';

export interface ActivitySummary {
  id: string;
  workspaceId?: string | null;
  projectId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  project?: {
    id: string;
    name: string;
    key: string;
  };
}

export interface TaskStatusCounts {
  TODO: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
  BACKLOG: number;
}

export interface TaskPriorityCounts {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
}

export interface ProjectAnalyticsSummary {
  projectId: string;
  projectName: string;
  projectKey: string;
  totalTasks: number;
  completedTasks: number;
  outstandingTasks: number;
  completionRate: number; // percentage rounded to 1 decimal place
  statusCounts: TaskStatusCounts;
  priorityCounts: TaskPriorityCounts;
  overdueTasksCount: number;
  upcomingTasksCount: number;
  overdueTasks: TaskSummary[];
  upcomingTasks: TaskSummary[];
  generatedAt?: string;
}

export interface WorkspaceAnalyticsSummary {
  workspaceId: string;
  workspaceName: string;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  outstandingTasks: number;
  completionRate: number;
  statusCounts: TaskStatusCounts;
  priorityCounts: TaskPriorityCounts;
  overdueTasksCount: number;
  upcomingTasksCount: number;
  projectBreakdowns: {
    id: string;
    name: string;
    key: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    overdueTasksCount: number;
  }[];
  generatedAt?: string;
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
