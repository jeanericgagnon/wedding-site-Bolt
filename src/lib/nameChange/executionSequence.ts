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
} from './types';

function requirementStatusToDependencyStatus(status: 'satisfied' | 'missing' | 'attention'): NameChangeExecutionDependency['status'] {
  return status;
}

export function buildNameChangeExecutionSequenceSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeExecutionSequenceSnapshot {
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const requirements = evaluateNameChangeRequirements(profile, documents, extractedFields);
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);

  const legalProof = requirements.results.find((result) => result.key === 'legal-proof-document');
  const identityCoverage = requirements.results.find((result) => result.key === 'identity-document-coverage');
  const countyContext = requirements.results.find((result) => result.key === 'county-context');
  const passportTimingRisk = requirements.results.find((result) => result.key === 'passport-timing-risk');

  const dependencies: NameChangeExecutionDependency[] = targetKey === 'ssa'
    ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
      ]
    : targetKey === 'dmv'
      ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'county-context',
          label: 'County / jurisdiction context',
          required: true,
          status: requirementStatusToDependencyStatus(countyContext?.status ?? 'missing'),
          reason: countyContext?.reason ?? 'County context requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'California-facing identity/address support',
          required: false,
          status: intake.documents.some((document) => ['current_drivers_license', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_drivers_license', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'California-facing identity or address support exists in intake.'
            : 'No California-facing identity or address support exists in intake yet.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'passport'
      ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'citizenship-eligibility',
          label: 'Citizenship eligible for passport path',
          required: true,
          status: profile.is_us_citizen ? 'satisfied' : 'missing',
          reason: profile.is_us_citizen
            ? 'Citizenship context supports the modeled U.S. passport path.'
            : 'Current modeled passport flow assumes U.S. citizenship eligibility.',
        },
        {
          key: 'passport-timing-risk',
          label: 'Passport timing risk reviewed',
          required: false,
          status: requirementStatusToDependencyStatus(passportTimingRisk?.status ?? 'attention'),
          reason: passportTimingRisk?.reason ?? 'Passport timing risk has not been evaluated.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'employer'
      ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'employment-context',
          label: 'Employment context eligible for employer packet',
          required: true,
          status: profile.employment_status === 'employed' || profile.employment_status === 'self_employed' ? 'satisfied' : 'missing',
          reason: profile.employment_status === 'employed' || profile.employment_status === 'self_employed'
            ? 'Employment context is active enough to justify employer / payroll packet prep.'
            : 'Employer / payroll packet only matters when employment context is active.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'banks'
      ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'financial-identity-support',
          label: 'Financial identity / address support exists',
          required: false,
          status: intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'Financial identity/address support exists in intake.'
            : 'No financial identity/address support exists in intake yet.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'insurance'
      ? [
        {
          key: 'legal-proof-document',
          label: 'Legal proof document ready',
          required: true,
          status: requirementStatusToDependencyStatus(legalProof?.status ?? 'missing'),
          reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
        },
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'insurance-identity-support',
          label: 'Insurance identity / address support exists',
          required: false,
          status: intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'Insurance identity/address support exists in intake.'
            : 'No insurance identity/address support exists in intake yet.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'voter'
      ? [
        {
          key: 'county-context',
          label: 'County / jurisdiction context',
          required: true,
          status: requirementStatusToDependencyStatus(countyContext?.status ?? 'missing'),
          reason: countyContext?.reason ?? 'County context requirement not evaluated.',
        },
        {
          key: 'california-voter-support',
          label: 'California voter-supporting identity/address support',
          required: false,
          status: intake.documents.some((document) => ['current_drivers_license', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_drivers_license', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'California voter-supporting identity/address support exists in intake.'
            : 'No California voter-supporting identity/address support exists in intake yet.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : targetKey === 'tsa'
      ? [
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'passport-timing-risk',
          label: 'Passport timing risk reviewed',
          required: false,
          status: requirementStatusToDependencyStatus(passportTimingRisk?.status ?? 'attention'),
          reason: passportTimingRisk?.reason ?? 'Passport timing risk has not been evaluated.',
        },
        {
          key: 'travel-profile-support',
          label: 'Travel-profile support exists',
          required: false,
          status: intake.documents.some((document) => ['current_passport', 'current_drivers_license'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_passport', 'current_drivers_license'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'Passport or Real ID support exists in intake for travel-profile updates.'
            : 'No passport or Real ID support exists in intake yet for travel-profile updates.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ]
      : [
        {
          key: 'identity-document-coverage',
          label: 'Identity document coverage',
          required: true,
          status: requirementStatusToDependencyStatus(identityCoverage?.status ?? 'missing'),
          reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
        },
        {
          key: 'employment-context',
          label: 'Employment context eligible for license updates',
          required: true,
          status: profile.employment_status === 'employed' || profile.employment_status === 'self_employed' ? 'satisfied' : 'missing',
          reason: profile.employment_status === 'employed' || profile.employment_status === 'self_employed'
            ? 'Employment context is active enough to justify professional license / certification updates.'
            : 'Professional license updates only matter when employment context is active.',
        },
        {
          key: 'license-identity-support',
          label: 'Professional-license identity support exists',
          required: false,
          status: intake.documents.some((document) => ['current_drivers_license', 'current_passport'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'satisfied'
            : 'attention',
          reason: intake.documents.some((document) => ['current_drivers_license', 'current_passport'].includes(document.kind) && document.intakeStatus !== 'not_started')
            ? 'Current ID support exists in intake for professional license updates.'
            : 'No current ID support exists in intake yet for professional license updates.',
        },
        ...evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan),
      ];

  const blockers = dependencies.filter((dependency) => dependency.required && dependency.status === 'missing').map((dependency) => dependency.reason);

  return {
    target: targetKey,
    lane: target.lane,
    ready: blockers.length === 0,
    blockers,
    dependencies,
  };
}
