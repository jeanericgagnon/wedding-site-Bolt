import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, CheckSquare, Square, Columns, List, Sparkles, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { PlanningTask } from './planningService';
import { formatTaskDueDate, isTaskDueOnOrBefore } from './taskDueDate';

interface Props {
  tasks: PlanningTask[];
  weddingDate: string | null;
  onAdd: (task: Partial<PlanningTask>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningTask>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateMilestones: () => Promise<void>;
  canEdit?: boolean;
}

type ViewMode = 'list' | 'kanban';
type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done';
type FilterPriority = 'all' | 'low' | 'medium' | 'high';

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'neutral'> = {
  high: 'error',
  medium: 'warning',
  low: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const TASK_CATEGORIES = ['Logistics', 'Guests', 'Vendors', 'Design', 'Ceremony', 'Reception', 'Travel', 'Legal', 'Other'];

interface TaskFormProps {
  initial?: Partial<PlanningTask>;
  onSave: (t: Partial<PlanningTask>) => Promise<void>;
  onCancel: () => void;
}

interface TaskCardProps {
  task: PlanningTask;
  onToggleDone: (task: PlanningTask) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
  canEdit?: boolean;
  pending?: boolean;
}

function TaskForm({ initial, onSave, onCancel }: TaskFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    due_date: initial?.due_date ?? '',
    status: initial?.status ?? 'todo',
    priority: initial?.priority ?? 'medium',
    owner_name: initial?.owner_name ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, category: form.category || null, due_date: form.due_date || null });
    } catch {
      toast('Couldn’t save that task right now.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[20px] border border-border-subtle bg-surface-subtle p-4 shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
          <input
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
            required
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <textarea
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional details"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
          <select
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.category ?? ''}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <option value="">No category</option>
            {TASK_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.due_date ?? ''}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Owner</label>
          <input
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.owner_name}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
            placeholder="Responsible person"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
          <select
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as PlanningTask['status'] }))}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
          <select
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as PlanningTask['priority'] }))}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</Button>
      </div>
    </form>
  );
}

