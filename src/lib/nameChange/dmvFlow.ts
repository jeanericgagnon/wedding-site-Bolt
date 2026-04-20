import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeDmvExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeDmvExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeDmvExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('dmv', profile, documents, extractedFields, plan);
}
