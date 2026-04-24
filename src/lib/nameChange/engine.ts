import { matchesNameChangeDocumentKind } from './documentKinds';
import { evaluateNameChangeRequirements } from './requirements';
import { NAME_CHANGE_ENGINE_VERSION, NAME_CHANGE_FORM_REGISTRY, NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
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
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'employment' || institution.category === 'insurance',
  },
  {
    id: 'personal_lifestyle',
    label: 'Personal + lifestyle',
    matches: (institution: NameChangeInstitutionEntry) => institution.category === 'personal' && !['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail'].includes(institution.key),
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
      reasons: ['Launch scope only supports California workflows right now.'],
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
    if (!legalProofReady) missing.push(hasLegalProofInIntake ? 'Certified marriage certificate review' : 'Certified marriage certificate metadata');
    if (outOfStateMarriageCertificateGroundingMissing) missing.push('Out-of-state marriage certificate reference fields');
  }

  if (legalBasis === 'court_order' && !legalProofReady) {
    missing.push(hasLegalProofInIntake ? 'Court order packet or signed order review' : 'Court order packet or signed order metadata');
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
      institutions: ['Banks', 'Payroll / HR', 'Insurance providers', 'Travel and loyalty accounts'],
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
      institutions: ['Banks', 'Payroll / HR', 'Insurance providers', 'Travel and loyalty accounts'],
      evidenceNeeded: ['Partner B account confirmations', 'Partner B updated photo ID', 'Partner B legal proof'],
    }),
  ];
}

function resolveInstitutionCoverageStatus(stepIds: string[], steps: NameChangePlanStep[]): 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete' {
  const matchingSteps = stepIds
    .map((stepId) => steps.find((step) => step.id === stepId))
    .filter((step): step is NameChangePlanStep => Boolean(step));

  if (matchingSteps.length === 0) return 'upcoming';
  if (matchingSteps.every((step) => step.executionStatus === 'complete')) return 'complete';
  if (matchingSteps.some((step) => step.executionStatus === 'in_progress' || step.executionStatus === 'complete')) return 'in_progress';
  if (matchingSteps.some((step) => step.status === 'ready')) return 'ready';
  if (matchingSteps.every((step) => step.status === 'blocked')) return 'blocked';
  return 'upcoming';
}

