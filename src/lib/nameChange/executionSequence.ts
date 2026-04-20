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
  const prerequisiteDependencies = evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan);

  const dependencies: NameChangeExecutionDependency[] = targetKey === 'ssa'
    ? [
        buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
        buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
      ]
    : targetKey === 'dmv'
      ? [
          buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
          buildRequirementDependency(countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.'),
          buildDocumentSupportDependency(intake, {
            key: 'identity-document-coverage',
            label: 'California-facing identity/address support',
            documentKinds: ['current_drivers_license', 'proof_of_address'],
            satisfiedReason: 'California-facing identity or address support exists in intake.',
            missingReason: 'No California-facing identity or address support exists in intake yet.',
          }),
          ...prerequisiteDependencies,
        ]
      : targetKey === 'passport'
        ? [
            buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
            buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
            {
              key: 'citizenship-eligibility',
              label: 'Citizenship eligible for passport path',
              required: true,
              status: profile.is_us_citizen ? 'satisfied' : 'missing',
              reason: profile.is_us_citizen
                ? 'Citizenship context supports the modeled U.S. passport path.'
                : 'Current modeled passport flow assumes U.S. citizenship eligibility.',
            },
            buildRequirementDependency(passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.'),
            ...prerequisiteDependencies,
          ]
        : targetKey === 'employer'
          ? [
              buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
              buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
              buildEmploymentContextDependency(
                profile,
                'Employment context eligible for employer packet',
                'Employment context is active enough to justify employer / payroll packet prep.',
                'Employer / payroll packet only matters when employment context is active.',
              ),
              ...prerequisiteDependencies,
            ]
          : targetKey === 'banks'
            ? [
                buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
                buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
                buildDocumentSupportDependency(intake, {
                  key: 'financial-identity-support',
                  label: 'Financial identity / address support exists',
                  documentKinds: ['current_drivers_license', 'current_passport', 'proof_of_address'],
                  satisfiedReason: 'Financial identity/address support exists in intake.',
                  missingReason: 'No financial identity/address support exists in intake yet.',
                }),
                ...prerequisiteDependencies,
              ]
            : targetKey === 'insurance'
              ? [
                  buildRequirementDependency(legalProof, 'legal-proof-document', 'Legal proof document ready', true, 'Legal proof requirement not evaluated.'),
                  buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
                  buildDocumentSupportDependency(intake, {
                    key: 'insurance-identity-support',
                    label: 'Insurance identity / address support exists',
                    documentKinds: ['current_drivers_license', 'current_passport', 'proof_of_address'],
                    satisfiedReason: 'Insurance identity/address support exists in intake.',
                    missingReason: 'No insurance identity/address support exists in intake yet.',
                  }),
                  ...prerequisiteDependencies,
                ]
              : targetKey === 'voter'
                ? [
                    buildRequirementDependency(countyContext, 'county-context', 'County / jurisdiction context', true, 'County context requirement not evaluated.'),
                    buildDocumentSupportDependency(intake, {
                      key: 'california-voter-support',
                      label: 'California voter-supporting identity/address support',
                      documentKinds: ['current_drivers_license', 'proof_of_address'],
                      satisfiedReason: 'California voter-supporting identity/address support exists in intake.',
                      missingReason: 'No California voter-supporting identity/address support exists in intake yet.',
                    }),
                    ...prerequisiteDependencies,
                  ]
                : targetKey === 'tsa'
                  ? [
                      buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
                      buildRequirementDependency(passportTimingRisk, 'passport-timing-risk', 'Passport timing risk reviewed', false, 'Passport timing risk has not been evaluated.'),
                      buildDocumentSupportDependency(intake, {
                        key: 'travel-profile-support',
                        label: 'Travel-profile support exists',
                        documentKinds: ['current_passport', 'current_drivers_license'],
                        satisfiedReason: 'Passport or Real ID support exists in intake for travel-profile updates.',
                        missingReason: 'No passport or Real ID support exists in intake yet for travel-profile updates.',
                      }),
                      ...prerequisiteDependencies,
                    ]
                  : [
                      buildRequirementDependency(identityCoverage, 'identity-document-coverage', 'Identity document coverage', true, 'Identity coverage requirement not evaluated.'),
                      buildEmploymentContextDependency(
                        profile,
                        'Employment context eligible for license updates',
                        'Employment context is active enough to justify professional license / certification updates.',
                        'Professional license updates only matter when employment context is active.',
                      ),
                      buildDocumentSupportDependency(intake, {
                        key: 'license-identity-support',
                        label: 'Professional-license identity support exists',
                        documentKinds: ['current_drivers_license', 'current_passport'],
                        satisfiedReason: 'Current ID support exists in intake for professional license updates.',
                        missingReason: 'No current ID support exists in intake yet for professional license updates.',
                      }),
                      ...prerequisiteDependencies,
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
