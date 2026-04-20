import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeLicenseExecutionSnapshot = NameChangeTargetExecutionSnapshot;

export function buildNameChangeLicenseExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeLicenseExecutionSnapshot {
  return buildNameChangeTargetExecutionSnapshot('licenses', profile, documents, extractedFields, plan);
}
