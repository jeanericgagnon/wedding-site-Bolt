import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Lock } from 'lucide-react';
import { formatNameChangeExecutionDateTime } from './nameChangeExecutionTime';
import type {
  CaseSetupFieldValues,
  DualPartnerTrackCard,
  EdgeCaseGuidanceCard,
  PlannerExecutionCountSummary,
  PlannerStepCountSummary,
  ExecutionTrackCard,
  LifecycleInsightsCard,
  MilestoneChecklistCard,
  ResumeCardViewModel,
} from './NameChangePlannerPanelTypes';
import type { NameChangeCaseInput, NameChangePlanSummary } from '../../../lib/nameChange/types';

interface NameChangeCaseSetupPanelProps {
  values: CaseSetupFieldValues;
  onDraftChange: (updates: Partial<NameChangeCaseInput>) => void;
  onStructuredIntakeChange: (key: string, value: unknown) => void;
  onSave: () => void;
  saving: boolean;
  missingInputs: string[];
  cautionNotes: string[];
}

interface NameChangeWorkspaceSummaryPanelProps {
  legalPathLabel: string;
  workflowStatusLabel: string;
  nextBestAction: string;
  stepCounts: PlannerStepCountSummary;
  executionCounts?: PlannerExecutionCountSummary | null;
  readinessPercent: number;
  launchCoverageSummary: string;
  jurisdictionGuidance: string;
  launchState: string | null | undefined;
  targetStatusOverview?: NameChangePlanSummary['targetStatusOverview'] | null;
  resumeCard: ResumeCardViewModel;
  lifecycleInsights: LifecycleInsightsCard;
  nextOptionalMilestoneLabel: string | null;
  onResumeHref: (href: string) => void;
  onLifecycleHref: (href: string) => void;
  onSave: () => void;
  saving: boolean;
  executionTracks: ExecutionTrackCard[];
  recommendedOrder: string[];
  edgeCaseGuidance: EdgeCaseGuidanceCard[];
  milestoneChecklist: MilestoneChecklistCard[];
  dualPartnerProofTracks: DualPartnerTrackCard[];
  getExecutionSummaryTone: (status: string) => string;
}

