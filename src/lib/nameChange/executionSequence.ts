import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeExecutionPrerequisites } from './executionPrerequisites';
import { evaluateNameChangeRequirements } from './requirements';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionDependency,
  NameChangeExecutionSequenceSnapshot,
  NameChangeExecutionTargetKey,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeRequirementResult,
} from './types';

function requirementStatusToDependencyStatus(status: 'satisfied' | 'missing' | 'attention'): NameChangeExecutionDependency['status'] {
  return status;
}

function buildRequirementDependency(
  result: NameChangeRequirementResult | undefined,
  key: string,
  label: string,
  required = true,
  fallbackReason: string,
): NameChangeExecutionDependency {
  return {
    key,
    label,
    required,
    status: requirementStatusToDependencyStatus(result?.status ?? 'missing'),
    reason: result?.reason ?? fallbackReason,
  };
}

function buildDocumentSupportDependency(
  intake: ReturnType<typeof buildNameChangeDocumentIntakeSnapshot>,
  config: {
    key: string;
    label: string;
    required?: boolean;
    documentKinds: NameChangeDocumentInput['document_kind'][];
    satisfiedReason: string;
    missingReason: string;
  },
): NameChangeExecutionDependency {
  const matched = intake.documents.some((document) => config.documentKinds.includes(document.kind) && document.intakeStatus !== 'not_started');
  return {
    key: config.key,
    label: config.label,
    required: config.required ?? false,
    status: matched ? 'satisfied' : 'attention',
    reason: matched ? config.satisfiedReason : config.missingReason,
  };
}

function buildEmploymentContextDependency(profile: NameChangeCaseInput, label: string, satisfiedReason: string, missingReason: string): NameChangeExecutionDependency {
  const activeEmployment = profile.employment_status === 'employed' || profile.employment_status === 'self_employed';
  return {
    key: 'employment-context',
    label,
    required: true,
    status: activeEmployment ? 'satisfied' : 'missing',
    reason: activeEmployment ? satisfiedReason : missingReason,
  };
}

type RequirementBag = {
  legalProof: NameChangeRequirementResult | undefined;
  identityCoverage: NameChangeRequirementResult | undefined;
  countyContext: NameChangeRequirementResult | undefined;
  passportTimingRisk: NameChangeRequirementResult | undefined;
};

type SequenceContext = {
  profile: NameChangeCaseInput;
  intake: ReturnType<typeof buildNameChangeDocumentIntakeSnapshot>;
  requirements: RequirementBag;
  prerequisiteDependencies: NameChangeExecutionDependency[];
};

type DependencyRecipe = (context: SequenceContext) => NameChangeExecutionDependency[];

