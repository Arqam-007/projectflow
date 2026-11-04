import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  X,
  Bell,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Plus,
} from 'lucide-react';
import type {
  HealthResponse,
  UserSummary,
  WorkspaceSummary,
  WorkspaceMemberSummary,
  ProjectSummary,
  ProjectMemberSummary,
  Role,
  ProjectStatus,
  TaskSummary,
  TaskStatus,
  TaskPriority,
  ProjectAnalyticsSummary,
  WorkspaceAnalyticsSummary,
  ActivitySummary,
  PaginationMeta,
} from '../../../packages/shared/src/types.js';

import { Sidebar } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { KanbanBoardView } from './components/KanbanBoardView.js';
import { WorkspacesView } from './components/WorkspacesView.js';
import { SpecsAndDevOpsView } from './components/SpecsAndDevOpsView.js';
import { AuthScreen } from './components/AuthScreen.js';
import {
  CreateTaskModal,
  EditTaskModal,
  CreateWorkspaceModal,
  CreateProjectModal,
  InviteMemberModal,
} from './components/Modals.js';

export default function App() {
  // Navigation & Shell State
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'board' | 'workspaces' | 'auth' | 'rbac' | 'architecture' | 'devops'
  >('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('projectflow_token'));
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Workspaces & Projects State
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<Role | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberSummary[]>([]);

  // Analytics & Activity Logs State
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalyticsSummary | null>(null);
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState<WorkspaceAnalyticsSummary | null>(null);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Tasks & Filtering State
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskFilterSearch, setTaskFilterSearch] = useState('');
  const [taskFilterPriority, setTaskFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('ALL');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState<string>('orderIndex');
  const [filterSortOrder, setFilterSortOrder] = useState<'asc' | 'desc'>('asc');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Modals State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState('');
  const [createTaskDesc, setCreateTaskDesc] = useState('');
  const [createTaskPriority, setCreateTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>('TODO');
  const [createTaskAssigneeId, setCreateTaskAssigneeId] = useState<string>('');
  const [createTaskDueDate, setCreateTaskDueDate] = useState<string>('');
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);

  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>('TODO');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState<string>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>('');
  const [editTaskSubmitting, setEditTaskSubmitting] = useState(false);

  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsSlug, setNewWsSlug] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<ProjectStatus>('ACTIVE');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('MEMBER');

  // Notifications & Feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Health Telemetry
  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setHealthData(json.data);
      }
    } catch {
      // Degraded / offline
    } finally {
      setLoadingHealth(false);
    }
  };

  // 2. Session Verification
  const verifyActiveSession = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data?.user) {
          setCurrentUser(body.data.user);
          loadWorkspaces(currentToken);
          return;
        }
      }
      localStorage.removeItem('projectflow_token');
      setToken(null);
      setCurrentUser(null);
    } catch {
      localStorage.removeItem('projectflow_token');
      setToken(null);
      setCurrentUser(null);
    }
  }, []);

  // 3. Load Workspaces
  const loadWorkspaces = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (body.success && body.data) {
        setWorkspaces(body.data);
        if (body.data.length > 0 && !selectedWorkspace) {
          selectWorkspace(body.data[0], authToken);
        }
      }
    } catch (err) {
      console.error('Error loading workspaces:', err);
    }
  };

  // 4. Select Workspace
  const selectWorkspace = async (ws: WorkspaceSummary, authToken = token) => {
    setSelectedWorkspace(ws);
    setSelectedProject(null);
    setTasks([]);
    if (!authToken) return;

    try {
      // Workspace details & user role
      const wsRes = await fetch(`/api/v1/workspaces/${ws.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const wsBody = await wsRes.json();
      if (wsBody.success && wsBody.data) {
        setWorkspaceRole(wsBody.data.currentUserRole || 'MEMBER');
      }

      // Workspace members
      const membersRes = await fetch(`/api/v1/workspaces/${ws.id}/members`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const membersBody = await membersRes.json();
      if (membersBody.success && membersBody.data) {
        setWorkspaceMembers(membersBody.data);
      }

      // Workspace projects
      const prjRes = await fetch(`/api/v1/workspaces/${ws.id}/projects`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const prjBody = await prjRes.json();
      if (prjBody.success && prjBody.data) {
        setProjects(prjBody.data);
        if (prjBody.data.length > 0) {
          selectProject(prjBody.data[0], authToken, ws.id);
        }
      }

      // Workspace analytics
      fetchWorkspaceAnalytics(ws.id, authToken);
    } catch (err) {
      console.error('Error selecting workspace:', err);
    }
  };

  // 5. Select Project
  const selectProject = async (prj: ProjectSummary, authToken = token, wsId = selectedWorkspace?.id) => {
    setSelectedProject(prj);
    if (!authToken) return;

    try {
      // Project members
      const pMembersRes = await fetch(`/api/v1/projects/${prj.id}/members`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const pMembersBody = await pMembersRes.json();
      if (pMembersBody.success && pMembersBody.data) {
        setProjectMembers(pMembersBody.data);
      }

      // Load tasks & analytics
      loadTasks(prj.id, authToken);
      fetchProjectAnalytics(prj.id, authToken);
      fetchActivities(prj.id, wsId, authToken);
    } catch (err) {
      console.error('Error selecting project:', err);
    }
  };

  // 6. Load Filtered Tasks
  const loadTasks = async (
    projectId = selectedProject?.id,
    authToken = token,
    search = taskFilterSearch,
    priority = taskFilterPriority,
    assignee = taskFilterAssignee,
    overdue = filterOverdueOnly,
    sort = filterSortBy,
    order = filterSortOrder
  ) => {
    if (!projectId || !authToken) return;
    setLoadingTasks(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (priority !== 'ALL') params.set('priority', priority);
      if (assignee !== 'ALL') params.set('assigneeId', assignee);
      if (overdue) params.set('overdueOnly', 'true');
      if (sort) params.set('sortBy', sort);
      if (order) params.set('sortOrder', order);
      params.set('limit', '100');

      const res = await fetch(`/api/v1/projects/${projectId}/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (body.success && body.data) {
        setTasks(body.data);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // 7. Analytics & Activities Fetchers
  const fetchProjectAnalytics = async (projectId: string, authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (body.success && body.data) {
        setProjectAnalytics(body.data);
      }
    } catch (err) {
      console.error('Error loading project analytics:', err);
    }
  };

  const fetchWorkspaceAnalytics = async (wsId: string, authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${wsId}/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (body.success && body.data) {
        setWorkspaceAnalytics(body.data);
      }
    } catch (err) {
      console.error('Error loading workspace analytics:', err);
    }
  };

  const fetchActivities = async (projectId?: string, wsId = selectedWorkspace?.id, authToken = token) => {
    if (!authToken) return;
    try {
      const url = projectId
        ? `/api/v1/projects/${projectId}/activities?limit=15`
        : wsId
        ? `/api/v1/workspaces/${wsId}/activities?limit=15`
        : null;
      if (!url) return;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (body.success && body.data) {
        setActivities(body.data);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  // 8. Task Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !token) return;
    setCreateTaskSubmitting(true);

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: createTaskTitle.trim(),
          description: createTaskDesc.trim() || undefined,
          priority: createTaskPriority,
          status: createTaskStatus,
          assigneeId: createTaskAssigneeId || undefined,
          dueDate: createTaskDueDate ? new Date(createTaskDueDate).toISOString() : undefined,
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`Task ${body.data?.key || ''} created successfully!`);
        setShowCreateTaskModal(false);
        setCreateTaskTitle('');
        setCreateTaskDesc('');
        loadTasks();
        fetchProjectAnalytics(selectedProject.id);
        fetchActivities(selectedProject.id);
      } else {
        showToast(body.error?.message || 'Failed to create task', 'error');
      }
    } catch (err) {
      showToast('Network error while creating task', 'error');
    } finally {
      setCreateTaskSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !token) return;
    setEditTaskSubmitting(true);

    try {
      // 1. Update details
      const res = await fetch(`/api/v1/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim() || undefined,
          priority: editTaskPriority,
          assigneeId: editTaskAssigneeId || null,
          dueDate: editTaskDueDate ? new Date(editTaskDueDate).toISOString() : null,
        }),
      });

      // 2. Update status if changed
      if (editTaskStatus !== selectedTask.status) {
        await fetch(`/api/v1/tasks/${selectedTask.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: editTaskStatus }),
        });
      }

      showToast(`Task updated successfully!`);
      setShowEditTaskModal(false);
      loadTasks();
      if (selectedProject) {
        fetchProjectAnalytics(selectedProject.id);
        fetchActivities(selectedProject.id);
      }
    } catch (err) {
      showToast('Error updating task', 'error');
    } finally {
      setEditTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token || !confirm('Permanently delete this task?')) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Task deleted successfully');
        loadTasks();
        if (selectedProject) {
          fetchProjectAnalytics(selectedProject.id);
          fetchActivities(selectedProject.id);
        }
      } else {
        const body = await res.json();
        showToast(body.error?.message || 'Failed to delete task', 'error');
      }
    } catch {
      showToast('Error deleting task', 'error');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`Moved to ${newStatus}`);
        loadTasks();
        if (selectedProject) {
          fetchProjectAnalytics(selectedProject.id);
          fetchActivities(selectedProject.id);
        }
      } else {
        showToast(body.error?.message || 'Disallowed status transition', 'error');
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  // 9. Workspace & Project Creation Actions
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newWsName.trim(),
          slug: newWsSlug.trim(),
          description: newWsDesc.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`Workspace "${newWsName}" created!`);
        setShowCreateWsModal(false);
        setNewWsName('');
        setNewWsSlug('');
        setNewWsDesc('');
        loadWorkspaces();
      } else {
        showToast(body.error?.message || 'Error creating workspace', 'error');
      }
    } catch {
      showToast('Network error creating workspace', 'error');
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${wsId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Workspace deleted');
        setSelectedWorkspace(null);
        loadWorkspaces();
      } else {
        const body = await res.json();
        showToast(body.error?.message || 'Failed to delete workspace', 'error');
      }
    } catch {
      showToast('Network error deleting workspace', 'error');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !token) return;

    const trimmedName = newProjectName.trim();
    if (trimmedName.length < 2) {
      showToast('Project name must be at least 2 characters', 'error');
      return;
    }

    const sanitizedKey = newProjectKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (!/^[A-Z0-9]{2,10}$/.test(sanitizedKey)) {
      showToast('Project key must be 2–10 uppercase letters or numbers (A–Z, 0–9)', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/v1/workspaces/${selectedWorkspace.id}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          key: sanitizedKey,
          description: newProjectDesc.trim() || undefined,
          status: newProjectStatus,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`Project "${trimmedName}" [${sanitizedKey}] created!`);
        setShowCreateProjectModal(false);
        setNewProjectName('');
        setNewProjectKey('');
        setNewProjectDesc('');
        selectWorkspace(selectedWorkspace);
      } else {
        showToast(body.error?.message || 'Error creating project', 'error');
      }
    } catch {
      showToast('Network error creating project', 'error');
    }
  };

  const handleDeleteProject = async (prjId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/projects/${prjId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Project deleted');
        if (selectedWorkspace) selectWorkspace(selectedWorkspace);
      } else {
        const body = await res.json();
        showToast(body.error?.message || 'Failed to delete project', 'error');
      }
    } catch {
      showToast('Network error deleting project', 'error');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !token) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${selectedWorkspace.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        showToast(`Invited ${inviteEmail} as ${inviteRole}!`);
        setShowInviteModal(false);
        setInviteEmail('');
        selectWorkspace(selectedWorkspace);
      } else {
        showToast(body.error?.message || 'Failed to invite member', 'error');
      }
    } catch {
      showToast('Network error sending invite', 'error');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: Role) => {
    if (!selectedWorkspace || !token) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${selectedWorkspace.id}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast(`Role updated to ${newRole}`);
        selectWorkspace(selectedWorkspace);
      } else {
        const body = await res.json();
        showToast(body.error?.message || 'Failed to update role', 'error');
      }
    } catch {
      showToast('Network error updating role', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedWorkspace || !token) return;
    try {
      const res = await fetch(`/api/v1/workspaces/${selectedWorkspace.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Member removed');
        selectWorkspace(selectedWorkspace);
      } else {
        const body = await res.json();
        showToast(body.error?.message || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Network error removing member', 'error');
    }
  };

  // 10. Auth Handlers
  const handleLogin = async (email: string, pass: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const body = await res.json();
      if (res.ok && body.success && body.data) {
        localStorage.setItem('projectflow_token', body.data.accessToken);
        setToken(body.data.accessToken);
        setCurrentUser(body.data.user);
        showToast(`Welcome back, ${body.data.user.name}!`);
        loadWorkspaces(body.data.accessToken);
      } else {
        setAuthError(body.error?.message || 'Invalid email or password');
      }
    } catch {
      setAuthError('Network error connecting to auth server');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (name: string, email: string, pass: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass }),
      });
      const body = await res.json();
      if (res.ok && body.success && body.data) {
        localStorage.setItem('projectflow_token', body.data.accessToken);
        setToken(body.data.accessToken);
        setCurrentUser(body.data.user);
        showToast(`Account registered successfully!`);
        loadWorkspaces(body.data.accessToken);
      } else {
        setAuthError(body.error?.message || 'Registration failed');
      }
    } catch {
      setAuthError('Network error connecting to auth server');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignored
      }
    }
    localStorage.removeItem('projectflow_token');
    setToken(null);
    setCurrentUser(null);
    setSelectedWorkspace(null);
    setSelectedProject(null);
    setTasks([]);
    showToast('Logged out successfully');
  };

  // Initial Load & Session Check
  useEffect(() => {
    fetchHealth();
    if (token) {
      verifyActiveSession(token);
    }
  }, [token, verifyActiveSession]);

  // When filters change, reload tasks
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    }
  }, [
    taskFilterSearch,
    taskFilterPriority,
    taskFilterAssignee,
    filterOverdueOnly,
    filterSortBy,
    filterSortOrder,
  ]);

  // Render Authentication Screen if not logged in
  if (!token || !currentUser) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        authSubmitting={authSubmitting}
        authError={authError}
        authSuccessMsg={authSuccessMsg}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030407] text-[#F5F7FA] overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold animate-in slide-in-from-top-3 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-[#0B0E14] border-[#D4FF24]/40 text-[#D4FF24]'
              : 'bg-[#0B0E14] border-rose-500/40 text-rose-400'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#D4FF24]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={selectWorkspace}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => selectProject(p)}
        currentUser={currentUser}
        workspaceRole={workspaceRole}
        onLogout={handleLogout}
        onOpenCreateWorkspace={() => setShowCreateWsModal(true)}
        onOpenCreateProject={() => setShowCreateProjectModal(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 bg-[#0B0E14] border-b border-white/[0.08] px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.06] md:hidden"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-[#9299A8]">
                <span className="font-semibold text-white">
                  {selectedWorkspace?.name || 'Workspace'}
                </span>
                {selectedProject && (
                  <>
                    <span>/</span>
                    <span className="text-[#1558C9] font-semibold">{selectedProject.name}</span>
                    <span className="text-[10px] font-mono text-[#D4FF24]">[{selectedProject.key}]</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateTaskModal(true)}
              disabled={!selectedProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] disabled:opacity-40 text-white text-xs font-semibold shadow-[0_2px_12px_rgba(21,88,201,0.3)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            <button
              onClick={() => setActiveTab('devops')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111722] hover:bg-[#161e2e] text-[#9299A8] hover:text-white border border-white/[0.06] text-xs font-mono transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">112 Tests PASS</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              selectedWorkspace={selectedWorkspace}
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={(p) => selectProject(p)}
              projectAnalytics={projectAnalytics}
              workspaceAnalytics={workspaceAnalytics}
              activities={activities}
              loadingAnalytics={loadingAnalytics}
              onOpenCreateTask={() => setShowCreateTaskModal(true)}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
              onOpenInviteMember={() => setShowInviteModal(true)}
              onNavigateToBoard={() => setActiveTab('board')}
            />
          )}

          {activeTab === 'board' && (
            <KanbanBoardView
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={(p) => selectProject(p)}
              tasks={tasks}
              projectMembers={projectMembers}
              loadingTasks={loadingTasks}
              onOpenCreateTask={() => setShowCreateTaskModal(true)}
              onOpenEditTask={(task) => {
                setSelectedTask(task);
                setEditTaskTitle(task.title);
                setEditTaskDesc(task.description || '');
                setEditTaskPriority(task.priority);
                setEditTaskStatus(task.status);
                setEditTaskAssigneeId(task.assigneeId || '');
                setEditTaskDueDate(
                  task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
                );
                setShowEditTaskModal(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              searchQuery={taskFilterSearch}
              setSearchQuery={setTaskFilterSearch}
              priorityFilter={taskFilterPriority}
              setPriorityFilter={setTaskFilterPriority}
              assigneeFilter={taskFilterAssignee}
              setAssigneeFilter={setTaskFilterAssignee}
              overdueOnly={filterOverdueOnly}
              setOverdueOnly={setFilterOverdueOnly}
              sortBy={filterSortBy}
              setSortBy={setFilterSortBy}
              sortOrder={filterSortOrder}
              setSortOrder={setFilterSortOrder}
              draggedTaskId={draggedTaskId}
              setDraggedTaskId={setDraggedTaskId}
              dragOverColumn={dragOverColumn}
              setDragOverColumn={setDragOverColumn}
            />
          )}

          {activeTab === 'workspaces' && (
            <WorkspacesView
              selectedWorkspace={selectedWorkspace}
              workspaceMembers={workspaceMembers}
              projects={projects}
              workspaceRole={workspaceRole}
              currentUser={currentUser}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
              onOpenInviteMember={() => setShowInviteModal(true)}
              onDeleteWorkspace={handleDeleteWorkspace}
              onDeleteProject={handleDeleteProject}
              onUpdateMemberRole={handleUpdateMemberRole}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {(activeTab === 'rbac' || activeTab === 'architecture' || activeTab === 'devops') && (
            <SpecsAndDevOpsView
              activeTab={activeTab}
              healthData={healthData}
              loadingHealth={loadingHealth}
              onRefreshHealth={fetchHealth}
              workspaceRole={workspaceRole}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onSubmit={handleCreateTask}
        projectName={selectedProject?.name || ''}
        projectKey={selectedProject?.key || ''}
        projectMembers={projectMembers}
        title={createTaskTitle}
        setTitle={setCreateTaskTitle}
        description={createTaskDesc}
        setDescription={setCreateTaskDesc}
        priority={createTaskPriority}
        setPriority={setCreateTaskPriority}
        status={createTaskStatus}
        setStatus={setCreateTaskStatus}
        assigneeId={createTaskAssigneeId}
        setAssigneeId={setCreateTaskAssigneeId}
        dueDate={createTaskDueDate}
        setDueDate={setCreateTaskDueDate}
        submitting={createTaskSubmitting}
      />

      <EditTaskModal
        isOpen={showEditTaskModal}
        onClose={() => setShowEditTaskModal(false)}
        onSubmit={handleUpdateTask}
        task={selectedTask}
        projectMembers={projectMembers}
        title={editTaskTitle}
        setTitle={setEditTaskTitle}
        description={editTaskDesc}
        setDescription={setEditTaskDesc}
        priority={editTaskPriority}
        setPriority={setEditTaskPriority}
        status={editTaskStatus}
        setStatus={setEditTaskStatus}
        assigneeId={editTaskAssigneeId}
        setAssigneeId={setEditTaskAssigneeId}
        dueDate={editTaskDueDate}
        setDueDate={setEditTaskDueDate}
        submitting={editTaskSubmitting}
      />

      <CreateWorkspaceModal
        isOpen={showCreateWsModal}
        onClose={() => setShowCreateWsModal(false)}
        onSubmit={handleCreateWorkspace}
        name={newWsName}
        setName={setNewWsName}
        slug={newWsSlug}
        setSlug={setNewWsSlug}
        description={newWsDesc}
        setDescription={setNewWsDesc}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSubmit={handleCreateProject}
        name={newProjectName}
        setName={setNewProjectName}
        keyStr={newProjectKey}
        setKeyStr={setNewProjectKey}
        description={newProjectDesc}
        setDescription={setNewProjectDesc}
        status={newProjectStatus}
        setStatus={setNewProjectStatus}
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteMember}
        email={inviteEmail}
        setEmail={setInviteEmail}
        role={inviteRole}
        setRole={setInviteRole}
        workspaceName={selectedWorkspace?.name || ''}
      />
    </div>
  );
}
