import { describe, expect, it } from 'vitest';
import { buildNameChangeCanonicalCase } from './canonical';
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

describe('name change canonical case', () => {
  it('treats legacy court-order documents as the canonical court-order slot', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
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

    const canonical = buildNameChangeCanonicalCase(makeCase(), documents, extractedFields);

    expect(canonical.documents.court_order).toMatchObject({
      intakeStatus: 'reviewed',
      storageMode: 'metadata_only',
      extractionFieldCount: 2,
      extractedFieldKeys: expect.arrayContaining(['case_number', 'court_order_date']),
    });
  });

  it('prefers the best real reviewed court-order document over earlier alias placeholders', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'draft-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order placeholder',
        file_name_masked: 'document-placeholder.pdf',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        id: 'doc-court-order',
        document_kind: 'court_order',
        display_name: 'Signed court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-0001',
        source_type: 'document_extract',
        is_verified: true,
      },
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
    ];

    const canonical = buildNameChangeCanonicalCase(makeCase(), documents, extractedFields);

    expect(canonical.documents.court_order).toMatchObject({
      intakeStatus: 'reviewed',
      storageMode: 'metadata_only',
      extractionFieldCount: 3,
      extractedFieldKeys: expect.arrayContaining(['first_name', 'last_name', 'case_number']),
    });
    expect(canonical.documents.court_order.extractedFieldKeys).not.toContain('court_order_date');
  });

  it('does not mix verified extracted keys from a lower-priority alias document into the canonical slot', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'placeholder-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Placeholder court order',
        file_name_masked: 'document-placeholder.pdf',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        id: 'reviewed-court-order',
        document_kind: 'court_order',
        display_name: 'Reviewed court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'placeholder-court-order',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-01',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'reviewed-court-order',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'reviewed-court-order',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const canonical = buildNameChangeCanonicalCase(makeCase(), documents, extractedFields);

    expect(canonical.documents.court_order).toMatchObject({
      intakeStatus: 'reviewed',
      extractionFieldCount: 2,
      extractedFieldKeys: ['first_name', 'last_name'],
    });
  });
});
