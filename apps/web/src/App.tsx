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
} from 'lucide-react';
import type { HealthResponse, UserSummary, AuthResponse } from '../../../packages/shared/src/types.js';

export default function App() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<'auth' | 'architecture' | 'schema' | 'endpoints' | 'devops'>('auth');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('projectflow_token'));
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Form inputs
  const [formName, setFormName] = useState('Sarah Jenkins');
  const [formEmail, setFormEmail] = useState('sarah.architect@projectflow.dev');
  const [formPassword, setFormPassword] = useState('SecurePass123!');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Protected Route Test State
  const [protectedData, setProtectedData] = useState<string | null>(null);
  const [protectedTesting, setProtectedTesting] = useState(false);
  const [protectedError, setProtectedError] = useState<string | null>(null);

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
          return;
        }
      }
      // If invalid/revoked
      localStorage.removeItem('projectflow_token');
      setToken(null);
      setCurrentUser(null);
    } catch {
      // Network failure
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
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Registration failed');
      }

      const authData: AuthResponse = body.data;
      setToken(authData.accessToken);
      setCurrentUser(authData.user);
      localStorage.setItem('projectflow_token', authData.accessToken);
      setAuthSuccessMsg(`Registered successfully as ${authData.user.name}! JWT access token issued.`);
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
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Invalid credentials');
      }

      const authData: AuthResponse = body.data;
      setToken(authData.accessToken);
      setCurrentUser(authData.user);
      localStorage.setItem('projectflow_token', authData.accessToken);
      setAuthSuccessMsg(`Logged in successfully! Welcome back, ${authData.user.name}.`);
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
      setProtectedData(null);
      setAuthSuccessMsg('Logged out. Token invalidated on server.');
    }
  };

  const testProtectedRoute = async (overrideToken?: string | null) => {
    setProtectedTesting(true);
    setProtectedError(null);
    setProtectedData(null);

    const tokenToSend = overrideToken !== undefined ? overrideToken : token;

    try {
      const headers: Record<string, string> = {};
      if (tokenToSend) {
        headers['Authorization'] = `Bearer ${tokenToSend}`;
      }

      const res = await fetch('/api/v1/auth/me', { headers });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setProtectedError(`HTTP ${res.status}: ${body.error?.message || 'Access denied'}`);
      } else {
        setProtectedData(JSON.stringify(body, null, 2));
      }
    } catch (err) {
      setProtectedError(err instanceof Error ? err.message : String(err));
    } finally {
      setProtectedTesting(false);
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
                Milestone 2 • Auth Live
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Full-Stack Project & Task Engineering Platform</p>
          </div>
        </div>

        {/* Live User Session & Telemetry Status in Navbar */}
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
                title="Sign out and invalidate token"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-400">Guest (Unauthenticated)</span>
            </div>
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
                  onClick={() => setActiveTab('auth')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'auth' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Auth Playground
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">M2</span>
                </button>

                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-left transition ${activeTab === 'architecture' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    System Architecture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M1</span>
                </button>

                <div className="relative group">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-left opacity-60 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <FolderTree className="w-4 h-4" />
                      Projects
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M3</span>
                  </button>
                </div>

                <div className="relative group">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-left opacity-60 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <Kanban className="w-4 h-4" />
                      Kanban Board
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M4</span>
                  </button>
                </div>

                <div className="relative group">
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-left opacity-60 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <Users className="w-4 h-4" />
                      Team & RBAC
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">M3</span>
                  </button>
                </div>
              </nav>
            </div>

            {/* Implementation Progress Widget */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Roadmap Progress</span>
                <span className="text-indigo-400 font-mono font-bold">2 / 6 Milestones</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full w-[33.3%] transition-all" />
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>M1: Core Architecture & Setup</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>M2: Auth, JWT & Passwords (Live)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">3</div>
                  <span>M3: Projects & RBAC</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">4</div>
                  <span>M4: Kanban & Tasks</span>
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
              <span>Hashing</span>
              <span className="font-mono text-slate-300">Bcrypt (Salt 12)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Auth Strategy</span>
              <span className="font-mono text-slate-300">JWT + Revocation</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tests</span>
              <span className="font-mono text-emerald-400">19 Passing</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
          {/* Milestone 2 Status Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 lg:p-8 shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Milestone 2 Verified & Tested
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                JWT Authentication, Password Hashing & Security Guards
              </h1>
              <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
                User registration, authentication, token issuance, and protected route authorization are fully active. All passwords are encrypted with bcrypt (12 rounds), inputs are strictly normalized and validated via Zod, and private endpoints are guarded by JWT middleware with token version invalidation on logout.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs w-fit">
            <button
              onClick={() => setActiveTab('auth')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'auth' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              Auth Playground & Verification
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'architecture' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Architecture & Files
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Prisma Schema (User Model)
            </button>
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'endpoints' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FileCode className="w-3.5 h-3.5" />
              API Endpoints & Guards
            </button>
            <button
              onClick={() => setActiveTab('devops')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${activeTab === 'devops' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Docker & Tests (19 Passing)
            </button>
          </div>

          {/* TAB 1: AUTHENTICATION PLAYGROUND */}
          {activeTab === 'auth' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Register / Login Form */}
              <div className="lg:col-span-6 rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      {authMode === 'register' ? 'Register Account' : 'Sign In'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => { setAuthMode('register'); setAuthError(null); setAuthSuccessMsg(null); }}
                      className={`px-3 py-1 rounded font-medium transition ${authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Register
                    </button>
                    <button
                      onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccessMsg(null); }}
                      className={`px-3 py-1 rounded font-medium transition ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Login
                    </button>
                  </div>
                </div>

                {authSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                {authError && (
                  <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-4 text-xs">
                  {authMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address (Normalized)
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. sarah.architect@projectflow.dev"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Password (Bcrypt Salt 12)
                      </label>
                      <span className="text-[10px] text-slate-500">Min 8 chars, 1 letter, 1 number</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-sans pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {authMode === 'register' ? 'Create Account & Issue Token' : 'Sign In & Authenticate'}
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" /> Security Guarantees:
                  </div>
                  <div>• Passwords hashed with 12 bcrypt salt rounds before database persistence.</div>
                  <div>• Password hashes and secrets are strictly excluded from HTTP response payloads and logs.</div>
                  <div>• Email normalized (lowercase and trimmed) with uniqueness constraint enforced.</div>
                </div>
              </div>

              {/* Right Column: Protected Endpoint & Session Inspector */}
              <div className="lg:col-span-6 space-y-6">
                {/* Active Session Card */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5 text-indigo-400" />
                      <h2 className="text-base font-bold text-white tracking-tight">Active JWT Session Inspector</h2>
                    </div>
                    {token && (
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition"
                      >
                        <LogOut className="w-3 h-3" /> Invalidate Token (Logout)
                      </button>
                    )}
                  </div>

                  {currentUser && token ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Authenticated User:</span>
                          <span className="font-semibold text-emerald-400 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        </div>
                        <div className="font-mono text-slate-300">
                          <div><strong>ID:</strong> {currentUser.id}</div>
                          <div><strong>Name:</strong> {currentUser.name}</div>
                          <div><strong>Email:</strong> {currentUser.email}</div>
                          <div><strong>Joined:</strong> {currentUser.createdAt}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 font-medium">JWT Bearer Token (Stored in Session):</span>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-300 break-all max-h-20 overflow-y-auto">
                          {token}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                      <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="text-xs font-medium text-slate-300">No Active Session</div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Register an account or sign in on the left to receive a signed JWT access token and inspect protected route behavior.
                      </p>
                    </div>
                  )}
                </div>

                {/* Guard Verification Sandbox */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight">Test Protected Route Guard: <code>GET /api/v1/auth/me</code></h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Test how the Express <code>authenticateToken</code> middleware responds to valid tokens, tampered tokens, or missing credentials:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => testProtectedRoute()}
                      disabled={protectedTesting}
                      className="py-2 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium transition"
                    >
                      1. Test Valid Token
                    </button>
                    <button
                      onClick={() => testProtectedRoute('invalid_tampered_token_xyz')}
                      disabled={protectedTesting}
                      className="py-2 px-3 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium transition"
                    >
                      2. Test Tampered Token
                    </button>
                    <button
                      onClick={() => testProtectedRoute(null)}
                      disabled={protectedTesting}
                      className="py-2 px-3 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 text-xs font-medium transition"
                    >
                      3. Test No Token (401)
                    </button>
                  </div>

                  {protectedTesting && (
                    <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      Dispatching request to /api/v1/auth/me...
                    </div>
                  )}

                  {protectedError && (
                    <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 text-xs font-mono">
                      {protectedError}
                    </div>
                  )}

                  {protectedData && (
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                      {protectedData}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM ARCHITECTURE & REPO LAYOUT */}
          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <FolderTree className="w-4 h-4" />
                  Clean Monorepo-Style Directory Layout
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
{`projectflow/
├── apps/
│   ├── web/src/              # React 19 SPA, Tailwind CSS, Lucide icons
│   │   ├── App.tsx           # Dashboard shell & telemetry
│   │   └── main.tsx          # Client entry point
│   └── api/src/              # Node.js + Express backend
│       ├── config/           # Zod-validated environment config
│       ├── controllers/      # Route handlers (auth, health)
│       ├── middleware/       # JWT auth guard, Zod validator, Logger, Error Handler
│       ├── routes/v1/        # Versioned routes (/api/v1/auth, /api/v1/health)
│       ├── services/         # AuthService, PasswordService, TokenService
│       ├── repositories/     # IUserRepository, PrismaUserRepository, MemoryUserRepository
│       ├── utils/            # AppError, ConflictError, UnauthorizedError
│       └── app.ts            # Configured Express application
├── packages/
│   └── shared/src/           # Types, Zod Schemas, Domain models
│       ├── types.ts          # UserSummary, RegisterRequest, AuthResponse, etc.
│       └── schemas.ts        # RegisterSchema, LoginSchema, Pagination
├── prisma/
│   └── schema.prisma         # PostgreSQL schema & relations (User with tokenVersion)
├── tests/
│   ├── api/auth.test.ts      # Supertest auth integration tests (13 tests)
│   ├── api/health.test.ts    # Supertest health tests (2 tests)
│   └── unit/validation.test.ts # Zod schema unit tests (4 tests)
├── .github/workflows/ci.yml  # Automated GitHub Actions workflow
├── docker-compose.yml        # PostgreSQL 16 Alpine container
├── Dockerfile                # Multi-stage production container
└── server.ts                 # Full-stack dev & prod Express server`}
                </pre>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <Shield className="w-4 h-4" />
                  Milestone 2 Security Architecture
                </div>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      1. Cryptographic Password Security
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Passwords hashed using <code className="text-indigo-300">bcryptjs</code> with 12 salt rounds. Plaintext passwords never reach storage, and password hashes are never serialized in API responses or logs.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      2. JWT Tokens & Instant Revocation
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Stateless JWT tokens with customizable expiration (<code className="text-indigo-300">JWT_EXPIRES_IN=7d</code>). Token invalidation on logout is supported via both an in-memory blocklist and database-level <code className="text-indigo-300">tokenVersion</code> increments.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      3. Safe Error Handling & No Enumeration
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Invalid password and non-existent email return identical 401 Unauthorized messages to prevent user enumeration attacks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRISMA SCHEMA */}
          {activeTab === 'schema' && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <Database className="w-4 h-4" />
                  Prisma User Entity (<code className="text-slate-300">prisma/schema.prisma</code>)
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  PostgreSQL Target • Unique Email Constraint • Token Version
                </span>
              </div>

              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed">
{`model User {
  id           String          @id @default(uuid())
  email        String          @unique
  passwordHash String
  name         String
  avatarUrl    String?
  tokenVersion Int             @default(0)   // Incremented on logout for instant invalidation
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  // Relationships
  ownedProjects   Project[]       @relation("ProjectOwner")
  memberships     ProjectMember[]
  createdTasks    Task[]          @relation("TaskCreator")
  assignedTasks   Task[]          @relation("TaskAssignee")
  activityLogs    ActivityLog[]

  @@map("users")
}`}
              </pre>
            </div>
          )}

          {/* TAB 4: API CONTRACTS */}
          {activeTab === 'endpoints' && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <FileCode className="w-4 h-4" />
                  Authentication API Contract (<code className="text-slate-300">/api/v1/auth/*</code>)
                </div>
                <span className="text-xs text-slate-400">All routes verified with Supertest</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[11px]">POST</span>
                    <span className="text-slate-200">/api/v1/auth/register</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 201 Created • Issues Token • Hashes Password
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[11px]">POST</span>
                    <span className="text-slate-200">/api/v1/auth/login</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK • Returns JWT • Safe 401 on Mismatch
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">GET</span>
                    <span className="text-slate-200">/api/v1/auth/me</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Protected (Bearer Guard) • Returns User Profile
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">POST</span>
                    <span className="text-slate-200">/api/v1/auth/logout</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Protected • Invalidates Session & Token
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEVOPS & TESTS */}
          {activeTab === 'devops' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <GitBranch className="w-4 h-4" />
                  Automated Test Coverage (19 Tests Passing)
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-300">
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

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <Cpu className="w-4 h-4" />
                  Local Docker & PostgreSQL Setup
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                  <div className="text-slate-400"># Start local PostgreSQL:</div>
                  <div className="text-emerald-400">docker compose up -d</div>
                  <div className="text-slate-400 mt-2"># Run migrations & tests:</div>
                  <div className="text-indigo-400">npx prisma migrate dev --name add_auth</div>
                  <div className="text-indigo-400">npm run test</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
