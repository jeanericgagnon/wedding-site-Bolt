import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import type {
  NameChangeAutofillPrepSnapshot,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormFieldPayload,
  NameChangeFormPayloadSnapshot,
} from './types';

export interface NameChangeFormFieldSpec {
  fieldKey: string;
  label: string;
  sourceTargetField: string;
  required?: boolean;
}

export interface NameChangeFormContractDefinition {
  formCode: string;
  label: string;
  fieldSpecs: NameChangeFormFieldSpec[];
}

function getAutofillField(
  fields: NameChangeAutofillPrepSnapshot['fields'],
  targetField: string,
) {
  return fields.find((field) => field.targetField === targetField);
}

function mapField(
  spec: NameChangeFormFieldSpec,
  autofill: NameChangeAutofillPrepSnapshot,
): NameChangeFormFieldPayload {
  const sourceField = getAutofillField(autofill.fields, spec.sourceTargetField);
  return {
    fieldKey: spec.fieldKey,
    label: spec.label,
    value: sourceField?.value.value ?? null,
    source: sourceField?.value.source ?? 'canonical_case',
    confidence: sourceField?.value.confidence ?? 'low',
    sourceDocumentKind: sourceField?.value.sourceDocumentKind,
    sourceFieldKey: sourceField?.value.sourceFieldKey,
  };
}

export function buildNameChangeFormPayloadSnapshot(
  definition: NameChangeFormContractDefinition,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const fields = definition.fieldSpecs.map((spec) => mapField(spec, autofill));
  const requiredSpecs = definition.fieldSpecs.filter((spec) => spec.required !== false);

  return {
    formCode: definition.formCode,
    fields,
    summary: {
      ready: requiredSpecs.filter((spec) => {
        const field = fields.find((item) => item.fieldKey === spec.fieldKey);
        return Boolean(field?.value);
      }).length,
      missing: requiredSpecs.filter((spec) => {
        const field = fields.find((item) => item.fieldKey === spec.fieldKey);
        return !field?.value;
      }).length,
      trustedReady: requiredSpecs.filter((spec) => {
        const field = fields.find((item) => item.fieldKey === spec.fieldKey);
        return Boolean(field?.value) && field?.confidence !== 'low';
      }).length,
      lowConfidence: fields.filter((field) => Boolean(field.value) && field.confidence === 'low').length,
      extractedBacked: fields.filter((field) => field.source === 'extracted_field').length,
    },
  };
}
