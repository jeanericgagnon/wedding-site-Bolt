import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeInsuranceExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeInsuranceExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeInsuranceExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('insurance', profile, documents, extractedFields, plan);
}