export function NameChangeCaseSetupPanel({
  values,
  onDraftChange,
  onStructuredIntakeChange,
  onSave,
  saving,
  missingInputs,
  cautionNotes,
}: NameChangeCaseSetupPanelProps) {
  return (
    <>
      <Card>
        <div id="case-setup" className="scroll-mt-24" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Case setup</h3>
            <p className="mt-1 text-sm text-text-secondary">This is the engine input. Keep it lean and structured.</p>
          </div>
          <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save planner case'}</Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current first name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.currentFirstName} onChange={(e) => onDraftChange({ current_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current middle name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.currentMiddleName} onChange={(e) => onDraftChange({ current_middle_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current last name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.currentLastName} onChange={(e) => onDraftChange({ current_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target first name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.targetFirstName} onChange={(e) => onDraftChange({ target_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target middle name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.targetMiddleName} onChange={(e) => onDraftChange({ target_middle_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target last name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.targetLastName} onChange={(e) => onDraftChange({ target_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Spouse last name</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.spouseLastName} onChange={(e) => onStructuredIntakeChange('spouseLastName', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Marriage date</span>
            <input type="date" className="w-full rounded-xl border border-border px-3 py-2" value={values.marriageDate} onChange={(e) => onDraftChange({ marriage_date: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Marriage state / issuing jurisdiction</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.marriageState} onChange={(e) => onDraftChange({ marriage_state: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">County / issuing county</span>
            <input className="w-full rounded-xl border border-border px-3 py-2" value={values.countyResidence} onChange={(e) => onDraftChange({ county_residence: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Legal basis</span>
            <select className="w-full rounded-xl border border-border px-3 py-2" value={values.legalBasis} onChange={(e) => onDraftChange({ legal_basis: e.target.value as NameChangeCaseInput['legal_basis'] })}>
              <option value="marriage">Marriage</option>
              <option value="court_order">Court order</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Urgency</span>
            <select className="w-full rounded-xl border border-border px-3 py-2" value={values.urgencyLevel} onChange={(e) => onDraftChange({ urgency_level: e.target.value as NameChangeCaseInput['urgency_level'] })}>
              <option value="standard">Standard</option>
              <option value="expedited">Expedited</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Employment status</span>
            <select className="w-full rounded-xl border border-border px-3 py-2" value={values.employmentStatus} onChange={(e) => onDraftChange({ employment_status: e.target.value as NameChangeCaseInput['employment_status'] })}>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="not_employed">Not employed</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Has passport', checked: values.hasUsPassport, key: 'has_us_passport' },
            { label: 'Passport needs update', checked: values.passportNeedsUpdate, key: 'passport_needs_update' },
            { label: 'Has current state license / REAL ID', checked: values.hasRealIdLicense, key: 'has_real_id_license' },
            { label: 'Both partners changing name', checked: values.bothPartnersChangeName, key: 'bothPartnersChangeName', source: 'structured' },
            { label: 'Travel booked soon', checked: values.travelBookedSoon, key: 'travelBookedSoon', source: 'structured' },
            { label: 'Wants doc intake help', checked: values.wantsDocumentIntakeHelp, key: 'wantsDocumentIntakeHelp', source: 'structured' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.source === 'structured'
                  ? onStructuredIntakeChange(item.key, e.target.checked)
                  : onDraftChange({ [item.key]: e.target.checked } as Partial<NameChangeCaseInput>)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {(missingInputs.length > 0 || cautionNotes.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {missingInputs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <h3 className="text-lg font-semibold text-text-primary">Intake gaps to close</h3>
              <p className="mt-1 text-sm text-text-secondary">These are the missing pieces keeping the planner from being cleanly actionable.</p>
              <ul className="mt-3 space-y-2 text-sm text-text-primary">
                {missingInputs.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Card>
          )}

          {cautionNotes.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-text-primary">Planner notes</h3>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {cautionNotes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

export function NameChangeWorkspaceSummaryPanel({
  legalPathLabel,
  workflowStatusLabel,
  nextBestAction,
  stepCounts,
  executionCounts,
  readinessPercent,
  launchCoverageSummary,
  jurisdictionGuidance,
  launchState,
  targetStatusOverview,
  resumeCard,
  lifecycleInsights,
  nextOptionalMilestoneLabel,
  onResumeHref,
  onLifecycleHref,
  onSave,
  saving,
  executionTracks,
  recommendedOrder,
  edgeCaseGuidance,
  milestoneChecklist,
  dualPartnerProofTracks,
  getExecutionSummaryTone,
}: NameChangeWorkspaceSummaryPanelProps) {
  const targetStatusBits = [
    (targetStatusOverview?.missingProofTargets ?? 0) > 0 ? `${targetStatusOverview?.missingProofTargets} with missing proof` : null,
    (targetStatusOverview?.attentionProofTargets ?? 0) > 0 ? `${targetStatusOverview?.attentionProofTargets} proof details worth checking` : null,
    (targetStatusOverview?.touchedByExecution ?? 0) > 0 ? `${targetStatusOverview?.touchedByExecution} recently updated` : null,
    `${targetStatusOverview?.touchedByReminder ?? 0} with reminder follow-up`,
  ].filter((value): value is string => Boolean(value));
  const latestMoveSource = targetStatusOverview?.latestTouchedSource === 'execution'
    ? 'step'
    : targetStatusOverview?.latestTouchedSource ?? null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs text-text-tertiary">Path</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{legalPathLabel}</p>
          <p className="mt-2 text-xs text-text-secondary">Case status: {workflowStatusLabel}</p>
          <p className="mt-2 text-xs text-text-secondary">Next best action: {nextBestAction}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-tertiary">Plan health</p>
          <p className="mt-2 text-sm text-text-primary">{stepCounts.ready} ready · {stepCounts.blocked} blocked · {stepCounts.later} later</p>
          <p className="mt-2 text-xs text-text-secondary">Steps: {executionCounts?.todo ?? 0} to do · {executionCounts?.in_progress ?? 0} started · {executionCounts?.complete ?? 0} complete</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{readinessPercent}% intake-ready</p>
          <p className="mt-2 text-xs text-text-secondary">Federal first, California-guided state filing next, then downstream follow-through.</p>
          {targetStatusBits.length > 0 ? <p className="mt-2 text-xs text-text-secondary">{targetStatusBits.join(' · ')}</p> : null}
          {targetStatusOverview?.latestTouchedAt && latestMoveSource ? (
            <p className="mt-2 text-xs text-text-secondary">Latest move {formatNameChangeExecutionDateTime(targetStatusOverview.latestTouchedAt)} · {latestMoveSource}</p>
          ) : null}
          {targetStatusOverview?.latestUpdatedAt && targetStatusOverview.latestUpdatedAt !== targetStatusOverview.latestTouchedAt ? (
            <p className="mt-1 text-xs text-text-secondary">Latest step {formatNameChangeExecutionDateTime(targetStatusOverview.latestUpdatedAt)}</p>
          ) : null}
          {targetStatusOverview?.latestMilestoneAt && targetStatusOverview.latestMilestoneAt !== targetStatusOverview.latestTouchedAt ? (
            <p className="mt-1 text-xs text-text-secondary">Latest milestone {formatNameChangeExecutionDateTime(targetStatusOverview.latestMilestoneAt)}</p>
          ) : null}
          {targetStatusOverview?.latestReminderAt && targetStatusOverview.latestReminderAt !== targetStatusOverview.latestTouchedAt ? (
            <p className="mt-1 text-xs text-text-secondary">Latest reminder {formatNameChangeExecutionDateTime(targetStatusOverview.latestReminderAt)}</p>
          ) : null}
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

      <Card padding="sm" className="border-primary/20 bg-primary/5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs text-primary">Coverage today</p>
            <p className="mt-2 text-sm text-text-primary">{launchCoverageSummary}</p>
            <p className="mt-2 text-xs text-text-secondary">{jurisdictionGuidance}</p>
          </div>
          <span className="rounded-xl bg-white px-2 py-1 text-xs text-text-secondary">
            {launchState === 'california' ? 'California-guided state lane' : 'State lane needs review'}
          </span>
        </div>
      </Card>

      <Card className="border-border-subtle bg-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-primary">Resume any time</p>
            <p className="mt-1 text-xs text-text-secondary">Free assistant · saved status · document checklist</p>
            <p className="mt-2 text-sm font-medium text-text-primary">{resumeCard.statusLabel}</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">{resumeCard.headline}</h3>
            <p className="mt-1 text-sm text-text-secondary">{resumeCard.helperCopy}</p>
            <p className="mt-2 text-sm text-text-secondary">Optional next step: {resumeCard.optionalNextStep}</p>
            {nextOptionalMilestoneLabel ? (
              <p className="mt-1 text-sm text-text-secondary">
                If you want a concrete place to pick back up,{' '}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-2"
                  onClick={() => onResumeHref(resumeCard.primaryHref)}
                >
                  {nextOptionalMilestoneLabel}
                </button>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
              <button
                type="button"
                className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1 font-medium hover:border-primary/25"
                onClick={() => onLifecycleHref(lifecycleInsights.milestoneSummaryHref)}
              >
                {lifecycleInsights.milestoneSummaryLabel}
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1 font-medium hover:border-primary/25"
                onClick={() => onLifecycleHref(lifecycleInsights.reminderSummaryHref)}
              >
                {lifecycleInsights.reminderSummaryLabel}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onResumeHref(resumeCard.primaryHref)}>{resumeCard.primaryLabel}</Button>
            <Button variant="outline" size="sm" onClick={() => onResumeHref(resumeCard.secondaryHref)}>{resumeCard.secondaryLabel}</Button>
            <Button variant="outline" size="sm" onClick={() => onResumeHref(resumeCard.tertiaryHref)}>{resumeCard.tertiaryLabel}</Button>
            <Button variant="ghost" size="sm" onClick={() => onResumeHref(resumeCard.plannerHref)}>{resumeCard.plannerLabel}</Button>
            <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save and come back later'}</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button type="button" className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25" onClick={() => onResumeHref(resumeCard.primaryHref)}>
            <p className="text-xs text-primary">Core identity chain</p>
            <p className="mt-1 text-sm text-text-primary">{lifecycleInsights.coreChainLabel}</p>
          </button>
          <button type="button" className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25" onClick={() => onResumeHref(resumeCard.plannerHref)}>
            <p className="text-xs text-primary">Follow-on work</p>
            <p className="mt-1 text-sm text-text-primary">{lifecycleInsights.followOnLabel}</p>
          </button>
          <button type="button" className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-left hover:border-primary/25" onClick={() => onLifecycleHref(lifecycleInsights.downstreamHref)}>
            <p className="text-xs text-primary">Downstream updates</p>
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
            <span className="rounded-xl bg-primary/10 px-2 py-1 text-xs text-primary">Day of Love free assistant</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {executionTracks.map((track) => (
              <div key={track.id} className="rounded-2xl border border-border-subtle bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-tertiary">{track.sequenceLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{track.title}</p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${track.featureTag === 'travel' ? 'bg-primary/10 text-primary' : track.featureTag === 'rollout' ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-secondary'}`}>
                    {track.featureTag}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{track.summary}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                  <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>{track.status}</span>
                </div>
              </div>
            ))}
            {recommendedOrder.map((stepLabel, index) => (
              <div key={stepLabel} className="rounded-2xl border border-border-subtle p-4">
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
            <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{readinessPercent}% ready</span>
          </div>

          <div className="mt-4 space-y-3">
            {edgeCaseGuidance.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${item.severity === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-border-subtle bg-white/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${item.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                    {item.severity === 'warning' ? 'Worth checking' : 'On track'}
                  </span>
                </div>
              </div>
            ))}
            {milestoneChecklist.map((milestone) => (
              <div key={milestone.id} className="rounded-2xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{milestone.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {milestone.dependsOnStepIds.join(' → ')}</p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(milestone.status)}`}>{milestone.status}</span>
                </div>
              </div>
            ))}
            {dualPartnerProofTracks.map((track) => (
              <div key={track.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{track.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                    <p className="mt-2 text-xs text-text-secondary">Proof: {track.requiredProof.join(' · ')}</p>
                  </div>
                  <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>{track.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
