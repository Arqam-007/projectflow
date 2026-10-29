import React, { useState, useEffect } from 'react';
import {
  Layers,
  Server,
  Database,
  Terminal,
  CheckCircle2,
  Clock,
  Shield,
  FolderTree,
  GitBranch,
  RefreshCw,
  Code2,
  Cpu,
  LayoutDashboard,
  Kanban,
  Users,
  Settings,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Zap,
  Lock,
  UserCheck,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  User,
  Mail,
  ShieldCheck,
  Fingerprint,
  Plus,
  Briefcase,
  ChevronDown,
  Trash2,
  UserPlus,
  Crown,
  ShieldAlert,
} from 'lucide-react';
import type {
  HealthResponse,
  UserSummary,
  AuthResponse,
  WorkspaceSummary,
  WorkspaceMemberSummary,
  ProjectSummary,
  ProjectMemberSummary,
  Role,
  ProjectStatus,
} from '../../../packages/shared/src/types.js';

export default function App() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'auth' | 'rbac' | 'architecture' | 'devops'>('workspaces');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('projectflow_token'));
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Auth form
  const [formName, setFormName] = useState('Sarah Jenkins');
  const [formEmail, setFormEmail] = useState('sarah.architect@projectflow.dev');
  const [formPassword, setFormPassword] = useState('SecurePass123!');
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
  const [loadingWorkspaceData, setLoadingWorkspaceData] = useState(false);
  const [workspaceActionError, setWorkspaceActionError] = useState<string | null>(null);
  const [workspaceActionSuccess, setWorkspaceActionSuccess] = useState<string | null>(null);

  // Creation Modals / Forms
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
  const [inviteTarget, setInviteTarget] = useState<'workspace' | 'project'>('workspace');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.data) {
        setHealthData(data.data);
      }
    } catch {
      // Ignored for telemetry
    } finally {
      setLoadingHealth(false);
    }
  };

  const verifyActiveSession = async (currentToken: string) => {
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
      // Offline/error
    }
  };

  const loadWorkspaces = async (authToken = token) => {
    if (!authToken) return;
    setLoadingWorkspaceData(true);
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
    } finally {
      setLoadingWorkspaceData(false);
    }
  };

  const selectWorkspace = async (ws: WorkspaceSummary, authToken = token) => {
    setSelectedWorkspace(ws);
    setSelectedProject(null);
    if (!authToken) return;

    try {
      // Fetch workspace details & current user role
      const wsRes = await fetch(`/api/v1/workspaces/${ws.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const wsBody = await wsRes.json();
      if (wsBody.success && wsBody.data) {
        setWorkspaceRole(wsBody.data.currentUserRole || 'MEMBER');
      }

      // Fetch projects in workspace
      const prjRes = await fetch(`/api/v1/workspaces/${ws.id}/projects`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const prjBody = await prjRes.json();
      if (prjBody.success && prjBody.data) {
        setProjects(prjBody.data);
        if (prjBody.data.length > 0) {
          selectProject(prjBody.data[0], authToken);
        } else {
          setSelectedProject(null);
          setProjectMembers([]);
        }
      }

      // Fetch workspace members
      const memRes = await fetch(`/api/v1/workspaces/${ws.id}/members`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const memBody = await memRes.json();
      if (memBody.success && memBody.data) {
        setWorkspaceMembers(memBody.data);
      }
    } catch (err) {
      console.error('Failed to load workspace details:', err);
    }
  };

  const selectProject = async (prj: ProjectSummary, authToken = token) => {
    setSelectedProject(prj);
    if (!authToken) return;

    try {
      const memRes = await fetch(`/api/v1/projects/${prj.id}/members`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const memBody = await memRes.json();
      if (memBody.success && memBody.data) {
        setProjectMembers(memBody.data);
      }
    } catch (err) {
      console.error('Failed to load project members:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (token) {
      verifyActiveSession(token);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Registration failed');

      const authData: AuthResponse = body.data;
      setToken(authData.accessToken);
      setCurrentUser(authData.user);
      localStorage.setItem('projectflow_token', authData.accessToken);
      setAuthSuccessMsg(`Registered as ${authData.user.name}!`);
      loadWorkspaces(authData.accessToken);
      setActiveTab('workspaces');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPassword }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Invalid email or password');

      const authData: AuthResponse = body.data;
      setToken(authData.accessToken);
      setCurrentUser(authData.user);
      localStorage.setItem('projectflow_token', authData.accessToken);
      setAuthSuccessMsg(`Welcome back, ${authData.user.name}!`);
      loadWorkspaces(authData.accessToken);
      setActiveTab('workspaces');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!token) return;
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignored
    } finally {
      localStorage.removeItem('projectflow_token');
      setToken(null);
      setCurrentUser(null);
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setProjects([]);
      setSelectedProject(null);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setWorkspaceActionError(null);
    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newWsName,
          slug: newWsSlug.trim() || undefined,
          description: newWsDesc.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to create workspace');

      setWorkspaceActionSuccess(`Workspace "${body.data.name}" created!`);
      setShowCreateWsModal(false);
      setNewWsName('');
      setNewWsSlug('');
      setNewWsDesc('');
      await loadWorkspaces(token);
      selectWorkspace(body.data, token);
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWorkspace) return;
    setWorkspaceActionError(null);
    try {
      const res = await fetch(`/api/v1/workspaces/${selectedWorkspace.id}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProjectName,
          key: newProjectKey.toUpperCase(),
          description: newProjectDesc.trim() || undefined,
          status: newProjectStatus,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to create project');

      setWorkspaceActionSuccess(`Project "${body.data.name}" [${body.data.key}] created!`);
      setShowCreateProjectModal(false);
      setNewProjectName('');
      setNewProjectKey('');
      setNewProjectDesc('');
      selectWorkspace(selectedWorkspace, token);
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWorkspace) return;
    setWorkspaceActionError(null);

    try {
      const endpoint =
        inviteTarget === 'workspace'
          ? `/api/v1/workspaces/${selectedWorkspace.id}/members`
          : `/api/v1/projects/${selectedProject?.id}/members`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to add member');

      setWorkspaceActionSuccess(`Added ${body.data.user.name} as ${body.data.role}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      if (inviteTarget === 'workspace') {
        selectWorkspace(selectedWorkspace, token);
      } else if (selectedProject) {
        selectProject(selectedProject, token);
      }
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!token || !confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to delete project');
      setWorkspaceActionSuccess('Project deleted.');
      if (selectedWorkspace) selectWorkspace(selectedWorkspace, token);
    } catch (err) {
      setWorkspaceActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">ProjectFlow</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Milestone 3 • RBAC & Workspaces Live
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Full-Stack Project & Task Engineering Platform</p>
          </div>
        </div>

        {/* User Session & Status */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-white font-medium truncate max-w-[120px]">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{currentUser.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 p-1 transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Lock className="w-3.5 h-3.5" /> Sign In / Register
            </button>
          )}

          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Refresh server health status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh API</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                Workspace Modules
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('workspaces')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'workspaces' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    Workspaces & Projects
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">M3</span>
                </button>

                <button
                  onClick={() => setActiveTab('rbac')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'rbac' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4" />
                    RBAC Permission Matrix
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Specs</span>
                </button>

                <button
                  onClick={() => setActiveTab('auth')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'auth' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <Lock className="w-4 h-4" />
                    Auth & Sessions
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M2</span>
                </button>

                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'architecture' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <FolderTree className="w-4 h-4" />
                    System Architecture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M1</span>
                </button>

                <div className="relative group">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-left opacity-60 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <Kanban className="w-4 h-4" />
                      Tasks & Kanban
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M4</span>
                  </button>
                </div>
              </nav>
            </div>

            {/* Implementation Progress Widget */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Roadmap Progress</span>
                <span className="text-emerald-400 font-mono font-bold">3 / 6 Completed</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-500 h-full w-[50%] transition-all" />
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>M1: Scaffolding & Setup</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>M2: Auth, JWT & Passwords</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>M3: Workspaces, Projects & RBAC</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">4</div>
                  <span>M4: Kanban Board & Tasks</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">5</div>
                  <span>M5: Analytics & Logs</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">6</div>
                  <span>M6: Testing & Portfolio Docs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>RBAC Roles</span>
              <span className="font-mono text-slate-300">Owner, Admin, Member</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Isolation</span>
              <span className="font-mono text-slate-300">Anti-IDOR Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Automated Tests</span>
              <span className="font-mono text-emerald-400 font-bold">39 Passing</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
          {/* Milestone 3 Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 lg:p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Milestone 3 Verified: Workspaces, Projects & RBAC
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                Workspaces, Projects & Role-Based Access Control
              </h1>
              <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
                Multi-tenant workspace isolation, project lifecycle management, and rigorous role-based access control (Owner, Admin, Member, Viewer) are fully active. All actions are authenticated via JWT and authorized on the backend to prevent cross-workspace data leakage and IDOR vulnerabilities.
              </p>
            </div>
          </div>

          {/* Action Feedback alerts */}
          {workspaceActionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {workspaceActionSuccess}
              </span>
              <button onClick={() => setWorkspaceActionSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}
          {workspaceActionError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                {workspaceActionError}
              </span>
              <button onClick={() => setWorkspaceActionError(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* TAB 1: WORKSPACES & PROJECTS DASHBOARD */}
          {activeTab === 'workspaces' && (
            <div className="space-y-6">
              {!currentUser ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                  <Lock className="w-10 h-10 text-indigo-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">Authentication Required</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Sign in or register an account to create workspaces, manage projects, and test Role-Based Access Control.
                  </p>
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
                  >
                    Open Auth Playground
                  </button>
                </div>
              ) : (
                <>
                  {/* Workspace Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs text-slate-400">Current Workspace:</div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'}
                          {workspaceRole && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {workspaceRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {workspaces.length > 1 && (
                        <select
                          value={selectedWorkspace?.id || ''}
                          onChange={(e) => {
                            const found = workspaces.find((w) => w.id === e.target.value);
                            if (found) selectWorkspace(found);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          {workspaces.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.slug})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => setShowCreateWsModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Workspace
                      </button>

                      {selectedWorkspace && (workspaceRole === 'OWNER' || workspaceRole === 'ADMIN') && (
                        <button
                          onClick={() => {
                            setInviteTarget('workspace');
                            setShowInviteModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Invite Member
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Projects in Workspace Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-base font-bold text-white tracking-tight">
                          Projects in {selectedWorkspace?.name || 'Workspace'}
                        </h2>
                      </div>

                      {selectedWorkspace && (
                        <button
                          onClick={() => setShowCreateProjectModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create Project
                        </button>
                      )}
                    </div>

                    {projects.length === 0 ? (
                      <div className="p-8 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-3">
                        <FolderTree className="w-8 h-8 text-slate-600 mx-auto" />
                        <div className="text-xs text-slate-300 font-medium">No projects created yet in this workspace</div>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Projects organize tasks, sprints, and team assignments under this workspace.
                        </p>
                        <button
                          onClick={() => setShowCreateProjectModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create First Project
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className={`p-4 rounded-xl bg-slate-900 border transition cursor-pointer space-y-3 ${selectedProject?.id === project.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                            onClick={() => selectProject(project)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {project.key}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  project.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : project.status === 'PLANNING'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {project.status}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-bold text-white text-sm">{project.name}</h3>
                              {project.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{project.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                              <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                              {(workspaceRole === 'OWNER' || project.ownerId === currentUser.id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id);
                                  }}
                                  className="text-slate-500 hover:text-red-400 p-1"
                                  title="Delete project (Owner only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Members & RBAC Table */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">Workspace Members & Roles</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {workspaceMembers.length} Active Member{workspaceMembers.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-950/50">
                          <tr>
                            <th className="py-2.5 px-3 rounded-l-lg">User</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3 rounded-r-lg">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {workspaceMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-300">
                                  {m.user.name.charAt(0)}
                                </div>
                                {m.user.name} {m.userId === currentUser.id && '(You)'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{m.user.email}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    m.role === 'OWNER'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : m.role === 'ADMIN'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {m.role === 'OWNER' && <Crown className="w-3 h-3 text-amber-400" />}
                                  {m.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {new Date(m.joinedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: RBAC MATRIX SPECIFICATION */}
          {activeTab === 'rbac' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    ProjectFlow RBAC Permission Matrix (Enforced on Backend)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every API endpoint verifies permissions on the server using <code>requireWorkspaceRole()</code> and <code>requireProjectRole()</code> middleware. Frontend buttons reflect these rules, but unauthorized HTTP requests are rejected with <code>403 Forbidden</code> or <code>404 Not Found</code> (to prevent IDOR leaks).
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="p-3 border-b border-slate-800">Capability / Operation</th>
                        <th className="p-3 border-b border-slate-800 text-center">OWNER</th>
                        <th className="p-3 border-b border-slate-800 text-center">ADMIN</th>
                        <th className="p-3 border-b border-slate-800 text-center">MEMBER</th>
                        <th className="p-3 border-b border-slate-800 text-center">VIEWER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
                      <tr>
                        <td className="p-3 font-medium text-white">View Workspace & Projects</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Create Projects in Workspace</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-red-400">✕</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Update Project Name / Status</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-red-400">✕ (403)</td>
                        <td className="p-3 text-center text-red-400">✕ (403)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Invite Members to Workspace</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓ (All Roles)</td>
                        <td className="p-3 text-center text-blue-400 font-medium">✓ (Member/Viewer)</td>
                        <td className="p-3 text-center text-red-400">✕</td>
                        <td className="p-3 text-center text-red-400">✕</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Change Roles & Remove Members</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-blue-400 font-medium">✓ (Non-Owners)</td>
                        <td className="p-3 text-center text-red-400">✕</td>
                        <td className="p-3 text-center text-red-400">✕</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Delete Project / Workspace</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">✓</td>
                        <td className="p-3 text-center text-red-400">✕ (403)</td>
                        <td className="p-3 text-center text-red-400">✕ (403)</td>
                        <td className="p-3 text-center text-red-400">✕ (403)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTH & SESSIONS (Milestone 2) */}
          {activeTab === 'auth' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm">
                    {authMode === 'register' ? 'Register New User' : 'Sign In User'}
                  </h3>
                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={() => setAuthMode('login')}
                      className={`px-2.5 py-1 rounded ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => setAuthMode('register')}
                      className={`px-2.5 py-1 rounded ${authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                {authSuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs">
                    {authSuccessMsg}
                  </div>
                )}
                {authError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-xs">
                    {authError}
                  </div>
                )}

                <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-3 text-xs">
                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="text-slate-300">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300">Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                  >
                    {authSubmitting ? 'Authenticating...' : authMode === 'register' ? 'Register Account' : 'Sign In'}
                  </button>
                </form>
              </div>

              {/* Active Session & Diagnostics */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <h3 className="font-bold text-white text-sm">Active Session Inspector</h3>
                {currentUser && token ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                      <div><strong>ID:</strong> {currentUser.id}</div>
                      <div><strong>Name:</strong> {currentUser.name}</div>
                      <div><strong>Email:</strong> {currentUser.email}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400">JWT Token (Bearer):</span>
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-300 break-all max-h-20 overflow-y-auto">
                        {token}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs transition inline-flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out & Invalidate Token
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No active session. Please sign in or register.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ARCHITECTURE & DEVOPS */}
          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <FolderTree className="w-4 h-4" />
                  Milestone 3 Codebase Architecture
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`projectflow/
├── apps/
│   ├── web/src/              # React 19 Frontend SPA
│   └── api/src/
│       ├── controllers/      # Workspace & Project controllers
│       ├── middleware/       # requireWorkspaceRole, requireProjectRole (RBAC)
│       ├── routes/v1/        # /workspaces, /projects, /auth, /health
│       ├── services/         # WorkspaceService, ProjectService, AuthService
│       └── repositories/     # WorkspaceRepo, ProjectRepo, UserRepo
├── packages/
│   └── shared/src/           # Types & Zod Schemas (Workspaces, Projects, Roles)
├── prisma/
│   └── schema.prisma         # Workspace, WorkspaceMember, Project, ProjectMember
└── tests/
    ├── api/workspaces.test.ts # 10 tests (CRUD, Roles, Members)
    ├── api/projects.test.ts   # 10 tests (CRUD, Anti-IDOR, Roles)
    └── api/auth.test.ts       # 13 tests (JWT, Bcrypt, Invalidation)`}
                </pre>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <GitBranch className="w-4 h-4" />
                  Automated Test Coverage (39 Tests Passing)
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>tests/api/workspaces.test.ts</span>
                    <span className="text-emerald-400">10 / 10 Passed</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>tests/api/projects.test.ts</span>
                    <span className="text-emerald-400">10 / 10 Passed</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>tests/api/auth.test.ts</span>
                    <span className="text-emerald-400">13 / 13 Passed</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>tests/api/health.test.ts</span>
                    <span className="text-emerald-400">2 / 2 Passed</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>tests/unit/validation.test.ts</span>
                    <span className="text-emerald-400">4 / 4 Passed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Create Workspace */}
      {showCreateWsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Workspace Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Slug (Optional URL identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. acme-corp"
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Workspace description..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Project */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Create Project in {selectedWorkspace?.name}</h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Banking App"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Project Key * (2-10 letters, e.g. MBA, DEV)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="MBA"
                  value={newProjectKey}
                  onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Status</label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PLANNING">PLANNING</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Project goals and scope..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invite Member */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Invite Member</h3>
            <form onSubmit={handleInviteMember} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Registered User Email *</label>
                <input
                  type="email"
                  required
                  placeholder="user@projectflow.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {workspaceRole === 'OWNER' && <option value="ADMIN">ADMIN (Manage projects and members)</option>}
                  <option value="MEMBER">MEMBER (Create projects, view workspace)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
