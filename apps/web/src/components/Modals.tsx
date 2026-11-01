import React from 'react';
import {
  X,
  CheckSquare,
  Briefcase,
  Layers,
  UserPlus,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type {
  TaskPriority,
  TaskStatus,
  ProjectStatus,
  Role,
  ProjectMemberSummary,
  TaskSummary,
} from '../../../../packages/shared/src/types.js';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  projectName: string;
  projectKey: string;
  projectMembers: ProjectMemberSummary[];
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  priority: TaskPriority;
  setPriority: (p: TaskPriority) => void;
  status: TaskStatus;
  setStatus: (s: TaskStatus) => void;
  assigneeId: string;
  setAssigneeId: (a: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  submitting: boolean;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectName,
  projectKey,
  projectMembers,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  status,
  setStatus,
  assigneeId,
  setAssigneeId,
  dueDate,
  setDueDate,
  submitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0B0E14] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#D4FF24]" />
              Create Task in {projectName} [{projectKey}]
            </h3>
            <p className="text-xs text-[#9299A8] mt-0.5">Sequential task numbering applied automatically</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement WebGL memory disposal"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specs, deliverables, acceptance criteria..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BACKLOG">Backlog</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
              </input>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111722] text-[#9299A8] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] disabled:opacity-50 text-white text-xs font-bold shadow-[0_4px_16px_rgba(21,88,201,0.35)]"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  task: TaskSummary | null;
  projectMembers: ProjectMemberSummary[];
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  priority: TaskPriority;
  setPriority: (p: TaskPriority) => void;
  status: TaskStatus;
  setStatus: (s: TaskStatus) => void;
  assigneeId: string;
  setAssigneeId: (a: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  submitting: boolean;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  projectMembers,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  status,
  setStatus,
  assigneeId,
  setAssigneeId,
  dueDate,
  setDueDate,
  submitting,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0B0E14] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#1558C9]" />
              Edit Task {task.taskKey || `Task #${task.taskNumber}`}
            </h3>
            <p className="text-xs text-[#9299A8] mt-0.5">Update priority, assignee, and parameters</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BACKLOG">Backlog</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111722] text-[#9299A8] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] disabled:opacity-50 text-white text-xs font-bold shadow-[0_4px_16px_rgba(21,88,201,0.35)]"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (n: string) => void;
  slug: string;
  setSlug: (s: string) => void;
  description: string;
  setDescription: (d: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  slug,
  setSlug,
  description,
  setDescription,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#0B0E14] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#D4FF24]" />
            Create Workspace
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Workspace Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                );
              }}
              placeholder="Acme Engineering"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Workspace Slug *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-eng"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Main sprint organization..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111722] text-[#9299A8] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-bold"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (n: string) => void;
  keyStr: string;
  setKeyStr: (k: string) => void;
  description: string;
  setDescription: (d: string) => void;
  status: ProjectStatus;
  setStatus: (s: ProjectStatus) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  keyStr,
  setKeyStr,
  description,
  setDescription,
  status,
  setStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#0B0E14] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D4FF24]" />
            New Project
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                const words = e.target.value.trim().split(/\s+/);
                const generatedKey = words
                  .slice(0, 3)
                  .map((w) => w.charAt(0))
                  .join('')
                  .toUpperCase();
                if (generatedKey) setKeyStr(generatedKey);
              }}
              placeholder="Core Platform"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Project Key (e.g. CORE) *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={keyStr}
                onChange={(e) => setKeyStr(e.target.value.toUpperCase())}
                placeholder="CORE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#F5F7FA]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PLANNING">PLANNING</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project goals and requirements..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111722] text-[#9299A8] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-bold"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  email: string;
  setEmail: (e: string) => void;
  role: Role;
  setRole: (r: Role) => void;
  workspaceName: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  email,
  setEmail,
  role,
  setRole,
  workspaceName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#0B0E14] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#D4FF24]" />
            Invite Member to {workspaceName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9299A8] hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">User Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@projectflow.local"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F7FA]">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] text-xs text-white outline-none"
            >
              <option value="ADMIN">ADMIN (Manage projects and members)</option>
              <option value="MEMBER">MEMBER (Create and update tasks)</option>
              <option value="VIEWER">VIEWER (Read-only access)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111722] text-[#9299A8] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-bold"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
