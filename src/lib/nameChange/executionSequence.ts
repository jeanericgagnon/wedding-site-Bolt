import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeExecutionPrerequisites } from './executionPrerequisites';
import { NAME_CHANGE_SEQUENCE_PROFILE_RECIPES } from './executionSequenceProfiles';
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
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const results = evaluateNameChangeRequirements(profile, documents, extractedFields).results;
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const prerequisiteDependencies = evaluateNameChangeExecutionPrerequisites(target.prerequisiteRules, plan);

  const dependencies = NAME_CHANGE_SEQUENCE_PROFILE_RECIPES[target.sequenceProfile]({
    profile,
    intake,
    requirements: {
      legalProof: results.find((result) => result.key === 'legal-proof-document'),
      identityCoverage: results.find((result) => result.key === 'identity-document-coverage'),
      courtOrderPathReadiness: results.find((result) => result.key === 'court-order-path-readiness'),
      courtOrderReferenceExtraction: results.find((result) => result.key === 'court-order-reference-extraction'),
      courtOrderJurisdictionContext: results.find((result) => result.key === 'court-order-jurisdiction-context'),
      countyContext: results.find((result) => result.key === 'county-context'),
      launchStateAlignment: results.find((result) => result.key === 'launch-state-alignment'),
      passportTimingRisk: results.find((result) => result.key === 'passport-timing-risk'),
      expeditedTravelSequencing: results.find((result) => result.key === 'expedited-travel-sequencing'),
      passportEligibilityPath: results.find((result) => result.key === 'passport-eligibility-path'),
    },
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
