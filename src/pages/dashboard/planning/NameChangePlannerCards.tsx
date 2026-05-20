import React from 'react';
import { Card } from '../../../components/ui/Card';
import { getExecutionNextActionDetail } from '../../../lib/nameChange/actionFeed';
import { getExecutionNextActionGuidance, getExecutionStatusVaultNotes } from '../../../lib/nameChange/targetExecution';
import { formatNameChangeExecutionDateTime } from './nameChangeExecutionTime';
import { getNameChangeStatusChipLabel, type ExecutionCardConfig, type ReminderPostureCardConfig } from './nameChangePlannerUi';

export const ExecutionSnapshotCard: React.FC<ExecutionCardConfig> = ({
  anchorId,
  title,
  description,
  readyLabel,
  notReadyLabel,
  sequenceTitle,
  payloadTitle,
  payloadDescription,
  snapshot,
}) => {
  const visibleStatusVaultNotes = getExecutionStatusVaultNotes(snapshot);
  const guidedNextAction = snapshot.nextAction ? getExecutionNextActionGuidance(snapshot) : null;

  return (
    <Card>
      <div id={anchorId} className="scroll-mt-24" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">{description}</p>
          <p className="mt-2 text-xs text-text-secondary">{snapshot.readinessSummary.summaryLabel}</p>
        </div>
        <span className={`rounded-xl px-2 py-1 text-xs ${snapshot.ready ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {snapshot.ready ? readyLabel : notReadyLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-border-subtle p-3"><p className="text-xs text-text-tertiary">Status</p><p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.status}</p></div>
        <div className="rounded-2xl border border-border-subtle p-3"><p className="text-xs text-text-tertiary">Needs first</p><p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.blockingFieldRisks}</p></div>
        <div className="rounded-2xl border border-border-subtle p-3"><p className="text-xs text-text-tertiary">Worth checking</p><p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.attentionFieldRisks}</p></div>
        <div className="rounded-2xl border border-border-subtle p-3"><p className="text-xs text-text-tertiary">Needs review</p><p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.lowConfidenceFields}</p></div>
        <div className="rounded-2xl border border-border-subtle p-3"><p className="text-xs text-text-tertiary">Document checks</p><p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.documentRepairDebt}</p></div>
      </div>

      <div className="mt-4 rounded-2xl border border-border-subtle p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-tertiary">Saved status</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.statusVault.status.replace(/_/g, ' ')}</p>
          </div>
          <div className="space-y-1 text-right">
            {snapshot.statusVault.lastTouchedAt ? <p className="text-xs text-text-secondary">Latest touch {formatNameChangeExecutionDateTime(snapshot.statusVault.lastTouchedAt)}{snapshot.statusVault.lastTouchedSource === 'reminder' ? ' · reminder' : snapshot.statusVault.lastTouchedSource === 'execution' ? ' · execution' : ''}</p> : null}
            {snapshot.statusVault.lastUpdatedAt && snapshot.statusVault.lastUpdatedAt !== snapshot.statusVault.lastTouchedAt ? <p className="text-xs text-text-secondary">Step updated {formatNameChangeExecutionDateTime(snapshot.statusVault.lastUpdatedAt)}</p> : null}
            {snapshot.statusVault.reminderSummary.latestReminderAt && snapshot.statusVault.reminderSummary.latestReminderAt !== snapshot.statusVault.lastTouchedAt ? <p className="text-xs text-text-secondary">Reminder updated {formatNameChangeExecutionDateTime(snapshot.statusVault.reminderSummary.latestReminderAt)}</p> : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-text-secondary">{snapshot.statusVault.proofSummary}</p>
        {visibleStatusVaultNotes.length > 0 && <ul className="mt-3 space-y-1 text-sm text-text-secondary">{visibleStatusVaultNotes.slice(0, 3).map((note, noteIndex) => <li key={`${snapshot.targetKey}-status-vault-note-${noteIndex}`}>• {note}</li>)}</ul>}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.checklist.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{item.label}</p>
              <span className={`rounded-xl px-2 py-1 text-xs ${item.status === 'ready' ? 'bg-success/10 text-success' : item.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>{getNameChangeStatusChipLabel(item.status)}</span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{item.reason}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border-subtle p-4">
        <h4 className="text-sm font-semibold text-text-primary">{sequenceTitle}</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {snapshot.sequence.dependencies.map((dependency) => (
            <div key={dependency.key} className="rounded-2xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{dependency.label}</p>
                <span className={`rounded-xl px-2 py-1 text-xs ${dependency.status === 'satisfied' ? 'bg-success/10 text-success' : dependency.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>{getNameChangeStatusChipLabel(dependency.status)}</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{dependency.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.autofillFields.map((field) => (
          <div key={field.targetField} className="rounded-2xl border border-border-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{field.label}</p>
            <p className="mt-2 text-sm text-text-secondary">{field.value.value ?? 'Missing'}</p>
            <p className="mt-2 text-xs text-text-secondary">{field.targetField} · {field.value.source} · {field.value.confidence}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border-subtle p-4">
        {snapshot.nextAction ? (
          <div className="mb-4 rounded-2xl border border-border-subtle p-4">
            <p className="text-xs text-text-tertiary">Next best step</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.nextAction.label}</p>
            <div className="mt-2 space-y-1 text-sm text-text-secondary">
              <p>{guidedNextAction?.overview ?? getExecutionNextActionDetail(snapshot)}</p>
              {guidedNextAction?.doNow ? <p>Do now: {guidedNextAction.doNow}</p> : null}
              {guidedNextAction?.whyItHelps ? <p>Why it helps: {guidedNextAction.whyItHelps}</p> : null}
              {guidedNextAction?.canWait ? <p>Can wait: {guidedNextAction.canWait}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{payloadTitle}</h4>
            <p className="text-xs text-text-secondary">{payloadDescription}</p>
          </div>
          <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {snapshot.formPayload.summary.ready} filled · {snapshot.formPayload.summary.trustedReady} trusted · {snapshot.formPayload.summary.lowConfidence} low-confidence · {snapshot.formPayload.summary.missing} missing
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {snapshot.formPayload.fields.map((field) => (
            <div key={field.fieldKey} className="rounded-2xl border border-border-subtle p-4">
              <p className="text-sm font-semibold text-text-primary">{field.label}</p>
              <p className="mt-2 text-sm text-text-secondary">{field.value ?? 'Missing'}</p>
              <p className="mt-2 text-xs text-text-secondary">{field.fieldKey} · {field.source}{field.sourceDocumentKind ? ` · ${field.sourceDocumentKind}` : ''}{field.sourceFieldKey ? ` · ${field.sourceFieldKey}` : ''}{' · '}{field.confidence}</p>
            </div>
          ))}
        </div>

        {snapshot.fieldRisks.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Details to check</h4>
                <p className="text-xs text-text-secondary">The specific fields that still need a quick look before this packet feels ready.</p>
              </div>
              <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                {snapshot.fieldRisks.filter((risk) => risk.severity === 'blocking').length} needed · {snapshot.fieldRisks.filter((risk) => risk.severity === 'attention').length} worth checking
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {snapshot.fieldRisks.map((risk) => (
                <div key={`${risk.fieldKey}-${risk.severity}`} className="rounded-2xl border border-border-subtle p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">{risk.label}</p>
                    <span className={`rounded-xl px-2 py-1 text-xs ${risk.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{getNameChangeStatusChipLabel(risk.severity)}</span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">{risk.reason}</p>
                  <p className="mt-2 text-xs text-text-secondary">{risk.fieldKey} · {risk.source}{risk.sourceDocumentKind ? ` · ${risk.sourceDocumentKind}` : ''}{risk.sourceFieldKey ? ` · ${risk.sourceFieldKey}` : ''}{' · '}{risk.confidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export const ReminderPostureCard: React.FC<ReminderPostureCardConfig> = ({ title, value, detail, tone = 'neutral' }) => {
  const toneClass = tone === 'danger'
    ? 'border-danger/20 bg-danger/5'
    : tone === 'warning'
      ? 'border-warning/20 bg-warning/5'
      : tone === 'primary'
        ? 'border-primary/20 bg-primary/5'
        : 'border-border-subtle bg-white/60';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs text-text-tertiary">{title}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
      <p className="mt-2 text-xs text-text-secondary">{detail}</p>
    </div>
  );
};
