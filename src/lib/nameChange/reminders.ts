import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangePlan, NameChangeReminderAttentionItem, NameChangeReminderAttentionSummary, NameChangeReminderInput, NameChangeReminderSuggestion, NameChangeReminderSummary } from './types';

const REMINDER_STALE_AFTER_MS = 1000 * 60 * 60 * 72;

function getReminderTimestamp(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const parsed = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(trimmed);
  if (
    dateOnlyMatch
    && (parsed.getFullYear() !== Number(dateOnlyMatch[1])
      || parsed.getMonth() !== Number(dateOnlyMatch[2]) - 1
      || parsed.getDate() !== Number(dateOnlyMatch[3]))
  ) {
    return null;
  }
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}
const MILESTONE_CONFIRM_REMINDER_PREFIX = 'reminder-milestone-confirm-';

type NameChangeCoreStepReminderConfig = {
  id: string;
  label: string;
  standardOffsetDays: number;
  expeditedOffsetDays: number;
  standardUrgency: NameChangeReminderSuggestion['urgency'];
  expeditedUrgency: NameChangeReminderSuggestion['urgency'];
  reason: string;
  includeWhen?: (plan: NameChangePlan) => boolean;
};

type NameChangeInstitutionReminderFamilyConfig = {
  offsetAdjustmentDays?: number;
  minimumUrgency?: NameChangeReminderSuggestion['urgency'];
  reasonSuffix?: string;
};

type NameChangeContextReminderConfig = {
  id: string;
  label: string;
  standardOffsetDays: number;
  expeditedOffsetDays: number;
  standardUrgency: NameChangeReminderSuggestion['urgency'];
  expeditedUrgency: NameChangeReminderSuggestion['urgency'];
  reason: string;
  dependsOnStepId: string;
  includeWhen: (plan: NameChangePlan) => boolean;
};

const MILESTONE_CONFIRMATION_CONFIG: Record<string, {
  label: string;
  reason: string;
  urgency?: NameChangeReminderSuggestion['urgency'];
  suggestedOffsetDays: number;
}> = {
  'milestone-legal-proof': {
    label: 'Confirm certified legal proof is ready for downstream use',
    reason: 'Verify that the reviewed legal-proof document is the certificate or court order you plan to reuse downstream before SSA or DMV work starts.',
    urgency: 'medium',
    suggestedOffsetDays: 1,
  },
  'milestone-ssa': {
    label: 'Confirm Social Security update is recorded',
    reason: 'Confirm that the SSA update has posted before DMV, payroll, or tax systems start relying on the new name.',
    urgency: 'high',
    suggestedOffsetDays: 3,
  },
  'milestone-photo-id': {
    label: 'Confirm primary photo ID is updated and usable',
    reason: 'Verify that the replacement ID is issued and usable before passport, travel, banking, or employer records depend on it.',
    urgency: 'high',
    suggestedOffsetDays: 5,
  },
  'milestone-passport': {
    label: 'Confirm passport update is reflected in the travel identity chain',
    reason: 'Verify that the passport update has landed before travel profiles, bookings, or trusted-traveler records start leaning on it.',
    urgency: 'medium',
    suggestedOffsetDays: 6,
  },
  'milestone-payroll': {
    label: 'Confirm payroll and HR are using the verified name',
    reason: 'Check that payroll, benefits, and HR records picked up the SSA-backed name before the next pay cycle or benefits workflow depends on it.',
    urgency: 'high',
    suggestedOffsetDays: 4,
  },
  'milestone-tax': {
    label: 'Confirm tax and government records are aligned across filing and status systems',
    reason: 'Verify that tax, county, and immigration-facing records are lined up so filings, notices, and status checks do not split across names.',
    urgency: 'medium',
    suggestedOffsetDays: 5,
  },
  'milestone-account-rollout': {
    label: 'Confirm the main account rollout packet is reflected downstream',
    reason: 'After the core rollout push, verify that banking, insurance, and the main downstream records reflect the right legal name.',
    urgency: 'medium',
    suggestedOffsetDays: 7,
  },
  'milestone-professional-licenses': {
    label: 'Confirm professional licenses and credentials reflect the legal name',
    reason: 'Verify that the board record, wallet card, and credential lookup all reflect the updated legal name before employers or renewals rely on them.',
    urgency: 'medium',
    suggestedOffsetDays: 7,
  },
  'milestone-downstream-rollout': {
    label: 'Confirm the long-tail downstream rollout is actually finished',
    reason: 'Use this checkpoint to confirm that travel, loyalty, utilities, and the other long-tail accounts are no longer carrying the old name.',
    urgency: 'medium',
    suggestedOffsetDays: 9,
  },
};

