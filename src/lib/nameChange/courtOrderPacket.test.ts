import { describe, expect, it } from 'vitest';
import { buildNameChangeCourtOrderPacketSnapshot } from './courtOrderPacket';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'court_order',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: null,
    marriage_date: null,
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['court_order'],
    structured_intake: {
      spouseLastName: null,
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('court-order name change packet snapshot', () => {
  it('builds a structured court-order path review payload', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-05',
        extraction_confidence: 0.93,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'middle_name',
        field_label: 'Middle name',
        field_value_masked: 'Marie',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeCourtOrderPacketSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.formCode).toBe('COURT-ORDER-PATH-REVIEW');
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.currentMiddleName')).toMatchObject({
      value: 'Marie',
      source: 'canonical_case',
      sourceFieldKey: 'middle_name',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.targetFirstName')).toMatchObject({
      value: 'Alex',
      source: 'extracted_field',
      sourceDocumentKind: 'court_order',
      sourceFieldKey: 'first_name',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.targetMiddleName')).toMatchObject({
      value: 'Marie',
      source: 'extracted_field',
      sourceDocumentKind: 'court_order',
      sourceFieldKey: 'middle_name',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.targetLastName')).toMatchObject({
      value: 'Jordan',
      source: 'extracted_field',
      sourceDocumentKind: 'court_order',
      sourceFieldKey: 'last_name',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.caseNumber')).toMatchObject({ value: '24-CV-1188' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.orderDate')).toMatchObject({ value: '2026-04-05' });
  });
});
