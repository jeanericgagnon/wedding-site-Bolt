import { matchesNameChangeDocumentKind } from './documentKinds';
import { NAME_CHANGE_ENGINE_VERSION, NAME_CHANGE_FORM_REGISTRY, NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type {
  NameChangeEligibilityDecision,
  NameChangeEngineInput,
  NameChangeFormRegistryEntry,
  NameChangeInstitutionEntry,
  NameChangePlan,
  NameChangePlanFormRef,
  NameChangePlanStep,
} from './types';

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

function collectMissingInputs(
  input: NameChangeEngineInput,
  legalBasis: 'marriage' | 'court_order',
  legalProofReady: boolean,
  hasLegalProofInIntake: boolean,
) {
  const missing: string[] = [];
  const profile = input.profile;

  if (!hasMeaningfulValue(profile.current_first_name)) missing.push('Current first name');
  if (!hasMeaningfulValue(profile.current_last_name)) missing.push('Current last name');
  if (!hasMeaningfulValue(profile.target_first_name)) missing.push('Target first name');
  if (!hasMeaningfulValue(profile.target_last_name)) missing.push('Target last name');
  if (!hasMeaningfulValue(profile.county_residence)) missing.push('California county');

  if (legalBasis === 'marriage') {
    if (!hasMeaningfulValue(profile.marriage_date)) missing.push('Marriage date');
    if (!hasMeaningfulValue(String(profile.structured_intake.spouseLastName ?? ''))) missing.push('Spouse last name');
    if (!legalProofReady) missing.push(hasLegalProofInIntake ? 'Certified marriage certificate review' : 'Certified marriage certificate metadata');
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

export function buildNameChangePlan(input: NameChangeEngineInput): NameChangePlan {
  const eligibility = evaluateCaliforniaNameChangeEligibility(input);
  const legalBasis = eligibility.decision === 'court_order_required' ? 'court_order' : eligibility.legalBasis;
  const hasMarriageCertificate = hasDocument(input, 'marriage_certificate');
  const hasReviewedMarriageCertificate = hasReviewedDocument(input, 'marriage_certificate');
  const hasCourtOrder = hasDocument(input, 'court_order');
  const hasReviewedCourtOrder = hasReviewedDocument(input, 'court_order');
  const hasLegalProofInIntake = legalBasis === 'marriage' ? hasMarriageCertificate : hasCourtOrder;
  const legalProofReady = legalBasis === 'marriage' ? hasReviewedMarriageCertificate : hasReviewedCourtOrder;
  const institutionalTargets = institutionsFor(input);
  const travelBookedSoon = Boolean(input.profile.structured_intake.travelBookedSoon);
  const wantsDocumentIntakeHelp = input.profile.structured_intake.wantsDocumentIntakeHelp !== false;

  const blockers = [
    ...(legalProofReady
      ? []
      : [legalBasis === 'marriage'
        ? hasLegalProofInIntake
          ? 'Certified marriage certificate is in intake but still needs review.'
          : 'Certified marriage certificate still missing from intake.'
        : hasLegalProofInIntake
          ? 'Court order packet or signed order is in intake but still needs review.'
          : 'Court order packet or signed order still missing from intake.']),
    ...eligibility.reasons.filter((reason) => eligibility.decision === 'court_order_required' && !reason.includes('selected')),
  ];
  const missingInputs = collectMissingInputs(input, legalBasis, legalProofReady, hasLegalProofInIntake);

  const steps: NameChangePlanStep[] = [];

  steps.push(buildStep({
    id: 'eligibility-proof',
    phase: 'eligibility',
    title: legalBasis === 'marriage' ? 'Confirm certified marriage proof' : 'Complete California court-order packet',
    description: legalBasis === 'marriage'
      ? 'Before anything else, make sure you have the certified marriage certificate that will support the record updates.'
      : 'Because this requested name looks outside the standard California marriage shortcut, start with the California court petition path.',
    timing: 'Start now',
    status: legalProofReady ? 'ready' : 'blocked',
    blockers: legalProofReady ? [] : blockers,
    forms: legalBasis === 'marriage' ? [] : formsFor('court_order', 'california_resident'),
    institutions: [],
    evidenceNeeded: legalBasis === 'marriage' ? ['Certified marriage certificate'] : ['Filed California name change petition packet', 'Signed court order'],
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
      description: 'Keep travel records aligned with the new legal name after the main SSA and DMV changes are underway.',
      timing: input.profile.urgency_level === 'expedited' ? 'Book this early if upcoming travel matters' : 'After SSA and DMV are underway',
      status: legalProofReady ? 'ready' : 'blocked',
      blockers: legalProofReady ? [] : ['Passport update waits on the same legal proof and supporting ID chain.'],
      forms: passportForms,
      institutions: ['U.S. Department of State'],
      evidenceNeeded: ['Current passport or new passport evidence package', 'Passport photo', 'Legal name-change proof', 'Updated photo ID when available'],
    }));
  }

  const institutionRolloutSteps = buildInstitutionRolloutSteps(institutionalTargets, legalProofReady);

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
  const executionCounts = steps.reduce((counts, step) => {
    const key = step.executionStatus ?? 'todo';
    counts[key] += 1;
    return counts;
  }, { todo: 0, in_progress: 0, complete: 0 });
  const nextBestAction = missingInputs[0]
    ? `Fill: ${missingInputs[0]}`
    : travelBookedSoon && input.profile.passport_needs_update
      ? 'Line up your passport update timing'
      : steps.find((step) => step.status === 'ready')?.title ?? steps[0]?.title ?? 'Complete intake';

  return {
    engineVersion: NAME_CHANGE_ENGINE_VERSION,
    jurisdiction: {
      country: 'US',
      launchState: input.profile.launch_state,
      countyResidence: input.profile.county_residence ?? null,
    },
    profile: {
      legalBasis,
      hasPassport: input.profile.has_us_passport,
      passportNeedsUpdate: input.profile.passport_needs_update,
      hasRealIdLicense: input.profile.has_real_id_license,
      employmentStatus: input.profile.employment_status,
      urgencyLevel: input.profile.urgency_level,
    },
    summary: {
      legalPathLabel: legalBasis === 'marriage' ? 'California marriage-based name change path' : 'California court-order-backed name change path',
      recommendedOrder,
      blockers,
      cautionNotes,
      missingInputs,
      readinessPercent,
      executionCounts,
      nextBestAction,
    },
    steps,
  };
}
