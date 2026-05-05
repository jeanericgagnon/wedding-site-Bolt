import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionDependency,
  NameChangeExecutionSequenceProfileKey,
  NameChangeRequirementResult,
} from './types';

type RequirementBag = {
  caseLegalNameCompleteness: NameChangeRequirementResult | undefined;
  legalProof: NameChangeRequirementResult | undefined;
  identityCoverage: NameChangeRequirementResult | undefined;
  courtOrderPathReadiness: NameChangeRequirementResult | undefined;
  courtOrderReferenceExtraction: NameChangeRequirementResult | undefined;
  courtOrderJurisdictionContext: NameChangeRequirementResult | undefined;
  marriageJurisdictionAlignment: NameChangeRequirementResult | undefined;
  outOfStateMarriageCertificateGrounding: NameChangeRequirementResult | undefined;
  countyContext: NameChangeRequirementResult | undefined;
  launchStateAlignment: NameChangeRequirementResult | undefined;
  passportTimingRisk: NameChangeRequirementResult | undefined;
  passportExpirationGrounding: NameChangeRequirementResult | undefined;
  expeditedTravelSequencing: NameChangeRequirementResult | undefined;
  citizenshipProofIntake: NameChangeRequirementResult | undefined;
  passportEligibilityPath: NameChangeRequirementResult | undefined;
};

export type NameChangeSequenceContext = {
  profile: NameChangeCaseInput;
  intake: ReturnType<typeof buildNameChangeDocumentIntakeSnapshot>;
  requirements: RequirementBag;
  prerequisiteDependencies: NameChangeExecutionDependency[];
};

export type NameChangeDependencyRecipe = (context: NameChangeSequenceContext) => NameChangeExecutionDependency[];

