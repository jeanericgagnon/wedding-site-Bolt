import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormFieldPayload,
  NameChangeFormPayloadSnapshot,
} from './types';

function getField(
  fields: ReturnType<typeof buildNameChangeAutofillPrepSnapshot>['fields'],
  targetField: string,
) {
  return fields.find((field) => field.targetField === targetField);
}

function mapField(
  fieldKey: string,
  label: string,
  sourceField: ReturnType<typeof getField>,
): NameChangeFormFieldPayload {
  return {
    fieldKey,
    label,
    value: sourceField?.value.value ?? null,
    source: sourceField?.value.source ?? 'canonical_case',
    confidence: sourceField?.value.confidence ?? 'low',
  };
}

export function buildNameChangeSs5FormSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);

  const fields: NameChangeFormFieldPayload[] = [
    mapField('applicant.currentFirstName', 'Current first name', getField(autofill.fields, 'applicant.current_first_name')),
    mapField('applicant.currentMiddleName', 'Current middle name', getField(autofill.fields, 'applicant.current_middle_name')),
    mapField('applicant.currentLastName', 'Current last name', getField(autofill.fields, 'applicant.current_last_name')),
    mapField('applicant.newLastName', 'New last name', getField(autofill.fields, 'applicant.target_last_name')),
    mapField('legal.marriageDate', 'Marriage date', getField(autofill.fields, 'legal.marriage_date')),
    mapField('identity.passportIssueDate', 'Passport issue date', getField(autofill.fields, 'identity.passport_issue_date')),
  ];

  return {
    formCode: 'SSA-SS5',
    fields,
    summary: {
      ready: fields.filter((field) => Boolean(field.value)).length,
      missing: fields.filter((field) => !field.value).length,
      extractedBacked: fields.filter((field) => field.source === 'extracted_field').length,
    },
  };
}
