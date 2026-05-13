import { matchesNameChangeDocumentKind } from './documentKinds';
import {
  compactTemplateBody,
  formatAccountUpdateChecklistGuidanceLine,
  formatAccountUpdateProofLine,
  getAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateReadinessIntroLine,
  getAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateReadinessSubjectPrefix,
  getAccountUpdateTemplateStatusLine,
  getDefaultAccountUpdateBlockingProofHopLabel,
  getFallbackBlockingProofHopLabel,
  normalizeAccountUpdateChecklistItems,
  normalizeAccountUpdateProofItems,
} from './accountUpdateTemplateCopy';
import { evaluateNameChangeRequirements } from './requirements';
import { NAME_CHANGE_ENGINE_VERSION, NAME_CHANGE_FORM_REGISTRY, NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeEligibilityDecision,
  NameChangeEngineInput,
  NameChangeFormRegistryEntry,
  NameChangeInstitutionEntry,
  NameChangePlan,
  NameChangePlanFormRef,
  NameChangePlanStep,
  NameChangeReminderInput,
} from './types';

type AccountUpdateTemplate = NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number];
type AccountUpdateTemplateReadiness = AccountUpdateTemplate['readiness'];

export {
  formatAccountUpdateChecklistGuidanceLine,
  formatAccountUpdateProofLine,
  getAccountUpdateTemplateActionLabel,
  getAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateCopyLabel,
  getAccountUpdateTemplateReadinessActionLabel,
  getAccountUpdateTemplateReadinessIntroLine,
  getAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateReadinessSubjectPrefix,
  getAccountUpdateTemplateStateLine,
  getAccountUpdateTemplateStatusLabel,
  getAccountUpdateTemplateStatusLine,
  getDefaultAccountUpdateBlockingProofHopLabel,
  getFallbackBlockingProofHopLabel,
  normalizeAccountUpdateChecklistItems,
  normalizeAccountUpdateProofItems,
} from './accountUpdateTemplateCopy';

const DOWNSTREAM_ROLLOUT_MILESTONE_STEP_IDS = [
  'state-dmv',
  'institution-medical-records',
  'institution-utilities-housing',
  'institution-phone-digital-identity',
  'institution-subscriptions-social',
  'institution-school-alumni-records',
  'institution-professional-licenses',
  'institution-voter-registration',
  'institution-tsa-precheck',
  'institution-travel-hospitality',
  'institution-dmv-registration-title',
  'institution-frequent-flyer-hotel-rail',
] as const;

const CORE_ACCOUNT_ROLLOUT_MILESTONE_STEP_IDS = [
  'state-dmv',
  'institution-banks',
  'institution-investments-loans',
  'institution-student-loans-financial-aid',
  'institution-mortgage-property-records',
  'institution-credit-bureaus',
  'institution-insurance',
  'institution-disability-insurance',
  'institution-workers-comp-leave',
  'institution-medical-records',
  'institution-utilities-housing',
  'institution-phone-digital-identity',
] as const;

const INSTITUTION_CATEGORY_COVERAGE_CONFIG = [
  {
    id: 'legal_government',
    label: 'Legal + government',
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'government',
  },
  {
    id: 'financial',
    label: 'Financial',
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'financial',
  },
  {
    id: 'work_insurance',
    label: 'Work + insurance',
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'employment'
      || institution.category === 'insurance'
      || institution.key === 'professional-licenses',
  },
  {
    id: 'personal_lifestyle',
    label: 'Personal + lifestyle',
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'personal'
      && !['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail', 'professional-licenses'].includes(institution.key),
  },
  {
    id: 'travel_mobility',
    label: 'Travel + mobility',
    matches: (institution: NameChangeInstitutionEntry) => ['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail'].includes(institution.key),
  },
] as const;

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function getNameChangeEngineTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
}

function isMarriageStyleAllowedInCalifornia(input: NameChangeEngineInput): boolean {
  const profile = input.profile;
  if (profile.legal_basis !== 'marriage') return false;

  const currentFirst = normalize(profile.current_first_name);
  const currentMiddle = normalize(profile.current_middle_name);
  const currentLast = normalize(profile.current_last_name);
  const targetFirst = normalize(profile.target_first_name);
  const targetMiddle = normalize(profile.target_middle_name);
  const targetLast = normalize(profile.target_last_name);
  const spouseLast = normalize(String(profile.structured_intake.spouseLastName ?? ''));

  const firstMatches = currentFirst === targetFirst;
  const middleMatches = currentMiddle === targetMiddle || targetMiddle === '';
  const targetUsesSpouseSurname = Boolean(spouseLast) && (targetLast === spouseLast || targetLast === `${currentLast}-${spouseLast}` || targetLast === `${spouseLast}-${currentLast}`);

  return firstMatches && middleMatches && targetUsesSpouseSurname;
}

export function evaluateCaliforniaNameChangeEligibility(input: NameChangeEngineInput): NameChangeEligibilityDecision {
  if (input.profile.launch_state !== 'california') {
    return {
      legalBasis: 'court_order',
      decision: 'court_order_required',
      reasons: ['This guided path currently supports California name-change steps.'],
    };
  }

  if (input.profile.legal_basis === 'court_order') {
    return {
      legalBasis: 'court_order',
      decision: 'approved_path',
      reasons: ['Court-order workflow selected, which can support broader custom name choices.'],
    };
  }

  if (isMarriageStyleAllowedInCalifornia(input)) {
    return {
      legalBasis: 'marriage',
      decision: 'approved_path',
      reasons: ['Requested name fits the California marriage-based shortcut path.'],
    };
  }

  return {
    legalBasis: 'court_order',
    decision: 'court_order_required',
    reasons: ['Requested name appears to fall outside the straightforward California marriage-based combinations.'],
  };
}

function hasDocument(input: NameChangeEngineInput, kind: string) {
  return input.documents.some((document) => matchesNameChangeDocumentKind(document.document_kind, kind as never) && document.intake_status !== 'not_started');
}

function hasReviewedDocument(input: NameChangeEngineInput, kind: string) {
  return input.documents.some((document) => matchesNameChangeDocumentKind(document.document_kind, kind as never) && document.intake_status === 'reviewed');
}

function hasMeaningfulValue(value: string | null | undefined) {
  return Boolean((value ?? '').trim());
}

function hasMiddleNameInPlay(profile: NameChangeEngineInput['profile']) {
  return hasMeaningfulValue(profile.current_middle_name) || hasMeaningfulValue(profile.target_middle_name);
}

function hasChangeReason(profile: NameChangeEngineInput['profile'], matcher: RegExp) {
  return profile.change_reasons.some((reason) => matcher.test(normalize(reason)));
}

function collectMissingInputs(
  input: NameChangeEngineInput,
  legalBasis: 'marriage' | 'court_order',
  legalProofReady: boolean,
  hasLegalProofInIntake: boolean,
  outOfStateMarriageCertificateGroundingMissing: boolean,
) {
  const missing: string[] = [];
  const profile = input.profile;

  if (!hasMeaningfulValue(profile.current_first_name)) missing.push('Current first name');
  if (hasMiddleNameInPlay(profile) && !hasMeaningfulValue(profile.current_middle_name)) missing.push('Current middle name');
  if (!hasMeaningfulValue(profile.current_last_name)) missing.push('Current last name');
  if (!hasMeaningfulValue(profile.target_first_name)) missing.push('Target first name');
  if (hasMiddleNameInPlay(profile) && !hasMeaningfulValue(profile.target_middle_name)) missing.push('Target middle name');
  if (!hasMeaningfulValue(profile.target_last_name)) missing.push('Target last name');
  if (!hasMeaningfulValue(profile.county_residence)) missing.push('California county');

  if (legalBasis === 'marriage') {
    if (!hasMeaningfulValue(profile.marriage_date)) missing.push('Marriage date');
    if (!hasMeaningfulValue(String(profile.structured_intake.spouseLastName ?? ''))) missing.push('Spouse last name');
    if (!legalProofReady) missing.push(hasLegalProofInIntake ? 'Certified marriage certificate review' : 'Certified marriage certificate details');
    if (outOfStateMarriageCertificateGroundingMissing) missing.push('Out-of-state marriage certificate county, certificate number, and issuing authority');
  }

  if (legalBasis === 'court_order' && !legalProofReady) {
    missing.push(hasLegalProofInIntake ? 'Court order packet or signed order review' : 'Court order packet or signed order details');
  }

  if (profile.passport_needs_update && !profile.is_us_citizen) {
    missing.push('Citizenship review for passport guidance');
  }

  return missing;
}

function formsFor(...conditions: Array<NameChangeFormRegistryEntry['appliesWhen'][number]>): NameChangePlanFormRef[] {
  return NAME_CHANGE_FORM_REGISTRY
    .filter((entry) => conditions.every((condition) => entry.appliesWhen.includes(condition)))
    .map((entry) => ({
      code: entry.code,
      title: entry.title,
      authority: entry.authority,
      jurisdiction: entry.jurisdiction,
      url: entry.url,
    }));
}

function institutionsFor(input: NameChangeEngineInput): NameChangeInstitutionEntry[] {
  return NAME_CHANGE_INSTITUTION_LIBRARY.filter((institution) =>
    institution.triggers.includes('all')
    || (input.profile.employment_status !== 'not_employed' && institution.triggers.includes('employment'))
    || (input.profile.passport_needs_update && institution.triggers.includes('passport'))
    || institution.triggers.includes('california_resident')
  ).sort((a, b) => a.launchPriority - b.launchPriority);
}

function buildStep(step: Omit<NameChangePlanStep, 'owner'>): NameChangePlanStep {
  return {
    ...step,
    owner: 'user',
    executionStatus: step.executionStatus ?? 'todo',
    executionNote: step.executionNote ?? null,
    executionUpdatedAt: step.executionUpdatedAt ?? null,
    completedAt: step.completedAt ?? null,
  };
}

function buildInstitutionRolloutSteps(institutions: NameChangeInstitutionEntry[], legalProofReady: boolean): NameChangePlanStep[] {
  return institutions.map((institution) => buildStep({
    id: `institution-${institution.key}`,
    phase: 'institutional',
    title: `Update ${institution.label}`,
    description: `${institution.notes} Best timing: ${institution.suggestedTiming}`,
    timing: institution.suggestedTiming,
    status: legalProofReady ? 'later' : 'blocked',
    blockers: legalProofReady ? [] : ['Primary identity records should move first.'],
    forms: [],
    institutions: [institution.label],
    evidenceNeeded: institution.evidenceNeeded,
  }));
}

