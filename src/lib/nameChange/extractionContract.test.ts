import { describe, expect, it } from 'vitest';
import { buildNameChangeExtractionContractSnapshot, getDocumentCapturedFieldKeys, getDocumentLinkedCapturedFieldKeys, getVerifiedDocumentFieldValue, getVerifiedDocumentLinkedFieldValue, hasAnyLinkedDocumentFieldValue, hasVerifiedDocumentLinkedFieldValue, hasVerifiedLinkedDocumentFieldValue } from './extractionContract';
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
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change extraction contract', () => {
  it('builds typed extraction payloads from document-linked fields first', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { document_id: 'doc-marriage', field_key: 'first_name', field_label: 'First name', field_value_masked: 'Alex', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-marriage', field_key: 'last_name', field_label: 'Last name', field_value_masked: 'Rivera', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-marriage', field_key: 'spouse_last_name', field_label: 'Spouse last name', field_value_masked: 'Jordan', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-marriage', field_key: 'county', field_label: 'County', field_value_masked: 'San Diego', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-passport', field_key: 'issuance_date', field_label: 'Passport issue date', field_value_masked: '2024-06-01', source_type: 'document_extract', is_verified: true },
      { field_key: 'issuance_date', field_label: 'Manual issue date', field_value_masked: '2026-04-05', source_type: 'manual', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.marriageCertificate).toMatchObject({
      firstName: 'Alex',
      lastName: 'Rivera',
      spouseLastName: 'Jordan',
      county: 'San Diego',
      issuanceDate: '2026-04-05',
    });
    expect(snapshot.currentPassport.issuanceDate).toBe('2024-06-01');
  });

  it('falls back to unscoped manual values when no document-linked extraction exists yet', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { field_key: 'spouse_last_name', field_label: 'Spouse last name', field_value_masked: 'Jordan', source_type: 'manual', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.marriageCertificate.spouseLastName).toBe('Jordan');
  });

  it('ignores unscoped non-manual extraction rows when resolving manual fallback truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { field_key: 'spouse_last_name', field_label: 'Spouse last name', field_value_masked: 'Jordan-Extracted', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.marriageCertificate.spouseLastName).toBeNull();
  });

  it('keeps missing typed extraction fields null', () => {
    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), [], []);
    expect(snapshot.courtOrder).toMatchObject({
      firstName: null,
      middleName: null,
      lastName: null,
      caseNumber: null,
      courtOrderDate: null,
    });
    expect(snapshot.summary.conflictCount).toBe(0);
  });

  it('surfaces canonical conflicts when extracted values disagree with structured case truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { document_id: 'doc-marriage', field_key: 'spouse_last_name', field_label: 'Spouse last name', field_value_masked: 'Jordan-Smith', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-passport', field_key: 'first_name', field_label: 'First name', field_value_masked: 'Alicia', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.summary.conflictCount).toBe(2);
    expect(snapshot.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'target-last-name-marriage', extractedValue: 'Jordan-Smith', canonicalValue: 'Jordan' }),
      expect.objectContaining({ key: 'current-first-name-passport', extractedValue: 'Alicia', canonicalValue: 'Alex' }),
    ]));
  });

  it('surfaces current middle-name conflicts for passport and license extractions', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        id: 'doc-license',
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { document_id: 'doc-passport', field_key: 'middle_name', field_label: 'Middle name', field_value_masked: 'Quinn', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-license', field_key: 'middle_name', field_label: 'Middle name', field_value_masked: 'Lane', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'current-middle-name-passport', documentKind: 'current_passport', canonicalValue: 'Marie', extractedValue: 'Quinn' }),
      expect.objectContaining({ key: 'current-middle-name-license', documentKind: 'current_drivers_license', canonicalValue: 'Marie', extractedValue: 'Lane' }),
    ]));
  });

  it('maps court-order name-change documents and case-number extraction into the typed court-order snapshot', () => {
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
      { document_id: 'doc-court-order', field_key: 'first_name', field_label: 'First name', field_value_masked: 'Alex', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'middle_name', field_label: 'Middle name', field_value_masked: 'Quinn', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'last_name', field_label: 'Last name', field_value_masked: 'Rivera', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'case_number', field_label: 'Case number', field_value_masked: '24-CV-1188', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'court_order_date', field_label: 'Court order date', field_value_masked: '2026-04-05', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }), documents, extractedFields);
    expect(snapshot.courtOrder).toMatchObject({
      firstName: 'Alex',
      middleName: 'Quinn',
      lastName: 'Rivera',
      caseNumber: '24-CV-1188',
      courtOrderDate: '2026-04-05',
    });
  });

  it('canonically resolves aliased field keys and date values even when raw extraction rows bypass intake upsert', () => {
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
      { document_id: 'doc-court-order', field_key: 'signed dt', field_label: 'Signed dt', field_value_masked: 'Executed on Friday, April 5, 2026 1:30 PM PST', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'case no.', field_label: 'Case no.', field_value_masked: '24-cv - 1188', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }), documents, extractedFields);
    expect(snapshot.courtOrder).toMatchObject({
      caseNumber: '24-CV-1188',
      courtOrderDate: '2026-04-05',
    });
    expect(getDocumentCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual(expect.arrayContaining(['case_number', 'court_order_date']));
    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date')).toBe('2026-04-05');
  });

  it('surfaces court-order target middle-name conflicts against canonical case truth', () => {
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
      { document_id: 'doc-court-order', field_key: 'middle_name', field_label: 'Middle name', field_value_masked: 'Quinn', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      documents,
      extractedFields,
    );

    expect(snapshot.summary.conflictCount).toBe(1);
    expect(snapshot.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'target-middle-name-court-order',
        fieldKey: 'middle_name',
        canonicalValue: 'Marie',
        extractedValue: 'Quinn',
      }),
    ]));
  });

  it('uses canonical draft-style aliases when verified extraction rows point at upload filenames instead of persisted ids', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'reviewed-passport-123',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'uploads/passport upload v2.jpg?token=abc',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'issuance_date')).toBe('2024-06-01');
    expect(getDocumentLinkedCapturedFieldKeys(documents, extractedFields, 'current_passport')).toEqual(['issuance_date']);
  });

  it('treats opaque file-id aliases as canonical truth for the selected document kind', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'draft-current_passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'passport-upload-final.pdf',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'passport-upload-final.pdf',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Rivera',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);

    expect(snapshot.currentPassport).toMatchObject({
      firstName: 'Alex',
      lastName: 'Rivera',
    });
    expect(getDocumentLinkedCapturedFieldKeys(documents, extractedFields, 'current_passport')).toEqual(['first_name', 'last_name']);
  });

  it('treats hash-labeled case number extraction keys as canonical contract truth', () => {
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
      { document_id: 'doc-court-order', field_key: 'case #', field_label: 'Case #', field_value_masked: '24-cv - 1188', source_type: 'document_extract', is_verified: true },
    ];

    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')).toBe('24-CV-1188');
    expect(getDocumentCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual(['case_number']);
  });

  it('keeps manual fallback out of document-linked captured keys', () => {
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
      { field_key: 'case #', field_label: 'Case #', field_value_masked: '24-cv - 1188', source_type: 'manual', is_verified: true },
    ];

    expect(getDocumentCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual(['case_number']);
    expect(getDocumentLinkedCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual([]);
    expect(getVerifiedDocumentFieldValue(documents, extractedFields, 'court_order', 'case_number')).toBe('24-CV-1188');
  });

  it('flags court-order target-name conflicts against canonical case truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { document_id: 'doc-court-order', field_key: 'first_name', field_label: 'First name', field_value_masked: 'Avery', source_type: 'document_extract', is_verified: true },
      { document_id: 'doc-court-order', field_key: 'last_name', field_label: 'Last name', field_value_masked: 'Jordan-Smith', source_type: 'document_extract', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(
      makeCase({
        legal_basis: 'court_order',
        target_first_name: 'Alex',
        target_last_name: 'Jordan',
        marriage_state: null,
        marriage_date: null,
        structured_intake: { spouseLastName: null, travelBookedSoon: false, wantsDocumentIntakeHelp: true },
      }),
      documents,
      extractedFields,
    );

    expect(snapshot.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'target-first-name-court-order', documentKind: 'court_order', canonicalValue: 'Alex', extractedValue: 'Avery' }),
      expect.objectContaining({ key: 'target-last-name-court-order', documentKind: 'court_order', canonicalValue: 'Jordan', extractedValue: 'Jordan-Smith' }),
    ]));
  });

  it('detects canonical conflicts from snapshot-backed opaque upload ids without explicit extracted rows', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'passport-upload-final.pdf',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        extracted_snapshot: {
          fields: {
            first_name: { value: 'Alicia' },
            last_name: { value: 'Rivera-Smith' },
          },
        },
      },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(
      makeCase({
        current_first_name: 'Alex',
        current_last_name: 'Rivera',
      }),
      documents,
      [],
    );

    expect(snapshot.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'current-first-name-passport', canonicalValue: 'Alex', extractedValue: 'Alicia' }),
      expect.objectContaining({ key: 'current-last-name-passport', canonicalValue: 'Rivera', extractedValue: 'Rivera-Smith' }),
    ]));
  });

  it('ignores unverified extracted values when building canonical conflict signals', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { document_id: 'doc-passport', field_key: 'first_name', field_label: 'First name', field_value_masked: 'Alicia', source_type: 'document_extract', is_verified: false },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.conflicts).toEqual([]);
    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'first_name')).toBeNull();
  });

  it('only counts verified linked or manual fields as captured document truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];

    expect(getDocumentCapturedFieldKeys(documents, [
      {
        document_id: 'doc-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: false,
      },
      {
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'court_order')).toEqual(['court_order_date']);
  });

  it('prefers the strongest alias-matched document when verified extraction lives on the canonical row', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order-legacy',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        id: 'doc-court-order-canonical',
        document_kind: 'court_order',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order-canonical',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')).toBe('24-CV-1188');
    expect(getDocumentCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual(['case_number']);
  });

  it('ranks documents by unique canonical verified fields instead of duplicate raw alias rows', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order-duplicate-aliases',
        document_kind: 'court_order_name_change',
        display_name: 'Court order duplicate aliases',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        id: 'doc-court-order-stronger',
        document_kind: 'court_order',
        display_name: 'Court order stronger',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order-duplicate-aliases',
        field_key: 'signed dt',
        field_label: 'Signed dt',
        field_value_masked: 'Executed on Friday, April 5, 2026 1:30 PM PST',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order-duplicate-aliases',
        field_key: 'date of signature',
        field_label: 'Date of signature',
        field_value_masked: 'Friday, April 5, 2026 1:30 PM PST',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order-stronger',
        field_key: 'case no.',
        field_label: 'Case no.',
        field_value_masked: '24-cv - 1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')).toBe('24-CV-1188');
    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date')).toBe('2026-04-05');
  });

  it('prefers a real reviewed court-order document over a placeholder alias with the same extracted coverage', () => {
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

    expect(getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')).toBe('24-CV-1188');
    expect(getDocumentLinkedCapturedFieldKeys(documents, extractedFields, 'court_order')).toEqual(['case_number']);
  });

  it('distinguishes linked court-order grounding from manual fallback truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];

    expect(hasAnyLinkedDocumentFieldValue(documents, [
      {
        document_id: 'doc-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: false,
      },
    ], 'court_order', 'case_number')).toBe(true);

    expect(hasVerifiedLinkedDocumentFieldValue(documents, [
      {
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ], 'court_order', 'case_number')).toBe(false);

    expect(hasVerifiedLinkedDocumentFieldValue(documents, [
      {
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'court_order', 'case_number')).toBe(false);

    expect(hasVerifiedDocumentLinkedFieldValue(documents, [
      {
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'court_order', 'case_number')).toBe(true);

    expect(getVerifiedDocumentLinkedFieldValue(documents, [
      {
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'court_order', 'case_number')).toBeNull();

    expect(getVerifiedDocumentFieldValue(documents, [
      {
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'court_order', 'case_number')).toBe('24-CV-1188');
  });
});
