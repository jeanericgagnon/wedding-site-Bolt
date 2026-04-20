import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeRequirements } from './requirements';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionDependency,
  NameChangeExecutionSequenceSnapshot,
  NameChangeExtractedFieldInput,
} from './types';

function requirementStatusToDependencyStatus(status: 'satisfied' | 'missing' | 'attention'): NameChangeExecutionDependency['status'] {
  return status;
}

export function buildNameChangeExecutionSequenceSnapshot(
  target: 'ssa' | 'dmv',
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExecutionSequenceSnapshot {
  const requirements = evaluateNameChangeRequirements(profile, documents, extractedFields);
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);

  const legalProof = requirements.results.find((result) => result.key === 'legal-proof-document');
  const identityCoverage = requirements.results.find((result) => result.key === 'identity-document-coverage');
  const countyContext = requirements.results.find((result) => result.key === 'county-context');

  const dependencies: NameChangeExecutionDependency[] = target === 'ssa'
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
    : [
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
        {
          key: 'federal-ssa-progress',
          label: 'SSA should move before DMV sequencing',
          required: true,
          status: profile.workflow_status === 'in_progress' || profile.workflow_status === 'complete' ? 'attention' : 'attention',
          reason: 'DMV sequencing should follow the federal identity change path; this is a sequencing attention item until explicit SSA completion state is modeled in dependencies.',
        },
      ];

  const blockers = dependencies.filter((dependency) => dependency.required && dependency.status === 'missing').map((dependency) => dependency.reason);

  return {
    target,
    lane: target === 'ssa' ? 'federal' : 'state',
    ready: blockers.length === 0,
    blockers,
    dependencies,
  };
}
