import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeExecutionPrerequisites } from './executionPrerequisites';
import { NAME_CHANGE_SEQUENCE_PROFILE_RECIPES } from './executionSequenceProfiles';
import { buildNameChangeSnapshotBackedExtractedFields } from './intakeDraft';
import { evaluateNameChangeRequirements } from './requirements';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionSequenceSnapshot,
  NameChangeExecutionTargetKey,
  NameChangeExtractedFieldInput,
  NameChangePlan,
} from './types';

export function buildNameChangeExecutionSequenceSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeExecutionSequenceSnapshot {
  const mergedExtractedFields = buildNameChangeSnapshotBackedExtractedFields(documents, extractedFields);
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const results = evaluateNameChangeRequirements(profile, documents, mergedExtractedFields).results;
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, mergedExtractedFields);
  const prerequisiteDependencies = evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan);

  const dependencies = NAME_CHANGE_SEQUENCE_PROFILE_RECIPES[target.sequenceProfile]({
    profile,
    intake,
    requirements: {
      caseLegalNameCompleteness: results.find((result) => result.key === 'case-legal-name-completeness'),
      legalProof: results.find((result) => result.key === 'legal-proof-document'),
      identityCoverage: results.find((result) => result.key === 'identity-document-coverage'),
      courtOrderPathReadiness: results.find((result) => result.key === 'court-order-path-readiness'),
      courtOrderReferenceExtraction: results.find((result) => result.key === 'court-order-reference-extraction'),
      courtOrderJurisdictionContext: results.find((result) => result.key === 'court-order-jurisdiction-context'),
      marriageJurisdictionAlignment: results.find((result) => result.key === 'marriage-jurisdiction-alignment'),
      outOfStateMarriageCertificateGrounding: results.find((result) => result.key === 'out-of-state-marriage-certificate-grounding'),
      countyContext: results.find((result) => result.key === 'county-context'),
      launchStateAlignment: results.find((result) => result.key === 'launch-state-alignment'),
      passportTimingRisk: results.find((result) => result.key === 'passport-timing-risk'),
      expeditedTravelSequencing: results.find((result) => result.key === 'expedited-travel-sequencing'),
      citizenshipProofIntake: results.find((result) => result.key === 'citizenship-proof-intake'),
      passportEligibilityPath: results.find((result) => result.key === 'passport-eligibility-path'),
    },
    prerequisiteDependencies,
  });

  const blockers = dependencies.filter((dependency) => dependency.blocksReady ?? (dependency.required && dependency.status === 'missing')).map((dependency) => dependency.reason);

  return {
    target: targetKey,
    lane: target.lane,
    ready: blockers.length === 0,
    blockers,
    dependencies,
  };
}