function buildDualPartnerProofSteps(legalProofReady: boolean): NameChangePlanStep[] {
  const blockedUntilLegalProof = legalProofReady ? [] : ['Certified legal proof must be ready before partner-specific execution proof can be tracked.'];

  return [
    buildStep({
      id: 'dual-partner-ssa-partner-a-proof',
      phase: 'federal',
      title: 'Track Partner A Social Security confirmation',
      description: 'Capture whether Partner A has submitted and confirmed the SSA name update so the dual-change workflow does not collapse both partners into one shared status.',
      timing: 'After legal proof is ready and before DMV',
      status: legalProofReady ? 'ready' : 'blocked',
      blockers: blockedUntilLegalProof,
      forms: [],
      institutions: ['Social Security Administration'],
      evidenceNeeded: ['Partner A SSA confirmation or receipt', 'Partner A legal name-change proof'],
    }),
    buildStep({
      id: 'dual-partner-ssa-partner-b-proof',
      phase: 'federal',
      title: 'Track Partner B Social Security confirmation',
      description: 'Capture whether Partner B has submitted and confirmed the SSA name update separately from Partner A.',
      timing: 'After legal proof is ready and before DMV',
      status: legalProofReady ? 'ready' : 'blocked',
      blockers: blockedUntilLegalProof,
      forms: [],
      institutions: ['Social Security Administration'],
      evidenceNeeded: ['Partner B SSA confirmation or receipt', 'Partner B legal name-change proof'],
    }),
    buildStep({
      id: 'dual-partner-dmv-partner-a-proof',
      phase: 'state',
      title: 'Track Partner A photo ID confirmation',
      description: 'Track Partner A DMV or state ID completion separately so downstream banks, payroll, insurance, and travel profiles know which identity proof is ready.',
      timing: 'After Partner A SSA confirmation',
      status: legalProofReady ? 'later' : 'blocked',
      blockers: legalProofReady ? ['Partner A SSA confirmation should come first.'] : blockedUntilLegalProof,
      forms: [],
      institutions: ['California DMV'],
      evidenceNeeded: ['Partner A updated photo ID', 'Partner A SSA confirmation'],
    }),
    buildStep({
      id: 'dual-partner-dmv-partner-b-proof',
      phase: 'state',
      title: 'Track Partner B photo ID confirmation',
      description: 'Track Partner B DMV or state ID completion separately from Partner A.',
      timing: 'After Partner B SSA confirmation',
      status: legalProofReady ? 'later' : 'blocked',
      blockers: legalProofReady ? ['Partner B SSA confirmation should come first.'] : blockedUntilLegalProof,
      forms: [],
      institutions: ['California DMV'],
      evidenceNeeded: ['Partner B updated photo ID', 'Partner B SSA confirmation'],
    }),
    buildStep({
      id: 'dual-partner-rollout-partner-a-proof',
      phase: 'institutional',
      title: 'Track Partner A downstream account confirmations',
      description: 'Track Partner A payroll, banking, insurance, licensing, travel, and personal-account confirmations as a separate rollout lane.',
      timing: 'After Partner A photo ID is updated',
      status: legalProofReady ? 'later' : 'blocked',
      blockers: legalProofReady ? ['Partner A photo ID should be updated before broad account rollout.'] : blockedUntilLegalProof,
      forms: [],
      institutions: ['Banks', 'Payroll / HR', 'Insurance companies', 'Travel and loyalty accounts'],
      evidenceNeeded: ['Partner A account confirmations', 'Partner A updated photo ID', 'Partner A legal proof'],
    }),
    buildStep({
      id: 'dual-partner-rollout-partner-b-proof',
      phase: 'institutional',
      title: 'Track Partner B downstream account confirmations',
      description: 'Track Partner B payroll, banking, insurance, licensing, travel, and personal-account confirmations as a separate rollout lane.',
      timing: 'After Partner B photo ID is updated',
      status: legalProofReady ? 'later' : 'blocked',
      blockers: legalProofReady ? ['Partner B photo ID should be updated before broad account rollout.'] : blockedUntilLegalProof,
      forms: [],
      institutions: ['Banks', 'Payroll / HR', 'Insurance companies', 'Travel and loyalty accounts'],
      evidenceNeeded: ['Partner B account confirmations', 'Partner B updated photo ID', 'Partner B legal proof'],
    }),
  ];
}

function resolvePlanSequenceStatus(stepIds: readonly string[], steps: NameChangePlanStep[]): 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete' {
  const matchingSteps = stepIds
    .map((stepId) => steps.find((step) => step.id === stepId))
    .filter((step): step is NameChangePlanStep => Boolean(step));

  if (matchingSteps.length === 0) return 'upcoming';
  if (matchingSteps.every((step) => step.executionStatus === 'complete')) return 'complete';

  const firstIncompleteIndex = matchingSteps.findIndex((step) => step.executionStatus !== 'complete');
  const firstIncomplete = matchingSteps[firstIncompleteIndex];
  const priorSteps = matchingSteps.slice(0, firstIncompleteIndex);
  const activeDependencyIsCurrentTarget = firstIncompleteIndex === matchingSteps.length - 1;

  if (priorSteps.some((step) => step.executionStatus === 'in_progress')) return 'in_progress';
  if (priorSteps.some((step) => step.status === 'blocked')) return 'blocked';
  if (firstIncomplete?.status === 'blocked') return 'blocked';
  if (firstIncomplete?.executionStatus === 'in_progress') return 'in_progress';
  if (!activeDependencyIsCurrentTarget) return 'upcoming';
  if (priorSteps.every((step) => step.executionStatus === 'complete') && firstIncomplete?.status === 'ready') return 'ready';
  return 'upcoming';
}

function buildTargetStatusOverview(
  input: NameChangeEngineInput,
  plan: NameChangePlan,
  steps: NameChangePlanStep[],
  reminders: NameChangeReminderInput[] = [],
): NonNullable<NameChangePlan['summary']['targetStatusOverview']> {
  const trackedSteps = steps.filter((step) => step.phase !== 'eligibility');
  const latestUpdatedAt = trackedSteps
    .flatMap((step) => [step.executionUpdatedAt, step.completedAt])
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeEngineTimestamp(right) - getNameChangeEngineTimestamp(left))[0] ?? null;
  const latestMilestoneAt = (plan.summary.milestoneChecklist ?? [])
    .map((milestone) => milestone.lastUpdatedAt ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeEngineTimestamp(right) - getNameChangeEngineTimestamp(left))[0] ?? null;
  const openReminders = reminders
    .filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled');
  const latestReminderAt = openReminders
    .map((reminder) => reminder.updated_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeEngineTimestamp(right) - getNameChangeEngineTimestamp(left))[0] ?? null;
  const latestTouchedAt = [latestUpdatedAt, latestMilestoneAt, latestReminderAt]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeEngineTimestamp(right) - getNameChangeEngineTimestamp(left))[0] ?? null;
  const latestTouchedSource = latestTouchedAt === latestReminderAt && latestReminderAt
    ? 'reminder' as const
    : latestTouchedAt === latestMilestoneAt && latestMilestoneAt
      ? 'milestone' as const
    : latestTouchedAt === latestUpdatedAt && latestUpdatedAt
      ? 'execution' as const
      : null;
  const targetStatusCounts = Object.keys(NAME_CHANGE_EXECUTION_TARGETS).reduce((summary, targetKey) => {
    const snapshot = buildNameChangeTargetExecutionSnapshot(targetKey as keyof typeof NAME_CHANGE_EXECUTION_TARGETS, input.profile, input.documents, input.extractedFields, plan, reminders);

    if (snapshot.statusVault.status === 'complete') {
      summary.complete += 1;
    } else if (snapshot.statusVault.status === 'in_progress') {
      summary.inProgress += 1;
    } else if (snapshot.statusVault.status === 'ready') {
      summary.ready += 1;
    } else if (snapshot.statusVault.status === 'blocked') {
      summary.blocked += 1;
    } else {
      summary.todo += 1;
    }

    if (snapshot.statusVault.proofCounts.missing > 0) {
      summary.missingProofTargets += 1;
    }

    if (snapshot.statusVault.proofCounts.attention > 0) {
      summary.attentionProofTargets += 1;
    }

    if (snapshot.statusVault.executionCounts.inProgress > 0 || snapshot.statusVault.executionCounts.complete > 0 || Boolean(snapshot.statusVault.lastUpdatedAt)) {
      summary.touchedByExecution += 1;
    }

    if (snapshot.statusVault.reminderSummary.openCount > 0 || Boolean(snapshot.statusVault.reminderSummary.latestReminderAt)) {
      summary.touchedByReminder += 1;
    }

    return summary;
  }, {
    todo: 0,
    inProgress: 0,
    complete: 0,
    ready: 0,
    blocked: 0,
    missingProofTargets: 0,
    attentionProofTargets: 0,
    touchedByExecution: 0,
    touchedByReminder: 0,
  });

  return trackedSteps.reduce((summary) => summary, {
    todo: targetStatusCounts.todo,
    inProgress: targetStatusCounts.inProgress,
    complete: targetStatusCounts.complete,
    ready: targetStatusCounts.ready,
    blocked: targetStatusCounts.blocked,
    missingProofTargets: targetStatusCounts.missingProofTargets,
    attentionProofTargets: targetStatusCounts.attentionProofTargets,
    touchedByExecution: targetStatusCounts.touchedByExecution,
    touchedByReminder: targetStatusCounts.touchedByReminder,
    latestUpdatedAt,
    latestMilestoneAt,
    latestReminderAt,
    latestTouchedAt,
    latestTouchedSource,
  });
}

function buildInstitutionCategoryCoverage(
  institutions: NameChangeInstitutionEntry[],
  steps: NameChangePlanStep[],
): NonNullable<NameChangePlan['summary']['institutionCategoryCoverage']> {
  return INSTITUTION_CATEGORY_COVERAGE_CONFIG.map((config) => {
    const categoryInstitutions = institutions.filter((institution) => config.matches(institution));
    const dependsOnStepIds = categoryInstitutions.map((institution) => `institution-${institution.key}`);
    const labels = categoryInstitutions.slice(0, 2).map((institution) => institution.label);
    const trailingCount = Math.max(0, categoryInstitutions.length - labels.length);
    const labelSummary = labels.length === 0
      ? 'No institutions queued yet.'
      : trailingCount > 0
        ? `${labels.join(', ')}, +${trailingCount} more`
        : labels.join(', ');

    return {
      id: config.id,
      label: config.label,
      status: resolvePlanSequenceStatus(dependsOnStepIds, steps),
      summary: `${categoryInstitutions.length} targets queued · ${labelSummary}`,
      targetCount: categoryInstitutions.length,
      dependsOnStepIds,
      institutionKeys: categoryInstitutions.map((institution) => institution.key),
    };
  }).filter((category) => category.targetCount > 0);
}

