import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  Briefcase,
  Shield,
  FileCode,
  Terminal,
  LogOut,
  ChevronDown,
  Plus,
  X,
  Sparkles,
  Layers,
  Crown,
  UserCheck,
} from 'lucide-react';
import type {
  WorkspaceSummary,
  ProjectSummary,
  UserSummary,
  Role,
} from '../../../../packages/shared/src/types.js';

interface SidebarProps {
  activeTab: 'dashboard' | 'board' | 'workspaces' | 'auth' | 'rbac' | 'architecture' | 'devops';
  setActiveTab: (tab: 'dashboard' | 'board' | 'workspaces' | 'auth' | 'rbac' | 'architecture' | 'devops') => void;
  workspaces: WorkspaceSummary[];
  selectedWorkspace: WorkspaceSummary | null;
  onSelectWorkspace: (ws: WorkspaceSummary) => void;
  projects: ProjectSummary[];
  selectedProject: ProjectSummary | null;
  onSelectProject: (p: ProjectSummary) => void;
  currentUser: UserSummary | null;
  workspaceRole: Role | null;
  onLogout: () => void;
  onOpenCreateWorkspace: () => void;
  onOpenCreateProject: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  projects,
  selectedProject,
  onSelectProject,
  currentUser,
  workspaceRole,
  onLogout,
  onOpenCreateWorkspace,
  onOpenCreateProject,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [showWsMenu, setShowWsMenu] = React.useState(false);

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      badge: 'Real-Time',
    },
    {
      id: 'board' as const,
      label: 'Kanban Board',
      icon: Kanban,
      badge: selectedProject?.key,
    },
    {
      id: 'workspaces' as const,
      label: 'Workspace & Team',
      icon: Briefcase,
    },
    {
      id: 'rbac' as const,
      label: 'Access Control (RBAC)',
      icon: Shield,
    },
    {
      id: 'architecture' as const,
      label: 'System Specs',
      icon: FileCode,
    },
    {
      id: 'devops' as const,
      label: 'DevOps & Telemetry',
      icon: Terminal,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B0E14] border-r border-white/[0.08] text-[#F5F7FA]">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#1558C9] to-[#0d3478] border border-[#1558C9]/40 shadow-[0_0_15px_rgba(21,88,201,0.4)]">
            <Layers className="w-5 h-5 text-[#F5F7FA]" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D4FF24] ring-2 ring-[#0B0E14]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">ProjectFlow</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#D4FF24]/10 text-[#D4FF24] border border-[#D4FF24]/20 font-bold">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#9299A8]">Enterprise Workflow Engine</p>
          </div>
        </div>

        {/* Close button for mobile */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Workspace Selector Dropdown */}
      <div className="p-3 border-b border-white/[0.07]">
        <div className="relative">
          <button
            onClick={() => setShowWsMenu(!showWsMenu)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#111722] hover:bg-[#161e2e] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#1558C9]/20 border border-[#1558C9]/40 flex items-center justify-center text-xs font-bold text-[#1558C9] shrink-0">
                {selectedWorkspace?.name?.charAt(0) || 'W'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {selectedWorkspace?.name || 'Select Workspace'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#9299A8]">
                  <span>{selectedWorkspace?.slug || 'No slug'}</span>
                  {workspaceRole && (
                    <>
                      <span>·</span>
                      <span className="text-[#D4FF24] font-medium">{workspaceRole}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#9299A8] shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {showWsMenu && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-[#111722] border border-white/[0.12] shadow-2xl p-1.5 space-y-1 glass-dropdown">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#9299A8]">
                Your Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setShowWsMenu(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-[#1558C9]/20 text-white font-medium border border-[#1558C9]/30'
                      : 'text-[#9299A8] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="text-[10px] text-[#9299A8] font-mono">{ws.slug}</span>
                </button>
              ))}
              <div className="pt-1 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowWsMenu(false);
                    onOpenCreateWorkspace();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-[#D4FF24] hover:bg-[#D4FF24]/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#9299A8]">
          Main Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobileOpen) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#1558C9] text-white shadow-[0_4px_16px_rgba(21,88,201,0.35)]'
                  : 'text-[#9299A8] hover:text-[#F5F7FA] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-[#9299A8]'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-black/25 text-[#D4FF24] font-bold'
                      : 'bg-white/[0.06] text-[#9299A8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Project Quick-List in Sidebar */}
        <div className="pt-5">
          <div className="px-2 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#9299A8]">
              Projects ({projects.length})
            </span>
            <button
              onClick={onOpenCreateProject}
              className="text-[#D4FF24] hover:text-[#e4ff6b] p-0.5 rounded transition-colors"
              title="Create new project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((p) => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    if (activeTab !== 'board' && activeTab !== 'dashboard') {
                      setActiveTab('board');
                    }
                    if (isMobileOpen) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-[#111722] border border-[#1558C9]/40 text-white font-medium'
                      : 'text-[#9299A8] hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#D4FF24]' : 'bg-[#9299A8]/40'
                      }`}
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9299A8] ml-2 shrink-0">
                    [{p.key}]
                  </span>
                </button>
              );
            })}

              {projects.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-[#9299A8] italic">No projects yet</p>
              )}
            </div>
          </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-white/[0.07] bg-[#030407]/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#111722] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1558C9] to-[#D4FF24] p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-full bg-[#0B0E14] flex items-center justify-center text-xs font-bold text-white">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-[#9299A8] truncate">{currentUser?.email || 'Logged In'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-[#9299A8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
