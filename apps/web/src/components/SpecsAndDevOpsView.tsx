import React from 'react';
import {
  Shield,
  FileCode,
  Terminal,
  Database,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Server,
  GitBranch,
  Lock,
  Layers,
  Crown,
} from 'lucide-react';
import type { HealthResponse, Role } from '../../../../packages/shared/src/types.js';

interface SpecsAndDevOpsViewProps {
  activeTab: 'rbac' | 'architecture' | 'devops';
  healthData: HealthResponse | null;
  loadingHealth: boolean;
  onRefreshHealth: () => void;
  workspaceRole: Role | null;
}

export const SpecsAndDevOpsView: React.FC<SpecsAndDevOpsViewProps> = ({
  activeTab,
  healthData,
  loadingHealth,
  onRefreshHealth,
  workspaceRole,
}) => {
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (activeTab === 'rbac') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1558C9]" />
                Role-Based Access Control (RBAC) Matrix
              </h2>
              <p className="text-xs text-[#9299A8] mt-1">
                Enforcing strict role permissions and anti-IDOR isolation across multi-tenant workspaces
              </p>
            </div>
            {workspaceRole && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1558C9]/15 border border-[#1558C9]/35 text-white text-xs font-semibold">
                <Crown className="w-4 h-4 text-[#D4FF24]" />
                <span>Your Role: {workspaceRole}</span>
              </div>
            )}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9299A8] uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Operation / Capability</th>
                <th className="pb-3 font-semibold text-center text-amber-400">OWNER</th>
                <th className="pb-3 font-semibold text-center text-[#1558C9]">ADMIN</th>
                <th className="pb-3 font-semibold text-center text-[#D4FF24]">MEMBER</th>
                <th className="pb-3 font-semibold text-center text-[#9299A8]">VIEWER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { op: 'View Workspace, Projects & Tasks', owner: '✓', admin: '✓', member: '✓', viewer: '✓' },
                { op: 'Create Projects in Workspace', owner: '✓', admin: '✓', member: '✓', viewer: '✕ (403)' },
                { op: 'Update Project Details & Status', owner: '✓', admin: '✓', member: '✕ (403)', viewer: '✕ (403)' },
                { op: 'Create & Update Tasks', owner: '✓', admin: '✓', member: '✓', viewer: '✕ (403)' },
                { op: 'Transition Task Statuses', owner: '✓', admin: '✓', member: '✓', viewer: '✕ (403)' },
                { op: 'Delete Tasks', owner: '✓', admin: '✓', member: 'Creator Only', viewer: '✕ (403)' },
                { op: 'Invite Members to Workspace', owner: '✓ (All)', admin: '✓ (Non-Owners)', member: '✕ (403)', viewer: '✕ (403)' },
                { op: 'Update Member Roles', owner: '✓', admin: '✓ (Non-Owners)', member: '✕ (403)', viewer: '✕ (403)' },
                { op: 'Delete Project / Workspace', owner: '✓ (Sole Owner Protected)', admin: '✕ (403)', member: '✕ (403)', viewer: '✕ (403)' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-medium text-white">{row.op}</td>
                  <td className="py-3 text-center font-mono font-bold text-amber-400">{row.owner}</td>
                  <td className="py-3 text-center font-mono font-bold text-[#1558C9]">{row.admin}</td>
                  <td className="py-3 text-center font-mono font-bold text-[#D4FF24]">{row.member}</td>
                  <td className="py-3 text-center font-mono text-[#9299A8]">{row.viewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Anti-IDOR note */}
        <div className="p-5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D4FF24]" />
            Anti-Resource Enumeration & IDOR Protection
          </h3>
          <p className="text-xs text-[#9299A8] leading-relaxed">
            ProjectFlow prevents Insecure Direct Object References (IDOR) by returning <code className="text-[#D4FF24] bg-white/[0.05] px-1 py-0.5 rounded">404 Not Found</code> rather than <code className="text-rose-400 bg-white/[0.05] px-1 py-0.5 rounded">403 Forbidden</code> whenever a user probes resources belonging to another workspace. This conceals private database identifiers from unauthorized users.
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === 'architecture') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl space-y-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#1558C9]" />
            System Architecture & Dual-Engine Persistence
          </h2>
          <p className="text-xs text-[#9299A8]">
            Production PostgreSQL 16 + Prisma ORM with in-memory sandbox isolation and strict state machine rules
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#D4FF24]" />
              Dual-Engine Repository Abstraction
            </h3>
            <p className="text-xs text-[#9299A8] leading-relaxed">
              Every data access service interacts strictly through typed repository contracts (`TaskRepository`, `WorkspaceRepository`, `ProjectRepository`). In production and local Docker environments, Prisma queries PostgreSQL 16 with row-locking (<code className="text-[#D4FF24] font-mono">SELECT FOR UPDATE</code>). In sandboxes, memory adapters guarantee 100% test isolation.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1558C9]" />
              Task State Machine Transitions
            </h3>
            <p className="text-xs text-[#9299A8] leading-relaxed">
              The backend enforces strict lifecycle transitions preventing arbitrary status skips:
              <br />
              <code className="text-white font-mono text-[11px] block mt-2 bg-[#111722] p-2 rounded-lg">
                BACKLOG → TODO / IN_PROGRESS<br />
                TODO ⇄ IN_PROGRESS → IN_REVIEW → DONE<br />
                IN_REVIEW → IN_PROGRESS (Rework) / DONE (Approved)
              </code>
            </p>
          </div>
        </div>

        {/* REST API Endpoints Summary */}
        <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-3">
          <h3 className="text-sm font-bold text-white">Versioned REST Endpoints (`/api/v1`)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            {[
              { m: 'GET', p: '/health', d: 'System & Database Health' },
              { m: 'POST', p: '/auth/register', d: 'Registration + JWT' },
              { m: 'POST', p: '/auth/login', d: 'Login + Rate Limiting' },
              { m: 'GET', p: '/workspaces', d: 'User Accessible Workspaces' },
              { m: 'GET', p: '/workspaces/:id/analytics', d: 'Portfolio Metrics' },
              { m: 'GET', p: '/projects/:id/tasks', d: 'Filtered Tasks' },
              { m: 'POST', p: '/projects/:id/tasks', d: 'Atomic Task Creation' },
              { m: 'PATCH', p: '/tasks/:id/status', d: 'State Machine Transition' },
              { m: 'GET', p: '/projects/:id/activities', d: 'Sanitized Audit Logs' },
            ].map((ep, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-[#111722] border border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      ep.m === 'GET' ? 'text-emerald-400' : ep.m === 'POST' ? 'text-[#1558C9]' : 'text-amber-400'
                    }`}
                  >
                    {ep.m}
                  </span>
                  <span className="text-white truncate">{ep.p}</span>
                </div>
                <p className="text-[10px] text-[#9299A8] font-sans mt-1">{ep.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DevOps & Telemetry Tab
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#1558C9]" />
            DevOps & Operational Telemetry
          </h2>
          <p className="text-xs text-[#9299A8] mt-1">
            Real-time server telemetry, database probe status, and Docker commands
          </p>
        </div>
        <button
          onClick={onRefreshHealth}
          disabled={loadingHealth}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111722] hover:bg-[#161e2e] text-white text-xs font-semibold border border-white/[0.08] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-[#1558C9]' : ''}`} />
          <span>Probe Health</span>
        </button>
      </div>

      {/* Live Health Status Card */}
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                healthData?.status === 'healthy'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <div>
              <span className="text-sm font-bold text-white">
                Server Status: {healthData?.status?.toUpperCase() || 'CONNECTING...'}
              </span>
              <p className="text-xs text-[#9299A8]">
                Environment: {healthData?.environment} · Uptime: {healthData?.uptimeSeconds}s
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#D4FF24] bg-[#D4FF24]/10 border border-[#D4FF24]/20 px-2 py-0.5 rounded">
            v{healthData?.version || '1.0.0'}
          </span>
        </div>

        {/* Database probe details */}
        <div className="p-4 rounded-xl bg-[#111722] border border-white/[0.06] text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#9299A8]">Database Provider:</span>
            <span className="text-white font-bold">{healthData?.database?.provider}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9299A8]">Database Connected:</span>
            <span
              className={`font-bold ${
                healthData?.database?.connected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {healthData?.database?.connected ? 'YES (Live PostgreSQL)' : 'SANDBOX / DOCKER REQ'}
            </span>
          </div>
          {healthData?.database?.message && (
            <p className="text-[11px] text-[#9299A8] font-sans pt-1 border-t border-white/[0.04]">
              {healthData.database.message}
            </p>
          )}
        </div>
      </div>

      {/* Docker Quick Commands */}
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-[#D4FF24]" />
          Local Docker & Database Commands
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {[
            { id: 'c1', label: 'Start PostgreSQL 16 container', cmd: 'docker compose up -d postgres' },
            { id: 'c2', label: 'Apply migrations to local database', cmd: 'npm run prisma:deploy' },
            { id: 'c3', label: 'Seed development sample database', cmd: 'npm run prisma:seed' },
            { id: 'c4', label: 'Run all 113 automated tests', cmd: 'npm run test:all' },
          ].map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-[#111722] border border-white/[0.06] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <span className="text-[10px] text-[#9299A8] font-sans block">{item.label}</span>
                <span className="text-white font-semibold">{item.cmd}</span>
              </div>
              <button
                onClick={() => copyToClipboard(item.cmd, item.id)}
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white shrink-0 transition-colors"
                title="Copy command"
              >
                {copiedCmd === item.id ? <Check className="w-3.5 h-3.5 text-[#D4FF24]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