function isMilestoneConfirmationReminder(reminder: Pick<NameChangeReminderInput, 'reminder_key'> | Pick<NameChangeReminderSuggestion, 'id'>): boolean {
  const reminderKey = 'reminder_key' in reminder ? reminder.reminder_key : reminder.id;
  return reminderKey.startsWith(MILESTONE_CONFIRM_REMINDER_PREFIX);
}

const CORE_STEP_REMINDER_CONFIGS: Record<string, NameChangeCoreStepReminderConfig> = {
  'eligibility-proof': {
    id: 'reminder-legal-proof-followup',
    label: 'Check certified legal proof readiness',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium' as const,
    expeditedUrgency: 'high' as const,
    reason: 'The certificate or court-order proof packet is the reusable base for SSA, DMV, passport, payroll, tax, and downstream account updates.',
  },
  'federal-ssa': {
    id: 'reminder-ssa-followup',
    label: 'Check SSA name change progress',
    standardOffsetDays: 3,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium' as const,
    expeditedUrgency: 'high' as const,
    reason: 'SSA is the anchor for the federal-first path, so an early follow-up keeps the rest of the workflow aligned.',
  },
  'state-dmv': {
    id: 'reminder-dmv-followup',
    label: 'Check California DMV name change progress',
    standardOffsetDays: 5,
    expeditedOffsetDays: 2,
    standardUrgency: 'medium' as const,
    expeditedUrgency: 'high' as const,
    reason: 'California DMV progress is the main state identity hinge for downstream account updates.',
  },
  'federal-passport': {
    id: 'reminder-passport-followup',
    label: 'Check passport name-match progress',
    standardOffsetDays: 4,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium' as const,
    expeditedUrgency: 'high' as const,
    reason: 'Travel-facing identity usually needs an early follow-up once SSA or DMV is moving.',
    includeWhen: (plan: NameChangePlan) => plan.profile.passportNeedsUpdate,
  },
  'institutions-rollout': {
    id: 'reminder-institutions-rollout',
    label: 'Check downstream institution rollout progress',
    standardOffsetDays: 10,
    expeditedOffsetDays: 6,
    standardUrgency: 'medium' as const,
    expeditedUrgency: 'medium' as const,
    reason: 'Once the core identity path is moving, the long tail of banks, insurance, utilities, and other accounts is where name-change workflows usually stall.',
  },
};

const INSTITUTION_REMINDER_FAMILY_CONFIGS: Record<string, NameChangeInstitutionReminderFamilyConfig> = {
  employment: {
    offsetAdjustmentDays: -1,
    minimumUrgency: 'medium',
    reasonSuffix: ' Employment-linked records tend to matter quickly once government identity updates begin to settle.',
  },
  insurance: {
    minimumUrgency: 'medium',
    reasonSuffix: ' Coverage, cards, and care rosters are easier to keep aligned when they are checked early.',
  },
  financial: {
    offsetAdjustmentDays: -1,
    minimumUrgency: 'medium',
    reasonSuffix: ' Financial accounts are one of the first downstream lanes where old/new-name mismatches get irritating fast.',
  },
  government: {
    minimumUrgency: 'medium',
    reasonSuffix: ' Government-adjacent record alignment tends to support other admin work once it is confirmed.',
  },
};

