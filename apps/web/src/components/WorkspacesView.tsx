import React from 'react';
import {
  Briefcase,
  Users,
  Shield,
  Layers,
  Plus,
  Trash2,
  Crown,
  UserCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type {
  WorkspaceSummary,
  WorkspaceMemberSummary,
  ProjectSummary,
  Role,
} from '../../../../packages/shared/src/types.js';

interface WorkspacesViewProps {
  selectedWorkspace: WorkspaceSummary | null;
  workspaceMembers: WorkspaceMemberSummary[];
  projects: ProjectSummary[];
  workspaceRole: Role | null;
  currentUser: { id: string; name: string; email: string } | null;
  onOpenCreateProject: () => void;
  onOpenInviteMember: () => void;
  onDeleteWorkspace: (wsId: string) => void;
  onDeleteProject: (prjId: string) => void;
  onUpdateMemberRole: (userId: string, newRole: Role) => void;
  onRemoveMember: (userId: string) => void;
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({
  selectedWorkspace,
  workspaceMembers,
  projects,
  workspaceRole,
  currentUser,
  onOpenCreateProject,
  onOpenInviteMember,
  onDeleteWorkspace,
  onDeleteProject,
  onUpdateMemberRole,
  onRemoveMember,
}) => {
  const isOwner = workspaceRole === 'OWNER';
  const isAdminOrOwner = workspaceRole === 'ADMIN' || workspaceRole === 'OWNER';

  return (
    <div className="space-y-8">
      {/* 1. Workspace Header Overview Card */}
      <div className="p-6 lg:p-8 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1558C9]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1558C9]/20 border border-[#1558C9]/40 flex items-center justify-center text-sm font-bold text-[#1558C9]">
                {selectedWorkspace?.name?.charAt(0) || 'W'}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {selectedWorkspace?.name || 'Workspace'}
                </h1>
                <p className="text-xs font-mono text-[#9299A8]">
                  Slug: <span className="text-[#D4FF24]">{selectedWorkspace?.slug}</span> · ID: {selectedWorkspace?.id}
                </p>
              </div>
            </div>
            {selectedWorkspace?.description && (
              <p className="text-sm text-[#9299A8] max-w-xl leading-relaxed pt-1">
                {selectedWorkspace.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isAdminOrOwner && (
              <button
                onClick={onOpenInviteMember}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(21,88,201,0.35)] transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete workspace "${selectedWorkspace?.name}"? All associated projects and tasks will be permanently removed.`
                    )
                  ) {
                    if (selectedWorkspace) onDeleteWorkspace(selectedWorkspace.id);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Projects in Workspace Section */}
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4FF24]" />
              Projects in Workspace ({projects.length})
            </h2>
            <p className="text-xs text-[#9299A8]">Independent project streams and task backlogs</p>
          </div>
          <button
            onClick={onOpenCreateProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111722] hover:bg-[#161e2e] text-white text-xs font-medium border border-white/[0.08] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4FF24]" />
            <span>New Project</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-xl bg-[#111722] border border-white/[0.06] hover:border-[#1558C9]/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1558C9]/20 text-[#1558C9] border border-[#1558C9]/35">
                    {proj.key}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-2">{proj.name}</h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  {proj.status}
                </span>
              </div>

              {proj.description && (
                <p className="text-xs text-[#9299A8] line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>
              )}

              <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-[#9299A8]">
                <span>Created {new Date(proj.createdAt).toLocaleDateString()}</span>
                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete project "${proj.name}" and all its tasks?`)) {
                        onDeleteProject(proj.id);
                      }
                    }}
                    className="p-1 rounded text-[#9299A8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-[#9299A8] italic">
              No projects created yet.
            </div>
          )}
        </div>
      </div>

      {/* 3. Workspace Members & RBAC Table */}
      <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.08] space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4FF24]" />
            Team Members & Roles ({workspaceMembers.length})
          </h2>
          <p className="text-xs text-[#9299A8]">
            Enforcing strict Role-Based Access Control: OWNER, ADMIN, MEMBER, VIEWER
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9299A8] uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Joined Date</th>
                {isAdminOrOwner && <th className="pb-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {workspaceMembers.map((member) => {
                const isMemberSelf = member.userId === currentUser?.id;
                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1558C9] to-[#D4FF24] p-[1.5px] shrink-0">
                          <div className="w-full h-full rounded-full bg-[#0B0E14] flex items-center justify-center text-xs font-bold text-white">
                            {member.user?.name?.charAt(0) || 'U'}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {member.user?.name || 'User'}
                            {isMemberSelf && (
                              <span className="ml-2 text-[10px] font-mono text-[#D4FF24]">(You)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-[#9299A8]">{member.user?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      {isAdminOrOwner && !isMemberSelf && member.role !== 'OWNER' ? (
                        <select
                          value={member.role}
                          onChange={(e) => onUpdateMemberRole(member.userId, e.target.value as Role)}
                          className="px-2 py-1 rounded bg-[#111722] border border-white/[0.08] text-xs text-[#F5F7FA] outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            member.role === 'OWNER'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              : member.role === 'ADMIN'
                              ? 'bg-[#1558C9]/20 text-[#1558C9] border border-[#1558C9]/35'
                              : member.role === 'MEMBER'
                              ? 'bg-[#D4FF24]/15 text-[#D4FF24] border border-[#D4FF24]/25'
                              : 'bg-white/[0.06] text-[#9299A8] border border-white/[0.08]'
                          }`}
                        >
                          {member.role === 'OWNER' && <Crown className="w-3 h-3" />}
                          {member.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-[#9299A8] font-mono text-[11px]">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>

                    {isAdminOrOwner && (
                      <td className="py-3.5 text-right">
                        {(!isMemberSelf && member.role !== 'OWNER') || (isMemberSelf && member.role !== 'OWNER') ? (
                          <button
                            onClick={() => onRemoveMember(member.userId)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
                          >
                            {isMemberSelf ? 'Leave' : 'Remove'}
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
