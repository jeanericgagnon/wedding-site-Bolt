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
        confidence: 'low',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_middle_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Marie',
        sourceFieldKey: 'middle_name',
        confidence: 'high',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.current_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Alicia',
        sourceDocumentKind: 'current_passport',
        confidence: 'low',
      }),
    });
  });

  it('prefers reviewed court-order target middle-name extraction over canonical fallback when present', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'Superior Court of California',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order',
        field_key: 'middle_name',
        field_label: 'Middle name',
        field_value_masked: 'Quinn',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      documents,
      extractedFields,
    );

    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_middle_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Quinn',
        sourceDocumentKind: 'court_order',
        sourceFieldKey: 'middle_name',
        confidence: 'low',
      }),
    });
  });

  it('keeps non-conflicting extracted values at normal extracted confidence', () => {
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
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'legal.marriage_date')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '2026-04-05',
        confidence: 'medium',
      }),
    });
  });

  it('feeds autofill from canonicalized upload aliases when verified extraction is no longer keyed to the persisted document id', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'reviewed-marriage-123',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'https://cdn.dayof.love/object/123?filename=marriage%20certificate.pdf&token=abc',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan-Smith',
        sourceDocumentKind: 'marriage_certificate',
      }),
    });
  });

  it('keeps uploaded-only extracted values at low confidence until review completes', () => {
    const documents: NameChangeDocumentInput[] = [
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
        document_id: 'doc-passport',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'identity.passport_issue_date')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '2024-06-01',
        confidence: 'low',
      }),
    });
  });

  it('keeps unverified extracted values out of direct autofill lookups', () => {
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
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: false,
      },
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Extracted',
        source_type: 'document_extract',
        is_verified: false,
      },
      {
        document_id: 'doc-marriage',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange County',
        source_type: 'document_extract',
        is_verified: false,
      },
      {
        document_id: 'doc-passport',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: false,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.current_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Alex',
        confidence: 'high',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Jordan',
        confidence: 'high',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.county')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'San Diego',
        confidence: 'high',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'identity.passport_issue_date')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: null,
        confidence: 'low',
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

  it('does not attribute manual fallback values to a document source in autofill prep', () => {
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

    const snapshot = buildNameChangeAutofillPrepSnapshot(
      makeCase({ target_last_name: 'Jordan-Smith' }),
      documents,
      extractedFields,
    );
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Jordan-Smith',
        confidence: 'high',
        sourceDocumentKind: undefined,
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

  it('prefers real reviewed court-order extraction over placeholder alias values in autofill', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'draft:court_order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order placeholder',
        file_name_masked: 'court_order.pdf',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        id: 'doc-court-order-reviewed',
        document_kind: 'court_order',
        display_name: 'Court order reviewed',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft:court_order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-0001',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order-reviewed',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(
      makeCase({
        legal_basis: 'court_order',
        marriage_state: null,
        marriage_date: null,
        structured_intake: { spouseLastName: null, travelBookedSoon: true, wantsDocumentIntakeHelp: true },
      }),
      documents,
      extractedFields,
    );

    expect(snapshot.fields.find((field) => field.targetField === 'legal.court_order_case_number')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '24-CV-1188',
        sourceDocumentKind: 'court_order',
        sourceFieldKey: 'case_number',
      }),
    });
  });

  it('keeps unverified court-order autofill values out of the packet draft', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Avery',
        source_type: 'document_extract',
        is_verified: false,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: false,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(
      makeCase({
        legal_basis: 'court_order',
        target_first_name: 'Alex',
        target_last_name: 'Jordan',
        marriage_state: null,
        marriage_date: null,
        structured_intake: { spouseLastName: null, travelBookedSoon: true, wantsDocumentIntakeHelp: true },
      }),
      documents,
      extractedFields,
    );

    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Alex',
        confidence: 'high',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'legal.court_order_case_number')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: null,
        confidence: 'low',
      }),
    });
  });
});
