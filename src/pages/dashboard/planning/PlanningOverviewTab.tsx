import React from 'react';
import { AlertTriangle, Clock, DollarSign, Users, CheckCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { PlanningTask, PlanningBudgetItem, PlanningVendor } from './planningService';

interface SeatingReadiness {
  attending: number;
  seated: number;
  unassigned: number;
}

interface Props {
  tasks: PlanningTask[];
  budgetItems: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  seatingReadiness: SeatingReadiness;
  onTabChange: (tab: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export const PlanningOverviewTab: React.FC<Props> = ({ tasks, budgetItems, vendors, seatingReadiness, onTabChange }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    return new Date(t.due_date) < today;
  });

  const upcomingTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= today && d <= in7Days;
  });

  const totalEstimated = budgetItems.reduce((s, i) => s + (i.estimated_amount || 0), 0);
  const totalActual = budgetItems.reduce((s, i) => s + (i.actual_amount || 0), 0);

  const unpaidVendorBalance = vendors.reduce((s, v) => s + (v.balance_due || 0), 0);

  const dueSoonVendors = vendors.filter(v => {
    if (!v.next_payment_due || v.balance_due <= 0) return false;
    const d = new Date(v.next_payment_due);
    return d <= in7Days;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onTabChange('tasks')}
          className="text-left"
        >
          <Card padding="md" className={`h-full transition-shadow hover:shadow-md ${overdueTasks.length > 0 ? 'border-error/40 bg-error/5' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${overdueTasks.length > 0 ? 'bg-error/10' : 'bg-surface-subtle'}`}>
                <AlertTriangle className={`w-5 h-5 ${overdueTasks.length > 0 ? 'text-error' : 'text-text-tertiary'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{overdueTasks.length}</p>
                <p className="text-sm text-text-secondary">Overdue tasks</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('tasks')} className="text-left">
          <Card padding="md" className="h-full transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{upcomingTasks.length}</p>
                <p className="text-sm text-text-secondary">Due in 7 days</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('budget')} className="text-left">
          <Card padding="md" className="h-full transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary-light">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{fmt(totalActual)}</p>
                <p className="text-sm text-text-secondary">Actual vs {fmt(totalEstimated)} planned</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('vendors')} className="text-left">
          <Card padding="md" className={`h-full transition-shadow hover:shadow-md ${unpaidVendorBalance > 0 ? 'border-warning/40' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${unpaidVendorBalance > 0 ? 'bg-warning/10' : 'bg-surface-subtle'}`}>
                <DollarSign className={`w-5 h-5 ${unpaidVendorBalance > 0 ? 'text-warning' : 'text-text-tertiary'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{fmt(unpaidVendorBalance)}</p>
                <p className="text-sm text-text-secondary">Vendor balance due</p>
              </div>
            </div>
          </Card>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Seating Readiness</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Attending guests</span>
              <span className="font-semibold text-text-primary">{seatingReadiness.attending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Seated guests</span>
              <span className="font-semibold text-success">{seatingReadiness.seated}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Unassigned attending</span>
              <span className={`font-semibold ${seatingReadiness.unassigned > 0 ? 'text-warning' : 'text-text-tertiary'}`}>
                {seatingReadiness.unassigned}
              </span>
            </div>
            {seatingReadiness.attending > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>Seating progress</span>
                  <span>{seatingReadiness.attending > 0 ? Math.round((seatingReadiness.seated / seatingReadiness.attending) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${seatingReadiness.attending > 0 ? (seatingReadiness.seated / seatingReadiness.attending) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Task Progress</h3>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-text-tertiary">No tasks yet. Add tasks in the Tasks tab.</p>
          ) : (
            <div className="space-y-3">
              {(['todo', 'in_progress', 'done'] as const).map(status => {
                const count = tasks.filter(t => t.status === status).length;
                const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
                const colors = { todo: 'bg-surface-subtle', in_progress: 'bg-warning/20', done: 'bg-success/20' };
                const textColors = { todo: 'text-text-secondary', in_progress: 'text-warning', done: 'text-success' };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
                      <span className="text-sm text-text-secondary">{labels[status]}</span>
                    </div>
                    <span className={`font-semibold ${textColors[status]}`}>{count}</span>
                  </div>
                );
              })}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>Completion</span>
                  <span>{Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {dueSoonVendors.length > 0 && (
        <Card padding="md" className="border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-text-primary">Vendor Payments Due Soon</h3>
          </div>
          <div className="space-y-2">
            {dueSoonVendors.map(v => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-text-primary">{v.name}</span>
                  {v.next_payment_due && (
                    <span className="text-text-tertiary ml-2">due {new Date(v.next_payment_due).toLocaleDateString()}</span>
                  )}
                </div>
                <span className="font-semibold text-warning">{fmt(v.balance_due)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