function buildAccountUpdateTemplates(
  input: NameChangeEngineInput,
  steps: NameChangePlanStep[],
  legalProofReady: boolean,
): NonNullable<NameChangePlan['summary']['accountUpdateTemplates']> {
  const proofChecklistBase = legalProofReady
    ? ['Certified legal name-change proof']
    : ['Certified legal name-change proof still needs review before most downstream updates will stick'];
  const hasPassport = Boolean(input.profile.has_us_passport);
  const needsPassport = Boolean(input.profile.passport_needs_update);
  const normalizedTargetName = [input.profile.target_first_name, input.profile.target_middle_name, input.profile.target_last_name]
    .filter((value) => hasMeaningfulValue(value))
    .join(' ');
  const normalizedCurrentName = [input.profile.current_first_name, input.profile.current_middle_name, input.profile.current_last_name]
    .filter((value) => hasMeaningfulValue(value))
    .join(' ');
  const getReadinessChecklistLine = (
    readiness: AccountUpdateTemplateReadiness,
    lines: {
      ready: string;
      in_progress: string;
      complete?: string;
      upcoming?: string;
      blocked?: string;
    },
  ) => {
    if (readiness === 'ready') return lines.ready;
    if (readiness === 'in_progress') return lines.in_progress;
    if (readiness === 'complete') return lines.complete ?? lines.ready;
    if (readiness === 'upcoming') return lines.upcoming ?? lines.in_progress;
    return lines.blocked ?? lines.upcoming ?? lines.in_progress;
  };
  const normalizeChecklistSnippet = (value: string) => value.trim().replace(/[.\s]+$/u, '');
  const ensureTerminalPeriod = (value: string) => {
    const trimmed = value.trim();
    if (normalizeChecklistSnippet(trimmed) === '') return '';
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  };
  const joinChecklistSnippets = (items: string[]) => {
    const normalized = items
      .map((item) => normalizeChecklistSnippet(item))
      .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);

    return normalized.length > 0 ? `${normalized.join(', ')}.` : '';
  };
  const getReadinessSubject = (
    baseSubject: string,
    readiness: AccountUpdateTemplateReadiness,
    blockingProofHopLabel?: string,
  ) => {
    const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);
    const subjectPrefix = getAccountUpdateTemplateReadinessSubjectPrefix(readiness);

    return `${subjectPrefix}${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}: ${baseSubject}`;
  };
  const getReadinessIntro = (
    readiness: AccountUpdateTemplateReadiness,
    blockingProofHopLabel?: string,
  ) => getAccountUpdateTemplateReadinessIntroLine(readiness, blockingProofHopLabel);
  const getStatusLine = (
    readiness: AccountUpdateTemplateReadiness,
    blockingProofHopLabel?: string,
  ) => getAccountUpdateTemplateStatusLine(readiness, blockingProofHopLabel);
  const getAudienceLine = (audience: string) => getAccountUpdateTemplateAudienceLine(audience);
  const getReadinessRequestLine = (
    templateId: string,
    readiness: AccountUpdateTemplateReadiness,
  ) => templateId === 'template-payroll'
    ? getReadinessChecklistLine(readiness, {
        ready: 'Please confirm the exact upload/form path and whether payroll, health coverage, retirement, and beneficiary records will all update together.',
        in_progress: 'Please confirm the intake path now so I can queue payroll, benefits, and beneficiary follow-through the moment the SSA receipt lands.',
        complete: 'Please confirm payroll, health coverage, retirement, and beneficiary records already show the final legal name everywhere they should.',
        upcoming: 'Please confirm the intake path, hold timing, and whether you can pre-note the request while SSA alignment is still upstream.',
        blocked: 'Please just confirm the intake path and payroll timing for now so I can come back once the legal proof packet is grounded.',
      })
    : templateId === 'template-bank'
      ? getReadinessChecklistLine(readiness, {
          ready: 'Please tell me the fastest secure submission path and confirm whether cards, checks, statements, and my online profile will all update together.',
          in_progress: 'Please confirm the submission path now and whether you can start the rename while the updated ID or DMV proof is still landing.',
          complete: 'Please confirm cards, checks, statements, and my online profile already reflect the final legal name everywhere.',
          upcoming: 'Please confirm whether legal proof alone or an interim DMV receipt is enough to start, and whether cards or checks need a second pass later.',
          blocked: 'Please just send the exact bank/card document rules and intake path for now so I can return once the legal proof packet is grounded.',
        })
      : templateId === 'template-insurance'
        ? getReadinessChecklistLine(readiness, {
            ready: 'Please confirm what proof you require and whether cards, autopay records, claims history, and beneficiary settings should be refreshed at the same time.',
            in_progress: 'Please confirm the carrier intake path now so I can queue cards, billing, and claims follow-through as soon as the updated ID clears.',
            complete: 'Please confirm cards, billing, claims history, and beneficiary settings already reflect the final legal name.',
            upcoming: 'Please confirm whether legal proof alone is enough to start cards, billing, and claims updates before the updated ID lands.',
            blocked: 'Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.',
          })
        : templateId === 'template-tax'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Please confirm whether you need direct document submission from me, whether the SSA sync is enough, and how I should verify tax or government-record updates before the next filing or recording cycle.',
              in_progress: 'Please confirm the verification path now so I can queue the tax, county, or immigration request and attach SSA confirmation as soon as the current step lands.',
              complete: 'Please confirm payroll reporting, withholding records, and government agency files now match the final legal name before the next filing or recording cycle.',
              upcoming: 'Please confirm the verification path and filing-cycle timing while SSA sync is still upstream so I do not miss the next filing, recording, or status window.',
              blocked: 'Please just confirm the tax/government process for now so I can return once the legal proof packet is grounded.',
            })
          : templateId === 'template-travel'
            ? getReadinessChecklistLine(readiness, {
                ready: 'Please confirm what proof you need, whether existing bookings can stay linked, and how to avoid check-in, TSA, title, or auto-policy mismatch issues during the transition.',
                in_progress: 'Please confirm the travel support path now so I can queue traveler-profile, loyalty, vehicle-title, and auto-policy updates while the final passport proof is still landing.',
                complete: 'Please confirm traveler profiles, loyalty records, vehicle title/registration files, auto-policy records, and any live bookings already match the final ID or passport name.',
                upcoming: 'Please confirm your hold/change policy and mismatch handling for bookings, title records, and auto policies before I touch any of them while passport timing is still upstream.',
                blocked: 'Please just share your mismatch policy and acceptable temporary-proof rules for now so I can return once the legal proof packet is grounded.',
              })
            : templateId === 'template-digital-identity'
              ? getReadinessChecklistLine(readiness, {
                  ready: 'Please tell me the secure submission path and whether autopay, lease contacts, caller ID, email aliases, alumni directories, display-name/social sync, or account recovery settings should be refreshed at the same time.',
                  in_progress: 'Please confirm the verification flow now so I can queue utility, phone, housing, social/profile, display-name sync, and recovery updates as soon as final ID evidence posts.',
                  complete: 'Please confirm billing, lease contacts, caller ID, alumni/profile, display-name sync, and recovery records already show the final legal name everywhere they should.',
                  upcoming: 'Please confirm whether legal proof alone can start utilities, phone, housing, social/profile, display-name sync, or recovery updates before the updated ID lands.',
                  blocked: 'Please just share the verification rules for now so I can return once the legal proof packet is grounded.',
                })
              : getReadinessChecklistLine(readiness, {
                  ready: 'Please confirm the board-specific submission path, whether my wallet card or public lookup entry will update automatically, and how long the change usually takes.',
                  in_progress: 'Please confirm the board submission path now so I can queue the record update and attach the updated ID or reissue receipt as soon as it clears.',
                  complete: 'Please confirm the board record, wallet card, renewal file, and public lookup already show the final legal name.',
                  upcoming: 'Please confirm the board-specific document rules now so I know whether the next ID/license hop is enough to start.',
                  blocked: 'Please just share the board submission rules for now so I can return once the legal proof packet is grounded.',
                });
  const getProofReadinessSummary = (
    templateId: string,
    readiness: AccountUpdateTemplateReadiness,
    blockingProofHopLabel?: string,
  ) => {
    const summary = templateId === 'template-payroll'
    ? getReadinessChecklistLine(readiness, {
        ready: 'Send with certified legal proof plus the SSA receipt or confirmation now.',
        in_progress: 'Hold send until the SSA receipt posts, but prep payroll, benefits, and beneficiary routing now.',
        complete: 'Use this as a confirmation pass that payroll, benefits, and beneficiary records already synced.',
        upcoming: 'Do not send yet; legal proof is grounded, but SSA is still the missing proof hop.',
        blocked: 'Do not send yet; the legal proof chain still needs to clear before payroll updates can stick.',
      })
    : templateId === 'template-bank'
      ? getReadinessChecklistLine(readiness, {
          ready: 'Send with legal proof plus the updated photo ID or acceptable DMV receipt now.',
          in_progress: 'Hold send until the updated ID lands, but lock the bank/card submission path now.',
          complete: 'Use this as a confirmation pass that cards, checks, statements, and profile records already synced.',
          upcoming: 'Do not send yet; legal proof is grounded, but the photo-ID hop is still missing.',
          blocked: 'Do not send yet; the legal proof chain still needs to clear before bank/card rename proof will hold.',
        })
      : templateId === 'template-insurance'
        ? getReadinessChecklistLine(readiness, {
            ready: 'Send with legal proof now and include updated ID if the carrier verification team asks for it.',
            in_progress: 'Hold send until the updated ID clears, but lock the carrier intake path now.',
            complete: 'Use this as a confirmation pass that cards, billing, claims, and beneficiary records already synced.',
            upcoming: 'Do not send yet; legal proof is grounded, but updated ID may still be the missing carrier proof.',
            blocked: 'Do not send yet; the legal proof chain still needs to clear before carrier evidence will stick.',
          })
        : templateId === 'template-tax'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Send with the SSA-backed confirmation path now so tax, county, and government records can align.',
              in_progress: 'Hold send until SSA confirmation lands, but lock the tax/government verification path now.',
              complete: 'Use this as a confirmation pass that payroll reporting, withholding, and government records already synced.',
              upcoming: 'Do not send yet; legal proof is grounded, but SSA sync is still the missing proof hop.',
              blocked: 'Do not send yet; the legal proof chain still needs to clear before tax or government updates can stick.',
            })
          : templateId === 'template-travel'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Send with the passport-safe identity packet now so bookings, loyalty profiles, title records, and auto policies stay aligned.',
              in_progress: 'Hold send until final passport proof lands, but lock the mismatch and booking policy now.',
              complete: 'Use this as a confirmation pass that traveler profiles, loyalty records, title files, auto policies, and live bookings already synced.',
              upcoming: 'Do not send yet; legal proof is grounded, but passport timing is still the missing proof hop.',
              blocked: 'Do not send yet; the legal proof chain still needs to clear before travel-profile evidence will stick.',
            })
            : templateId === 'template-digital-identity'
              ? getReadinessChecklistLine(readiness, {
                  ready: 'Send with legal proof now and include updated ID if the utility or phone verification flow asks for it.',
                  in_progress: 'Hold send until final ID evidence posts, but lock the verification path now.',
                  complete: 'Use this as a confirmation pass that billing, housing, recovery, caller-ID, and display-name records already synced.',
                  upcoming: 'Do not send yet; legal proof is grounded, but updated ID is still the missing proof hop.',
                  blocked: 'Do not send yet; the legal proof chain still needs to clear before identity-verification updates can stick.',
                })
              : getReadinessChecklistLine(readiness, {
                  ready: 'Send with legal proof plus the updated ID or license reissue receipt now.',
                  in_progress: 'Hold send until the updated ID or reissue receipt lands, but lock the board submission path now.',
                  complete: 'Use this as a confirmation pass that the board record, wallet card, and lookup entry already synced.',
                  upcoming: 'Do not send yet; legal proof is grounded, but the ID/license hop is still missing.',
                  blocked: 'Do not send yet; the legal proof chain still needs to clear before board-facing proof will hold.',
                });
    const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);
    if (!fallbackBlockingProofHopLabel || readiness === 'ready' || readiness === 'complete') return summary;
    return `${summary} Blocking hop: ${fallbackBlockingProofHopLabel}.`;
  };
  const getProofChecklistStatusNote = (
    templateId: string,
    readiness: AccountUpdateTemplateReadiness,
  ) => templateId === 'template-payroll'
    ? getReadinessChecklistLine(readiness, {
        ready: 'Attach the SSA receipt/confirmation now if payroll needs it.',
        in_progress: 'Queue this now, then attach the SSA receipt/confirmation once it posts.',
        complete: 'Use this to confirm payroll, benefits, and beneficiary records already match.',
        upcoming: 'Wait to send until SSA is the next cleared proof hop.',
          blocked: 'Gather the intake path only until legal proof is fully grounded.',
      })
    : templateId === 'template-bank'
      ? getReadinessChecklistLine(readiness, {
          ready: 'Attach the updated photo ID or DMV receipt now if the bank requires it.',
          in_progress: 'Queue this now, then attach the updated ID or DMV receipt once it lands.',
          complete: 'Use this to confirm cards, checks, statements, and profile records already match.',
          upcoming: 'Wait to send until the photo ID or DMV receipt is the next cleared proof hop.',
          blocked: 'Gather the bank/card document rules only until legal proof is fully grounded.',
        })
      : templateId === 'template-insurance'
        ? getReadinessChecklistLine(readiness, {
            ready: 'Attach updated ID only if the carrier verification team asks for it now.',
            in_progress: 'Queue this now, then attach updated ID once carrier verification proof clears.',
            complete: 'Use this to confirm cards, billing, claims, and beneficiary records already match.',
            upcoming: 'Wait to send until the carrier-safe ID proof hop clears.',
            blocked: 'Gather the carrier evidence rules only until legal proof is fully grounded.',
          })
        : templateId === 'template-tax'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Attach the SSA-backed confirmation path now so withholding and government agency records can align.',
              in_progress: 'Queue this now, then attach SSA-backed confirmation once the current proof step lands.',
              complete: 'Use this to confirm payroll reporting, withholding, and government agency records already match.',
              upcoming: 'Wait to send until SSA is the next cleared proof hop.',
              blocked: 'Gather the tax/government process only until legal proof is fully grounded.',
            })
          : templateId === 'template-travel'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Attach the passport-safe packet now and flag any live booking, title, or auto-policy references.',
              in_progress: 'Queue this now, then attach final passport-safe proof once it lands.',
              complete: 'Use this to confirm traveler profiles, loyalty records, title files, auto policies, and live bookings already match.',
              upcoming: 'Wait to send until passport-safe proof is the next cleared hop.',
              blocked: 'Gather mismatch and booking rules only until legal proof is fully grounded.',
            })
            : templateId === 'template-digital-identity'
              ? getReadinessChecklistLine(readiness, {
                  ready: 'Attach updated ID only if the utility, phone, or housing flow asks for it now.',
                  in_progress: 'Queue this now, then attach final ID evidence once the verification proof lands.',
                  complete: 'Use this to confirm billing, housing, recovery, caller-ID, and display-name records already match.',
                  upcoming: 'Wait to send until updated ID is the next cleared proof hop.',
                  blocked: 'Gather verification rules only until legal proof is fully grounded.',
                })
              : getReadinessChecklistLine(readiness, {
                  ready: 'Attach the updated ID or license reissue receipt now if the board requires it.',
                  in_progress: 'Queue this now, then attach the updated ID or reissue receipt once it lands.',
                  complete: 'Use this to confirm the board record, wallet card, and public lookup already match.',
                  upcoming: 'Wait to send until the ID or license reissue hop clears.',
                  blocked: 'Gather board submission rules only until legal proof is fully grounded.',
                });
  const getBlockingProofHopSentence = (
    readiness: AccountUpdateTemplateReadiness,
    blockingProofHopLabel?: string,
  ) => {
    const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);
    return fallbackBlockingProofHopLabel
      ? `Blocked by: ${fallbackBlockingProofHopLabel}. Current blocker: ${fallbackBlockingProofHopLabel}.`
      : '';
  };
  const templateConfig = [
    {
      id: 'template-payroll',
      audience: 'Employer payroll / HR',
      subject: 'Name change update for payroll and benefits',
      dependsOnStepIds: ['federal-ssa', 'institution-irs-employer', 'institution-retirement-benefits'],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated Social Security record or SSA receipt',
        'Updated photo ID if payroll or benefits asks for one',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hi team — I have legally updated my name from ${normalizedCurrentName} to ${normalizedTargetName} and need payroll, benefits, and internal records aligned. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-bank',
      audience: 'Bank or credit card support',
      subject: 'Request to update account name after legal name change',
      dependsOnStepIds: [
        'state-dmv',
        'institution-banks',
        'institution-investments-loans',
        'institution-student-loans-financial-aid',
        'institution-mortgage-property-records',
        'institution-credit-bureaus',
      ],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated photo ID or DMV receipt',
        'Replacement card / account reissue instructions',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hello — I recently completed a legal name change and need the name on my account updated. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-insurance',
      audience: 'Insurance or subscription support',
      subject: 'Please update my account to my legal name',
      dependsOnStepIds: [
        'state-dmv',
        'institution-insurance',
        'institution-disability-insurance',
        'institution-workers-comp-leave',
        'institution-medical-records',
      ],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated photo ID if coverage verification requires it',
        'Member ID / policy number so cards and claims stay aligned',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hi — I need this account updated to my current legal name so coverage, billing, and member records stay aligned. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-tax',
      audience: 'Tax agency, county recorder, immigration, or government record support',
      subject: 'Align my tax and government records with my legal name change',
      dependsOnStepIds: ['federal-ssa', 'institution-irs-records', 'institution-state-tax-agency', 'institution-county-recorder-property', 'institution-uscis-immigration-records'],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated Social Security record or SSA confirmation',
        'Any employer payroll confirmation or filing reference already on file',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hello — I need my tax and government-facing records updated to match my legal name so payroll reporting, filing records, and county or immigration records do not drift. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-travel',
      audience: 'Airline, hotel, loyalty, DMV title/registration, auto insurance, or travel support',
      subject: 'Please align my travel, loyalty, vehicle title, and auto-policy records with my legal name change',
      dependsOnStepIds: [
        'federal-passport',
        'institution-tsa-precheck',
        'institution-travel-hospitality',
        'institution-dmv-registration-title',
        'institution-frequent-flyer-hotel-rail',
      ],
      proofDocuments: [
        ...proofChecklistBase,
        needsPassport ? 'Updated passport or passport renewal timing confirmation' : 'Current passport details if no passport update is needed',
        'Any existing booking references that need manual relinking',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hello — I am updating my legal name and need my traveler profile, loyalty records, vehicle title/registration files, auto-policy records, and any upcoming reservation notes aligned so they do not conflict with my ID or passport timing. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-digital-identity',
      audience: 'Phone, utilities, housing, alumni, social/profile, or primary digital identity support',
      subject: 'Update my account holder name to match my legal records',
      dependsOnStepIds: [
        'state-dmv',
        'institution-utilities-housing',
        'institution-phone-digital-identity',
        'institution-subscriptions-social',
        'institution-school-alumni-records',
        'institution-courtesy-social-sync',
      ],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated photo ID if identity verification is required',
        'Any lease / utility account numbers or recovery-email checkpoints to refresh',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hi — I recently completed a legal name change and need my account holder name updated so billing, verification checks, alumni/profile records, display-name/social identity sync, and recovery/contact records stay consistent. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
    {
      id: 'template-licenses',
      audience: 'Licensing board or credentialing support',
      subject: 'Update my professional license to my legal name',
      dependsOnStepIds: ['state-dmv', 'institution-professional-licenses'],
      proofDocuments: [
        ...proofChecklistBase,
        'Updated photo ID or license reissue receipt',
        'License number / renewal cycle details',
      ],
      buildBody: (proofLine: string, readinessLine: string, requestLine: string, readinessIntro: string, audienceLine: string, statusLine: string, proofReadinessSummary: string, blockingProofHopSentence: string, checklistGuidanceLine: string, proofChecklistLine: string) => `Hello — I need my professional license and credentialing records updated to my current legal name so renewals, verification, and employer matching stay clean. ${audienceLine} ${readinessIntro} ${statusLine} ${blockingProofHopSentence} ${proofReadinessSummary} ${proofLine} ${proofChecklistLine} ${checklistGuidanceLine} ${readinessLine} ${requestLine}`,
    },
  ] as const;

  return templateConfig.map((template) => {
    const readiness = resolvePlanSequenceStatus(template.dependsOnStepIds, steps);
    const blockingProofHopLabel = getDefaultAccountUpdateBlockingProofHopLabel(template.id, readiness);
    const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);
    const readinessLabel = getAccountUpdateTemplateReadinessLabel(readiness, blockingProofHopLabel);
    const readinessSpecificProof = template.id === 'template-payroll'
      ? getReadinessChecklistLine(readiness, {
          ready: 'SSA is already far enough along that I can attach the receipt/confirmation with my legal proof now.',
          in_progress: 'SSA follow-through is already moving, so I can draft this now and attach the SSA receipt as soon as it posts.',
          complete: 'The payroll-side proof chain should already be synced, so I mainly need confirmation that payroll, benefits, and deductions all show the final legal name.',
          upcoming: 'My legal proof is in hand, but SSA/payroll alignment is still upstream, so I mainly need your intake path and hold timing.',
          blocked: 'My legal proof chain is still being grounded, so I need your intake path first and will send the legal proof packet once it is ready.',
        })
      : template.id === 'template-bank'
        ? getReadinessChecklistLine(readiness, {
            ready: 'My updated ID path is far enough along that I can send legal proof plus the current ID/DMV receipt you require.',
            in_progress: 'My updated ID path is already moving, so I can draft this now and send the DMV/ID proof as soon as it lands.',
            complete: 'The bank rename should already be through the pipeline, so I mainly need confirmation that cards, statements, checks, and online banking all stayed aligned.',
            upcoming: 'My legal proof is ready, but the photo-ID update is still upstream, so I mainly need your exact submission requirements and whether an interim DMV receipt works.',
            blocked: 'I am still waiting on the core legal-proof chain, so I need your exact document rules first and will send the legal proof packet once it is ready.',
          })
        : template.id === 'template-insurance'
          ? getReadinessChecklistLine(readiness, {
              ready: 'I can send the legal proof packet now and include updated ID if your verification team needs it.',
              in_progress: 'The ID/coverage proof chain is already moving, so I can queue this now and attach the updated ID as soon as it clears.',
              complete: 'Coverage records should already be in sync, so I mainly need confirmation that cards, billing, claims, and beneficiaries all reflect the final legal name.',
              upcoming: 'My legal proof is ready, but updated ID may still be pending, so I need to know whether legal proof alone is enough to start.',
              blocked: 'The legal-proof chain is still upstream, so I need your exact evidence rules first and will send the legal proof packet once it is ready.',
            })
          : template.id === 'template-tax'
            ? getReadinessChecklistLine(readiness, {
                ready: 'SSA alignment is already ready enough that I can send the confirmation path you need now.',
                in_progress: 'SSA and payroll tax alignment are already moving, so I can draft this now and send the confirmation once the current step lands.',
                complete: 'The tax-side name sync should already be in place, so I mainly need confirmation that payroll reporting and agency records now match the final legal name.',
                upcoming: 'My legal proof is ready, but SSA/tax sync is still upstream, so I mostly need the exact verification path and timing guardrails.',
                blocked: 'The core proof chain is still upstream, so I need your process first and will send the legal proof packet once it is ready.',
              })
            : template.id === 'template-travel'
              ? getReadinessChecklistLine(readiness, {
                  ready: 'My passport/identity proof chain is ready enough that I can send the travel-safe version of the packet now.',
                  in_progress: 'Passport or travel identity updates are already moving, so I can draft this now and send final proof once the current document lands.',
                  complete: 'The travel-side rename should already be in place, so I mainly need confirmation that traveler profiles, loyalty records, and live bookings all match the final ID.',
                  upcoming: 'My legal proof is ready, but passport/travel identity timing is still upstream, so I need your hold/change policy before I touch bookings.',
                  blocked: 'The legal-proof chain is still upstream, so I need your mismatch policy first and will send the legal proof packet once it is ready.',
                })
              : template.id === 'template-digital-identity'
                ? getReadinessChecklistLine(readiness, {
                    ready: 'I can send the legal proof packet now and include updated ID if your verification flow asks for it.',
                    in_progress: 'The ID and account-proof chain is already moving, so I can prep this now and send final ID evidence as soon as it posts.',
                    complete: 'These identity records should already be synced, so I mainly need confirmation that billing, recovery, caller ID, and contact records all show the final legal name.',
                    upcoming: 'My legal proof is ready, but photo-ID follow-through is still upstream, so I need to know whether legal proof alone can start the update.',
                    blocked: 'The proof chain is still upstream, so I need your verification rules first and will send the legal proof packet once it is ready.',
                  })
                : template.id === 'template-licenses'
                  ? getReadinessChecklistLine(readiness, {
                      ready: 'My legal proof and ID chain are ready enough that I can send the board packet now.',
                      in_progress: 'The ID/license proof chain is already moving, so I can draft this now and attach the updated ID or receipt as soon as it clears.',
                      complete: 'The board-side rename should already be processing, so I mainly need confirmation that the license record, wallet card, and public lookup all show the final legal name.',
                      upcoming: 'My legal proof is ready, but the updated ID/license reissue path is still upstream, so I need the board-specific document rules first.',
                      blocked: 'The proof chain is still upstream, so I need the board submission rules first and will send the legal proof packet once it is ready.',
                    })
                  : getReadinessChecklistLine(readiness, {
                      ready: 'I can send the current legal-proof packet now.',
                      in_progress: 'The supporting proof chain is already moving, so I can draft this now and send the final packet as soon as it lands.',
                      complete: 'The account-update proof chain should already be synced, so I mainly need confirmation that the final legal name is showing everywhere it should.',
                    });
    const readinessSpecificChecklistItem = template.id === 'template-payroll'
      ? getReadinessChecklistLine(readiness, {
          ready: 'Attach the SSA receipt or confirmation with the payroll packet now',
          in_progress: 'Queue the payroll ask now, then attach the SSA receipt as soon as it posts',
          complete: 'Confirm payroll, benefits, timekeeping, and deductions all already show the final legal name',
          upcoming: 'Use this to learn the payroll intake path while SSA alignment is still upstream',
          blocked: 'Hold documents for now and only confirm payroll timing + intake rules',
        })
      : template.id === 'template-bank'
        ? getReadinessChecklistLine(readiness, {
            ready: 'Include the updated photo ID or DMV receipt the bank/card team requires',
            in_progress: 'Draft now and plan to attach the DMV or ID proof as soon as it lands',
            complete: 'Confirm cards, statements, checks, and online banking all reflect the final legal name',
            upcoming: 'Confirm whether legal proof alone or an interim DMV receipt is enough to start',
            blocked: 'Ask for the exact bank/card document rules before starting the account rename',
          })
        : template.id === 'template-insurance'
          ? getReadinessChecklistLine(readiness, {
              ready: 'Send the legal proof packet now and include updated ID if verification asks for it',
              in_progress: 'Queue the carrier update now and attach the updated ID once it clears',
              complete: 'Confirm cards, billing, claims, dependents, and beneficiaries all reflect the final legal name',
              upcoming: 'Confirm whether legal proof alone can start cards, claims, and billing updates',
              blocked: 'Hold policy changes for now and just gather the carrier evidence rules',
            })
          : template.id === 'template-tax'
            ? getReadinessChecklistLine(readiness, {
                ready: 'Send the SSA-backed confirmation path the tax team needs now',
                in_progress: 'Draft the tax/state request now and attach SSA confirmation once it lands',
                complete: 'Confirm payroll reporting, withholding records, and agency files now match the final legal name',
                upcoming: 'Ask for the verification path and filing-cycle timing while SSA sync is still upstream',
                blocked: 'Do not send documents yet; only confirm the tax/state process first',
              })
            : template.id === 'template-travel'
              ? getReadinessChecklistLine(readiness, {
                  ready: 'Send the travel-safe packet now with the passport or identity proof now in hand',
                  in_progress: 'Draft the travel request now and attach final passport proof once it lands',
                  complete: 'Confirm traveler profiles, loyalty accounts, title files, auto policies, and live bookings all match the final ID name',
                  upcoming: 'Confirm hold/change policy before touching bookings, title records, or auto policies while passport timing is still upstream',
                  blocked: 'Ask for mismatch policy and booking rules before the legal proof packet is ready',
                })
              : template.id === 'template-digital-identity'
                ? getReadinessChecklistLine(readiness, {
                    ready: 'Send legal proof now and include updated ID if the verification flow asks for it',
                    in_progress: 'Queue the utility/phone update now and attach final ID evidence once it posts',
                    complete: 'Confirm billing, housing, recovery, caller-ID, and display-name records all show the final legal name',
                    upcoming: 'Confirm whether legal proof alone can start utilities, phone, housing, social/profile, display-name sync, or recovery updates',
                    blocked: 'Hold identity changes for now and only gather verification rules',
                  })
                : template.id === 'template-licenses'
                  ? getReadinessChecklistLine(readiness, {
                      ready: 'Send the board packet now with the updated ID or reissue receipt',
                      in_progress: 'Draft now and attach the updated ID or license receipt as soon as it clears',
                      complete: 'Confirm the board record, wallet card, renewal file, and public lookup all show the final legal name',
                      upcoming: 'Ask for the board-specific document rules before the ID/license path lands',
                      blocked: 'Do not trigger public-record or renewal updates until the proof chain is real',
                    })
                  : getReadinessChecklistLine(readiness, {
                      ready: 'Send the current legal-proof packet now',
                      in_progress: 'Draft now and attach the final proof packet as soon as it lands',
                      complete: 'Confirm the final legal name is already showing across the account records you changed',
                    });
    const proofDocuments = normalizeAccountUpdateProofItems([...template.proofDocuments]);
    const checklistHighlight = ensureTerminalPeriod(readinessSpecificChecklistItem);
    const requestLine = getReadinessRequestLine(template.id, readiness);
    const proofReadinessSummary = getProofReadinessSummary(template.id, readiness, blockingProofHopLabel);
    const proofChecklistStatusNote = ensureTerminalPeriod(getProofChecklistStatusNote(template.id, readiness));
    const readinessIntro = getReadinessIntro(readiness, blockingProofHopLabel);
    const blockingProofHopSentence = getBlockingProofHopSentence(readiness, blockingProofHopLabel);
    const proofChecklist = normalizeAccountUpdateChecklistItems([...proofDocuments, checklistHighlight]);
    const proofChecklistWithStatus = normalizeAccountUpdateChecklistItems([...proofChecklist, proofChecklistStatusNote]);
    const proofLine = formatAccountUpdateProofLine(proofDocuments, readinessSpecificProof);
    const proofChecklistLine = proofChecklistWithStatus.length > 0
      ? `Proof checklist I am tracking: ${joinChecklistSnippets(proofChecklistWithStatus)}`
      : '';
    const checklistGuidanceLine = formatAccountUpdateChecklistGuidanceLine(checklistHighlight, proofChecklistStatusNote);

    return {
      id: template.id,
      audience: template.audience,
      subject: getReadinessSubject(template.subject, readiness, blockingProofHopLabel),
      body: compactTemplateBody(template.buildBody(proofLine, readinessLabel, requestLine, readinessIntro, getAudienceLine(template.audience), getStatusLine(readiness, blockingProofHopLabel), proofReadinessSummary, blockingProofHopSentence, checklistGuidanceLine, proofChecklistLine)),
      readiness,
      readinessLabel,
      proofReadinessSummary,
      blockingProofHopLabel,
      checklistHighlight,
      checklistStatusNote: proofChecklistStatusNote,
      requestSummary: requestLine,
      dependsOnStepIds: [...template.dependsOnStepIds],
      proofDocuments,
      proofChecklist: proofChecklistWithStatus,
    };
  }).filter((template) => (hasPassport ? true : template.id !== 'template-travel' || needsPassport || template.readiness !== 'blocked'));
}

