import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangePlan, NameChangeReminderAttentionItem, NameChangeReminderAttentionSummary, NameChangeReminderInput, NameChangeReminderSuggestion, NameChangeReminderSummary } from './types';

const REMINDER_STALE_AFTER_MS = 1000 * 60 * 60 * 72;
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
    label: 'Confirm tax records are aligned across IRS, state, and payroll systems',
    reason: 'Verify that tax-facing records are lined up so withholding, filings, and notices do not split across names.',
    urgency: 'medium',
    suggestedOffsetDays: 5,
  },
  'milestone-account-rollout': {
    label: 'Confirm the main account rollout packet is reflected downstream',
    reason: 'After the core rollout push, verify that banking, insurance, and the main downstream records reflect the right legal name.',
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
    reasonSuffix: ' Coverage, cards, and provider rosters are easier to keep aligned when they are checked early.',
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
    includeWhen: (plan) => !plan.profile.isUsCitizen && plan.profile.passportNeedsUpdate,
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
    includeWhen: (plan) => plan.profile.legalBasis === 'court_order',
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

function getReminderPlannerRoute(
  suggestion: Pick<NameChangeReminderSuggestion, 'id' | 'dependsOnStepId'>,
): Pick<NameChangeReminderSuggestion, 'sectionKey' | 'plannerIntent' | 'focusTargetId'> {
  if (suggestion.id === 'reminder-case-legal-name-setup') {
    return {
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
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
    suggestion.dependsOnStepId === 'institution-employer'
    || suggestion.dependsOnStepId === 'institution-licenses'
    || suggestion.dependsOnStepId === 'institution-voter-registration'
    || suggestion.dependsOnStepId === 'institution-courtesy-notifications'
    || suggestion.dependsOnStepId === 'institution-travel-hospitality'
  ) {
    return {
      sectionKey: 'work-identity',
      plannerIntent: 'open_execution_card',
      focusTargetId:
        suggestion.dependsOnStepId === 'institution-licenses'
          ? 'execution-card-licenses'
          : suggestion.dependsOnStepId === 'institution-travel-hospitality'
            ? 'execution-card-tsa'
            : suggestion.dependsOnStepId === 'institution-voter-registration'
              ? 'execution-card-voter'
              : suggestion.dependsOnStepId === 'institution-courtesy-notifications'
                ? 'execution-card-courtesy'
                : 'execution-card-employer',
    };
  }

  if (
    suggestion.dependsOnStepId === 'institutions-rollout'
    || suggestion.dependsOnStepId === 'institution-banks'
    || suggestion.dependsOnStepId === 'institution-insurance'
    || suggestion.dependsOnStepId === 'institution-medical-records'
    || suggestion.dependsOnStepId === 'institution-utilities'
  ) {
    return {
      sectionKey: 'institutional',
      plannerIntent: 'open_execution_card',
      focusTargetId:
        suggestion.dependsOnStepId === 'institution-insurance'
          ? 'execution-card-insurance'
          : suggestion.dependsOnStepId === 'institution-medical-records'
            ? 'execution-card-medical'
            : suggestion.dependsOnStepId === 'institution-utilities'
              ? 'execution-card-utilities'
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
      urgency: raiseUrgency(urgencyFromOffset(suggestedOffsetDays), category.id === 'travel_mobility' ? 'medium' : undefined),
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
  const nowMs = new Date(nowIso).getTime();

  reminders
    .filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled')
    .forEach((reminder) => {
      const dependentStep = plan.steps.find((step) => step.id === reminder.depends_on_step_id);
      if (!dependentStep) return;

      const milestoneConfirmation = isMilestoneConfirmationReminder(reminder);
      if (dependentStep.executionStatus === 'complete' && !milestoneConfirmation) return;

      const lastTouchedAt = dependentStep.executionUpdatedAt ?? null;
      const isStale = lastTouchedAt ? (nowMs - new Date(lastTouchedAt).getTime()) >= REMINDER_STALE_AFTER_MS : true;
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
        dependsOnStepId: reminder.depends_on_step_id,
        dependentStepTitle: dependentStep.title,
        dependentStepExecutionStatus: dependentStep.executionStatus ?? 'todo',
        reminderStatus: reminder.status,
        urgency: reminder.urgency,
        priorityTier,
        actionability,
        suggestedOffsetDays: reminder.suggested_offset_days,
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
