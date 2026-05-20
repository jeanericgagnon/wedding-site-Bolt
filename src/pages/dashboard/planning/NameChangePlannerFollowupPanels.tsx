import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { bulkUpdateNameChangeReminderStatus, updateNameChangeReminderStatus } from '../../../lib/nameChange/reminders';
import type { NameChangeActionFeedItem } from '../../../lib/nameChange/actionFeed';
import type { NameChangeReminderInput } from '../../../lib/nameChange/types';
import type {
  ActionFeedStatusLabelFns,
  InstitutionLibraryCard,
  RegistryFormCard,
  ReminderAttentionItemCard,
  ReminderAttentionSummaryCard,
  ReminderSummaryCard,
} from './NameChangePlannerPanelTypes';
import type { ReminderPostureCardConfig } from './nameChangePlannerUi';
import { ReminderPostureCard } from './NameChangePlannerCards';

interface NameChangeReminderAttentionPanelProps {
  reminderAttention: ReminderAttentionItemCard[];
  reminderAttentionSummary: ReminderAttentionSummaryCard;
  reminderPostureCards: ReminderPostureCardConfig[];
  effectiveReminders: NameChangeReminderInput[];
  onRemindersChange: (reminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
  scrollToPlannerTarget: (targetId: string) => void;
  getReminderCtaLabel: (plannerIntent?: 'open_execution_card') => string;
  formatDateTime: (value: string) => string;
}

interface NameChangeSuggestedRemindersPanelProps {
  effectiveReminders: NameChangeReminderInput[];
  reminderSummary: ReminderSummaryCard;
  onRemindersChange: (reminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
  scrollToPlannerTarget: (targetId: string) => void;
  getReminderCtaLabel: (plannerIntent?: 'open_execution_card') => string;
}

interface NameChangeNextStepsPanelProps {
  actionFeed: NameChangeActionFeedItem[];
  scrollToPlannerTarget: (targetId: string) => void;
  labels: ActionFeedStatusLabelFns;
}

interface NameChangePlannerAdminReviewPanelProps {
  showAdmin: boolean;
  onToggle: () => void;
  forms: RegistryFormCard[];
  institutions: InstitutionLibraryCard[];
}

export function NameChangeReminderAttentionPanel({
  reminderAttention,
  reminderAttentionSummary,
  reminderPostureCards,
  effectiveReminders,
  onRemindersChange,
  scrollToPlannerTarget,
  getReminderCtaLabel,
  formatDateTime,
}: NameChangeReminderAttentionPanelProps) {
  if (reminderAttention.length === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Reminders worth checking</h3>
          <p className="text-sm text-text-secondary">Open reminders still tied to unfinished steps.</p>
          <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.highUrgency} high urgency · {reminderAttentionSummary.actionablePriority} ready to handle · {reminderAttentionSummary.blockedAndStale} waiting and old</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-white/70 px-2 py-1 text-xs text-text-secondary">{reminderAttention.length} item{reminderAttention.length === 1 ? '' : 's'}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemindersChange(
              bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'scheduled'),
              { action: 'bulk-update' },
            )}
          >
            Schedule all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemindersChange(
              bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'dismissed'),
              { action: 'bulk-update' },
            )}
          >
            Dismiss all
          </Button>
          {reminderAttentionSummary.stale > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemindersChange(
                bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.filter((item) => item.isStale).map((item) => item.reminderKey), 'scheduled'),
                { action: 'schedule-stale' },
              )}
            >
              Schedule old
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {reminderPostureCards.map(({ key, ...card }) => (
          <ReminderPostureCard key={key} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-warning/20 bg-white/60 p-4">
          <p className="text-xs text-text-tertiary">Actionable split</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionablePriority} priority · {reminderAttentionSummary.actionableNormal} normal</p>
          <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.actionableAndStale} actionable + stale · posture {reminderAttentionSummary.actionableFreshPosture}</p>
        </div>
        <div className="rounded-2xl border border-warning/20 bg-white/60 p-4">
          <p className="text-xs text-text-tertiary">Old ready reminders</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionableStalePriority} priority · {reminderAttentionSummary.actionableStaleNormal} normal</p>
          <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.staleActionablePosture}</p>
        </div>
        <div className="rounded-2xl border border-warning/20 bg-white/60 p-4">
          <p className="text-xs text-text-tertiary">Old waiting reminders</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.blockedStalePriority} priority · {reminderAttentionSummary.blockedStaleNormal} normal</p>
          <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.blockedStalePosture} · stale priority {reminderAttentionSummary.stalePriority}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reminderAttention.map((item) => (
          <div key={item.reminderKey} className="rounded-2xl border border-warning/20 bg-white/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                <p className="mt-1 text-xs text-text-secondary">Depends on {item.dependentStepTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.priorityTier && <span className={`rounded-xl px-2 py-1 text-xs ${item.priorityTier === 'critical' ? 'bg-danger/10 text-danger' : item.priorityTier === 'elevated' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{item.priorityTier}</span>}
                {item.actionability && <span className={`rounded-xl px-2 py-1 text-xs ${item.actionability === 'blocked_by_untouched_step' ? 'bg-surface-subtle text-text-secondary' : 'bg-primary/10 text-primary'}`}>{item.actionability === 'blocked_by_untouched_step' ? 'blocked' : 'actionable'}</span>}
                {item.isStale && <span className="rounded-xl bg-warning/10 px-2 py-1 text-xs text-warning">old</span>}
                <span className={`rounded-xl px-2 py-1 text-xs ${item.urgency === 'high' ? 'bg-warning/10 text-warning' : item.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>{item.urgency}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-text-secondary">Step is still {item.dependentStepExecutionStatus.replace('_', ' ')} · reminder is {item.reminderStatus}</p>
            <p className="mt-2 text-xs font-medium text-text-primary">Follow-up target: {item.suggestedOffsetDays} day{item.suggestedOffsetDays === 1 ? '' : 's'} after the triggering step</p>
            <p className="mt-2 text-xs text-text-secondary">Last update: {item.lastTouchedAt ? formatDateTime(item.lastTouchedAt) : 'No step updates yet'}</p>
            <div className="mt-3 flex gap-2">
              {item.focusTargetId && (
                <Button variant="ghost" size="sm" onClick={() => scrollToPlannerTarget(item.focusTargetId!)}>
                  {getReminderCtaLabel(item.plannerIntent)}
                </Button>
              )}
              {item.reminderStatus !== 'scheduled' && (
                <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
              )}
              {item.reminderStatus !== 'dismissed' && (
                <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeSuggestedRemindersPanel({
  effectiveReminders,
  reminderSummary,
  onRemindersChange,
  scrollToPlannerTarget,
  getReminderCtaLabel,
}: NameChangeSuggestedRemindersPanelProps) {
  if (effectiveReminders.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Suggested follow-up reminders</h3>
          <p className="text-sm text-text-secondary">Suggested reminders based on the steps in this plan.</p>
          <p className="mt-2 text-xs text-text-secondary">{reminderSummary.pending} pending · {reminderSummary.highUrgencyOpen} high-urgency open</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{effectiveReminders.length} reminders</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {effectiveReminders.map((reminder) => (
          <div key={reminder.reminder_key} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{reminder.label}</p>
                <p className="mt-1 text-xs text-text-secondary">Depends on: {reminder.depends_on_step_id}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs ${reminder.urgency === 'high' ? 'bg-warning/10 text-warning' : reminder.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                {reminder.urgency}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{reminder.reason}</p>
            <p className="mt-3 text-xs font-medium text-text-primary">Target follow-up: {reminder.suggested_offset_days} day{reminder.suggested_offset_days === 1 ? '' : 's'} after the triggering step</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{reminder.status}</span>
              <div className="flex gap-2">
                {reminder.focus_target_id && (
                  <Button variant="ghost" size="sm" onClick={() => scrollToPlannerTarget(reminder.focus_target_id!)}>
                    {getReminderCtaLabel(reminder.planner_intent)}
                  </Button>
                )}
                {reminder.status !== 'scheduled' && (
                  <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
                )}
                {reminder.status !== 'dismissed' && (
                  <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeNextStepsPanel({
  actionFeed,
  scrollToPlannerTarget,
  labels,
}: NameChangeNextStepsPanelProps) {
  return (
    <Card>
      <div id="account-update-templates" className="scroll-mt-24" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Next steps</h3>
          <p className="text-sm text-text-secondary">A simple order for what to handle next, including any document details worth checking.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {actionFeed.length} action{actionFeed.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actionFeed.slice(0, 6).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollToPlannerTarget(item.focusTargetId)}
            className="rounded-2xl border border-border-subtle p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.action.label}</p>
                <p className="mt-1 text-xs text-text-secondary">{item.title} · {item.laneLabel}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-xl px-2 py-1 text-xs ${item.severity === 'blocking' ? 'bg-danger/10 text-danger' : item.severity === 'attention' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                  {labels.getStatusChipLabel(item.severity)}
                </span>
                <span className={`rounded-xl px-2 py-1 text-xs ${labels.getUrgencyClass(item.urgencyTier)}`}>
                  {labels.getStatusChipLabel(item.urgencyTier)}
                </span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-text-secondary">{item.action.detail}</p>
            <p className="mt-2 text-xs text-text-secondary">{labels.getSectionLabel(item.sectionKey)} · {item.origin === 'execution' ? 'next step' : 'document check'} · {item.action.category} · {labels.getUrgencyReasonLabel(item.urgencyReason)}</p>
            <p className="mt-3 text-xs font-medium text-primary">{labels.getCtaLabel(item.plannerIntent)} →</p>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function NameChangePlannerAdminReviewPanel({
  showAdmin,
  onToggle,
  forms,
  institutions,
}: NameChangePlannerAdminReviewPanelProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Rules + registry review</h3>
          <p className="text-sm text-text-secondary">Review the rules and lists that shape this plan.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>{showAdmin ? 'Hide review' : 'Show review'}</Button>
      </div>

      {showAdmin && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-text-primary">Seeded forms ({forms.length})</p>
            </div>
            <div className="mt-3 space-y-3">
              {forms.map((form) => (
                <div key={form.code} className="rounded-xl bg-surface-subtle/50 p-3">
                  <p className="text-sm font-medium text-text-primary">{form.code}: {form.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{form.authority} · {form.jurisdiction}</p>
                  <p className="mt-1 text-xs text-text-secondary">Triggers: {form.appliesWhen.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-text-primary">Institution library ({institutions.length})</p>
            </div>
            <div className="mt-3 space-y-3">
              {institutions.map((institution) => (
                <div key={institution.key} className="rounded-xl bg-surface-subtle/50 p-3">
                  <p className="text-sm font-medium text-text-primary">{institution.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">Category: {institution.category}</p>
                  <p className="mt-1 text-xs text-text-secondary">{institution.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
