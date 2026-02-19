import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckSquare, Square, Columns, List, Sparkles, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PlanningTask } from './planningService';

interface Props {
  tasks: PlanningTask[];
  weddingDate: string | null;
  onAdd: (task: Partial<PlanningTask>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningTask>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateMilestones: () => Promise<void>;
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

function TaskForm({ initial, onSave, onCancel }: {
  initial?: Partial<PlanningTask>;
  onSave: (t: Partial<PlanningTask>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
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
    await onSave({ ...form, due_date: form.due_date || null });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-surface-subtle rounded-xl border border-border-subtle">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional details"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.due_date ?? ''}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Owner</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.owner_name}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
            placeholder="Responsible person"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
          <select
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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

function TaskCard({ task, onUpdate, onDelete, onEdit }: {
  task: PlanningTask;
  onUpdate: (id: string, updates: Partial<PlanningTask>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < today;

  return (
    <div className={`p-3 bg-surface rounded-xl border transition-all ${isOverdue ? 'border-error/30 bg-error/5' : 'border-border-subtle'}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
          className="mt-0.5 flex-shrink-0 text-text-tertiary hover:text-primary transition-colors"
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
            {task.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-error font-medium' : 'text-text-tertiary'}`}>
                {isOverdue ? 'Overdue: ' : ''}{new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {task.owner_name && (
              <span className="text-xs text-text-tertiary">{task.owner_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const TasksTab: React.FC<Props> = ({ tasks, weddingDate, onAdd, onUpdate, onDelete, onGenerateMilestones }) => {
  const [view, setView] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanningTask | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingMilestones, setGeneratingMilestones] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

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

  async function handleBulkDone() {
    for (const id of Array.from(selectedIds)) {
      await onUpdate(id, { status: 'done' });
    }
    setSelectedIds(new Set());
  }

  async function handleGenerateMilestones() {
    setGeneratingMilestones(true);
    await onGenerateMilestones();
    setGeneratingMilestones(false);
    setConfirmGenerate(false);
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
            className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select
            className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as FilterPriority)}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-lg border border-border-subtle">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-surface shadow-sm text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded transition-colors ${view === 'kanban' ? 'bg-surface shadow-sm text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkDone}>
              <CheckSquare className="w-4 h-4 mr-1" />
              Mark {selectedIds.size} Done
            </Button>
          )}
          {weddingDate && tasks.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmGenerate(true)} disabled={generatingMilestones}>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Checklist
            </Button>
          )}
          {weddingDate && tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmGenerate(true)} disabled={generatingMilestones}>
              <Sparkles className="w-4 h-4 mr-1" />
              Checklist
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {confirmGenerate && (
        <div className="p-4 bg-primary-light border border-primary/20 rounded-xl flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Generate milestone checklist?</p>
            <p className="text-xs text-text-secondary mt-0.5">This will add ~28 standard wedding tasks based on your wedding date. Existing tasks will be kept.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" onClick={handleGenerateMilestones} disabled={generatingMilestones}>
              {generatingMilestones ? 'Generating...' : 'Generate'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
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
        <Card padding="lg" className="text-center">
          <p className="text-text-secondary mb-2">No tasks yet.</p>
          {weddingDate ? (
            <p className="text-sm text-text-tertiary">Add tasks manually or generate a milestone checklist from your wedding date.</p>
          ) : (
            <p className="text-sm text-text-tertiary">Add your first task to get started.</p>
          )}
        </Card>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {sortedFiltered.map(task => (
            <div key={task.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(task.id)}
                onChange={e => {
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
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onEdit={() => setEditingTask(task)}
                  />
                )}
              </div>
            </div>
          ))}
          {sortedFiltered.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-4">No tasks match the current filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="bg-surface-subtle rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">{col.label}</h3>
                  <span className="text-xs text-text-tertiary bg-surface px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onEdit={() => setEditingTask(task)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-text-tertiary text-center py-6">No tasks</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
