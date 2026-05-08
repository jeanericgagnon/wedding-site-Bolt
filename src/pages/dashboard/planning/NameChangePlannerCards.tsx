import React from 'react';
import { Lock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { getExecutionNextActionDetail } from '../../../lib/nameChange/actionFeed';
import { getExecutionNextActionGuidance, getExecutionStatusVaultNotes } from '../../../lib/nameChange/targetExecution';
import type { NameChangeCaseInput, NameChangePlan } from '../../../lib/nameChange/types';
import type { buildNameChangeOverviewCardModel } from '../nameChangeOverviewCard';
import type { buildNameChangeOverviewInsights } from '../nameChangeOverviewInsights';
import { NAME_CHANGE_LIFECYCLE_LABELS } from '../nameChangeLifecycleLabels';
import { formatNameChangeExecutionDateTime } from './nameChangeExecutionTime';
import {
  getExecutionSummaryTone,
  getNameChangeStatusChipLabel,
  getWorkflowStatusLabel,
  type ExecutionCardConfig,
  type ReminderPostureCardConfig,
} from './nameChangePlannerUi';

interface NameChangePlannerIntroCardsProps {
  draft: NameChangeCaseInput;
  dualPartnerProofTracks: NonNullable<NameChangePlan['summary']['dualPartnerProofTracks']>;
  edgeCaseGuidance: NonNullable<NameChangePlan['summary']['edgeCaseGuidance']>;
  executionTracks: NonNullable<NameChangePlan['summary']['executionTracks']>;
  lifecycleInsights: ReturnType<typeof buildNameChangeOverviewInsights>;
  milestoneChecklist: NonNullable<NameChangePlan['summary']['milestoneChecklist']>;
  nextOptionalMilestone: NonNullable<NameChangePlan['summary']['milestoneChecklist']>[number] | null;
  onSave: () => Promise<void>;
  plan: NameChangePlan;
  resumeCard: ReturnType<typeof buildNameChangeOverviewCardModel>;
  saving: boolean;
  scrollToHref: (href: string) => void;
  stepCounts: {
    blocked: number;
    later: number;
    ready: number;
  };
}

export const NameChangePlannerIntroCards: React.FC<NameChangePlannerIntroCardsProps> = ({
  draft,
  dualPartnerProofTracks,
  edgeCaseGuidance,
  executionTracks,
  lifecycleInsights,
  milestoneChecklist,
  nextOptionalMilestone,
  onSave,
  plan,
  resumeCard,
  saving,
  scrollToHref,
  stepCounts,
}) => (
  <>
    <div className="grid gap-4 md:grid-cols-3">
      <Card padding="sm">
        <p className="text-xs text-text-tertiary">Path</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.legalPathLabel}</p>
        <p className="mt-2 text-xs text-text-secondary">Case status: {getWorkflowStatusLabel(draft.workflow_status)}</p>
        <p className="mt-2 text-xs text-text-secondary">Next best action: {plan.summary.nextBestAction}</p>
      </Card>
      <Card padding="sm">
        <p className="text-xs text-text-tertiary">Plan health</p>
        <p className="mt-2 text-sm text-text-primary">{stepCounts.ready} ready · {stepCounts.blocked} blocked · {stepCounts.later} later</p>
        <p className="mt-2 text-xs text-text-secondary">Steps: {plan.summary.executionCounts?.todo ?? 0} to do · {plan.summary.executionCounts?.in_progress ?? 0} started · {plan.summary.executionCounts?.complete ?? 0} complete</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.readinessPercent}% intake-ready</p>
        <p className="mt-2 text-xs text-text-secondary">Federal-first, California-second, institutions after primary ID.</p>
      </Card>
      <Card padding="sm" className="border-primary/20 bg-primary/5">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-primary">Privacy rule</p>
            <p className="mt-2 text-sm text-text-primary">Uploads are optional. You can save only the details you want to track.</p>
          </div>
        </div>
      </Card>
    </div>

    <Card className="border-border-subtle bg-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-primary">Resume any time</p>
          <p className="mt-1 text-xs text-text-secondary">Free assistant · saved status · document checklist</p>
          <p className="mt-2 text-sm font-medium text-text-primary">{resumeCard.statusLabel}</p>
          <h3 className="mt-2 text-lg font-semibold text-text-primary">{resumeCard.headline}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {resumeCard.helperCopy}
          </p>
          <p className="mt-2 text-sm text-text-secondary">Optional next step: {resumeCard.optionalNextStep}</p>
          {nextOptionalMilestone ? (
            <p className="mt-1 text-sm text-text-secondary">
              If you want a concrete place to pick back up,{' '}
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2"
                onClick={() => scrollToHref(resumeCard.primaryHref)}
              >
                {nextOptionalMilestone.label}
              </button>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
            <button
              type="button"
              className="rounded-md border border-border-subtle bg-surface-subtle px-2 py-1 font-medium hover:border-primary/25"
              onClick={() => scrollToHref(lifecycleInsights.milestoneSummaryHref)}
            >
              {lifecycleInsights.milestoneSummaryLabel}
            </button>
            <button
              type="button"
              className="rounded-md border border-border-subtle bg-surface-subtle px-2 py-1 font-medium hover:border-primary/25"
              onClick={() => scrollToHref(lifecycleInsights.reminderSummaryHref)}
            >
              {lifecycleInsights.reminderSummaryLabel}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => scrollToHref(resumeCard.primaryHref)}>
            {resumeCard.primaryLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => scrollToHref(resumeCard.secondaryHref)}>
            {resumeCard.secondaryLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => scrollToHref(resumeCard.tertiaryHref)}>
            {resumeCard.tertiaryLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToHref(resumeCard.plannerHref)}>
            {resumeCard.plannerLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onSave()} disabled={saving}>{saving ? 'Saving…' : 'Save and come back later'}</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25"
          onClick={() => scrollToHref(resumeCard.primaryHref)}
        >
          <p className="text-xs text-primary">{NAME_CHANGE_LIFECYCLE_LABELS.coreChain}</p>
          <p className="mt-1 text-sm text-text-primary">{lifecycleInsights.coreChainLabel}</p>
        </button>
        <button
          type="button"
          className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25"
          onClick={() => scrollToHref(resumeCard.plannerHref)}
        >
          <p className="text-xs text-primary">{NAME_CHANGE_LIFECYCLE_LABELS.followOn}</p>
          <p className="mt-1 text-sm text-text-primary">{lifecycleInsights.followOnLabel}</p>
        </button>
        <button
          type="button"
          className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25"
          onClick={() => scrollToHref(lifecycleInsights.downstreamHref)}
        >
          <p className="text-xs text-primary">{NAME_CHANGE_LIFECYCLE_LABELS.downstream}</p>
          <p className="mt-1 text-sm text-text-primary">{lifecycleInsights.downstreamLabel}</p>
        </button>
      </div>
    </Card>

    <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Post-wedding name change roadmap</h3>
            <p className="mt-1 text-sm text-text-secondary">Free, no-upsell guidance. Start with the core identity chain, then pick off the rest whenever you want to resume.</p>
          </div>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Day of Love free assistant</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {executionTracks.map((track) => (
            <div key={track.id} className="rounded-lg border border-border-subtle bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">{track.sequenceLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{track.title}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${track.featureTag === 'travel' ? 'bg-primary/10 text-primary' : track.featureTag === 'rollout' ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-secondary'}`}>
                  {track.featureTag}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{track.summary}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                <span className={`rounded-md px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>
                  {track.status}
                </span>
              </div>
            </div>
          ))}
          {plan.summary.recommendedOrder.map((stepLabel, index) => (
            <div key={stepLabel} className="rounded-lg border border-border-subtle p-4">
              <p className="text-xs text-text-tertiary">Step {index + 1}</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{stepLabel}</p>
              {index === 0 && <p className="mt-2 text-xs text-text-secondary">Get certified proof grounded before anything else moves.</p>}
              {index === 1 && <p className="mt-2 text-xs text-text-secondary">SSA is the first real filing move because tax, payroll, and federal identity depend on it.</p>}
              {index === 2 && <p className="mt-2 text-xs text-text-secondary">Driver license or state ID is next so the rest of the packet has fresh government photo ID.</p>}
              {index === 3 && <p className="mt-2 text-xs text-text-secondary">Passport follows the new SSA + ID chain, especially if travel is coming up.</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Milestones and progress</h3>
            <p className="mt-1 text-sm text-text-secondary">Track the few important pieces that decide what can move next.</p>
          </div>
          <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{plan.summary.readinessPercent}% ready</span>
        </div>

        <div className="mt-4 space-y-3">
          {edgeCaseGuidance.map((item) => (
            <div key={item.id} className={`rounded-lg border p-4 ${item.severity === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-border-subtle bg-white/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${item.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                  {item.severity === 'warning' ? 'Worth checking' : 'On track'}
                </span>
              </div>
            </div>
          ))}
          {milestoneChecklist.map((milestone) => (
            <div key={milestone.id} className="rounded-lg border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{milestone.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">Depends on: {milestone.dependsOnStepIds.join(' → ')}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${getExecutionSummaryTone(milestone.status)}`}>
                  {milestone.status}
                </span>
              </div>
            </div>
          ))}
          {dualPartnerProofTracks.map((track) => (
            <div key={track.id} className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{track.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                  <p className="mt-2 text-xs text-text-secondary">Proof: {track.requiredProof.join(' · ')}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>
                  {track.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>
);

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
      <span className={`rounded-md px-2 py-1 text-xs ${snapshot.ready ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
        {snapshot.ready ? readyLabel : notReadyLabel}
      </span>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-5">
      <div className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-text-tertiary">Status</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.status}</p>
      </div>
      <div className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-text-tertiary">Needs first</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.blockingFieldRisks}</p>
      </div>
      <div className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-text-tertiary">Worth checking</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.attentionFieldRisks}</p>
      </div>
      <div className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-text-tertiary">Needs review</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.lowConfidenceFields}</p>
      </div>
      <div className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-text-tertiary">Document checks</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.documentRepairDebt}</p>
      </div>
    </div>

    <div className="mt-4 rounded-lg border border-border-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-text-tertiary">Saved status</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.statusVault.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="space-y-1 text-right">
          {snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">
              Latest touch {formatNameChangeExecutionDateTime(snapshot.statusVault.lastTouchedAt)}
              {snapshot.statusVault.lastTouchedSource === 'reminder' ? ' · reminder' : snapshot.statusVault.lastTouchedSource === 'execution' ? ' · execution' : ''}
            </p>
          ) : null}
          {snapshot.statusVault.lastUpdatedAt && snapshot.statusVault.lastUpdatedAt !== snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">Step updated {formatNameChangeExecutionDateTime(snapshot.statusVault.lastUpdatedAt)}</p>
          ) : null}
          {snapshot.statusVault.reminderSummary.latestReminderAt && snapshot.statusVault.reminderSummary.latestReminderAt !== snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">Reminder updated {formatNameChangeExecutionDateTime(snapshot.statusVault.reminderSummary.latestReminderAt)}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-text-secondary">{snapshot.statusVault.proofSummary}</p>
      {visibleStatusVaultNotes.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-text-secondary">
          {visibleStatusVaultNotes.slice(0, 3).map((note, noteIndex) => (
            <li key={`${snapshot.targetKey}-status-vault-note-${noteIndex}`}>• {note}</li>
          ))}
        </ul>
      ) : null}
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.checklist.map((item) => (
        <div key={item.label} className="rounded-lg border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-text-primary">{item.label}</p>
            <span className={`rounded-md px-2 py-1 text-xs ${item.status === 'ready' ? 'bg-success/10 text-success' : item.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              {getNameChangeStatusChipLabel(item.status)}
            </span>
          </div>
          <p className="mt-3 text-sm text-text-secondary">{item.reason}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-lg border border-border-subtle p-4">
      <h4 className="text-sm font-semibold text-text-primary">{sequenceTitle}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {snapshot.sequence.dependencies.map((dependency) => (
          <div key={dependency.key} className="rounded-lg border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{dependency.label}</p>
              <span className={`rounded-md px-2 py-1 text-xs ${dependency.status === 'satisfied' ? 'bg-success/10 text-success' : dependency.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                {getNameChangeStatusChipLabel(dependency.status)}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{dependency.reason}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.autofillFields.map((field) => (
        <div key={field.targetField} className="rounded-lg border border-border-subtle p-4">
          <p className="text-sm font-semibold text-text-primary">{field.label}</p>
          <p className="mt-2 text-sm text-text-secondary">{field.value.value ?? 'Missing'}</p>
          <p className="mt-2 text-xs text-text-secondary">{field.targetField} · {field.value.source} · {field.value.confidence}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-lg border border-border-subtle p-4">
      {snapshot.nextAction ? (
        <div className="mb-4 rounded-lg border border-border-subtle p-4">
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
        <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {snapshot.formPayload.summary.ready} filled · {snapshot.formPayload.summary.trustedReady} trusted · {snapshot.formPayload.summary.lowConfidence} low-confidence · {snapshot.formPayload.summary.missing} missing
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.formPayload.fields.map((field) => (
          <div key={field.fieldKey} className="rounded-lg border border-border-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{field.label}</p>
            <p className="mt-2 text-sm text-text-secondary">{field.value ?? 'Missing'}</p>
            <p className="mt-2 text-xs text-text-secondary">
              {field.fieldKey} · {field.source}
              {field.sourceDocumentKind ? ` · ${field.sourceDocumentKind}` : ''}
              {field.sourceFieldKey ? ` · ${field.sourceFieldKey}` : ''}
              {' · '}{field.confidence}
            </p>
          </div>
        ))}
      </div>

      {snapshot.fieldRisks.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Details to check</h4>
              <p className="text-xs text-text-secondary">The specific fields that still need a quick look before this packet feels ready.</p>
            </div>
            <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {snapshot.fieldRisks.filter((risk) => risk.severity === 'blocking').length} needed · {snapshot.fieldRisks.filter((risk) => risk.severity === 'attention').length} worth checking
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {snapshot.fieldRisks.map((risk) => (
              <div key={`${risk.fieldKey}-${risk.severity}`} className="rounded-lg border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{risk.label}</p>
                  <span className={`rounded-md px-2 py-1 text-xs ${risk.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                    {getNameChangeStatusChipLabel(risk.severity)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{risk.reason}</p>
                <p className="mt-2 text-xs text-text-secondary">
                  {risk.fieldKey} · {risk.source}
                  {risk.sourceDocumentKind ? ` · ${risk.sourceDocumentKind}` : ''}
                  {risk.sourceFieldKey ? ` · ${risk.sourceFieldKey}` : ''}
                  {' · '}{risk.confidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs text-text-tertiary">{title}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
      <p className="mt-2 text-xs text-text-secondary">{detail}</p>
    </div>
  );
};