function TaskCard({ task, onToggleDone, onDelete, onEdit, canEdit = true, pending = false }: TaskCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = task.status !== 'done' && isTaskDueOnOrBefore(task.due_date, today);

  return (
    <div className={`rounded-[20px] border bg-white p-3 shadow-none transition-colors ${isOverdue ? 'border-error/25 bg-error/5' : 'border-border-subtle hover:border-primary/25'}`}>
      <div className="flex items-start gap-2">
        <button
          aria-label={task.status === 'done' ? `Mark task ${task.title} incomplete` : `Mark task ${task.title} complete`}
          onClick={() => canEdit && !pending && void onToggleDone(task)}
          disabled={!canEdit || pending}
          className="mt-0.5 flex-shrink-0 text-text-tertiary hover:text-primary transition-colors disabled:opacity-40"
        >
          {task.status === 'done' ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge variant={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
            {task.category && <Badge variant="neutral">{task.category}</Badge>}
            {task.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-error font-medium' : 'text-text-tertiary'}`}>
                {isOverdue ? 'Overdue: ' : ''}{formatTaskDueDate(task.due_date)}
              </span>
            )}
            {task.owner_name && (
              <span className="text-xs text-text-tertiary">{task.owner_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button aria-label={`Edit task ${task.title}`} onClick={() => canEdit && !pending && onEdit()} disabled={!canEdit || pending} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button aria-label={`Delete task ${task.title}`} onClick={() => canEdit && !pending && void onDelete(task.id)} disabled={!canEdit || pending} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const TasksTab: React.FC<Props> = ({ tasks, weddingDate, onAdd, onUpdate, onDelete, onCreateMilestones, canEdit = true }) => {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanningTask | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [generatingMilestones, setGeneratingMilestones] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  useEffect(() => {
    if (canEdit) return;
    setShowAddForm(false);
    setEditingTask(null);
    setSelectedIds(new Set());
    setConfirmCreate(false);
    setBulkUpdating(false);
    setGeneratingMilestones(false);
    setPendingTaskIds(new Set());
  }, [canEdit]);

  async function handleBulkDone() {
    if (!canEditRef.current || bulkUpdating || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        if (!canEditRef.current) return;
        await onUpdate(id, { status: 'done' });
      }
      if (!canEditRef.current) return;
      setSelectedIds(new Set());
    } catch {
      if (!canEditRef.current) return;
      toast('Couldn’t mark those tasks complete right now.', 'error');
    } finally {
      if (canEditRef.current) setBulkUpdating(false);
    }
  }

  async function handleCreateMilestones() {
    if (!canEditRef.current) return;
    setGeneratingMilestones(true);
    try {
      await onCreateMilestones();
      if (!canEditRef.current) return;
      setConfirmCreate(false);
    } catch {
      if (!canEditRef.current) return;
      toast('Couldn’t build the wedding checklist right now.', 'error');
    } finally {
      if (canEditRef.current) setGeneratingMilestones(false);
    }
  }

  async function runTaskMutation(taskId: string, work: () => Promise<void>, errorMessage: string) {
    if (!canEditRef.current || pendingTaskIds.has(taskId)) return;

    setPendingTaskIds((current) => new Set(current).add(taskId));
    try {
      if (!canEditRef.current) return;
      await work();
    } catch {
      if (!canEditRef.current) return;
      toast(errorMessage, 'error');
    } finally {
      if (!canEditRef.current) return;
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleTaskStatusToggle(task: PlanningTask) {
    await runTaskMutation(
      task.id,
      () => onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' }),
      'Couldn’t update that task right now.',
    );
  }

  async function handleTaskDelete(taskId: string) {
    await runTaskMutation(
      taskId,
      () => onDelete(taskId),
      'Couldn’t delete that task right now.',
    );
  }

  const kanbanColumns: { status: PlanningTask['status']; label: string }[] = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'done', label: 'Done' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select
            className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as FilterPriority)}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface-subtle p-1">
            <button
              onClick={() => setView('list')}
              className={`rounded-xl p-1.5 transition-colors ${view === 'list' ? 'bg-surface text-primary ring-1 ring-border-subtle' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`rounded-xl p-1.5 transition-colors ${view === 'kanban' ? 'bg-surface text-primary ring-1 ring-border-subtle' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkDone} disabled={!canEdit || bulkUpdating}>
              <CheckSquare className="w-4 h-4 mr-1" />
              {bulkUpdating ? 'Saving...' : `Mark ${selectedIds.size} complete`}
            </Button>
          )}
          {weddingDate && tasks.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmCreate(true)} disabled={generatingMilestones || !canEdit}>
              <Sparkles className="w-4 h-4 mr-1" />
              Build checklist
            </Button>
          )}
          {weddingDate && tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmCreate(true)} disabled={generatingMilestones || !canEdit}>
              <Sparkles className="w-4 h-4 mr-1" />
              Wedding checklist
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddForm(true)} disabled={!canEdit}>
            <Plus className="w-4 h-4 mr-1" />
            Add task
          </Button>
        </div>
      </div>

      {confirmCreate && (
        <div className="flex items-start justify-between gap-4 rounded-[20px] border border-primary/20 bg-primary-light p-4 shadow-none">
          <div>
            <p className="text-sm font-medium text-text-primary">Build a wedding checklist?</p>
            <p className="text-xs text-text-secondary mt-0.5">This adds a suggested planning checklist based on your wedding date. Anything you already added stays in place.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" onClick={handleCreateMilestones} disabled={!canEdit || generatingMilestones}>
              {generatingMilestones ? 'Building...' : 'Build checklist'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {showAddForm && (
        <TaskForm
          onSave={async (t) => { await onAdd(t); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingTask && (
        <TaskForm
          initial={editingTask}
          onSave={async (t) => { await onUpdate(editingTask.id, t); setEditingTask(null); }}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {tasks.length === 0 && !showAddForm ? (
        <Card padding="lg" className="rounded-[20px] text-center shadow-none">
          <p className="text-text-secondary mb-2">No planning items yet.</p>
          {weddingDate ? (
            <p className="text-sm text-text-tertiary">Add your own items or let dayof build a starting checklist from your wedding date.</p>
          ) : (
            <p className="text-sm text-text-tertiary">Add your first planning item to get started.</p>
          )}
        </Card>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {sortedFiltered.map(task => (
            <div key={task.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(task.id)}
                disabled={!canEdit}
                onChange={e => {
                  if (!canEdit) return;
                  const next = new Set(selectedIds);
                  if (e.target.checked) next.add(task.id);
                  else next.delete(task.id);
                  setSelectedIds(next);
                }}
                className="mt-3.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex-1">
                {editingTask?.id === task.id ? null : (
                  <TaskCard
                    task={task}
                    onToggleDone={handleTaskStatusToggle}
                    onDelete={handleTaskDelete}
                    onEdit={() => setEditingTask(task)}
                    canEdit={canEdit}
                    pending={pendingTaskIds.has(task.id)}
                  />
                )}
              </div>
            </div>
          ))}
          {sortedFiltered.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-4">Nothing matches those filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="space-y-2 rounded-[20px] border border-border-subtle bg-surface-subtle p-3 shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">{col.label}</h3>
                  <span className="rounded-xl border border-border-subtle bg-surface px-2 py-0.5 text-xs text-text-tertiary">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleDone={handleTaskStatusToggle}
                    onDelete={handleTaskDelete}
                    onEdit={() => setEditingTask(task)}
                    canEdit={canEdit}
                    pending={pendingTaskIds.has(task.id)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-text-tertiary text-center py-6">Nothing here yet</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
