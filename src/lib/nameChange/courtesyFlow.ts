import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeCourtesyExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeCourtesyExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeCourtesyExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('courtesy', profile, documents, extractedFields, plan);
}
