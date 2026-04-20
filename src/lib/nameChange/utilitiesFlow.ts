import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeUtilitiesExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeUtilitiesExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeUtilitiesExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('utilities', profile, documents, extractedFields, plan);
}
