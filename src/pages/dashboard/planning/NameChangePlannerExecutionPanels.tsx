import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ExecutionSnapshotCard } from './NameChangePlannerCards';
import type { ExecutionCardConfig, ExecutionSectionSummary } from './nameChangePlannerUi';
import type { NameChangeReminderInput } from '../../../lib/nameChange/types';
import { bulkUpdateNameChangeReminderStatus } from '../../../lib/nameChange/reminders';

interface NameChangeExecutionSectionsPanelProps {
  sections: ExecutionSectionSummary[];
  isSectionCollapsed: (section: ExecutionSectionSummary) => boolean;
  toggleSectionCollapsed: (sectionKey: string) => void;
  scrollToPlannerTarget: (targetId: string) => void;
  effectiveReminders: NameChangeReminderInput[];
  onRemindersChange: (reminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
}

export function NameChangeExecutionSectionsPanel({
  sections,
  isSectionCollapsed,
  toggleSectionCollapsed,
  scrollToPlannerTarget,
  effectiveReminders,
  onRemindersChange,
}: NameChangeExecutionSectionsPanelProps) {
  return (
    <>
      {sections.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Quick jump</h3>
              <p className="text-sm text-text-secondary">Jump straight to the part you want to handle next.</p>
            </div>
            <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {sections.length} section{sections.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => scrollToPlannerTarget(`execution-section-${section.key}`)}
                className="rounded-[20px] border border-border-subtle bg-white/60 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{section.title}</p>
                  <span className={`rounded-xl px-2 py-1 text-xs ${section.postureTone === 'danger' ? 'bg-danger/10 text-danger' : section.postureTone === 'warning' ? 'bg-warning/10 text-warning' : section.postureTone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                    {section.postureLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-secondary">{section.progressPercent}% · {section.progressLabel}</p>
                <p className="mt-2 text-xs text-text-secondary">{section.highestRiskCard}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {sections.map((section) => (
        <div key={section.key} className="space-y-4">
          <div id={`execution-section-${section.key}`} className="scroll-mt-24 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              <p className="text-sm text-text-secondary">{section.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-xl px-2 py-1 text-xs ${section.postureTone === 'danger' ? 'bg-danger/10 text-danger' : section.postureTone === 'warning' ? 'bg-warning/10 text-warning' : section.postureTone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                  {section.postureLabel}
                </span>
                <span className="text-xs text-text-secondary">{section.postureDetail}</span>
              </div>
              <div className="mt-3 max-w-xl">
                <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>Section progress</span>
                  <span>{section.progressPercent}% · {section.progressLabel}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-xl bg-surface-subtle">
                  <div
                    className={`h-full rounded-xl ${section.postureTone === 'danger' ? 'bg-danger' : section.postureTone === 'warning' ? 'bg-warning' : section.postureTone === 'primary' ? 'bg-primary' : 'bg-text-secondary'}`}
                    style={{ width: `${section.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={() => toggleSectionCollapsed(section.key)}>
              {isSectionCollapsed(section) ? 'Expand section' : 'Collapse section'}
            </Button>
          </div>

          {(section.reminderKeys.length > 0 || section.staleReminderKeys.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {section.highestRiskCardKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => section.highestRiskCardKey && scrollToPlannerTarget(`execution-card-${section.highestRiskCardKey}`)}
                >
                  Focus next card
                </Button>
              )}
              {section.staleReminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.staleReminderKeys, 'scheduled'),
                    { action: 'schedule-stale' },
                  )}
                >
                  Schedule {section.staleReminderKeys.length} old reminder{section.staleReminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
              {section.reminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.reminderKeys, 'dismissed'),
                    { action: 'bulk-update' },
                  )}
                >
                  Dismiss {section.reminderKeys.length} section reminder{section.reminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-border-subtle bg-white/60 p-4">
              <p className="text-xs text-text-tertiary">This part</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.readyCount} ready · {section.blockedCount} need details</p>
              <p className="mt-2 text-xs text-text-secondary">Items that can move now versus items that still need details.</p>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-white/60 p-4">
              <p className="text-xs text-text-tertiary">Worth checking</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.attentionCount} worth checking</p>
              <p className="mt-2 text-xs text-text-secondary">Items that are not blocked but deserve a quick look.</p>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-white/60 p-4">
              <p className="text-xs text-text-tertiary">Most useful next card</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.highestRiskCard}</p>
              <p className="mt-2 text-xs text-text-secondary">The card with the most useful next details to finish.</p>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-white/60 p-4">
              <p className="text-xs text-text-tertiary">Old reminders</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.staleReminderOverlap} old reminder{section.staleReminderOverlap === 1 ? '' : 's'}</p>
              <p className="mt-2 text-xs text-text-secondary">Follow-ups that may need to be rescheduled or dismissed.</p>
            </div>
          </div>

          <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-primary">Next best step</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{section.nextActionLabel}</p>
                <div className="mt-2 space-y-1 text-xs text-text-secondary">
                  <p>{section.nextActionOverview ?? section.nextActionDetail}</p>
                  {section.nextActionDoNow ? <p>Do now: {section.nextActionDoNow}</p> : null}
                  {section.nextActionWhyItHelps ? <p>Why it helps: {section.nextActionWhyItHelps}</p> : null}
                  {section.nextActionCanWait ? <p>Can wait: {section.nextActionCanWait}</p> : null}
                </div>
              </div>
              {section.highestRiskCardKey && (
                <Button size="sm" onClick={() => section.highestRiskCardKey && scrollToPlannerTarget(`execution-card-${section.highestRiskCardKey}`)}>
                  Open next action
                </Button>
              )}
            </div>
          </div>

          {!isSectionCollapsed(section) && (
            <div className="space-y-6">
              {section.cards.map(({ key, ...card }) => (
                <ExecutionSnapshotCard
                  key={key}
                  anchorId={`execution-card-${key}`}
                  {...card as Omit<ExecutionCardConfig, 'key'>}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