const CONTEXT_REMINDER_CONFIGS: NameChangeContextReminderConfig[] = [
  {
    id: 'reminder-travel-bookings',
    label: 'Double-check travel bookings against your live ID path',
    standardOffsetDays: 1,
    expeditedOffsetDays: 0,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'federal-passport',
    reason: 'Upcoming travel means booking names, TSA profiles, and passport timing should stay aligned with the SSA → DMV sequence.',
    includeWhen: (plan) => Boolean(plan.profile.passportNeedsUpdate && plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-travel-timing')),
  },
  {
    id: 'reminder-international-passport',
    label: 'Confirm your country-specific passport update path',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'federal-passport',
    reason: 'Non-U.S. passport handling is country-specific, so pinning down that rule set early keeps the rest of the identity chain honest.',
    includeWhen: (plan) => Boolean(
      !plan.profile.isUsCitizen
      && plan.profile.passportNeedsUpdate
      && plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-non-us-passport')
    ),
  },
  {
    id: 'reminder-travel-passport-branch',
    label: 'Keep TSA and travel profiles on your passport-specific identity path',
    standardOffsetDays: 3,
    expeditedOffsetDays: 1,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
    reason: 'When the passport chain is country-specific, TSA, airline traveler profiles, loyalty accounts, and booking-name changes should follow that same document path instead of assuming a standard U.S. passport update.',
    includeWhen: (plan) => Boolean(
      !plan.profile.isUsCitizen
      && plan.profile.passportNeedsUpdate
      && plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-non-us-passport')
    ),
  },
  {
    id: 'reminder-court-order-packet',
    label: 'Check court-order packet and hearing progress',
    standardOffsetDays: 3,
    expeditedOffsetDays: 1,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'On the court-order path, nothing downstream matters until the packet, hearing, and signed order are actually moving.',
    includeWhen: (plan) => Boolean(
      plan.profile.legalBasis === 'court_order'
      && plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-court-order-path')
    ),
  },
  {
    id: 'reminder-county-office-variation',
    label: 'Confirm the issuing county record path before filing follow-through',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'County clerk, recorder, and vital-records offices handle certified copies differently, so lock the issuing-office path before SSA or passport follow-through depends on it.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-county-office-variation')),
  },
  {
    id: 'reminder-out-of-state-proof-grounding',
    label: 'Ground the out-of-state certificate county, number, and issuing authority before downstream filing',
    standardOffsetDays: 1,
    expeditedOffsetDays: 0,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'Out-of-state marriage follow-through should pause until the certificate county, certificate number, and issuing authority are grounded from the reviewed proof set.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-out-of-state-proof')),
  },
  {
    id: 'reminder-document-name-mismatch',
    label: 'Resolve document-name conflicts before trusting downstream filing',
    standardOffsetDays: 1,
    expeditedOffsetDays: 0,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'When reviewed document extracts disagree with canonical case truth, fix the proof set before using it for packet prep, sequencing, or account follow-through.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-document-name-mismatch')),
  },
  {
    id: 'reminder-first-passport-branch',
    label: 'Prep the first-passport packet instead of a renewal shortcut',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'federal-passport',
    reason: 'If this is a first passport in the new legal name, line up the DS-11-style evidence path instead of assuming the simpler existing-passport branch.',
    includeWhen: (plan) => Boolean(
      plan.profile.passportNeedsUpdate
      && plan.profile.isUsCitizen
      && !plan.profile.hasPassport
      && plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-passport-branch')
    ),
  },
  {
    id: 'reminder-name-format-consistency',
    label: 'Lock the exact surname format before SSA and DMV filing',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium',
    expeditedUrgency: 'high',
    dependsOnStepId: 'federal-ssa',
    reason: 'Hyphenated or dual-surname cases need the exact same last-name formatting across SSA, DMV, passport, payroll, and account templates.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-hyphenated-name' || item.id === 'edge-dual-name-path')),
  },
  {
    id: 'reminder-travel-name-format-consistency',
    label: 'Keep travel profiles on the exact same surname format',
    standardOffsetDays: 4,
    expeditedOffsetDays: 2,
    standardUrgency: 'medium',
    expeditedUrgency: 'high',
    dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
    reason: 'Hyphenated or dual-surname cases need the exact same surname punctuation and order across passports, TSA/airline traveler profiles, loyalty accounts, and booked-trip follow-through.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-hyphenated-name' || item.id === 'edge-dual-name-path')),
  },
  {
    id: 'reminder-marriage-name-mismatch',
    label: 'Resolve the target legal-name path before filing',
    standardOffsetDays: 1,
    expeditedOffsetDays: 0,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'If the requested target legal name falls outside the California marriage shortcut, confirm the right packet and sequence before filing.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-marriage-name-mismatch')),
  },
  {
    id: 'reminder-mismatch-recovery',
    label: 'Reset the legal-proof path before continuing downstream updates',
    standardOffsetDays: 1,
    expeditedOffsetDays: 0,
    standardUrgency: 'high',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'When the target-name path no longer matches the marriage shortcut, pause SSA, DMV, passport, and account rollout until the court-order proof path is grounded.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-mismatch-recovery')),
  },
  {
    id: 'reminder-both-partners-changing',
    label: 'Keep each partner on a separate name-change execution chain',
    standardOffsetDays: 2,
    expeditedOffsetDays: 1,
    standardUrgency: 'medium',
    expeditedUrgency: 'high',
    dependsOnStepId: 'eligibility-proof',
    reason: 'If both partners are changing names, do not reuse reminders, confirmations, or proof assumptions across the two separate execution chains.',
    includeWhen: (plan) => Boolean(plan.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-both-partners-changing')),
  },
];