function buildRequirementDependency(
  result: NameChangeRequirementResult | undefined,
  key: string,
  label: string,
  required = true,
  fallbackReason: string,
  blockOnAttention = false,
  nextActionCategory: NameChangeExecutionDependency['nextActionCategory'] = 'dependency',
): NameChangeExecutionDependency {
  const status = result?.status ?? 'missing';
  return {
    key,
    label,
    required,
    status,
    reason: result?.reason ?? fallbackReason,
    nextActionCategory,
    blocksReady: required && (status === 'missing' || (status === 'attention' && blockOnAttention)),
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
  const required = config.required ?? false;
  const status: NameChangeExecutionDependency['status'] = matched ? 'satisfied' : 'attention';

  return {
    key: config.key,
    label: config.label,
    required,
    status,
    reason: matched ? config.satisfiedReason : config.missingReason,
    nextActionCategory: 'document',
    blocksReady: required && status !== 'satisfied',
  };
}

function buildEmploymentContextDependency(profile: NameChangeCaseInput, label: string, satisfiedReason: string, missingReason: string): NameChangeExecutionDependency {
  const activeEmployment = profile.employment_status === 'employed' || profile.employment_status === 'self_employed';
  const status: NameChangeExecutionDependency['status'] = activeEmployment ? 'satisfied' : 'missing';

  return {
    key: 'employment-context',
    label,
    required: true,
    status,
    reason: activeEmployment ? satisfiedReason : missingReason,
    nextActionCategory: 'dependency',
    blocksReady: status !== 'satisfied',
  };
}

function hasDualPartnerNameChange(profile: NameChangeCaseInput) {
  return profile.structured_intake.bothPartnersChangeName === true
    || profile.change_reasons.some((reason) => /both_partners_change_name|dual/i.test(reason));
}

function buildDualPartnerExecutionDependency(
  profile: NameChangeCaseInput,
  key: string,
  label: string,
  reason: string,
): NameChangeExecutionDependency {
  const dualPartner = hasDualPartnerNameChange(profile);
  return {
    key,
    label,
    required: false,
    status: dualPartner ? 'attention' : 'satisfied',
    reason: dualPartner
      ? reason
      : 'Only one partner is changing names, so no dual-chain execution split is required here.',
    nextActionCategory: 'review',
    blocksReady: false,
  };
}

const buildLegalAndIdentityDependencies: NameChangeDependencyRecipe = ({ requirements }) => [
  buildRequirementDependency(requirements.caseLegalNameCompleteness, 'case-legal-name-completeness', 'Case legal-name setup complete', true, 'Case legal-name completeness has not been evaluated.', false, 'dependency'),
  buildRequirementDependency(requirements.legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.', false, 'document'),
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.', false, 'document'),
];

const buildStrictLegalAndIdentityDependencies: NameChangeDependencyRecipe = ({ requirements }) => [
  buildRequirementDependency(requirements.caseLegalNameCompleteness, 'case-legal-name-completeness', 'Case legal-name setup complete', true, 'Case legal-name completeness has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.', true, 'document'),
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.', true, 'document'),
];

const buildSsaDependencies: NameChangeDependencyRecipe = ({ profile, requirements, prerequisiteDependencies }) => [
  ...buildStrictLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
  buildDualPartnerExecutionDependency(
    profile,
    'dual-partner-ssa-split',
    'Dual-partner SSA chain split',
    'Both partners are changing names, so SSA work should branch into separate packets, evidence copies, and submission follow-through for each partner.',
  ),
  ...prerequisiteDependencies,
];

const buildDmvDependencies: NameChangeDependencyRecipe = ({ profile, intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.caseLegalNameCompleteness, 'case-legal-name-completeness', 'Case legal-name setup complete', true, 'Case legal-name completeness has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.', true, 'document'),
  buildRequirementDependency(requirements.launchStateAlignment, 'launch-state-alignment', 'California launch-state alignment', true, 'California launch-state alignment has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.', true, 'dependency'),
  buildDocumentSupportDependency(intake, {
    key: 'identity-document-coverage',
    label: 'California-facing identity/address support',
    documentKinds: ['current_drivers_license', 'proof_of_address'],
    satisfiedReason: 'California-facing identity or address support exists in intake.',
    missingReason: 'No California-facing identity or address support exists in intake yet.',
  }),
  buildDualPartnerExecutionDependency(
    profile,
    'dual-partner-dmv-split',
    'Dual-partner DMV chain split',
    'Both partners are changing names, so DMV work should branch into separate appointment, temporary-ID, and title/registration follow-through per partner.',
  ),
  ...prerequisiteDependencies,
];

const buildCourtOrderDependencies: NameChangeDependencyRecipe = ({ requirements }) => [
  buildRequirementDependency(requirements.caseLegalNameCompleteness, 'case-legal-name-completeness', 'Case legal-name setup complete', true, 'Case legal-name completeness has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.launchStateAlignment, 'launch-state-alignment', 'California launch-state alignment', true, 'California launch-state alignment has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.courtOrderPathReadiness, 'court-order-path-readiness', 'Court-order path readiness', true, 'Court-order path readiness has not been evaluated.', true, 'review'),
  buildRequirementDependency(requirements.courtOrderJurisdictionContext, 'court-order-jurisdiction-context', 'Court-order jurisdiction context', true, 'Court-order jurisdiction context has not been evaluated.', true, 'dependency'),
  buildRequirementDependency(requirements.courtOrderReferenceExtraction, 'court-order-reference-extraction', 'Court-order reference extraction', true, 'Court-order reference extraction has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.', true, 'document'),
];

const buildPassportDependencies: NameChangeDependencyRecipe = ({ profile, requirements, prerequisiteDependencies }) => [
  ...buildStrictLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
  buildRequirementDependency(requirements.marriageJurisdictionAlignment, 'marriage-jurisdiction-alignment', 'Marriage jurisdiction alignment', true, 'Marriage jurisdiction alignment has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.outOfStateMarriageCertificateGrounding, 'out-of-state-marriage-certificate-grounding', 'Out-of-state marriage certificate grounding', true, 'Out-of-state marriage certificate grounding has not been evaluated.', true, 'document'),
  {
    key: 'citizenship-eligibility',
    label: 'Citizenship eligible for passport path',
    required: true,
    status: profile.is_us_citizen ? 'satisfied' : 'missing',
    reason: profile.is_us_citizen
      ? 'Citizenship context supports the modeled U.S. passport path.'
      : 'Current modeled passport flow assumes U.S. citizenship eligibility.',
  },
  buildRequirementDependency(requirements.passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.', false, 'review'),
  buildRequirementDependency(requirements.passportExpirationGrounding, 'passport-expiration-grounding', 'Passport expiration date grounded for travel work', true, 'Passport expiration grounding has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.expeditedTravelSequencing, 'expedited-travel-sequencing', 'Expedited travel sequencing ready', false, 'Expedited travel sequencing has not been evaluated.', false, 'review'),
  buildRequirementDependency(requirements.citizenshipProofIntake, 'citizenship-proof-intake', 'Citizenship proof intake ready for first-passport work', true, 'Citizenship proof intake has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.passportEligibilityPath, 'passport-eligibility-path', 'Passport eligibility path is clear', true, 'Passport eligibility path has not been evaluated.', true),
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
}): NameChangeDependencyRecipe {
  return ({ profile, intake, requirements, prerequisiteDependencies }) => [
    buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.', false, 'document'),
    buildEmploymentContextDependency(profile, config.label, config.satisfiedReason, config.missingReason),
    buildDocumentSupportDependency(intake, {
      key: config.supportKey,
      label: config.supportLabel,
      documentKinds: config.supportDocumentKinds,
      satisfiedReason: config.supportSatisfiedReason,
      missingReason: config.supportMissingReason,
    }),
    buildDualPartnerExecutionDependency(
      profile,
      `dual-partner-${config.supportKey}`,
      'Dual-partner downstream rollout split',
      'Both partners are changing names, so this downstream rollout should track separate confirmations, mailed notices, and completion proof for each partner.',
    ),
    ...prerequisiteDependencies,
  ];
}

function buildPhotoIdPacketDependencies(config: {
  supportKey: string;
  supportLabel: string;
  supportDocumentKinds: NameChangeDocumentInput['document_kind'][];
  supportSatisfiedReason: string;
  supportMissingReason: string;
}): NameChangeDependencyRecipe {
  return ({ profile, intake, requirements, prerequisiteDependencies }) => [
    ...buildLegalAndIdentityDependencies({ profile: null as never, intake, requirements, prerequisiteDependencies }),
    buildDocumentSupportDependency(intake, {
      key: config.supportKey,
      label: config.supportLabel,
      documentKinds: config.supportDocumentKinds,
      satisfiedReason: config.supportSatisfiedReason,
      missingReason: config.supportMissingReason,
    }),
    buildDualPartnerExecutionDependency(
      profile,
      `dual-partner-${config.supportKey}`,
      'Dual-partner downstream rollout split',
      'Both partners are changing names, so this downstream rollout should track separate confirmations, mailed notices, and completion proof for each partner.',
    ),
    ...prerequisiteDependencies,
  ];
}

const buildVoterDependencies: NameChangeDependencyRecipe = ({ profile, intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.launchStateAlignment, 'launch-state-alignment', 'California launch-state alignment', true, 'California launch-state alignment has not been evaluated.', false, 'dependency'),
  buildRequirementDependency(requirements.countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.', false, 'dependency'),
  buildDocumentSupportDependency(intake, {
    key: 'california-voter-support',
    label: 'California voter-supporting identity/address support',
    documentKinds: ['current_drivers_license', 'proof_of_address'],
    satisfiedReason: 'California voter-supporting identity/address support exists in intake.',
    missingReason: 'No California voter-supporting identity/address support exists in intake yet.',
  }),
  buildDualPartnerExecutionDependency(
    profile,
    'dual-partner-california-voter-support',
    'Dual-partner downstream rollout split',
    'Both partners are changing names, so this downstream rollout should track separate confirmations, mailed notices, and completion proof for each partner.',
  ),
  ...prerequisiteDependencies,
];

const buildTsaDependencies: NameChangeDependencyRecipe = ({ profile, intake, requirements, prerequisiteDependencies }) => [
  buildRequirementDependency(requirements.marriageJurisdictionAlignment, 'marriage-jurisdiction-alignment', 'Marriage jurisdiction alignment', true, 'Marriage jurisdiction alignment has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.outOfStateMarriageCertificateGrounding, 'out-of-state-marriage-certificate-grounding', 'Out-of-state marriage certificate grounding', true, 'Out-of-state marriage certificate grounding has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.', false, 'document'),
  buildRequirementDependency(requirements.passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.', false, 'review'),
  buildRequirementDependency(requirements.passportExpirationGrounding, 'passport-expiration-grounding', 'Passport expiration date grounded for travel work', true, 'Passport expiration grounding has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.expeditedTravelSequencing, 'expedited-travel-sequencing', 'Expedited travel sequencing ready', false, 'Expedited travel sequencing has not been evaluated.', false, 'review'),
  buildRequirementDependency(requirements.citizenshipProofIntake, 'citizenship-proof-intake', 'Citizenship proof intake ready for first-passport travel work', true, 'Citizenship proof intake has not been evaluated.', true, 'document'),
  buildRequirementDependency(requirements.passportEligibilityPath, 'passport-eligibility-path', 'Passport eligibility path is clear', true, 'Passport eligibility path has not been evaluated.', true),
  buildDocumentSupportDependency(intake, {
    key: 'travel-profile-support',
    label: 'Travel-profile support exists',
    documentKinds: ['current_passport', 'current_drivers_license'],
    satisfiedReason: 'Passport or Real ID support exists in intake for travel-profile updates.',
    missingReason: 'No passport or Real ID support exists in intake yet for travel-profile updates.',
  }),
  buildDualPartnerExecutionDependency(
    profile,
    'dual-partner-travel-profile-support',
    'Dual-partner downstream rollout split',
    'Both partners are changing names, so this downstream rollout should track separate confirmations, mailed notices, and completion proof for each partner.',
  ),
  ...prerequisiteDependencies,
];

export const NAME_CHANGE_SEQUENCE_PROFILE_RECIPES: Record<NameChangeExecutionSequenceProfileKey, NameChangeDependencyRecipe> = {
  courtOrder: buildCourtOrderDependencies,
  ssa: buildSsaDependencies,
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
    buildDualPartnerExecutionDependency(
      profile,
      'dual-partner-employer-packet',
      'Dual-partner downstream rollout split',
      'Both partners are changing names, so this downstream rollout should track separate payroll, HR, and benefits confirmations for each partner.',
    ),
    ...prerequisiteDependencies,
  ],
  taxes: ({ profile, requirements, prerequisiteDependencies }) => [
    ...buildLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
    buildRequirementDependency(requirements.countyContext, 'county-context', 'County / state tax jurisdiction context', true, 'County context requirement not evaluated.', false, 'dependency'),
    buildDualPartnerExecutionDependency(
      profile,
      'dual-partner-tax-alignment',
      'Dual-partner tax identity split',
      'Both partners are changing names, so IRS, state tax, withholding, and payroll confirmations should be tracked separately for each partner.',
    ),
    ...prerequisiteDependencies,
  ],
  legalGovernment: ({ profile, requirements, prerequisiteDependencies }) => [
    ...buildLegalAndIdentityDependencies({ profile, intake: null as never, requirements, prerequisiteDependencies }),
    buildRequirementDependency(
      requirements.countyContext,
      'county-context',
      'County / local filing jurisdiction context',
      true,
      'County and local jurisdiction context has not been evaluated yet.',
      false,
      'dependency',
    ),
    buildDualPartnerExecutionDependency(
      profile,
      'dual-partner-legal-government-rollout',
      'Dual-partner legal/government split',
      'Both partners are changing names, so county recorder, immigration, and adjacent government follow-through should keep separate proof trails for each partner.',
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
  medical: buildPhotoIdPacketDependencies({
    supportKey: 'medical-identity-support',
    supportLabel: 'Medical-office identity support exists',
    supportDocumentKinds: ['current_drivers_license', 'current_passport', 'proof_of_address'],
    supportSatisfiedReason: 'Medical-office identity support exists in intake.',
    supportMissingReason: 'No medical-office identity support exists in intake yet.',
  }),
  utilities: buildPhotoIdPacketDependencies({
    supportKey: 'utilities-identity-support',
    supportLabel: 'Utilities/lease identity support exists',
    supportDocumentKinds: ['current_drivers_license', 'proof_of_address'],
    supportSatisfiedReason: 'Utilities/lease identity support exists in intake.',
    supportMissingReason: 'No utilities/lease identity support exists in intake yet.',
  }),
  courtesy: ({ profile, intake, prerequisiteDependencies }) => [
    buildDocumentSupportDependency(intake, {
      key: 'courtesy-identity-support',
      label: 'Courtesy/social identity context exists',
      documentKinds: ['current_drivers_license', 'current_passport'],
      satisfiedReason: 'Courtesy/social identity context exists in intake.',
      missingReason: 'No courtesy/social identity context exists in intake yet.',
    }),
    buildDualPartnerExecutionDependency(
      profile,
      'dual-partner-courtesy-identity-support',
      'Dual-partner downstream rollout split',
      'Both partners are changing names, so this downstream rollout should track separate courtesy-name confirmations and social profile proof for each partner.',
    ),
    ...prerequisiteDependencies,
  ],
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
