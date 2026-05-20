import type { NameChangeConsentPlan } from './formConsentPlan';
import type { NameChangeFormCompanionIntakePrompt } from './formCompanionIntake';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';
import type { NameChangeSecureSessionPlan } from './formSecureSession';
import type { NameChangeSupplementalIntakePlan } from './formSupplementalIntake';

export type NameChangeDraftReadinessStatus =
  | 'needs_intake'
  | 'needs_secure_session'
  | 'needs_consent'
  | 'needs_adapter_mapping'
  | 'ready_for_guided_entry'
  | 'ready_for_review_draft';

export type NameChangeDraftReadinessStepStatus = 'complete' | 'blocked' | 'next' | 'review';

export interface NameChangeDraftReadinessStep {
  stepKey: string;
  label: string;
  status: NameChangeDraftReadinessStepStatus;
  statusLabel: string;
  count: number;
  detail: string;
  nextAction: string;
}

export interface NameChangeDraftReadinessPlan {
  status: NameChangeDraftReadinessStatus;
  statusLabel: string;
  primaryAction: string;
  blockers: string[];
  steps: NameChangeDraftReadinessStep[];
  readinessPayloadJson: string;
  summary: {
    missingInput: number;
    reviewInput: number;
    secureEntryFields: number;
    consentItems: number;
    adapterMappingsNeeded: number;
    guidedOnlineForms: number;
    reviewDraftForms: number;
    blockingSteps: number;
  };
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getStatusLabel(status: NameChangeDraftReadinessStatus) {
  if (status === 'needs_intake') return 'Needs intake';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_consent') return 'Needs consent';
  if (status === 'needs_adapter_mapping') return 'Needs mapping';
  if (status === 'ready_for_guided_entry') return 'Ready for guided entry';
  return 'Ready for review draft';
}

function getPrimaryAction(status: NameChangeDraftReadinessStatus) {
  if (status === 'needs_intake') return 'Collect or review the missing user details before generating form drafts.';
  if (status === 'needs_secure_session') return 'Open a short-lived secure session for fields that should not live in the normal planner.';
  if (status === 'needs_consent') return 'Capture use and retention consent before sensitive values are used in review drafts.';
  if (status === 'needs_adapter_mapping') return 'Probe and map official PDF field names before producing filled PDF drafts.';
  if (status === 'ready_for_guided_entry') return 'Use guided copy support for agency flows that must be completed on the official site.';
  return 'Generate review-only draft outputs and require the user to inspect, sign, and submit through official instructions.';
}

function getStepStatusLabel(status: NameChangeDraftReadinessStepStatus) {
  if (status === 'complete') return 'Complete';
  if (status === 'next') return 'Next';
  if (status === 'review') return 'Review';
  return 'Blocked';
}

function getOverallStatus(summary: NameChangeDraftReadinessPlan['summary']): NameChangeDraftReadinessStatus {
  if (summary.missingInput > 0 || summary.reviewInput > 0) return 'needs_intake';
  if (summary.secureEntryFields > 0) return 'needs_secure_session';
  if (summary.consentItems > 0) return 'needs_consent';
  if (summary.adapterMappingsNeeded > 0) return 'needs_adapter_mapping';
  if (summary.reviewDraftForms === 0 && summary.guidedOnlineForms > 0) return 'ready_for_guided_entry';
  return 'ready_for_review_draft';
}

function buildSteps(
  status: NameChangeDraftReadinessStatus,
  sharedMissing: number,
  sharedReview: number,
  supplementalMissing: number,
  secureEntryFields: number,
  consentItems: number,
  adapterMappingsNeeded: number,
  reviewDraftForms: number,
  guidedOnlineForms: number,
): NameChangeDraftReadinessStep[] {
  const sharedIntakeStatus: NameChangeDraftReadinessStepStatus = sharedMissing > 0
    ? 'blocked'
    : sharedReview > 0
      ? 'review'
      : 'complete';
  const supplementalStatus: NameChangeDraftReadinessStepStatus = supplementalMissing > 0 ? 'blocked' : 'complete';
  const secureStatus: NameChangeDraftReadinessStepStatus = secureEntryFields > 0
    ? status === 'needs_secure_session' ? 'next' : 'blocked'
    : 'complete';
  const consentStatus: NameChangeDraftReadinessStepStatus = consentItems > 0
    ? status === 'needs_consent' ? 'next' : 'blocked'
    : 'complete';
  const adapterStatus: NameChangeDraftReadinessStepStatus = adapterMappingsNeeded > 0
    ? status === 'needs_adapter_mapping' ? 'next' : 'blocked'
    : 'complete';
  const outputStatus: NameChangeDraftReadinessStepStatus = status === 'ready_for_review_draft' || status === 'ready_for_guided_entry'
    ? 'next'
    : 'blocked';

  return [
    {
      stepKey: 'shared_intake',
      label: 'Shared intake',
      status: sharedIntakeStatus,
      statusLabel: getStepStatusLabel(sharedIntakeStatus),
      count: sharedMissing + sharedReview,
      detail: `${sharedMissing} missing and ${sharedReview} review fields across the saved name-change profile.`,
      nextAction: sharedMissing > 0 ? 'Answer the shared intake questions once.' : sharedReview > 0 ? 'Review low-confidence shared values once.' : 'Shared intake is ready for the selected form companions.',
    },
    {
      stepKey: 'supplemental_intake',
      label: 'Supplemental form details',
      status: supplementalStatus,
      statusLabel: getStepStatusLabel(supplementalStatus),
      count: supplementalMissing,
      detail: `${supplementalMissing} supplemental details still need user input.`,
      nextAction: supplementalMissing > 0 ? 'Collect government-form details DayOf does not currently store by default.' : 'Supplemental form details are represented.',
    },
    {
      stepKey: 'secure_session',
      label: 'Secure session',
      status: secureStatus,
      statusLabel: getStepStatusLabel(secureStatus),
      count: secureEntryFields,
      detail: `${secureEntryFields} fields require short-lived secure entry.`,
      nextAction: secureEntryFields > 0 ? 'Collect secure-entry-only values without saving them in normal planner state.' : 'No secure-entry-only values are blocking draft generation.',
    },
    {
      stepKey: 'consent',
      label: 'Consent',
      status: consentStatus,
      statusLabel: getStepStatusLabel(consentStatus),
      count: consentItems,
      detail: `${consentItems} consent decisions are needed before sensitive values can be used.`,
      nextAction: consentItems > 0 ? 'Capture explicit use or retention consent for sensitive values.' : 'No sensitive-value consent is blocking this draft path.',
    },
    {
      stepKey: 'adapter_mapping',
      label: 'Adapter mapping',
      status: adapterStatus,
      statusLabel: getStepStatusLabel(adapterStatus),
      count: adapterMappingsNeeded,
      detail: `${adapterMappingsNeeded} PDF form adapters still need official field mapping.`,
      nextAction: adapterMappingsNeeded > 0 ? 'Probe the official PDFs and map semantic fields to PDF field names.' : 'Adapter mappings are ready for the current draft path.',
    },
    {
      stepKey: 'draft_output',
      label: 'Draft output',
      status: outputStatus,
      statusLabel: getStepStatusLabel(outputStatus),
      count: reviewDraftForms + guidedOnlineForms,
      detail: `${reviewDraftForms} review-draft forms and ${guidedOnlineForms} guided online flows are available.`,
      nextAction: outputStatus === 'next' ? 'Generate review-only output or guide official-site entry.' : 'Resolve the earlier blockers before producing draft output.',
    },
  ];
}

export function buildNameChangeDraftReadinessPlan(
  companionIntakePrompts: NameChangeFormCompanionIntakePrompt[],
  supplementalIntakePlan: NameChangeSupplementalIntakePlan,
  secureSessionPlan: NameChangeSecureSessionPlan,
  consentPlan: NameChangeConsentPlan,
  populationPlan: NameChangeFormPopulationPlan,
): NameChangeDraftReadinessPlan {
  const sharedMissing = companionIntakePrompts.filter((prompt) => prompt.status === 'missing').length;
  const sharedReview = companionIntakePrompts.filter((prompt) => prompt.status === 'review').length;
  const summary = {
    missingInput: sharedMissing + supplementalIntakePlan.summary.missing,
    reviewInput: sharedReview,
    secureEntryFields: secureSessionPlan.summary.ephemeralOnly,
    consentItems: consentPlan.summary.needsConsent,
    adapterMappingsNeeded: populationPlan.summary.needsAdapterMapping,
    guidedOnlineForms: populationPlan.summary.guidedOnline,
    reviewDraftForms: populationPlan.summary.readyForPopulation,
    blockingSteps: 0,
  };
  const status = getOverallStatus(summary);
  const steps = buildSteps(
    status,
    sharedMissing,
    sharedReview,
    supplementalIntakePlan.summary.missing,
    summary.secureEntryFields,
    summary.consentItems,
    summary.adapterMappingsNeeded,
    summary.reviewDraftForms,
    summary.guidedOnlineForms,
  );
  summary.blockingSteps = steps.filter((step) => step.status === 'blocked').length;
  const blockers = uniq([
    ...companionIntakePrompts
      .filter((prompt) => prompt.status === 'missing')
      .map((prompt) => `${prompt.label} is missing from shared intake.`),
    ...companionIntakePrompts
      .filter((prompt) => prompt.status === 'review')
      .map((prompt) => `${prompt.label} needs user review.`),
    ...supplementalIntakePlan.prompts
      .filter((prompt) => prompt.status === 'missing')
      .map((prompt) => `${prompt.label} is missing from supplemental intake.`),
    ...populationPlan.items.flatMap((item) => item.blockers),
  ]);

  return {
    status,
    statusLabel: getStatusLabel(status),
    primaryAction: getPrimaryAction(status),
    blockers,
    steps,
    readinessPayloadJson: JSON.stringify({
      reviewOnly: true,
      status,
      statusLabel: getStatusLabel(status),
      summary,
      steps,
      blockers,
    }, null, 2),
    summary,
  };
}