function raiseUrgency(
  current: NameChangeReminderSuggestion['urgency'],
  minimum?: NameChangeReminderSuggestion['urgency'],
): NameChangeReminderSuggestion['urgency'] {
  const rank = { low: 0, medium: 1, high: 2 } as const;
  if (!minimum) return current;
  return rank[current] >= rank[minimum] ? current : minimum;
}

function urgencyFromOffset(days: number): NameChangeReminderSuggestion['urgency'] {
  if (days <= 2) return 'high';
  if (days <= 7) return 'medium';
  return 'low';
}

function adjustReminderSuggestionForStepState(
  suggestion: NameChangeReminderSuggestion,
  plan: NameChangePlan,
): NameChangeReminderSuggestion | null {
  const step = plan.steps.find((candidate) => candidate.id === suggestion.dependsOnStepId);
  if (!step) return suggestion;
  if (step.executionStatus === 'complete') return null;

  if (step.executionStatus === 'in_progress') {
    const suggestedOffsetDays = Math.max(1, Math.min(suggestion.suggestedOffsetDays, suggestion.urgency === 'low' ? 5 : 2));
    return {
      ...suggestion,
      suggestedOffsetDays,
      urgency: suggestion.urgency === 'low' ? 'medium' : suggestion.urgency,
      reason: `${suggestion.reason} This step is already in progress, so the follow-up should stay tighter than a fresh todo item.`,
    };
  }

  return suggestion;
}

function getCaseLegalNameSetupMissingInputs(plan: NameChangePlan): string[] {
  return plan.summary.missingInputs.filter((item) =>
    item === 'Current first name'
    || item === 'Current middle name'
    || item === 'Current last name'
    || item === 'Target first name'
    || item === 'Target middle name'
    || item === 'Target last name'
  );
}

