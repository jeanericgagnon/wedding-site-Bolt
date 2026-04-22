import { describe, expect, it } from 'vitest';
import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'marriage',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: 'California',
    marriage_date: '2026-04-05',
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['marriage'],
    structured_intake: {
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change autofill prep snapshot', () => {
  it('builds candidate autofill fields from canonical case + document-linked extracted fields', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-marriage',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange County',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.summary.ready).toBeGreaterThan(0);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan-Smith',
        sourceFieldKey: 'spouse_last_name',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.current_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Alicia',
        sourceDocumentKind: 'current_passport',
      }),
    });
  });

  it('does not let an unrelated document override a preferred document lane', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-passport',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Wrong-Source',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Jordan',
      }),
    });
  });

  it('keeps missing fields explicit when neither canonical nor extracted value exists', () => {
    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase({ county_residence: null, marriage_date: null }), [], []);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.county')).toMatchObject({
      value: expect.objectContaining({ value: null, confidence: 'low' }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'legal.marriage_date')).toMatchObject({
      value: expect.objectContaining({ value: null, confidence: 'low' }),
    });
  });

  it('downgrades extracted confidence when the source document metadata is too thin', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan-Smith',
        confidence: 'low',
        sourceDocumentKind: 'marriage_certificate',
      }),
    });
  });

  it('carries court-order reference extraction into autofill prep for court-order cases', () => {
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
        field_value_masked: 'Avery',
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

    const snapshot = buildNameChangeAutofillPrepSnapshot(
      makeCase({
        legal_basis: 'court_order',
        target_first_name: 'Avery',
        marriage_state: null,
        marriage_date: null,
        structured_intake: { spouseLastName: null, travelBookedSoon: true, wantsDocumentIntakeHelp: true },
      }),
      documents,
      extractedFields,
    );

    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Avery',
        sourceDocumentKind: 'court_order',
        sourceFieldKey: 'first_name',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan',
        sourceDocumentKind: 'court_order',
        sourceFieldKey: 'last_name',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'legal.court_order_case_number')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '24-CV-1188',
        sourceDocumentKind: 'court_order',
        sourceFieldKey: 'case_number',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'legal.court_order_date')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '2026-04-05',
        sourceDocumentKind: 'court_order',
      }),
    });
  });
});
