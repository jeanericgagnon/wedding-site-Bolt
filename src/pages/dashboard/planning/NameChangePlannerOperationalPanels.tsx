import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FileStack, Sparkles } from 'lucide-react';
import type {
  AccountUpdateTemplateCard,
  DocumentVaultRowCard,
  PreparationOverviewRowCard,
  StatusTrackingRowCard,
} from './NameChangePlannerPanelTypes';

interface NameChangeDocumentVaultPanelProps {
  documentVaultRows: DocumentVaultRowCard[];
}

interface NameChangePreparationOverviewPanelProps {
  rows: PreparationOverviewRowCard[];
}

interface NameChangeStatusTrackingPanelProps {
  rows: StatusTrackingRowCard[];
}

interface NameChangeAccountUpdateTemplatesPanelProps {
  templates: AccountUpdateTemplateCard[];
  copiedTemplateNotice: {
    id: string;
    mode: 'copied' | 'downloaded';
  } | null;
  copyingTemplateId: string | null;
  onCopy: (templateId: string) => void;
}

export function NameChangeDocumentVaultPanel({
  documentVaultRows,
}: NameChangeDocumentVaultPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Lightweight document and status vault</h3>
          <p className="mt-1 text-sm text-text-secondary">Save status and document details without storing sensitive files.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{documentVaultRows.length} tracked docs</span>
      </div>

      <div className="mt-4 space-y-3">
        {documentVaultRows.length > 0 ? documentVaultRows.map((row) => (
          <div key={row.key} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                <p className="mt-1 text-xs text-text-secondary">{row.linkedFieldCount}/{row.expectedFieldCount} grounded fields · {row.storageModeLabel}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs ${row.status === 'reviewed' ? 'bg-success/10 text-success' : row.status === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                {row.status}
              </span>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-border-subtle p-4 text-sm text-text-secondary">Add a certificate, ID, or proof document and the vault will track readiness without holding raw files.</div>
        )}
      </div>
    </Card>
  );
}

export function NameChangePreparationOverviewPanel({
  rows,
}: NameChangePreparationOverviewPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Preparation overview</h3>
          <p className="mt-1 text-sm text-text-secondary">A compact pass across documents, milestones, reminders, and proof gaps before you dive into details.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{rows.length} tracked lanes</span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{row.statusLabel}</span>
                  {row.milestoneCompleteCount > 0 || row.milestoneInProgressCount > 0 ? (
                    <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                      Milestones {row.milestoneCompleteCount} confirmed • {row.milestoneInProgressCount} tracking
                    </span>
                  ) : null}
                  {row.reminderOpenCount > 0 ? (
                    <span className={`rounded-xl px-2 py-1 text-xs ${row.reminderHighUrgencyCount > 0 ? 'border border-primary/25 bg-surface-subtle text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                      Reminders {row.reminderOpenCount} open{row.reminderHighUrgencyCount > 0 ? ` • ${row.reminderHighUrgencyCount} time-sensitive` : ''}
                    </span>
                  ) : null}
                  {row.proofMissingCount > 0 ? (
                    <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-primary">
                      {row.proofMissingCount} missing
                    </span>
                  ) : null}
                  {row.proofAttentionCount > 0 ? (
                    <span className="rounded-xl border border-primary/25 bg-surface-subtle px-2 py-1 text-xs text-primary">
                      {row.proofAttentionCount} worth checking
                    </span>
                  ) : null}
                </div>
              </div>
              {row.note && <p className="mt-3 text-sm text-text-secondary">{row.note}</p>}
            </div>
            {row.additionalNotes.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                {row.additionalNotes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            ) : null}
            {row.executionNote && row.executionNote !== row.note ? <p className="mt-2 text-xs text-text-secondary">Step note: {row.executionNote}</p> : null}
            {row.milestoneNote && row.milestoneNote !== row.note && row.milestoneNote !== row.executionNote ? <p className="mt-2 text-xs text-text-secondary">Milestone note: {row.milestoneNote}</p> : null}
            {row.proofNote && row.proofNote !== row.note && row.proofNote !== row.executionNote && row.proofNote !== row.milestoneNote ? <p className="mt-2 text-xs text-text-secondary">Proof note: {row.proofNote}</p> : null}
            {row.reminderNote && row.reminderNote !== row.note ? <p className="mt-2 text-xs text-text-secondary">Reminder note: {row.reminderNote}</p> : null}
            {row.nextActionLabel ? (
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                <p>Next: {row.nextActionLabel}</p>
                {row.nextActionDetail && row.nextActionDetail !== row.executionNote ? <p>{row.nextActionDetail}</p> : null}
              </div>
            ) : null}
            {row.reminderLabel && <p className="mt-2 text-xs text-text-secondary">Reminders: {row.reminderLabel}</p>}
            {row.updatedLabel && <p className="mt-3 text-xs text-text-secondary">{row.updatedLabel}</p>}
            {row.executionUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.executionUpdatedLabel}</p>}
            {row.milestoneUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.milestoneUpdatedLabel}</p>}
            {row.reminderUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.reminderUpdatedLabel}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeStatusTrackingPanel({
  rows,
}: NameChangeStatusTrackingPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Status tracking</h3>
          <p className="mt-1 text-sm text-text-secondary">Keep the proof chain, status notes, and follow-up checks visible without digging through every step.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{rows.length} status lanes</span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                <p className="mt-2 text-sm text-text-secondary">{row.summary}</p>
                {row.additionalSummary ? <p className="mt-2 text-xs text-text-secondary">{row.additionalSummary}</p> : null}
              </div>
              {row.currentStatusLabel ? <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{row.currentStatusLabel}</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
              {row.blockedProofLabel ? <span className="rounded-xl border border-primary/25 bg-surface-subtle px-2 py-1 text-primary">{row.blockedProofLabel}</span> : null}
              {row.nextCheckLabel ? <span className="rounded-xl bg-surface-subtle px-2 py-1">{row.nextCheckLabel}</span> : null}
              {row.lastTouchedLabel ? <span className="rounded-xl bg-surface-subtle px-2 py-1">{row.lastTouchedLabel}</span> : null}
            </div>
            <div className="mt-2 space-y-1 text-xs text-text-secondary">
              {row.executionUpdatedLabel ? <p>{row.executionUpdatedLabel}</p> : null}
              {row.milestoneUpdatedLabel ? <p>{row.milestoneUpdatedLabel}</p> : null}
              {row.reminderUpdatedLabel ? <p>{row.reminderUpdatedLabel}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NameChangeAccountUpdateTemplatesPanel({
  templates,
  copiedTemplateNotice,
  copyingTemplateId,
  onCopy,
}: NameChangeAccountUpdateTemplatesPanelProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Prewritten update templates</h3>
          <p className="mt-1 text-sm text-text-secondary">Copy, stage, or send when the proof chain is ready. Payroll, bank, insurance, and other downstream updates should not require fresh writing every time.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{templates.length} templates</span>
      </div>

      <div className="mt-4 space-y-3">
        {templates.map((template) => (
          <div id={`account-update-template-${template.id}`} key={template.id} className="scroll-mt-24 rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-tertiary">{template.audience}</p>
                {template.subjectLine ? <p className="mt-2 text-sm font-semibold text-text-primary">{template.subjectLine}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl px-2 py-1 text-xs bg-surface-subtle text-text-secondary">
                  {template.readiness}
                </span>
                <Button size="sm" variant="outline" onClick={() => onCopy(template.id)} disabled={Boolean(copyingTemplateId)}>
                  {copiedTemplateNotice?.id === template.id
                    ? copiedTemplateNotice.mode === 'downloaded'
                      ? 'Downloaded update'
                      : 'Copied update'
                    : copyingTemplateId === template.id
                      ? 'Copying...'
                      : template.copyLabel}
                </Button>
              </div>
            </div>
            {template.contextLines.map((line) => (
              <p key={line} className="mt-2 text-xs text-text-secondary">{line}</p>
            ))}
            {template.body ? <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{template.body}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
