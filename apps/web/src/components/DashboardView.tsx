import React from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  Calendar,
  Sparkles,
  PieChart,
  Users,
  CheckSquare,
} from 'lucide-react';
import type {
  WorkspaceSummary,
  ProjectSummary,
  UserSummary,
  ProjectAnalyticsSummary,
  WorkspaceAnalyticsSummary,
  ActivitySummary,
} from '../../../../packages/shared/src/types.js';
import { ThreeDWorkflowCanvas } from './ThreeDWorkflowCanvas.js';

interface DashboardViewProps {
  currentUser: UserSummary | null;
  selectedWorkspace: WorkspaceSummary | null;
  projects: ProjectSummary[];
  selectedProject: ProjectSummary | null;
  onSelectProject: (p: ProjectSummary) => void;
  projectAnalytics: ProjectAnalyticsSummary | null;
  workspaceAnalytics: WorkspaceAnalyticsSummary | null;
  activities: ActivitySummary[];
  loadingAnalytics: boolean;
  onOpenCreateTask: () => void;
  onOpenCreateProject: () => void;
  onOpenInviteMember: () => void;
  onNavigateToBoard: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  selectedWorkspace,
  projects,
  selectedProject,
  onSelectProject,
  projectAnalytics,
  workspaceAnalytics,
  activities,
  loadingAnalytics,
  onOpenCreateTask,
  onOpenCreateProject,
  onOpenInviteMember,
  onNavigateToBoard,
}) => {
  // Aggregate stats across all projects in workspace or selected project
  const totalProjects = workspaceAnalytics?.totalProjects ?? projects.length;
  const totalTasks = projectAnalytics?.totalTasks ?? workspaceAnalytics?.totalTasks ?? 0;
  const completedTasks = projectAnalytics?.completedTasks ?? workspaceAnalytics?.completedTasks ?? 0;
  const outstandingTasks = projectAnalytics?.outstandingTasks ?? workspaceAnalytics?.outstandingTasks ?? 0;
  const completionRate = projectAnalytics?.completionRate ?? workspaceAnalytics?.completionRate ?? 0;
  const overdueTasks = projectAnalytics?.overdueTasksCount ?? workspaceAnalytics?.overdueTasksCount ?? 0;
  const upcomingTasks = projectAnalytics?.upcomingTasksCount ?? workspaceAnalytics?.upcomingTasksCount ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. Hero Section with 3D Workflow Canvas */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-6 lg:p-8 shadow-2xl">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#1558C9]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-60 h-60 bg-[#D4FF24]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1558C9]/15 border border-[#1558C9]/35 text-[#F5F7FA] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#D4FF24] animate-pulse" />
              <span>Workspace Active: {selectedWorkspace?.name || 'Primary Workspace'}</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5F7FA] to-[#D4FF24]">{currentUser?.name || 'Architect'}</span>
            </h1>

            <p className="text-sm text-[#9299A8] leading-relaxed max-w-xl">
              Real-time enterprise project intelligence across {totalProjects} active projects and {totalTasks} workflow tasks.
              Row-locking concurrency and RBAC guards active.
            </p>

            {/* Quick-action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-semibold shadow-[0_4px_20px_rgba(21,88,201,0.4)] transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
              <button
                onClick={onOpenCreateProject}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] hover:bg-[#161e2e] text-[#F5F7FA] border border-white/[0.08] hover:border-white/[0.15] text-xs font-semibold transition-all"
              >
                <Layers className="w-4 h-4 text-[#D4FF24]" />
                <span>New Project</span>
              </button>
              <button
                onClick={onOpenInviteMember}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] hover:bg-[#161e2e] text-[#9299A8] hover:text-white border border-white/[0.08] hover:border-white/[0.15] text-xs font-semibold transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>
          </div>

          {/* Interactive 3D Workflow Sculpture */}
          <div className="shrink-0 flex items-center justify-center">
            <ThreeDWorkflowCanvas size={240} className="drop-shadow-[0_10px_30px_rgba(21,88,201,0.3)]" />
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-xl bg-[#0B0E14] border border-white/[0.07] hover:border-[#1558C9]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9299A8]">
            <span className="font-medium">Total Projects</span>
            <div className="w-7 h-7 rounded-lg bg-[#1558C9]/15 border border-[#1558C9]/30 flex items-center justify-center text-[#1558C9]">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{totalProjects}</span>
            <span className="text-xs text-[#9299A8]">in workspace</span>
          </div>
          <p className="text-[11px] text-[#9299A8]">
            {projects.filter((p) => p.status === 'ACTIVE').length} active sprint streams
          </p>
        </div>

        {/* Workflow Tasks */}
        <div className="p-5 rounded-xl bg-[#0B0E14] border border-white/[0.07] hover:border-[#1558C9]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9299A8]">
            <span className="font-medium">Total Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-[#1558C9]/15 border border-[#1558C9]/30 flex items-center justify-center text-[#1558C9]">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{totalTasks}</span>
            <span className="text-xs text-[#9299A8]">items tracked</span>
          </div>
          <p className="text-[11px] text-[#9299A8]">
            {outstandingTasks} outstanding / {completedTasks} closed
          </p>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-xl bg-[#0B0E14] border border-white/[0.07] hover:border-[#D4FF24]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9299A8]">
            <span className="font-medium">Completion Rate</span>
            <div className="w-7 h-7 rounded-lg bg-[#D4FF24]/15 border border-[#D4FF24]/30 flex items-center justify-center text-[#D4FF24]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#D4FF24]">{completionRate}%</span>
            <span className="text-xs text-[#9299A8]">of current sprint</span>
          </div>
          {/* Progress bar with neon lime */}
          <div className="w-full h-1.5 rounded-full bg-[#111722] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1558C9] to-[#D4FF24] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </div>

        {/* Overdue / Deadlines Attention */}
        <div className="p-5 rounded-xl bg-[#0B0E14] border border-white/[0.07] hover:border-amber-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9299A8]">
            <span className="font-medium">Overdue & Upcoming</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overdueTasks > 0
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              {overdueTasks > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${overdueTasks > 0 ? 'text-rose-400' : 'text-white'}`}>
              {overdueTasks}
            </span>
            <span className="text-xs text-[#9299A8]">overdue / {upcomingTasks} upcoming</span>
          </div>
          <p className="text-[11px] text-[#9299A8]">
            {overdueTasks > 0 ? 'Requires immediate team triage' : 'All milestones on schedule'}
          </p>
        </div>
      </div>

      {/* 3. Mid Grid: Project Progress Breakdown & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Overview (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Project Sprint Progress</h2>
              <p className="text-xs text-[#9299A8]">Active project streams across this workspace</p>
            </div>
            <button
              onClick={onNavigateToBoard}
              className="text-xs text-[#1558C9] hover:text-[#1e6bf2] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Open Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const isSelected = selectedProject?.id === proj.id;
              // Find matching analytics if available
              const projBreakdown = workspaceAnalytics?.projectBreakdowns?.find(
                (pb) => pb.id === proj.id
              );
              const rate = projBreakdown?.completionRate ?? (isSelected ? completionRate : 0);
              const count = projBreakdown?.totalTasks ?? (isSelected ? totalTasks : 0);

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#111722] border-[#1558C9]/50 shadow-[0_0_20px_rgba(21,88,201,0.15)]'
                      : 'bg-[#111722]/60 hover:bg-[#111722] border-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1558C9]/20 text-[#1558C9] border border-[#1558C9]/30">
                        {proj.key}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">{proj.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-[#9299A8] font-mono">{count} tasks</span>
                      <span className="font-mono font-bold text-[#D4FF24]">{rate}%</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1558C9] to-[#D4FF24] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div className="p-8 text-center rounded-xl bg-[#111722]/40 border border-white/[0.05] space-y-3">
                <Layers className="w-8 h-8 text-[#9299A8] mx-auto opacity-50" />
                <p className="text-xs text-[#9299A8]">No projects created in this workspace yet</p>
                <button
                  onClick={onOpenCreateProject}
                  className="px-3 py-1.5 rounded-lg bg-[#1558C9] text-white text-xs font-medium"
                >
                  Create First Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Priority & Status Distribution (1 col) */}
        <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">Task Priority Breakdown</h2>
            <p className="text-xs text-[#9299A8]">Distribution of current workload</p>
          </div>

          <div className="space-y-4">
            {/* Urgent */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-rose-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Urgent Priority
                </span>
                <span className="font-mono text-white">
                  {projectAnalytics?.priorityCounts?.URGENT ?? 0}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#111722] overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? ((projectAnalytics?.priorityCounts?.URGENT ?? 0) / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* High */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  High Priority
                </span>
                <span className="font-mono text-white">
                  {projectAnalytics?.priorityCounts?.HIGH ?? 0}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#111722] overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? ((projectAnalytics?.priorityCounts?.HIGH ?? 0) / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Medium */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-[#1558C9] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#1558C9]" />
                  Medium Priority
                </span>
                <span className="font-mono text-white">
                  {projectAnalytics?.priorityCounts?.MEDIUM ?? 0}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#111722] overflow-hidden">
                <div
                  className="h-full bg-[#1558C9] rounded-full"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? ((projectAnalytics?.priorityCounts?.MEDIUM ?? 0) / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Low */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-[#9299A8] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#9299A8]" />
                  Low Priority
                </span>
                <span className="font-mono text-white">
                  {projectAnalytics?.priorityCounts?.LOW ?? 0}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#111722] overflow-hidden">
                <div
                  className="h-full bg-[#9299A8] rounded-full"
                  style={{
                    width: `${
                      totalTasks > 0
                        ? ((projectAnalytics?.priorityCounts?.LOW ?? 0) / totalTasks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status quick recap */}
          <div className="pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[#111722] border border-white/[0.04]">
              <span className="text-[10px] text-[#9299A8]">In Progress</span>
              <p className="text-sm font-bold text-[#1558C9]">
                {projectAnalytics?.statusCounts?.IN_PROGRESS ?? 0}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#111722] border border-white/[0.04]">
              <span className="text-[10px] text-[#9299A8]">In Review</span>
              <p className="text-sm font-bold text-amber-400">
                {projectAnalytics?.statusCounts?.IN_REVIEW ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Activity Stream */}
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D4FF24]" />
              Recent Workspace Audit Activity
            </h2>
            <p className="text-xs text-[#9299A8]">
              Tamper-evident, sanitized transaction logs across tasks and projects
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.05]">
          {activities.slice(0, 6).map((act) => {
            return (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#1558C9] mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white">
                      <span className="font-semibold text-[#D4FF24]">{act.user?.name || 'Team member'}</span>{' '}
                      <span className="text-[#9299A8]">performed</span>{' '}
                      <span className="font-mono text-white font-medium">{act.action}</span>
                      {typeof act.details?.title === 'string' && (
                        <span className="text-[#9299A8]"> on &quot;{act.details.title}&quot;</span>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-[#9299A8] mt-0.5">
                      Entity: {act.entityType} · ID: {act.entityId?.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-[#9299A8] shrink-0 font-mono">
                  {new Date(act.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}

          {activities.length === 0 && (
            <p className="py-6 text-center text-xs text-[#9299A8] italic">
              No recent activity recorded yet. Create or update tasks to generate audit events.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