export function getReminderPlannerRoute(
  suggestion: Pick<NameChangeReminderSuggestion, 'id' | 'dependsOnStepId'>,
): Pick<NameChangeReminderSuggestion, 'sectionKey' | 'plannerIntent' | 'focusTargetId'> {
  if (suggestion.id === 'reminder-case-legal-name-setup') {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    };
  }

  if (
    suggestion.id === 'reminder-court-order-packet'
  ) {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-courtOrder',
    };
  }

  if (
    suggestion.id === 'reminder-marriage-name-mismatch'
    || suggestion.id === 'reminder-mismatch-recovery'
    || suggestion.id === 'reminder-both-partners-changing'
    || suggestion.id === 'reminder-county-office-variation'
    || suggestion.id === 'reminder-out-of-state-proof-grounding'
    || suggestion.id === 'reminder-document-name-mismatch'
    || suggestion.id === 'reminder-name-format-consistency'
  ) {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    };
  }

  if (suggestion.id === 'reminder-travel-bookings') {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-tsa',
    };
  }

  if (suggestion.dependsOnStepId === 'federal-ssa') {
    return {
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-ssa',
    };
  }

  if (suggestion.dependsOnStepId === 'state-dmv') {
    return {
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-dmv',
    };
  }

  if (suggestion.dependsOnStepId === 'federal-passport') {
    return {
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-passport',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institution-irs-records'
    || suggestion.dependsOnStepId === 'institution-state-tax-agency'
  ) {
    return {
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-taxes',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institution-county-recorder-property'
    || suggestion.dependsOnStepId === 'institution-uscis-immigration-records'
  ) {
    return {
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-legalGovernment',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institution-employer'
    || suggestion.dependsOnStepId === 'institution-irs-employer'
    || suggestion.dependsOnStepId === 'institution-retirement-benefits'
    || suggestion.dependsOnStepId === 'institution-licenses'
    || suggestion.dependsOnStepId === 'institution-professional-licenses'
  ) {
    return {
      sectionKey: 'work-identity',
      plannerIntent: 'open_execution_card',
      focusTargetId:
        suggestion.dependsOnStepId === 'institution-licenses' || suggestion.dependsOnStepId === 'institution-professional-licenses'
          ? 'execution-card-licenses'
          : 'execution-card-employer',
    };
  }

  if (suggestion.dependsOnStepId === 'institution-courtesy-notifications') {
    return {
      sectionKey: 'institutional',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-courtesy',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institution-voter-registration'
    || suggestion.dependsOnStepId === 'institution-travel-hospitality'
    || suggestion.dependsOnStepId === 'institution-dmv-registration-title'
    || suggestion.dependsOnStepId === 'institution-frequent-flyer-hotel-rail'
  ) {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId:
        suggestion.dependsOnStepId === 'institution-voter-registration'
          ? 'execution-card-voter'
          : 'execution-card-tsa',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institutions-rollout'
    || suggestion.dependsOnStepId === 'institution-banks'
    || suggestion.dependsOnStepId === 'institution-investments-loans'
    || suggestion.dependsOnStepId === 'institution-student-loans-financial-aid'
    || suggestion.dependsOnStepId === 'institution-mortgage-property-records'
    || suggestion.dependsOnStepId === 'institution-credit-bureaus'
    || suggestion.dependsOnStepId === 'institution-insurance'
    || suggestion.dependsOnStepId === 'institution-disability-insurance'
    || suggestion.dependsOnStepId === 'institution-workers-comp-leave'
    || suggestion.dependsOnStepId === 'institution-medical-records'
    || suggestion.dependsOnStepId === 'institution-utilities'
    || suggestion.dependsOnStepId === 'institution-utilities-housing'
    || suggestion.dependsOnStepId === 'institution-phone-digital-identity'
    || suggestion.dependsOnStepId === 'institution-subscriptions-social'
    || suggestion.dependsOnStepId === 'institution-school-alumni-records'
    || suggestion.dependsOnStepId === 'institution-courtesy-social-sync'
  ) {
    return {
      sectionKey: 'institutional',
      plannerIntent: 'open_execution_card',
      focusTargetId:
        suggestion.dependsOnStepId === 'institution-insurance'
          || suggestion.dependsOnStepId === 'institution-disability-insurance'
          || suggestion.dependsOnStepId === 'institution-workers-comp-leave'
          ? 'execution-card-insurance'
          : suggestion.dependsOnStepId === 'institution-medical-records'
            ? 'execution-card-medical'
            : suggestion.dependsOnStepId === 'institution-utilities'
              || suggestion.dependsOnStepId === 'institution-utilities-housing'
              || suggestion.dependsOnStepId === 'institution-phone-digital-identity'
              ? 'execution-card-utilities'
              : suggestion.dependsOnStepId === 'institution-subscriptions-social'
                || suggestion.dependsOnStepId === 'institution-school-alumni-records'
                || suggestion.dependsOnStepId === 'institution-courtesy-social-sync'
                ? 'execution-card-courtesy'
                : 'execution-card-banks',
    };
  }

  return {
    sectionKey: 'cleanup',
    plannerIntent: 'open_execution_card',
    focusTargetId: 'execution-card-ssa',
  };
}

export function buildNameChangeReminderSuggestions(plan: NameChangePlan): NameChangeReminderSuggestion[] {
  const suggestions: NameChangeReminderSuggestion[] = [];
  const missingCaseLegalNameInputs = getCaseLegalNameSetupMissingInputs(plan);

  if (missingCaseLegalNameInputs.length > 0) {
    const suggestion = {
      id: 'reminder-case-legal-name-setup',
      label: 'Finish case legal-name setup before downstream filing',
      suggestedOffsetDays: 0,
      reason: `Case setup is still missing ${missingCaseLegalNameInputs.map((item) => item.toLowerCase()).join(', ')}. Lock the current and target legal-name fields before trusting packet prep, sequencing, or reminder timing.`,
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  }

  Object.entries(CORE_STEP_REMINDER_CONFIGS).forEach(([stepId, config]) => {
    if (config.includeWhen && !config.includeWhen(plan)) return;
    const step = plan.steps.find((candidate) => candidate.id === stepId);
    if (step?.status === 'blocked') return;

    const suggestion = {
      id: config.id,
      label: config.label,
      suggestedOffsetDays: plan.profile.urgencyLevel === 'expedited' ? config.expeditedOffsetDays : config.standardOffsetDays,
      reason: config.reason,
      dependsOnStepId: stepId,
      urgency: plan.profile.urgencyLevel === 'expedited' ? config.expeditedUrgency : config.standardUrgency,
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  });

  CONTEXT_REMINDER_CONFIGS.forEach((config) => {
    if (!config.includeWhen(plan)) return;

    const suggestion = {
      id: config.id,
      label: config.label,
      suggestedOffsetDays: plan.profile.urgencyLevel === 'expedited' ? config.expeditedOffsetDays : config.standardOffsetDays,
      reason: config.reason,
      dependsOnStepId: config.dependsOnStepId,
      urgency: plan.profile.urgencyLevel === 'expedited' ? config.expeditedUrgency : config.standardUrgency,
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  });

  NAME_CHANGE_INSTITUTION_LIBRARY.forEach((institution) => {
    const matchingStep = plan.steps.find((step) => step.id === `institution-${institution.key}`);
    if (!matchingStep) return;
    if (matchingStep.status === 'blocked') return;
    const familyConfig = INSTITUTION_REMINDER_FAMILY_CONFIGS[institution.category] ?? null;
    const suggestedOffsetDays = Math.max(1, institution.reminderDaysAfterPrimaryId + (familyConfig?.offsetAdjustmentDays ?? 0));

    const suggestion = {
      id: `reminder-${institution.key}`,
      label: `Follow up on ${institution.label}`,
      suggestedOffsetDays,
      reason: `${institution.notes}${familyConfig?.reasonSuffix ?? ''}`,
      dependsOnStepId: matchingStep.id,
      urgency: raiseUrgency(urgencyFromOffset(suggestedOffsetDays), familyConfig?.minimumUrgency),
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  });

  plan.summary.institutionCategoryCoverage?.forEach((category) => {
    if (category.dependsOnStepIds.length === 0) return;

    const matchingInstitutions = NAME_CHANGE_INSTITUTION_LIBRARY.filter((institution) => category.institutionKeys.includes(institution.key));
    if (matchingInstitutions.length === 0) return;

    const suggestedOffsetDays = Math.max(
      3,
      ...matchingInstitutions.map((institution) => institution.reminderDaysAfterPrimaryId + 2),
    );

    const dependentStep = plan.steps.find((step) => step.id === (category.dependsOnStepIds[category.dependsOnStepIds.length - 1] ?? category.dependsOnStepIds[0] ?? 'institutions-rollout'));
    if (dependentStep?.status === 'blocked') return;

    const suggestion = {
      id: `reminder-category-confirm-${category.id}`,
      label: `Confirm ${category.label.toLowerCase()} rollout is actually done`,
      suggestedOffsetDays,
      reason: `${category.summary}. Use this checkpoint to confirm the whole ${category.label.toLowerCase()} lane is no longer carrying the old name.`,
      dependsOnStepId: category.dependsOnStepIds[category.dependsOnStepIds.length - 1] ?? category.dependsOnStepIds[0] ?? 'institutions-rollout',
      urgency: raiseUrgency(
        urgencyFromOffset(suggestedOffsetDays),
        category.id === 'travel_mobility' || category.id === 'work_insurance' ? 'medium' : undefined,
      ),
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  });

  plan.summary.milestoneChecklist?.forEach((milestone) => {
    if (milestone.dependsOnStepIds.length === 0) return;
    if (milestone.status === 'blocked' || milestone.status === 'complete') return;

    const config = MILESTONE_CONFIRMATION_CONFIG[milestone.id];
    if (!config) return;

    const suggestion = {
      id: `${MILESTONE_CONFIRM_REMINDER_PREFIX}${milestone.id}`,
      label: config.label,
      suggestedOffsetDays: config.suggestedOffsetDays,
      reason: config.reason,
      dependsOnStepId: milestone.dependsOnStepIds[milestone.dependsOnStepIds.length - 1] ?? milestone.dependsOnStepIds[0] ?? 'eligibility-proof',
      urgency: config.urgency ?? urgencyFromOffset(config.suggestedOffsetDays),
    } satisfies NameChangeReminderSuggestion;

    suggestions.push({
      ...suggestion,
      ...getReminderPlannerRoute(suggestion),
    });
  });

  return suggestions
    .map((suggestion) => adjustReminderSuggestionForStepState(suggestion, plan))
    .filter((suggestion): suggestion is NameChangeReminderSuggestion => suggestion !== null)
    .sort((a, b) => a.suggestedOffsetDays - b.suggestedOffsetDays || a.label.localeCompare(b.label));
}

export function mapReminderSuggestionsToInputs(suggestions: NameChangeReminderSuggestion[]): NameChangeReminderInput[] {
  return suggestions.map((suggestion) => ({
    reminder_key: suggestion.id,
    label: suggestion.label,
    reason: suggestion.reason,
    depends_on_step_id: suggestion.dependsOnStepId,
    suggested_offset_days: suggestion.suggestedOffsetDays,
    urgency: suggestion.urgency,
    status: 'pending',
    section_key: suggestion.sectionKey,
    planner_intent: suggestion.plannerIntent,
    focus_target_id: suggestion.focusTargetId,
  }));
}

export function summarizeNameChangeReminders(reminders: NameChangeReminderInput[]): NameChangeReminderSummary {
  return reminders.reduce<NameChangeReminderSummary>((summary, reminder) => {
    summary.total += 1;
    summary[reminder.status] += 1;
    if (reminder.urgency === 'high' && (reminder.status === 'pending' || reminder.status === 'scheduled')) {
      summary.highUrgencyOpen += 1;
    }
    return summary;
  }, {
    total: 0,
    pending: 0,
    scheduled: 0,
    sent: 0,
    dismissed: 0,
    highUrgencyOpen: 0,
    staleAttentionOpen: 0,
  });
}

export function summarizeNameChangeReminderAttention(
  attentionItems: NameChangeReminderAttentionItem[],
  options?: { hasRecentStart?: boolean; hasRecentCompletion?: boolean },
): NameChangeReminderAttentionSummary {
  const staleTodo = attentionItems.filter((item) => item.isStale && item.dependentStepExecutionStatus === 'todo').length;
  const staleInProgress = attentionItems.filter((item) => item.isStale && item.dependentStepExecutionStatus === 'in_progress').length;
  const critical = attentionItems.filter((item) => item.priorityTier === 'critical').length;
  const elevated = attentionItems.filter((item) => item.priorityTier === 'elevated').length;
  const normal = attentionItems.filter((item) => (item.priorityTier ?? 'normal') === 'normal').length;
  const actionableNow = attentionItems.filter((item) => item.actionability === 'actionable_now').length;
  const blockedByUntouchedStep = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step').length;
  const blockedAndStale = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale).length;
  const actionablePriority = attentionItems.filter((item) => item.actionability === 'actionable_now' && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const actionableNormal = attentionItems.filter((item) => item.actionability === 'actionable_now' && (item.priorityTier ?? 'normal') === 'normal').length;
  const actionableAndStale = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale).length;
  const actionableStalePriority = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const actionableStaleNormal = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale && (item.priorityTier ?? 'normal') === 'normal').length;
  const blockedStalePriority = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const blockedStaleNormal = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale && (item.priorityTier ?? 'normal') === 'normal').length;

  return {
    total: attentionItems.length,
    stale: attentionItems.filter((item) => item.isStale).length,
    staleTodo,
    staleInProgress,
    highUrgency: attentionItems.filter((item) => item.urgency === 'high').length,
    critical,
    elevated,
    normal,
    actionableNow,
    blockedByUntouchedStep,
    blockedAndStale,
    actionablePriority,
    actionableNormal,
    actionableAndStale,
    actionableStalePriority,
    actionableStaleNormal,
    blockedStalePriority,
    blockedStaleNormal,
    dominantRiskLane: (() => {
      const blockedStaleScore = blockedAndStale;
      const staleActionableScore = actionableAndStale;
      const routineActionableScore = actionableNow - actionableAndStale;

      const entries = [
        ['blocked-stale', blockedStaleScore],
        ['stale-actionable', staleActionableScore],
        ['routine-actionable', routineActionableScore],
      ] as const;

      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      if (sorted[0][1] === sorted[1][1]) return 'mixed';
      return sorted[0][0];
    })(),
    staleActionablePosture: actionableStalePriority === actionableStaleNormal
      ? 'mixed'
      : actionableStalePriority > actionableStaleNormal
        ? 'priority-heavy'
        : 'normal-heavy',
    blockedStalePosture: blockedStalePriority === blockedStaleNormal
      ? 'mixed'
      : blockedStalePriority > blockedStaleNormal
        ? 'priority-heavy'
        : 'normal-heavy',
    attentionPosture: actionableNow === blockedByUntouchedStep
      ? 'mixed'
      : actionableNow > blockedByUntouchedStep
        ? 'actionable-heavy'
        : 'blocked-heavy',
    stalePriority: staleTodo === staleInProgress ? 'mixed' : staleTodo > staleInProgress ? 'untouched' : 'moving',
    agingWithoutExecution: (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion,
    agingWithoutExecutionLane: (() => {
      const aging = (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion;
      if (!aging) return 'none';
      if (blockedAndStale === actionableAndStale) return 'mixed';
      return blockedAndStale > actionableAndStale ? 'blocked-stale' : 'stale-actionable';
    })(),
    agingWithoutExecutionPosture: (() => {
      const aging = (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion;
      if (!aging) return 'none';
      if (blockedAndStale === actionableAndStale) return 'mixed';
      return blockedAndStale > actionableAndStale ? 'blocked-heavy' : 'actionable-heavy';
    })(),
    actionableFreshPosture: (() => {
      if (actionableNow === 0) return 'none';
      const freshActionable = actionableNow - actionableAndStale;
      if (actionableAndStale === freshActionable) return 'mixed';
      return actionableAndStale > freshActionable ? 'stale-heavy' : 'fresh-heavy';
    })(),
  };
}

export function updateNameChangeReminderStatus(
  reminders: NameChangeReminderInput[],
  reminderKey: string,
  status: NameChangeReminderInput['status'],
): NameChangeReminderInput[] {
  return reminders.map((reminder) => reminder.reminder_key === reminderKey ? { ...reminder, status } : reminder);
}

export function bulkUpdateNameChangeReminderStatus(
  reminders: NameChangeReminderInput[],
  reminderKeys: string[],
  status: NameChangeReminderInput['status'],
): NameChangeReminderInput[] {
  const keys = new Set(reminderKeys);
  return reminders.map((reminder) => keys.has(reminder.reminder_key) ? { ...reminder, status } : reminder);
}

export function syncNameChangeRemindersWithStepExecution(
  reminders: NameChangeReminderInput[],
  stepId: string,
  executionStatus: 'todo' | 'in_progress' | 'complete',
): NameChangeReminderInput[] {
  return reminders.map((reminder) => {
    if (reminder.depends_on_step_id !== stepId) return reminder;

    const milestoneConfirmation = isMilestoneConfirmationReminder(reminder);

    if (executionStatus === 'complete') {
      return {
        ...reminder,
        status: milestoneConfirmation ? (reminder.status === 'dismissed' ? 'dismissed' : 'pending') : 'sent',
      };
    }

    if (executionStatus === 'in_progress') {
      return {
        ...reminder,
        status: reminder.status === 'dismissed' ? 'dismissed' : 'scheduled',
      };
    }

    return {
      ...reminder,
      status: reminder.status === 'dismissed' ? 'dismissed' : 'pending',
    };
  });
}

export function deriveNameChangeReminderAttention(
  reminders: NameChangeReminderInput[],
  plan: NameChangePlan,
  nowIso: string = new Date().toISOString(),
): NameChangeReminderAttentionItem[] {
  const attentionItems: NameChangeReminderAttentionItem[] = [];
  const nowMs = getReminderTimestamp(nowIso) ?? Date.now();

  reminders
    .filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled')
    .forEach((reminder) => {
      const dependentStep = plan.steps.find((step) => step.id === reminder.depends_on_step_id);
      if (!dependentStep) return;

      const milestoneConfirmation = isMilestoneConfirmationReminder(reminder);
      if (dependentStep.executionStatus === 'complete' && !milestoneConfirmation) return;

      const lastTouchedAt = dependentStep.executionUpdatedAt ?? null;
      const lastTouchedMs = getReminderTimestamp(lastTouchedAt);
      const isStale = lastTouchedMs === null ? true : (nowMs - lastTouchedMs) >= REMINDER_STALE_AFTER_MS;
      const priorityTier = isStale && reminder.urgency === 'high' && (dependentStep.executionStatus ?? 'todo') === 'todo'
        ? 'critical'
        : isStale || reminder.urgency === 'high'
          ? 'elevated'
          : 'normal';
      const actionability = (dependentStep.executionStatus ?? 'todo') === 'todo'
        ? 'blocked_by_untouched_step'
        : 'actionable_now';

      attentionItems.push({
        reminderKey: reminder.reminder_key,
        label: reminder.label,
        dependsOnStepId: reminder.depends_on_step_id ?? '',
        dependentStepTitle: dependentStep.title,
        dependentStepExecutionStatus: dependentStep.executionStatus ?? 'todo',
        reminderStatus: reminder.status,
        urgency: reminder.urgency === 'normal' ? 'medium' : reminder.urgency,
        priorityTier,
        actionability,
        suggestedOffsetDays: reminder.suggested_offset_days ?? 0,
        lastTouchedAt,
        isStale,
        sectionKey: reminder.section_key,
        plannerIntent: reminder.planner_intent,
        focusTargetId: reminder.focus_target_id,
      });
    });

  return attentionItems.sort((a, b) => {
      const priorityRank = { critical: 0, elevated: 1, normal: 2 };
      const urgencyRank = { high: 0, medium: 1, low: 2 };
      return priorityRank[a.priorityTier ?? 'normal'] - priorityRank[b.priorityTier ?? 'normal']
        || Number(b.isStale) - Number(a.isStale)
        || urgencyRank[a.urgency] - urgencyRank[b.urgency]
        || a.suggestedOffsetDays - b.suggestedOffsetDays
        || a.label.localeCompare(b.label);
    });
}
