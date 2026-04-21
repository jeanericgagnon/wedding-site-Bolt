import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeCourtOrderExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeCourtOrderExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeCourtOrderExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, extractedFields, plan);
}
