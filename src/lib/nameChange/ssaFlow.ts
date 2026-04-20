import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeSsaExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeSsaExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeSsaExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('ssa', profile, documents, extractedFields, plan);
}