export function buildNameChangePlan(input: NameChangeEngineInput): NameChangePlan {
  const eligibility = evaluateCaliforniaNameChangeEligibility(input);
  const requirementResults = evaluateNameChangeRequirements(input.profile, input.documents, input.extractedFields).results;
  const legalBasis = eligibility.decision === 'court_order_required' ? 'court_order' : eligibility.legalBasis;
  const hasMarriageCertificate = hasDocument(input, 'marriage_certificate');
  const hasReviewedMarriageCertificate = hasReviewedDocument(input, 'marriage_certificate');
  const hasCourtOrder = hasDocument(input, 'court_order');
  const hasReviewedCourtOrder = hasReviewedDocument(input, 'court_order');
  const outOfStateMarriageCertificateGrounding = requirementResults.find((result) => result.key === 'out-of-state-marriage-certificate-grounding');
  const canonicalExtractionAlignment = requirementResults.find((result) => result.key === 'canonical-extraction-alignment');
  const outOfStateMarriageCertificateGroundingMissing = legalBasis === 'marriage'
    && outOfStateMarriageCertificateGrounding?.status !== 'satisfied';
  const hasLegalProofInIntake = legalBasis === 'marriage' ? hasMarriageCertificate : hasCourtOrder;
  const legalProofReady = legalBasis === 'marriage'
    ? hasReviewedMarriageCertificate && !outOfStateMarriageCertificateGroundingMissing
    : hasReviewedCourtOrder;
  const institutionalTargets = institutionsFor(input);
  const travelBookedSoon = Boolean(input.profile.structured_intake.travelBookedSoon);
  const wantsDocumentIntakeHelp = input.profile.structured_intake.wantsDocumentIntakeHelp !== false;
  const normalizedCurrentLastName = normalize(input.profile.current_last_name);
  const normalizedTargetLastName = normalize(input.profile.target_last_name);
  const normalizedSpouseLastName = normalize(String(input.profile.structured_intake.spouseLastName ?? ''));
  const hasMarriageNameMismatch = input.profile.legal_basis === 'marriage' && legalBasis === 'court_order';
  const hasBothPartnersChanging = input.profile.structured_intake.bothPartnersChangeName === true
    || hasChangeReason(input.profile, /(both|dual).*(partner|spouse)/)
    || hasChangeReason(input.profile, /(partner|spouse).*(both|dual)/);
  const isOutOfStateMarriage = normalize(input.profile.marriage_state) !== '' && normalize(input.profile.marriage_state) !== 'california';
  const countyOfficeDetail = legalBasis === 'marriage'
    ? isOutOfStateMarriage
      ? 'The issuing office may be a county clerk, recorder, or vital-records office depending on where the marriage was filed, so ground the exact county and certificate trail before treating the certificate as execution-ready.'
      : 'California county proof can come back through either the county clerk or recorder path, so capture the exact issuing office and certificate reference before pushing SSA or DMV.'
    : 'Court-order cases should still keep county and filing authority details straight so the signed order and future certified copies stay traceable.';
  const passportBranchDetail = !input.profile.passport_needs_update
    ? null
    : !input.profile.is_us_citizen
      ? 'This passport lane needs country-specific follow-through and should not be treated like the standard U.S. Department of State path.'
      : input.profile.has_us_passport
        ? travelBookedSoon
          ? 'Renew or amend the existing U.S. passport carefully so upcoming travel, TSA, and reservation names do not split during the transition.'
          : 'Refresh the existing U.S. passport after SSA and DMV so federal travel identity stays aligned with the new legal name.'
        : 'This is a first-passport branch, so build the new-name application packet instead of assuming a simple renewal.';
  const targetLastTokens = normalizedTargetLastName.split(/[-\s]+/).filter(Boolean);
  const hasHyphenatedTargetLastName = normalizedTargetLastName.includes('-');
  const hasCombinationSurnamePath = Boolean(
    normalizedCurrentLastName
    && normalizedSpouseLastName
    && normalizedTargetLastName.includes(' ')
    && !hasHyphenatedTargetLastName
    && targetLastTokens.includes(normalizedCurrentLastName)
    && targetLastTokens.includes(normalizedSpouseLastName),
  );
  const hasDualLastNamePath = Boolean(
    normalizedCurrentLastName
    && normalizedSpouseLastName
    && normalizedTargetLastName !== normalizedCurrentLastName
    && normalizedTargetLastName !== normalizedSpouseLastName
    && targetLastTokens.includes(normalizedCurrentLastName)
    && targetLastTokens.includes(normalizedSpouseLastName),
  );

  const blockers = [
    ...(legalProofReady
      ? []
      : [legalBasis === 'marriage'
        ? hasLegalProofInIntake
          ? outOfStateMarriageCertificateGroundingMissing && outOfStateMarriageCertificateGrounding?.reason
            ? outOfStateMarriageCertificateGrounding.reason
            : 'Certified marriage certificate is in intake but still needs review.'
          : 'Certified marriage certificate still missing from intake.'
        : hasLegalProofInIntake
          ? 'Court order packet or signed order is in intake but still needs review.'
          : 'Court order packet or signed order still missing from intake.']),
    ...eligibility.reasons.filter((reason) => eligibility.decision === 'court_order_required' && !reason.includes('selected')),
  ];
  const missingInputs = collectMissingInputs(
    input,
    legalBasis,
    legalProofReady,
    hasLegalProofInIntake,
    outOfStateMarriageCertificateGroundingMissing,
  );

  const steps: NameChangePlanStep[] = [];

  steps.push(buildStep({
    id: 'eligibility-proof',
    phase: 'eligibility',
    title: legalBasis === 'marriage' ? 'Confirm certified marriage proof' : 'Complete California court-order packet',
    description: legalBasis === 'marriage'
      ? `Before anything else, make sure the marriage certificate has been filed by the county and that you have certified copies ready for record updates. ${countyOfficeDetail}`
      : 'Because this requested name looks outside the standard California marriage shortcut, start with the California court petition path.',
    timing: 'Start now',
    status: legalProofReady ? 'ready' : 'blocked',
    blockers: legalProofReady ? [] : blockers,
    forms: legalBasis === 'marriage' ? [] : formsFor('court_order', 'california_resident'),
    institutions: [],
    evidenceNeeded: legalBasis === 'marriage'
      ? ['Filed marriage certificate record', 'Certified marriage certificate copies', 'County clerk / recorder or vital-records issuing authority']
      : ['Filed California name change petition packet', 'Signed court order'],
  }));

  steps.push(buildStep({
    id: 'federal-ssa',
    phase: 'federal',
    title: 'Update Social Security first',
    description: 'Federal-first order keeps payroll, taxes, and later DMV updates cleaner. The engine treats SSA as the first official record to change.',
    timing: 'As soon as legal proof is in hand',
    status: legalProofReady ? 'ready' : 'blocked',
    blockers: legalProofReady ? [] : ['Legal proof needs to be ready before SSA.'],
    forms: legalBasis === 'marriage' ? formsFor('marriage') : formsFor('court_order'),
    institutions: ['Social Security Administration'],
    evidenceNeeded: legalBasis === 'marriage'
      ? ['Certified marriage certificate', 'Current photo ID', 'Proof of identity/citizenship if requested']
      : ['Signed court order', 'Current photo ID', 'Proof of identity/citizenship if requested'],
  }));

  steps.push(buildStep({
    id: 'state-dmv',
    phase: 'state',
    title: 'Update your California DMV record',
    description: 'Once SSA is updated, move to your California license or state ID so the rest of the stack can anchor to current photo ID.',
    timing: 'After SSA confirmation',
    status: legalProofReady ? 'ready' : 'blocked',
    blockers: legalProofReady ? [] : ['SSA should be first, and legal proof still needs to be ready.'],
    forms: formsFor('california_resident'),
    institutions: ['California DMV'],
    evidenceNeeded: ['SSA-updated record', 'Current California ID or license', 'Legal name-change proof', 'Proof of California residency if requested'],
  }));

  if (input.profile.passport_needs_update) {
    const passportForms = formsFor('passport', 'citizen');
    steps.push(buildStep({
      id: 'federal-passport',
      phase: 'identity',
      title: input.profile.has_us_passport ? 'Refresh your passport to the new name' : 'Apply for a passport in the new name',
      description: `Keep travel records aligned with the new legal name after the main SSA and DMV changes are underway. ${passportBranchDetail}`,
      timing: input.profile.urgency_level === 'expedited' ? 'Book this early if upcoming travel matters' : 'After SSA and DMV are underway',
      status: legalProofReady ? 'ready' as const : 'blocked' as const,
      blockers: legalProofReady ? [] : ['Passport update waits on the same legal proof and supporting ID chain.'],
      forms: passportForms,
      institutions: ['U.S. Department of State'],
      evidenceNeeded: ['Current passport or new passport evidence package', 'Passport photo', 'Legal name-change proof', 'Updated photo ID when available'],
    }));
  }

  const institutionRolloutSteps = buildInstitutionRolloutSteps(institutionalTargets, legalProofReady);
  const dualPartnerProofSteps = hasBothPartnersChanging ? buildDualPartnerProofSteps(legalProofReady) : [];

  steps.push(buildStep({
    id: 'institutions-rollout',
    phase: 'institutional',
    title: 'Roll the new name through the rest of your accounts',
    description: 'This is where the guidance engine shifts from government records to the institutions that rely on those records, in priority order.',
    timing: 'After at least one primary government ID reflects the new name',
    status: legalProofReady ? 'later' : 'blocked',
    blockers: legalProofReady ? [] : ['Primary identity records should move first.'],
    forms: [],
    institutions: institutionalTargets.map((institution) => institution.label),
    evidenceNeeded: ['Updated photo ID', 'Legal proof document', 'Account-specific supporting info'],
  }));

  steps.push(...dualPartnerProofSteps);
  steps.push(...institutionRolloutSteps);

  const recommendedOrder = steps.map((step) => step.title);
  const cautionNotes = [
    'This planner generates guidance and sequencing. It is not filing paperwork on your behalf.',
    'Use structured extracted fields as your source of truth; raw uploads are only an intake accelerator.',
    ...(wantsDocumentIntakeHelp ? ['Document intake help is turned on, so capturing certificate / ID details early will make the rest of the workflow less manual.'] : []),
    ...(travelBookedSoon ? ['Upcoming travel means passport, TSA, and booking-name consistency should be watched closely once SSA is moving.'] : []),
    ...(input.profile.urgency_level === 'expedited' ? ['Expedited travel or hiring timelines may justify moving passport and employer updates higher once SSA is in motion.'] : []),
  ];
  const readinessDenominator = Math.max(1, steps.length + missingInputs.length);
  const readinessNumerator = steps.filter((step) => step.status !== 'blocked').length + (missingInputs.length === 0 ? 1 : 0);
  const readinessPercent = Math.max(0, Math.min(100, Math.round((readinessNumerator / readinessDenominator) * 100)));
  const accountRolloutTrackStepIds = ['state-dmv', ...institutionRolloutSteps.map((step) => step.id)];
  const executionTracks: NonNullable<NameChangePlan['summary']['executionTracks']> = [
    {
      id: 'track-legal-proof',
      title: legalBasis === 'marriage' ? 'County / legal proof grounding' : 'Court-order grounding',
      sequenceLabel: '1 · proof first',
      status: legalProofReady ? 'ready' : 'blocked',
      summary: legalBasis === 'marriage'
        ? 'Ground the certified marriage certificate before anything federal or state can safely move.'
        : 'Ground the signed court order before SSA or DMV can use the new legal name.',
      dependsOnStepIds: ['eligibility-proof'],
      featureTag: 'core' as const,
    },
    {
      id: 'track-ssa',
      title: 'SSA anchor update',
      sequenceLabel: '2 · federal anchor',
      status: legalProofReady ? 'ready' as const : 'blocked' as const,
      summary: 'Move Social Security first so tax, payroll, and federal identity stop fighting the new name.',
      dependsOnStepIds: ['eligibility-proof', 'federal-ssa'],
      featureTag: 'core' as const,
    },
    {
      id: 'track-photo-id',
      title: 'Driver license / state ID follow-through',
      sequenceLabel: '3 · photo ID chain',
      status: legalProofReady ? 'upcoming' as const : 'blocked' as const,
      summary: 'Use the SSA-updated record to refresh California ID so downstream accounts can verify against current photo ID.',
      dependsOnStepIds: ['federal-ssa', 'state-dmv'],
      featureTag: 'core' as const,
    },
    ...(input.profile.passport_needs_update
      ? [{
        id: 'track-passport',
        title: input.profile.has_us_passport ? 'Passport refresh lane' : 'Passport application lane',
        sequenceLabel: '4 · travel identity',
        status: legalProofReady ? 'upcoming' as const : 'blocked' as const,
        summary: travelBookedSoon
          ? 'Travel is on the board, so passport timing needs active watching as soon as SSA is moving and DMV is queued.'
          : input.profile.has_us_passport
            ? 'Passport should trail the SSA + photo-ID chain so travel identity stays aligned.'
            : 'First-passport work should start only after the SSA + photo-ID chain is grounded in the new name.',
        dependsOnStepIds: ['federal-ssa', 'state-dmv', 'federal-passport'],
        featureTag: 'travel' as const,
      }]
      : []),
    {
      id: 'track-rollout',
      title: 'Everything-else rollout packet',
      sequenceLabel: input.profile.passport_needs_update ? '5 · account rollout' : '4 · account rollout',
      status: legalProofReady ? resolvePlanSequenceStatus(accountRolloutTrackStepIds, steps) : 'blocked' as const,
      summary: 'Once the identity chain is grounded, fan out across payroll, banking, insurance, licenses, travel, and personal accounts from one packet.',
      dependsOnStepIds: accountRolloutTrackStepIds,
      featureTag: 'rollout' as const,
    },
  ];
  const hasStep = (stepId: string) => steps.some((step) => step.id === stepId);
  const milestoneChecklist = [
    {
      id: 'milestone-legal-proof',
      label: 'Certified legal proof is grounded and ready to reuse',
      status: resolvePlanSequenceStatus(['eligibility-proof'], steps),
      dependsOnStepIds: ['eligibility-proof'],
    },
    {
      id: 'milestone-ssa',
      label: 'Social Security update is submitted and ready to verify',
      status: resolvePlanSequenceStatus(['federal-ssa'], steps),
      dependsOnStepIds: ['eligibility-proof', 'federal-ssa'],
    },
    {
      id: 'milestone-photo-id',
      label: 'Primary photo ID is ready to move after SSA',
      status: resolvePlanSequenceStatus(['federal-ssa', 'state-dmv'], steps),
      dependsOnStepIds: ['federal-ssa', 'state-dmv'],
    },
    hasStep('federal-passport')
      ? {
        id: 'milestone-passport',
        label: 'Passport update is lined up from the live ID chain',
        status: resolvePlanSequenceStatus(['federal-ssa', 'state-dmv', 'federal-passport'], steps),
        dependsOnStepIds: ['federal-ssa', 'state-dmv', 'federal-passport'],
      }
      : null,
    hasStep('institution-irs-employer')
      ? {
        id: 'milestone-payroll',
        label: 'Payroll and HR can use the verified SSA identity',
        status: resolvePlanSequenceStatus(
          ['federal-ssa', 'institution-irs-employer', 'institution-retirement-benefits'].filter((stepId) => hasStep(stepId)),
          steps,
        ),
        dependsOnStepIds: ['federal-ssa', 'institution-irs-employer', 'institution-retirement-benefits'].filter((stepId) => hasStep(stepId)),
      }
      : null,
    (hasStep('institution-irs-records') || hasStep('institution-state-tax-agency') || hasStep('institution-county-recorder-property') || hasStep('institution-uscis-immigration-records'))
      ? {
        id: 'milestone-tax',
        label: 'Tax and government records are ready to align with SSA and legal proof',
        status: resolvePlanSequenceStatus(
          ['federal-ssa', 'institution-irs-records', 'institution-state-tax-agency', 'institution-county-recorder-property', 'institution-uscis-immigration-records'].filter((stepId) => hasStep(stepId)),
          steps,
        ),
        dependsOnStepIds: ['federal-ssa', 'institution-irs-records', 'institution-state-tax-agency', 'institution-county-recorder-property', 'institution-uscis-immigration-records'].filter((stepId) => hasStep(stepId)),
      }
      : null,
    {
      id: 'milestone-account-rollout',
      label: 'Banks, insurance, and core accounts can move from one packet',
      status: resolvePlanSequenceStatus(
        CORE_ACCOUNT_ROLLOUT_MILESTONE_STEP_IDS.filter((stepId) => hasStep(stepId)),
        steps,
      ),
      dependsOnStepIds: CORE_ACCOUNT_ROLLOUT_MILESTONE_STEP_IDS.filter((stepId) => hasStep(stepId)),
    },
    hasStep('institution-professional-licenses')
      ? {
        id: 'milestone-professional-licenses',
        label: 'Professional license records can be reissued cleanly',
        status: resolvePlanSequenceStatus(['state-dmv', 'institution-professional-licenses'], steps),
        dependsOnStepIds: ['state-dmv', 'institution-professional-licenses'],
      }
      : null,
    hasStep('institutions-rollout')
      ? {
        id: 'milestone-downstream-rollout',
        label: 'Downstream rollout is ready for the long-tail accounts',
        status: resolvePlanSequenceStatus(
          DOWNSTREAM_ROLLOUT_MILESTONE_STEP_IDS.filter((stepId) => hasStep(stepId)),
          steps,
        ),
        dependsOnStepIds: DOWNSTREAM_ROLLOUT_MILESTONE_STEP_IDS.filter((stepId) => hasStep(stepId)),
      }
      : null,
  ].filter((milestone): milestone is NonNullable<typeof milestone> => Boolean(milestone));
  const milestoneChecklistWithTiming = milestoneChecklist.map((milestone) => ({
    ...milestone,
    lastUpdatedAt: milestone.dependsOnStepIds
      .flatMap((stepId) => steps.find((step) => step.id === stepId))
      .flatMap((step) => step ? [step.executionUpdatedAt, step.completedAt] : [])
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => getNameChangeEngineTimestamp(right) - getNameChangeEngineTimestamp(left))[0] ?? null,
  }));
  const dualPartnerProofTracks = hasBothPartnersChanging
    ? [
      {
        id: 'dual-partner-ssa-proof',
        label: 'SSA proof for both partners',
        status: resolvePlanSequenceStatus(['dual-partner-ssa-partner-a-proof', 'dual-partner-ssa-partner-b-proof'], steps),
        dependsOnStepIds: ['dual-partner-ssa-partner-a-proof', 'dual-partner-ssa-partner-b-proof'],
        requiredProof: ['Partner A SSA confirmation', 'Partner B SSA confirmation'],
      },
      {
        id: 'dual-partner-dmv-proof',
        label: 'Photo ID proof for both partners',
        status: resolvePlanSequenceStatus(['dual-partner-ssa-partner-a-proof', 'dual-partner-ssa-partner-b-proof', 'dual-partner-dmv-partner-a-proof', 'dual-partner-dmv-partner-b-proof'], steps),
        dependsOnStepIds: ['dual-partner-dmv-partner-a-proof', 'dual-partner-dmv-partner-b-proof'],
        requiredProof: ['Partner A updated photo ID', 'Partner B updated photo ID'],
      },
      {
        id: 'dual-partner-rollout-proof',
        label: 'Downstream account proof for both partners',
        status: resolvePlanSequenceStatus([
          'dual-partner-dmv-partner-a-proof',
          'dual-partner-dmv-partner-b-proof',
          'dual-partner-rollout-partner-a-proof',
          'dual-partner-rollout-partner-b-proof',
        ], steps),
        dependsOnStepIds: ['dual-partner-rollout-partner-a-proof', 'dual-partner-rollout-partner-b-proof'],
        requiredProof: ['Partner A account confirmations', 'Partner B account confirmations', 'mailed-notice or portal proof where available'],
      },
    ]
    : [];
  const accountUpdateTemplates = buildAccountUpdateTemplates(input, steps, legalProofReady);
  const executionCounts = steps.reduce((counts, step) => {
    const key = step.executionStatus ?? 'todo';
    counts[key] += 1;
    return counts;
  }, { todo: 0, in_progress: 0, complete: 0 });
  const institutionCategoryCoverage = buildInstitutionCategoryCoverage(institutionalTargets, steps);
  const nextBestAction = missingInputs[0]
    ? `Fill: ${missingInputs[0]}`
    : travelBookedSoon && input.profile.passport_needs_update
      ? 'Line up your passport update timing'
      : steps.find((step) => step.status === 'ready')?.title ?? steps[0]?.title ?? 'Complete intake';
  const edgeCaseGuidance = [
    ...(travelBookedSoon && input.profile.passport_needs_update
      ? [{
        id: 'edge-travel-timing',
        label: 'Upcoming travel timing conflict',
        detail: 'Keep booking names, TSA profiles, and passport timing aligned while the SSA → DMV chain is in motion. Do not strand travel records between old and new identity documents.',
        severity: 'warning' as const,
      }, {
        id: 'edge-global-entry-followthrough',
        label: 'Known-traveler and Global Entry follow-through',
        detail: 'Treat TSA PreCheck, Global Entry, airline profiles, hotel loyalty, title or registration, and auto-policy updates as one travel-safe packet so upcoming bookings and identity checks do not drift apart.',
        severity: 'info' as const,
      }]
      : []),
    ...(!input.profile.is_us_citizen && input.profile.passport_needs_update
      ? [{
        id: 'edge-non-us-passport',
        label: 'Non-U.S. passport handling',
        detail: 'Passport guidance needs country-specific follow-through because the free assistant cannot assume a U.S. passport update path here.',
        severity: 'warning' as const,
      }]
      : []),
    ...(legalBasis === 'court_order'
      ? [{
        id: 'edge-court-order-path',
        label: 'Court-order path in effect',
        detail: 'This case does not fit the simple marriage shortcut, so the assistant keeps the court-order packet as the hard gate before SSA, DMV, or passport execution.',
        severity: 'info' as const,
      }, {
        id: 'edge-court-order-certified-copy',
        label: 'Court-order certified-copy readiness',
        detail: 'Downstream teams often want the signed order plus one or more certified copies, so do not treat the court-order lane as ready until you can actually reuse that packet across SSA, DMV, passport, and institutional updates.',
        severity: hasReviewedCourtOrder ? 'info' as const : 'warning' as const,
      }]
      : []),
    ...(legalBasis === 'marriage'
      ? [{
        id: 'edge-county-office-variation',
        label: isOutOfStateMarriage ? 'Out-of-state county record variation' : 'County clerk / recorder variation',
        detail: countyOfficeDetail,
        severity: outOfStateMarriageCertificateGroundingMissing ? 'warning' as const : 'info' as const,
      }, {
        id: 'edge-resident-id-jurisdiction-handoff',
        label: isOutOfStateMarriage ? 'Resident-ID jurisdiction handoff' : 'Resident-ID county handoff',
        detail: isOutOfStateMarriage
          ? 'The marriage proof comes from outside California, but the resident-ID lane still needs a clean California handoff. Keep the issuing-county trail, certificate number, and California DMV proof packet tied together so downstream accounts do not question the jurisdiction jump.'
          : 'Keep the county proof trail and the California DMV handoff tied together so the same certificate story survives into payroll, banking, insurance, and travel updates.',
        severity: isOutOfStateMarriage && outOfStateMarriageCertificateGroundingMissing ? 'warning' as const : 'info' as const,
      }]
      : []),
    ...(outOfStateMarriageCertificateGroundingMissing
      ? [{
        id: 'edge-out-of-state-proof',
        label: 'Out-of-state certificate grounding gap',
        detail: 'County, certificate-number, and issuing-authority proof still need to be grounded before the free assistant can safely treat the marriage certificate as execution-ready proof.',
        severity: 'warning' as const,
      }]
      : []),
    ...(hasMarriageNameMismatch
      ? [{
        id: 'edge-marriage-name-mismatch',
        label: 'Marriage shortcut target-name mismatch',
        detail: 'The requested target legal name does not fit the straight California marriage shortcut, so treat this as a court-order workflow unless the target name is corrected.',
        severity: 'warning' as const,
      }, {
        id: 'edge-mismatch-recovery',
        label: 'Mismatch recovery needs court-order proof',
        detail: 'Do not keep pushing marriage-certificate-only updates if the target name and legal path disagree. Ground the court-order packet, then re-run SSA, DMV, and passport sequencing from that proof set.',
        severity: 'warning' as const,
      }]
      : []),
    ...(canonicalExtractionAlignment?.status === 'attention'
      ? [{
        id: 'edge-document-name-mismatch',
        label: 'Document name mismatch across proof set',
        detail: canonicalExtractionAlignment.reason,
        severity: 'warning' as const,
      }]
      : []),
    ...(hasBothPartnersChanging
      ? [{
        id: 'edge-both-partners-changing',
        label: 'Both partners are changing names',
        detail: 'Treat this as two separate execution chains. Do not reuse reminder timing, SSA assumptions, or account confirmations from one partner as proof the other partner is done.',
        severity: 'info' as const,
      }]
      : []),
    ...(passportBranchDetail
      ? [{
        id: 'edge-passport-branch',
        label: input.profile.is_us_citizen
          ? input.profile.has_us_passport
            ? 'Passport renewal branch'
            : 'First-passport branch'
          : 'Non-U.S. passport branch',
        detail: passportBranchDetail,
        severity: input.profile.is_us_citizen ? 'info' as const : 'warning' as const,
      }]
      : []),
    ...(!input.profile.has_real_id_license
      ? [{
        id: 'edge-real-id-followthrough',
        label: 'Current photo-ID proof is still weaker than REAL ID',
        detail: 'Keep the DMV or resident-ID lane especially explicit if your current ID is not already Real ID-aligned, because banking, travel, payroll, and insurance teams may ask for a clearer government-photo-ID handoff before they trust the new name.',
        severity: 'warning' as const,
      }]
      : []),
    ...(hasHyphenatedTargetLastName
      ? [{
        id: 'edge-hyphenated-name',
        label: 'Hyphenated surname consistency',
        detail: 'Use the exact same hyphenated surname format on SSA, DMV, passport, payroll, and travel profiles so punctuation drift does not create identity mismatches downstream.',
        severity: 'info' as const,
      }]
      : []),
    ...(hasCombinationSurnamePath
      ? [{
        id: 'edge-combination-name-format',
        label: 'Space-separated combination surname format',
        detail: 'This looks like a combination surname without a hyphen, so keep the exact surname order and spacing identical on legal proof, SSA, DMV, passport, payroll, banking, insurance, and travel records.',
        severity: 'info' as const,
      }]
      : []),
    ...(hasDualLastNamePath
      ? [{
        id: 'edge-dual-name-path',
        label: 'Dual surname rollout',
        detail: 'This looks like a keep-one-plus-add-one surname path, so keep the same surname order across legal proof, SSA, DMV, passport, and institution updates.',
        severity: 'info' as const,
      }]
      : []),
  ];

  const plan: NameChangePlan = {
    engineVersion: NAME_CHANGE_ENGINE_VERSION,
    jurisdiction: {
      country: 'US',
      launchState: input.profile.launch_state,
      countyResidence: input.profile.county_residence ?? null,
    },
    profile: {
      legalBasis,
      isUsCitizen: input.profile.is_us_citizen,
      hasPassport: input.profile.has_us_passport,
      passportNeedsUpdate: input.profile.passport_needs_update,
      hasRealIdLicense: input.profile.has_real_id_license,
      employmentStatus: input.profile.employment_status,
      urgencyLevel: input.profile.urgency_level,
    },
    summary: {
      legalPathLabel: legalBasis === 'marriage' ? 'California marriage-based name change path' : 'California court-order-backed name change path',
      recommendedOrder,
      executionTracks: executionTracks.map((track) => ({ ...track, dependsOnStepIds: [...track.dependsOnStepIds] })),
      edgeCaseGuidance: edgeCaseGuidance.map((item) => ({ ...item })),
      blockers,
      cautionNotes,
      missingInputs,
      readinessPercent,
      targetStatusOverview: undefined,
      milestoneChecklist: milestoneChecklistWithTiming.map((milestone) => ({
        ...milestone,
        dependsOnStepIds: [...milestone.dependsOnStepIds],
      })),
      dualPartnerProofTracks: dualPartnerProofTracks.map((track) => ({
        ...track,
        dependsOnStepIds: [...track.dependsOnStepIds],
        requiredProof: [...track.requiredProof],
      })),
      institutionCategoryCoverage: institutionCategoryCoverage.map((category) => ({
        ...category,
        dependsOnStepIds: [...category.dependsOnStepIds],
        institutionKeys: [...category.institutionKeys],
      })),
      accountUpdateTemplates: accountUpdateTemplates.map((template) => ({ ...template })),
      executionCounts,
      nextBestAction,
    },
    steps,
  };

  plan.summary.targetStatusOverview = buildTargetStatusOverview(input, plan, steps, input.reminders ?? []);

  return plan;
}