const buildLegalAndIdentityDependencies: DependencyRecipe = ({ requirements }) => [
  buildRequirementDependency(requirements.legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
];

const buildDmvDependencies: DependencyRecipe = ({ intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
  buildRequirementDependency(requirements.countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.'),
  buildDocumentSupportDependency(intake, {
    key: 'identity-document-coverage',
    label: 'California-facing identity/address support',
    documentKinds: ['current_drivers_license', 'proof_of_address'],
    satisfiedReason: 'California-facing identity or address support exists in intake.',
    missingReason: 'No California-facing identity or address support exists in intake yet.',
  }),
  ...prerequisiteDependencies,
];

const buildPassportDependencies: DependencyRecipe = ({ profile, requirements, prerequisiteDependencies }) => [
  ...buildLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
  {
    key: 'citizenship-eligibility',
    label: 'Citizenship eligible for passport path',
    required: true,
    status: profile.is_us_citizen ? 'satisfied' : 'missing',
    reason: profile.is_us_citizen
      ? 'Citizenship context supports the modeled U.S. passport path.'
      : 'Current modeled passport flow assumes U.S. citizenship eligibility.',
  },
  buildRequirementDependency(requirements.passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.'),
  ...prerequisiteDependencies,
];

function buildEmploymentTargetDependencies(config: {
  label: string;
  satisfiedReason: string;
  missingReason: string;
  supportKey: string;
  supportLabel: string;
  supportDocumentKinds: NameChangeDocumentInput['document_kind'][];
  supportSatisfiedReason: string;
  supportMissingReason: string;
}): DependencyRecipe {
  return ({ profile, intake, requirements, prerequisiteDependencies }) => [
    buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
    buildEmploymentContextDependency(profile, config.label, config.satisfiedReason, config.missingReason),
    buildDocumentSupportDependency(intake, {
      key: config.supportKey,
      label: config.supportLabel,
      documentKinds: config.supportDocumentKinds,
      satisfiedReason: config.supportSatisfiedReason,
      missingReason: config.supportMissingReason,
    }),
    ...prerequisiteDependencies,
  ];
}

function buildPhotoIdPacketDependencies(config: {
  supportKey: string;
  supportLabel: string;
  supportDocumentKinds: NameChangeDocumentInput['document_kind'][];
  supportSatisfiedReason: string;
  supportMissingReason: string;
}): DependencyRecipe {
  return ({ intake, requirements, prerequisiteDependencies }) => [
    ...buildLegalAndIdentityDependencies({ profile: null as never, intake, requirements, prerequisiteDependencies }),
    buildDocumentSupportDependency(intake, {
      key: config.supportKey,
      label: config.supportLabel,
      documentKinds: config.supportDocumentKinds,
      satisfiedReason: config.supportSatisfiedReason,
      missingReason: config.supportMissingReason,
    }),
    ...prerequisiteDependencies,
  ];
}

const buildVoterDependencies: DependencyRecipe = ({ intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.'),
  buildDocumentSupportDependency(intake, {
    key: 'california-voter-support',
    label: 'California voter-supporting identity/address support',
    documentKinds: ['current_drivers_license', 'proof_of_address'],
    satisfiedReason: 'California voter-supporting identity/address support exists in intake.',
    missingReason: 'No California voter-supporting identity/address support exists in intake yet.',
  }),
  ...prerequisiteDependencies,
];

const buildTsaDependencies: DependencyRecipe = ({ intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
  buildRequirementDependency(requirements.passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.'),
  buildDocumentSupportDependency(intake, {
    key: 'travel-profile-support',
    label: 'Travel-profile support exists',
    documentKinds: ['current_passport', 'current_drivers_license'],
    satisfiedReason: 'Passport or Real ID support exists in intake for travel-profile updates.',
    missingReason: 'No passport or Real ID support exists in intake yet for travel-profile updates.',
  }),
  ...prerequisiteDependencies,
];

const TARGET_DEPENDENCY_RECIPES: Record<NameChangeExecutionTargetKey, DependencyRecipe> = {
  ssa: buildLegalAndIdentityDependencies,
  dmv: buildDmvDependencies,
  passport: buildPassportDependencies,
  employer: ({ profile, requirements, prerequisiteDependencies }) => [
    ...buildLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
    buildEmploymentContextDependency(
      profile,
      'Employment context eligible for employer packet',
      'Employment context is active enough to justify employer / payroll packet prep.',
      'Employer / payroll packet only matters when employment context is active.',
    ),
    ...prerequisiteDependencies,
  ],
  banks: buildPhotoIdPacketDependencies({
    supportKey: 'financial-identity-support',
    supportLabel: 'Financial identity / address support exists',
    supportDocumentKinds: ['current_drivers_license', 'current_passport', 'proof_of_address'],
    supportSatisfiedReason: 'Financial identity/address support exists in intake.',
    supportMissingReason: 'No financial identity/address support exists in intake yet.',
  }),
  insurance: buildPhotoIdPacketDependencies({
    supportKey: 'insurance-identity-support',
    supportLabel: 'Insurance identity / address support exists',
    supportDocumentKinds: ['current_drivers_license', 'current_passport', 'proof_of_address'],
    supportSatisfiedReason: 'Insurance identity/address support exists in intake.',
    supportMissingReason: 'No insurance identity/address support exists in intake yet.',
  }),
  voter: buildVoterDependencies,
  tsa: buildTsaDependencies,
  licenses: buildEmploymentTargetDependencies({
    label: 'Employment context eligible for license updates',
    satisfiedReason: 'Employment context is active enough to justify professional license / certification updates.',
    missingReason: 'Professional license updates only matter when employment context is active.',
    supportKey: 'license-identity-support',
    supportLabel: 'Professional-license identity support exists',
    supportDocumentKinds: ['current_drivers_license', 'current_passport'],
    supportSatisfiedReason: 'Current ID support exists in intake for professional license updates.',
    supportMissingReason: 'No current ID support exists in intake yet for professional license updates.',
  }),
};

export function buildNameChangeExecutionSequenceSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeExecutionSequenceSnapshot {
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const results = evaluateNameChangeRequirements(profile, documents, extractedFields).results;
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const requirements: RequirementBag = {
    legalProof: results.find((result) => result.key === 'legal-proof-document'),
    identityCoverage: results.find((result) => result.key === 'identity-document-coverage'),
    countyContext: results.find((result) => result.key === 'county-context'),
    passportTimingRisk: results.find((result) => result.key === 'passport-timing-risk'),
  };
  const prerequisiteDependencies = evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan);

  const dependencies = TARGET_DEPENDENCY_RECIPES[targetKey]({
    profile,
    intake,
    requirements,
    prerequisiteDependencies,
  });

  const blockers = dependencies.filter((dependency) => dependency.required && dependency.status === 'missing').map((dependency) => dependency.reason);

  return {
    target: targetKey,
    lane: target.lane,
    ready: blockers.length === 0,
    blockers,
    dependencies,
  };
}
