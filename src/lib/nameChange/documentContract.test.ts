import { describe, expect, it } from 'vitest';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { createDraftNameChangeDocument, upsertDraftNameChangeExtractedField } from './intakeDraft';
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

describe('name change document intake contract', () => {
  it('builds required-document readiness and extraction gap summary', () => {
    const documents: NameChangeDocumentInput[] = [
      {
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
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: '2026-04-05',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeDocumentIntakeSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.summary.requiredReady).toBeGreaterThanOrEqual(1);
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      required: true,
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: expect.arrayContaining(['first_name', 'last_name']),
    });
    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      metadataMissing: expect.arrayContaining(['issuing authority', 'issued date', 'expiration date', 'extraction confidence']),
    });
    expect(snapshot.summary.metadataReady).toBe(1);
    expect(snapshot.summary.metadataGaps).toBe(1);
  });

  it('switches required legal proof to court order for court-order cases', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(makeCase({ legal_basis: 'court_order' }), [], []);
    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({ required: true });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({ required: false });
  });

  it('counts uploaded required proof as still missing from readiness until review is complete', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'San Diego County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'driver-license-•••.pdf',
          issuing_authority: 'California DMV',
          issued_on: '2025-01-10',
          expires_on: '2030-01-10',
          extraction_confidence: 0.95,
        },
        {
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
        {
          document_kind: 'social_security_card',
          display_name: 'Social Security card',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'ssa-card-•••.pdf',
          issuing_authority: 'Social Security Administration',
          issued_on: '2020-01-01',
          extraction_confidence: 0.9,
        },
        {
          document_kind: 'birth_certificate',
          display_name: 'Birth certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'birth-certificate-•••.pdf',
          issuing_authority: 'California Department of Public Health',
          issued_on: '1990-01-01',
          extraction_confidence: 0.9,
        },
        {
          document_kind: 'proof_of_address',
          display_name: 'Proof of address',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'utility-bill-•••.pdf',
          issuing_authority: 'SDG&E',
          issued_on: '2026-04-01',
          extraction_confidence: 0.88,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      required: true,
      intakeStatus: 'uploaded',
    });
    expect(snapshot.summary.requiredReady).toBe(5);
    expect(snapshot.summary.requiredMissing).toBe(1);
  });

  it('counts reviewed required proof with metadata gaps as still missing from readiness', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: null,
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'driver-license-•••.pdf',
          issuing_authority: 'California DMV',
          issued_on: '2025-01-10',
          expires_on: '2030-01-10',
          extraction_confidence: 0.95,
        },
        {
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
        {
          document_kind: 'social_security_card',
          display_name: 'Social Security card',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'ssa-card-•••.pdf',
          issuing_authority: 'Social Security Administration',
          issued_on: '2020-01-01',
          extraction_confidence: 0.9,
        },
        {
          document_kind: 'birth_certificate',
          display_name: 'Birth certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'birth-certificate-•••.pdf',
          issuing_authority: 'California Department of Public Health',
          issued_on: '1990-01-01',
          extraction_confidence: 0.9,
        },
        {
          document_kind: 'proof_of_address',
          display_name: 'Proof of address',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'utility-bill-•••.pdf',
          issuing_authority: 'SDG&E',
          issued_on: '2026-04-01',
          extraction_confidence: 0.88,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      required: true,
      intakeStatus: 'reviewed',
      metadataMissing: ['issuing authority'],
      metadataReady: 0,
      extractionFieldCount: 0,
      expectedExtractionFields: [],
      capturedExtractionFields: [],
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
    expect(snapshot.summary.requiredReady).toBe(5);
    expect(snapshot.summary.requiredMissing).toBe(1);
    expect(snapshot.summary.autofillReady).toBe(0);
  });

  it('keeps metadata-incomplete reviewed documents out of extraction-gap summary', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: ['issuing authority'],
      extractionFieldCount: 0,
      expectedExtractionFields: [],
      capturedExtractionFields: [],
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
    expect(snapshot.summary.extractionGaps).toBe(0);
  });

  it('keeps uploaded preferred documents out of reviewed-ready summary counters until review is complete', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
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
      ],
      [
        {
          document_id: null,
          field_key: 'issuance_date',
          field_label: 'Issue date',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'uploaded',
      metadataReady: 0,
      capturedExtractionFields: [],
    });
    expect(snapshot.summary.metadataReady).toBe(1);
    expect(snapshot.summary.autofillReady).toBe(0);
    expect(snapshot.summary.extractionGaps).toBe(1);
  });

  it('treats draft uploaded documents as missing extraction confidence until real review data exists', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Passport draft',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'current-passport-draft.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'uploaded',
      metadataMissing: expect.arrayContaining(['masked filename', 'issuing authority', 'issued date', 'expiration date', 'extraction confidence']),
      metadataReady: 0,
    });
    expect(snapshot.summary.metadataGaps).toBe(1);
  });

  it('treats reviewed draft filenames as metadata gaps until a real masked filename exists', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-reviewed',
          document_kind: 'current_passport',
          display_name: 'Passport reviewed',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'current-passport-draft.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: ['masked filename'],
      metadataReady: 0,
    });
    expect(snapshot.summary.metadataGaps).toBe(1);
    expect(snapshot.summary.metadataReady).toBe(0);
  });

  it('treats court_order_name_change as the court-order intake contract and exposes case-number extraction gaps', () => {
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

    const snapshotWithoutCaseNumber = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      documents,
      [
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshotWithoutCaseNumber.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      required: true,
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: expect.arrayContaining(['case_number']),
    });

    const snapshotWithCaseNumber = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      documents,
      [
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
      ],
    );

    expect(snapshotWithCaseNumber.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['case_number', 'court_order_date']),
    });
  });

  it('prefers the strongest matching document when alias duplicates exist in intake', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-stale-alias',
          document_kind: 'court_order_name_change',
          display_name: 'Court order alias',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'court-order-•••.pdf',
        },
        {
          id: 'doc-canonical',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
    });
  });

  it('treats raw linked court-order date values as captured after contract-level normalization', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: 'Executed on Friday, April 5, 2026 1:30 PM PST',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: ['court_order_date'],
      missingExtractionFields: expect.arrayContaining(['case_number']),
    });
  });

  it('treats aliased raw extraction field keys as canonical captured contract truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'signed dt',
          field_label: 'Signed dt',
          field_value_masked: 'Executed on Friday, April 5, 2026 1:30 PM PST',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'case no.',
          field_label: 'Case no.',
          field_value_masked: '24-cv - 1188',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['case_number', 'court_order_date']),
      missingExtractionFields: ['first_name', 'last_name'],
    });
  });

  it('treats raw case-hash extraction labels as canonical captured case numbers', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'case #',
          field_label: 'Case #',
          field_value_masked: '24-cv - 1188',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: ['case_number'],
      missingExtractionFields: ['first_name', 'last_name', 'court_order_date'],
    });
  });

  it('does not treat manual fallback extraction as document-captured truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          field_key: 'case #',
          field_label: 'Case #',
          field_value_masked: '24-cv - 1188',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: [],
      missingExtractionFields: ['first_name', 'last_name', 'case_number', 'court_order_date'],
    });
  });

  it('does not let duplicate alias rows on a weaker document outrank the stronger court-order truth source', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-court-order-duplicate-aliases',
          document_kind: 'court_order_name_change',
          display_name: 'Court order duplicate aliases',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'court-order-duplicate-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.7,
        },
        {
          id: 'doc-court-order-stronger',
          document_kind: 'court_order',
          display_name: 'Court order stronger',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-stronger-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
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
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      intakeStatus: 'reviewed',
      capturedExtractionFields: ['case_number'],
      missingExtractionFields: ['first_name', 'last_name', 'court_order_date'],
    });
  });

  it('prefers reviewed metadata-ready documents over uploaded metadata-light duplicates', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-uploaded',
          document_kind: 'current_passport',
          display_name: 'Passport upload',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
        {
          id: 'doc-reviewed',
          document_kind: 'current_passport',
          display_name: 'Passport reviewed',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-reviewed-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      metadataReady: 1,
    });
  });

  it('prefers persisted documents over draft placeholders when both exist', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Passport draft',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'current-passport-draft.pdf',
          extraction_confidence: 0.92,
        },
        {
          id: 'doc-reviewed',
          document_kind: 'current_passport',
          display_name: 'Passport reviewed',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-reviewed-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      metadataReady: 1,
    });
  });

  it('prefers the canonical document kind when duplicate alias rows are otherwise tied', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-alias',
          document_kind: 'court_order_name_change',
          display_name: 'Court order alias',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
        {
          id: 'doc-canonical',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      metadataReady: 1,
    });
    expect(snapshot.summary.metadataReady).toBeGreaterThanOrEqual(1);
  });

  it('uses strongest-document extraction counts when alias duplicates disagree', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-alias',
          document_kind: 'court_order_name_change',
          display_name: 'Court order alias',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'court-order-•••.pdf',
        },
        {
          id: 'doc-canonical',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          document_id: 'doc-canonical',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-canonical',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      intakeStatus: 'reviewed',
      extractionFieldCount: 2,
      capturedExtractionFields: ['case_number', 'court_order_date'],
    });
  });

  it('keeps captured extraction fields tied to the selected strongest court-order document', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [
        {
          id: 'doc-alias',
          document_kind: 'court_order_name_change',
          display_name: 'Court order alias',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'court-order-•••.pdf',
        },
        {
          id: 'doc-canonical',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.93,
        },
      ],
      [
        {
          document_id: 'doc-alias',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-01',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-canonical',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      intakeStatus: 'reviewed',
      extractionFieldCount: 1,
      capturedExtractionFields: ['case_number'],
      missingExtractionFields: ['first_name', 'last_name', 'court_order_date'],
    });
  });

  it('deduplicates repeated captured extraction field keys in contract output', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
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
      ],
      [
        {
          field_key: 'issuance_date',
          field_label: 'Issue date',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      extractionFieldCount: 0,
      capturedExtractionFields: [],
      missingExtractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    });
  });

  it('does not count conflict-heavy documents as ready when fields are present', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
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
      ],
      [
        {
          document_id: 'doc-marriage',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Rivera',
          source_type: 'document_extract',
          is_verified: true,
        },
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
          field_key: 'issuance_date',
          field_label: 'Issue date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'San Diego',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      metadataReady: 0,
      missingExtractionFields: [],
      canonicalConflicts: [expect.objectContaining({ key: 'target-last-name-marriage' })],
    });
    expect(snapshot.summary.requiredReady).toBe(0);
    expect(snapshot.summary.requiredMissing).toBe(6);
    expect(snapshot.summary.metadataReady).toBe(0);
    expect(snapshot.summary.metadataGaps).toBe(1);
    expect(snapshot.summary.autofillReady).toBe(0);
    expect(snapshot.summary.extractionGaps).toBe(1);
  });

  it('does not surface extraction expectations for documents that are not started', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [],
      [
        {
          field_key: 'issuance_date',
          field_label: 'Issue date',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'not_started',
      extractionFieldCount: 0,
      expectedExtractionFields: [],
      capturedExtractionFields: [],
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
  });

  it('treats county values with county affixes as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.95,
        },
      ],
      [
        {
          document_id: 'doc-marriage',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'County of Orange',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'issuance_date',
          field_label: 'Issue date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county']),
      canonicalConflicts: [],
    });
  });

  it('treats labeled county values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-county',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.96,
        },
      ],
      [
        {
          document_id: 'doc-marriage-county',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-county',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-county',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county']),
      canonicalConflicts: [],
    });
  });

  it('treats labeled reference-number values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order',
          display_name: 'Certified court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: 'Case No. 24-cv-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Signed date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['case_number', 'court_order_date']),
      missingExtractionFields: expect.not.arrayContaining(['case_number']),
      canonicalConflicts: [],
    });
  });

  it('treats labeled person-name values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', target_first_name: 'Alicia', target_last_name: 'Smith' }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order',
          display_name: 'Filed court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-•••.pdf',
          issuing_authority: 'Superior Court of California',
          issued_on: '2026-04-05',
          extraction_confidence: 0.95,
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'First name: alicia',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'New legal name - smith',
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
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['first_name', 'last_name', 'case_number', 'court_order_date']),
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
  });

  it('keeps optional other documents out of metadata-gap summary counts', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: null,
          document_kind: 'other',
          display_name: 'Other supporting document',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: null,
          issuing_authority: null,
          issued_on: null,
          extraction_confidence: null,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'other')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
    });
    expect(snapshot.summary.metadataGaps).toBe(0);
  });

  it('keeps optional other documents out of metadata-ready summary counts', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: null,
          document_kind: 'other',
          display_name: 'Other supporting document',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'supporting-doc-•••.pdf',
          issuing_authority: 'Manual upload',
          issued_on: '2026-04-01',
          extraction_confidence: 0.88,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'other')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 0,
      metadataMissing: [],
      expectedExtractionFields: [],
      capturedExtractionFields: [],
      missingExtractionFields: [],
    });
    expect(snapshot.summary.metadataReady).toBe(0);
    expect(snapshot.summary.autofillReady).toBe(0);
    expect(snapshot.summary.extractionGaps).toBe(0);
    expect(snapshot.summary.requiredReady).toBe(0);
    expect(snapshot.summary.requiredMissing).toBe(6);
  });

  it('treats intake aliases for supporting documents as canonical contract kinds', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        createDraftNameChangeDocument('marriage license # copy' as never, 'Marriage license # copy'),
        createDraftNameChangeDocument('social security + SSA card' as never, 'SSA card'),
        createDraftNameChangeDocument('bank statement' as never, 'Bank statement'),
        createDraftNameChangeDocument('residency document' as never, 'Residency document'),
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'uploaded',
    });
    expect(snapshot.documents.find((document) => document.kind === 'social_security_card')).toMatchObject({
      intakeStatus: 'uploaded',
    });
    expect(snapshot.documents.find((document) => document.kind === 'proof_of_address')).toMatchObject({
      intakeStatus: 'uploaded',
    });
    expect(snapshot.documents.find((document) => document.kind === 'other')).toMatchObject({
      intakeStatus: 'not_started',
    });
  });

  it('treats normalized draft extraction aliases as canonical contract capture for marriage and court-order docs', () => {
    const marriageDraft = {
      ...createDraftNameChangeDocument('marriage certificate' as never, 'Marriage certificate'),
      id: 'doc-marriage',
      intake_status: 'reviewed' as const,
      file_name_masked: 'marriage-certificate-•••.pdf',
      issuing_authority: 'San Diego County Clerk',
      issued_on: '2026-04-05',
      extraction_confidence: 0.97,
    };
    const courtOrderDraft = {
      ...createDraftNameChangeDocument('court order name change' as never, 'Court order'),
      id: 'doc-court-order',
      intake_status: 'reviewed' as const,
      file_name_masked: 'court-order-•••.pdf',
      issuing_authority: 'San Diego Superior Court',
      issued_on: '2026-04-05',
      extraction_confidence: 0.93,
    };
    const extractedFields = upsertDraftNameChangeExtractedField(
      upsertDraftNameChangeExtractedField(
      upsertDraftNameChangeExtractedField([], marriageDraft.id, 'cert #' as never, '  ', 'mc - 123'),
      courtOrderDraft.id,
      'order entered on' as never,
      '  ',
      'Executed on Friday, April 5, 2026 1:30 PM PST',
    ),
      courtOrderDraft.id,
      'case #' as never,
      '  ',
      '24–cv—1188',
    );

    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', marriage_state: null, marriage_date: null }),
      [marriageDraft, courtOrderDraft],
      extractedFields,
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: ['certificate_number'],
      extractionFieldCount: 1,
    });
    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['case_number', 'court_order_date']),
      extractionFieldCount: 2,
    });
    expect(extractedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field_key: 'certificate_number', field_value_masked: 'MC-123' }),
      expect.objectContaining({ field_key: 'case_number', field_value_masked: '24-CV-1188' }),
      expect.objectContaining({ field_key: 'court_order_date', field_value_masked: '2026-04-05' }),
    ]));
  });
});
