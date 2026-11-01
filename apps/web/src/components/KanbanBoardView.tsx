import React from 'react';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  ArrowRight,
  User,
  SlidersHorizontal,
  ArrowUpDown,
  Trash2,
  Edit3,
  GripVertical,
} from 'lucide-react';
import type {
  ProjectSummary,
  TaskSummary,
  TaskStatus,
  TaskPriority,
  ProjectMemberSummary,
} from '../../../../packages/shared/src/types.js';

interface KanbanBoardViewProps {
  projects: ProjectSummary[];
  selectedProject: ProjectSummary | null;
  onSelectProject: (p: ProjectSummary) => void;
  tasks: TaskSummary[];
  projectMembers: ProjectMemberSummary[];
  loadingTasks: boolean;
  onOpenCreateTask: () => void;
  onOpenEditTask: (task: TaskSummary) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  // Filters & Sorting
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  priorityFilter: TaskPriority | 'ALL';
  setPriorityFilter: (p: TaskPriority | 'ALL') => void;
  assigneeFilter: string;
  setAssigneeFilter: (a: string) => void;
  overdueOnly: boolean;
  setOverdueOnly: (o: boolean) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (o: 'asc' | 'desc') => void;
  // Drag and drop
  draggedTaskId: string | null;
  setDraggedTaskId: (id: string | null) => void;
  dragOverColumn: TaskStatus | null;
  setDragOverColumn: (status: TaskStatus | null) => void;
}

const KANBAN_COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: 'TODO', label: 'To Do', dotColor: 'bg-[#9299A8]' },
  { id: 'IN_PROGRESS', label: 'In Progress', dotColor: 'bg-[#1558C9]' },
  { id: 'IN_REVIEW', label: 'In Review', dotColor: 'bg-amber-400' },
  { id: 'DONE', label: 'Done', dotColor: 'bg-[#D4FF24]' },
];

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BACKLOG: ['TODO', 'IN_PROGRESS'],
  TODO: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW', 'DONE', 'BACKLOG'],
  IN_REVIEW: ['IN_PROGRESS', 'DONE', 'TODO'],
  DONE: ['TODO', 'IN_PROGRESS'],
};

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  tasks,
  projectMembers,
  loadingTasks,
  onOpenCreateTask,
  onOpenEditTask,
  onDeleteTask,
  onStatusChange,
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  overdueOnly,
  setOverdueOnly,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  draggedTaskId,
  setDraggedTaskId,
  dragOverColumn,
  setDragOverColumn,
}) => {
  const isOverdue = (dueDate: Date | string | null | undefined, status: TaskStatus) => {
    if (!dueDate || status === 'DONE') return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25">
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1558C9]/20 text-[#1558C9] border border-[#1558C9]/35">
            MED
          </span>
        );
      case 'LOW':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.05] text-[#9299A8] border border-white/[0.08]">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Project Selector Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-[#9299A8] uppercase tracking-wider mr-2 shrink-0">
            Project:
          </span>
          {projects.map((p) => {
            const isSelected = selectedProject?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1558C9] text-white shadow-[0_4px_16px_rgba(21,88,201,0.35)]'
                    : 'bg-[#0B0E14] text-[#9299A8] hover:text-white border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <span>{p.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-black/30 text-[#D4FF24]' : 'bg-white/[0.05] text-[#9299A8]'
                  }`}
                >
                  {p.key}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenCreateTask}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(21,88,201,0.35)] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* 2. Advanced Filter & Search Controls */}
      <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/[0.07] flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, key..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111722] border border-white/[0.06] focus:border-[#1558C9] text-white text-xs placeholder-[#9299A8]/60 outline-none transition-colors"
          />
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'ALL')}
          className="px-3 py-2 rounded-lg bg-[#111722] border border-white/[0.06] text-xs text-[#F5F7FA] outline-none"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#111722] border border-white/[0.06] text-xs text-[#F5F7FA] outline-none"
        >
          <option value="ALL">All Assignees</option>
          <option value="UNASSIGNED">Unassigned Only</option>
          {projectMembers.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user?.name || m.user?.email}
            </option>
          ))}
        </select>

        {/* Overdue Only Toggle */}
        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            overdueOnly
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-[#111722] text-[#9299A8] hover:text-white border border-white/[0.06]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue Only</span>
        </button>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#111722] border border-white/[0.06] text-xs text-[#F5F7FA] outline-none"
          >
            <option value="orderIndex">Sort by Position</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="taskNumber">Sort by Task #</option>
            <option value="title">Sort by Title</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg bg-[#111722] text-[#9299A8] hover:text-white border border-white/[0.06] transition-colors"
            title={`Sort ${sortOrder.toUpperCase()}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.id);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                if (draggedTaskId) {
                  onStatusChange(draggedTaskId, col.id);
                  setDraggedTaskId(null);
                }
              }}
              className={`flex flex-col rounded-2xl bg-[#0B0E14] border transition-all ${
                isOver
                  ? 'border-[#1558C9] shadow-[0_0_25px_rgba(21,88,201,0.25)] bg-[#0e131d]'
                  : 'border-white/[0.07]'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#111722] text-[#9299A8] border border-white/[0.05]">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="p-3 space-y-3 min-h-[300px]">
                {colTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  const allowedNextStatuses = VALID_TRANSITIONS[task.status] || [];

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className="group p-4 rounded-xl bg-[#111722] hover:bg-[#161e2e] border border-white/[0.06] hover:border-white/[0.15] shadow-lg transition-all space-y-3 cursor-grab active:cursor-grabbing"
                    >
                      {/* Top Bar: Key & Priority */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-[#1558C9] group-hover:text-[#D4FF24] transition-colors">
                          {task.taskKey || `${selectedProject?.key || 'TASK'}-${task.taskNumber}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(task.priority)}
                          <button
                            onClick={() => onOpenEditTask(task)}
                            className="p-1 rounded text-[#9299A8] hover:text-white hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit task"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 rounded text-[#9299A8] hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-[#9299A8] mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Due Date & Assignee */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {task.assignee ? (
                            <div className="flex items-center gap-1 text-[#F5F7FA]">
                              <div className="w-4 h-4 rounded-full bg-[#1558C9] text-[9px] font-bold flex items-center justify-center text-white">
                                {task.assignee.name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-[10px] truncate max-w-[80px]">
                                {task.assignee.name?.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#9299A8]/70 italic">Unassigned</span>
                          )}
                        </div>

                        {task.dueDate && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-mono font-medium ${
                              overdue ? 'text-rose-400 font-bold' : 'text-[#9299A8]'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Quick State Machine Transition Buttons */}
                      {allowedNextStatuses.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.04] flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] uppercase tracking-wider text-[#9299A8] mr-1">
                            Move:
                          </span>
                          {allowedNextStatuses.map((st) => (
                            <button
                              key={st}
                              onClick={() => onStatusChange(task.id, st)}
                              className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-[#1558C9]/30 text-[10px] text-[#9299A8] hover:text-[#D4FF24] border border-white/[0.06] hover:border-[#1558C9]/40 transition-colors"
                            >
                              {st === 'IN_PROGRESS'
                                ? 'In Progress'
                                : st === 'IN_REVIEW'
                                ? 'Review'
                                : st === 'DONE'
                                ? 'Done'
                                : st === 'TODO'
                                ? 'To Do'
                                : st}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="py-12 text-center text-xs text-[#9299A8] italic border border-dashed border-white/[0.05] rounded-xl">
                    No tasks in {col.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
