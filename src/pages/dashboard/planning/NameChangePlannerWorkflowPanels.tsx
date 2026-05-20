import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { AlertTriangle, MapPinned } from 'lucide-react';
import type { NameChangePlan } from '../../../lib/nameChange/types';
import type { RecentActivityCard } from './NameChangePlannerPanelTypes';

interface NameChangePlannerRecentActivityPanelProps {
  items: RecentActivityCard[];
  stepCount: number;
  reminderCount: number;
  showAdmin: boolean;
  latestMovementPosture?: string | null;
  dominantMovementLane?: string | null;
  mixedMovementReason?: string | null;
  mixedMovementHasUntouchedRisk?: boolean;
  mixedMovementReminderHeavy?: boolean;
  reminderChurnRisk?: string | null;
  hasRecentCompletion?: boolean;
  hasRecentStart?: boolean;
  hasRecentUntouchedRisk?: boolean;
  hasZeroRecentStepMovement?: boolean;
  formatDateTime: (value: string) => string;
  getActivitySourceLabel: (value: string) => string;
  getExecutionStatusLabel: (value: 'in_progress' | 'todo' | 'complete' | null | undefined) => string;
}

interface NameChangeGeneratedChecklistPanelProps {
  plan: NameChangePlan;
  getExecutionStatusLabel: (value: 'in_progress' | 'todo' | 'complete' | null | undefined) => string;
  onStepExecutionStatusChange: (stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => void;
  onStepExecutionNoteChange: (stepId: string, note: string) => void;
  formatDateTime: (value: string) => string;
}

export function NameChangePlannerRecentActivityPanel({
  items,
  stepCount,
  reminderCount,
  showAdmin,
  latestMovementPosture,
  dominantMovementLane,
  mixedMovementReason,
  mixedMovementHasUntouchedRisk,
  mixedMovementReminderHeavy,
  reminderChurnRisk,
  hasRecentCompletion,
  hasRecentStart,
  hasRecentUntouchedRisk,
  hasZeroRecentStepMovement,
  formatDateTime,
  getActivitySourceLabel,
  getExecutionStatusLabel,
}: NameChangePlannerRecentActivityPanelProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Recent activity</h3>
          <p className="text-sm text-text-secondary">Latest name-change updates from step notes and status changes.</p>
          <p className="mt-2 text-xs text-text-secondary">{stepCount} step updates · {reminderCount} reminder actions</p>
          {showAdmin && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-text-secondary">Latest movement posture: {latestMovementPosture ?? 'mixed'}</p>
              <p className="text-xs text-text-secondary">Dominant movement lane: {dominantMovementLane ?? 'mixed'}</p>
              {mixedMovementReason && <p className="text-xs text-text-secondary">Mixed movement reason: {mixedMovementReason}</p>}
              {mixedMovementReason && <p className="text-xs text-text-secondary">Mixed window still shows untouched risk: {mixedMovementHasUntouchedRisk ? 'yes' : 'no'}</p>}
              {mixedMovementReason && <p className="text-xs text-text-secondary">Mixed window reminder-heavy: {mixedMovementReminderHeavy ? 'yes' : 'no'}</p>}
              <p className="text-xs text-text-secondary">Reminder churn risk: {reminderChurnRisk ?? 'low'}</p>
              <p className="text-xs text-text-secondary">Recent completion: {hasRecentCompletion ? 'yes' : 'no'}</p>
              <p className="text-xs text-text-secondary">Recent start: {hasRecentStart ? 'yes' : 'no'}</p>
              <p className="text-xs text-text-secondary">Untouched risk still visible: {hasRecentUntouchedRisk ? 'yes' : 'no'}</p>
              <p className="text-xs text-text-secondary">Zero recent step movement: {hasZeroRecentStepMovement ? 'yes' : 'no'}</p>
            </div>
          )}
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {items.length} recent updates
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.stepId}-${item.timestamp}`} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                <p className="mt-1 text-xs text-text-secondary">{formatDateTime(item.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{getActivitySourceLabel(item.source)}</span>
                <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{getExecutionStatusLabel(item.executionStatus)}</span>
              </div>
            </div>
            {item.note && <p className="mt-3 text-sm text-text-secondary">{item.note}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeGeneratedChecklistPanel({
  plan,
  getExecutionStatusLabel,
  onStepExecutionStatusChange,
  onStepExecutionNoteChange,
  formatDateTime,
}: NameChangeGeneratedChecklistPanelProps) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Generated checklist</h3>
          <p className="text-sm text-text-secondary">Steps tailored from your saved details.</p>
        </div>
      </div>

      {plan.summary.blockers.length > 0 && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Current blockers</p>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                {plan.summary.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {plan.steps.map((step) => (
          <div key={step.id} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-tertiary">{step.phase}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{step.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs ${step.status === 'ready' ? 'bg-success/10 text-success' : step.status === 'blocked' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{step.status}</span>
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="font-medium text-text-primary">Timing</p>
                <p className="mt-1 text-text-secondary">{step.timing}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">Evidence</p>
                <ul className="mt-1 space-y-1 text-text-secondary">{step.evidenceNeeded.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
              <div>
                <p className="font-medium text-text-primary">Forms / institutions</p>
                <ul className="mt-1 space-y-1 text-text-secondary">
                  {step.forms.map((form) => <li key={form.code}>• {form.code}: {form.title}</li>)}
                  {step.institutions.map((institution) => <li key={institution}>• {institution}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">Status: {getExecutionStatusLabel(step.executionStatus)}</span>
              {step.executionStatus !== 'in_progress' && step.status !== 'blocked' && (
                <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'in_progress')}>Mark in progress</Button>
              )}
              {step.executionStatus !== 'complete' && step.status !== 'blocked' && (
                <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'complete')}>Mark complete</Button>
              )}
              {step.executionStatus !== 'todo' && (
                <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'todo')}>Reset</Button>
              )}
            </div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs font-medium text-text-secondary">Step note</label>
              <textarea
                className="min-h-[84px] w-full rounded-xl border border-border px-3 py-2 text-sm"
                value={step.executionNote ?? ''}
                onChange={(e) => onStepExecutionNoteChange(step.id, e.target.value)}
                placeholder="Add what was submitted, confirmed, or still blocked here"
              />
              {(step.executionUpdatedAt || step.completedAt) && (
                <p className="text-xs text-text-secondary">
                  {step.executionUpdatedAt ? `Updated ${formatDateTime(step.executionUpdatedAt)}` : ''}
                  {step.executionUpdatedAt && step.completedAt ? ' · ' : ''}
                  {step.completedAt ? `Completed ${formatDateTime(step.completedAt)}` : ''}
                </p>
              )}
            </div>
            {step.blockers.length > 0 && <p className="mt-3 text-xs text-warning">Blocked by: {step.blockers.join(' · ')}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