function buildTargetStatusOverview(
  steps: NameChangePlanStep[],
  reminders: NameChangeReminderInput[] = [],
): NonNullable<NameChangePlan['summary']['targetStatusOverview']> {
  const trackedSteps = steps.filter((step) => step.phase !== 'eligibility');
  const reminderStepIds = new Set(
    reminders
      .filter((reminder) => reminder.status !== 'dismissed')
      .map((reminder) => reminder.depends_on_step_id ?? null)
      .filter((stepId): stepId is string => Boolean(stepId)),
  );
  const latestUpdatedAt = trackedSteps
    .flatMap((step) => [step.executionUpdatedAt, step.completedAt])
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const latestReminderAt = reminders
    .filter((reminder) => reminder.status !== 'dismissed')
    .map((reminder) => reminder.updated_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const latestTouchedAt = [latestUpdatedAt, latestReminderAt]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const latestTouchedSource = latestTouchedAt === latestReminderAt && latestReminderAt
    ? 'reminder' as const
    : latestTouchedAt === latestUpdatedAt && latestUpdatedAt
      ? 'execution' as const
      : null;

  return trackedSteps.reduce((summary, step) => {
    const executionStatus = step.executionStatus ?? 'todo';
    if (executionStatus === 'complete') {
      summary.complete += 1;
    } else if (executionStatus === 'in_progress') {
      summary.inProgress += 1;
    } else {
      summary.todo += 1;
    }

    if (step.executionUpdatedAt || step.completedAt || executionStatus === 'in_progress' || executionStatus === 'complete') {
      summary.touchedByExecution += 1;
    }

    if (reminderStepIds.has(step.id)) {
      summary.touchedByReminder += 1;
    }

    if (step.status === 'ready') {
      summary.ready += 1;
    } else if (step.status === 'blocked') {
      summary.blocked += 1;
    }

    return summary;
  }, {
    todo: 0,
    inProgress: 0,
    complete: 0,
    ready: 0,
    blocked: 0,
    touchedByExecution: 0,
    touchedByReminder: 0,
    latestUpdatedAt,
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
      status: resolveInstitutionCoverageStatus(dependsOnStepIds, steps),
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
  const templateConfig = [
    {
      id: 'template-payroll',
      audience: 'Employer payroll / HR',
      subject: 'Name change update for payroll and benefits',
      dependsOnStepIds: ['federal-ssa', 'institution-irs-employer', 'institution-retirement-benefits'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated Social Security record or SSA receipt',
        'Updated photo ID if payroll or benefits asks for one',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hi team — I have legally updated my name from ${normalizedCurrentName} to ${normalizedTargetName} and need payroll, benefits, and internal records aligned. ${proofLine} ${readinessLine} Please confirm the exact upload/form path, whether payroll, health coverage, retirement, and beneficiary records will all update together, and when the change will hit payroll.`,
    },
    {
      id: 'template-bank',
      audience: 'Bank or credit card support',
      subject: 'Request to update account name after legal name change',
      dependsOnStepIds: ['state-photo-id', 'institution-banks', 'institution-credit-bureaus'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated photo ID or DMV receipt',
        'Replacement card / account reissue instructions',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hello — I recently completed a legal name change and need the name on my account updated. ${proofLine} ${readinessLine} Please tell me the fastest secure submission path and confirm whether cards, checks, statements, and my online profile will all update together.`,
    },
    {
      id: 'template-insurance',
      audience: 'Insurance or subscription support',
      subject: 'Please update my account to my legal name',
      dependsOnStepIds: ['state-photo-id', 'institution-insurance', 'institution-medical-records'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated photo ID if coverage verification requires it',
        'Member ID / policy number so cards and claims stay aligned',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hi — I need this account updated to my current legal name so coverage, billing, and member records stay aligned. ${proofLine} ${readinessLine} Please confirm what proof you require and whether cards, autopay records, claims history, and beneficiary settings should be refreshed at the same time.`,
    },
    {
      id: 'template-tax',
      audience: 'Tax agency or payroll tax support',
      subject: 'Align my tax records with my legal name change',
      dependsOnStepIds: ['federal-ssa', 'institution-irs-records', 'institution-state-tax-agency'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated Social Security record or SSA confirmation',
        'Any employer payroll confirmation already on file',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hello — I need my tax records updated to match my legal name so payroll reporting and year-end forms do not drift. ${proofLine} ${readinessLine} Please confirm whether you need direct document submission from me, whether the SSA sync is enough, and how I should verify the update before the next filing cycle.`,
    },
    {
      id: 'template-travel',
      audience: 'Airline, hotel, loyalty, or travel support',
      subject: 'Please align my travel profile with my legal name change',
      dependsOnStepIds: ['federal-passport', 'institution-tsa-precheck', 'institution-travel-hospitality', 'institution-frequent-flyer-hotel-rail'],
      proofChecklist: [
        ...proofChecklistBase,
        needsPassport ? 'Updated passport or passport renewal timing confirmation' : 'Current passport details if no passport update is needed',
        'Any existing booking references that need manual relinking',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hello — I am updating my legal name and need my traveler profile, loyalty records, and any upcoming reservation notes aligned so they do not conflict with my ID or passport timing. ${proofLine} ${readinessLine} Please confirm what proof you need, whether existing bookings can stay linked, and how to avoid check-in or TSA mismatch issues during the transition.`,
    },
    {
      id: 'template-digital-identity',
      audience: 'Phone, utilities, housing, or primary digital identity support',
      subject: 'Update my account holder name to match my legal records',
      dependsOnStepIds: ['state-photo-id', 'institution-utilities-housing', 'institution-phone-digital-identity'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated photo ID if identity verification is required',
        'Any lease / utility account numbers or recovery-email checkpoints to refresh',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hi — I recently completed a legal name change and need my account holder name updated so billing, verification checks, and recovery/contact records stay consistent. ${proofLine} ${readinessLine} Please tell me the secure submission path and whether autopay, lease contacts, caller ID, email aliases, or account recovery settings should be refreshed at the same time.`,
    },
    {
      id: 'template-licenses',
      audience: 'Licensing board or credentialing support',
      subject: 'Update my professional license to my legal name',
      dependsOnStepIds: ['state-photo-id', 'institution-professional-licenses'],
      proofChecklist: [
        ...proofChecklistBase,
        'Updated photo ID or license reissue receipt',
        'License number / renewal cycle details',
      ],
      buildBody: (proofLine: string, readinessLine: string) => `Hello — I need my professional license and credentialing records updated to my current legal name so renewals, verification, and employer matching stay clean. ${proofLine} ${readinessLine} Please confirm the board-specific submission path, whether my wallet card or public lookup entry will update automatically, and how long the change usually takes.`,
    },
  ] as const;

  return templateConfig.map((template) => {
    const readiness = resolveInstitutionCoverageStatus(template.dependsOnStepIds, steps);
    const readinessLabel = readiness === 'ready'
      ? 'You have enough upstream proof to send this now.'
      : readiness === 'in_progress'
        ? 'The upstream identity work is already moving, so this outreach can be drafted now and sent as soon as the current step lands.'
        : readiness === 'complete'
          ? 'The core proof chain is already complete, so this should be a clean confirmation/update pass.'
          : 'Hold this until the upstream proof chain is further along.';
    const proofLine = `I can provide ${template.proofChecklist.join(', ')}.`;

    return {
      id: template.id,
      audience: template.audience,
      subject: template.subject,
      body: template.buildBody(proofLine, readinessLabel),
      readiness,
      readinessLabel,
      dependsOnStepIds: [...template.dependsOnStepIds],
      proofChecklist: [...template.proofChecklist],
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
    ...(wantsDocumentIntakeHelp ? ['Document intake help is turned on, so capturing certificate / ID metadata early will make the rest of the workflow less manual.'] : []),
    ...(travelBookedSoon ? ['Upcoming travel means passport, TSA, and booking-name consistency should be watched closely once SSA is moving.'] : []),
    ...(input.profile.urgency_level === 'expedited' ? ['Expedited travel or hiring timelines may justify moving passport and employer updates higher once SSA is in motion.'] : []),
  ];
  const readinessDenominator = Math.max(1, steps.length + missingInputs.length);
  const readinessNumerator = steps.filter((step) => step.status !== 'blocked').length + (missingInputs.length === 0 ? 1 : 0);
  const readinessPercent = Math.max(0, Math.min(100, Math.round((readinessNumerator / readinessDenominator) * 100)));
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
      status: legalProofReady ? 'upcoming' as const : 'blocked' as const,
      summary: 'Once the identity chain is grounded, fan out across payroll, banking, insurance, licenses, travel, and personal accounts from one packet.',
      dependsOnStepIds: ['state-dmv', 'institutions-rollout'],
      featureTag: 'rollout' as const,
    },
  ];
  const milestoneChecklist = [
    {
      id: 'milestone-legal-proof',
      label: 'Certified legal proof is grounded and reviewed',
      status: legalProofReady ? 'ready' : 'blocked',
      dependsOnStepIds: ['eligibility-proof'],
    },
    {
      id: 'milestone-ssa',
      label: 'Social Security update is ready to file',
      status: legalProofReady ? 'ready' : 'blocked',
      dependsOnStepIds: ['eligibility-proof', 'federal-ssa'],
    },
    {
      id: 'milestone-photo-id',
      label: 'Primary photo ID can move right after SSA',
      status: legalProofReady ? 'upcoming' : 'blocked',
      dependsOnStepIds: ['federal-ssa', 'state-dmv'],
    },
    {
      id: 'milestone-account-rollout',
      label: 'Banks, payroll, insurance, and subscriptions can be updated from one packet',
      status: legalProofReady ? 'upcoming' : 'blocked',
      dependsOnStepIds: ['state-dmv', 'institutions-rollout'],
    },
  ] as const;
  const dualPartnerProofTracks = hasBothPartnersChanging
    ? [
      {
        id: 'dual-partner-ssa-proof',
        label: 'SSA proof for both partners',
        status: legalProofReady ? 'ready' as const : 'blocked' as const,
        dependsOnStepIds: ['dual-partner-ssa-partner-a-proof', 'dual-partner-ssa-partner-b-proof'],
        requiredProof: ['Partner A SSA confirmation', 'Partner B SSA confirmation'],
      },
      {
        id: 'dual-partner-dmv-proof',
        label: 'Photo ID proof for both partners',
        status: legalProofReady ? 'upcoming' as const : 'blocked' as const,
        dependsOnStepIds: ['dual-partner-dmv-partner-a-proof', 'dual-partner-dmv-partner-b-proof'],
        requiredProof: ['Partner A updated photo ID', 'Partner B updated photo ID'],
      },
      {
        id: 'dual-partner-rollout-proof',
        label: 'Downstream account proof for both partners',
        status: legalProofReady ? 'upcoming' as const : 'blocked' as const,
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
      }]
      : []),
    ...(legalBasis === 'marriage'
      ? [{
        id: 'edge-county-office-variation',
        label: isOutOfStateMarriage ? 'Out-of-state county record variation' : 'County clerk / recorder variation',
        detail: countyOfficeDetail,
        severity: outOfStateMarriageCertificateGroundingMissing ? 'warning' as const : 'info' as const,
      }]
      : []),
    ...(outOfStateMarriageCertificateGroundingMissing
      ? [{
        id: 'edge-out-of-state-proof',
        label: 'Out-of-state certificate grounding gap',
        detail: 'County / certificate reference fields still need to be grounded before the free assistant can safely treat the marriage certificate as execution-ready proof.',
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
    ...(hasHyphenatedTargetLastName
      ? [{
        id: 'edge-hyphenated-name',
        label: 'Hyphenated surname consistency',
        detail: 'Use the exact same hyphenated surname format on SSA, DMV, passport, payroll, and travel profiles so punctuation drift does not create identity mismatches downstream.',
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

  return {
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
      targetStatusOverview: buildTargetStatusOverview(steps, input.reminders),
      milestoneChecklist: milestoneChecklist.map((milestone) => ({
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
}
