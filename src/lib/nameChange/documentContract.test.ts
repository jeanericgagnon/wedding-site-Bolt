import { describe, expect, it } from 'vitest';
import { NAME_CHANGE_DOCUMENT_CONTRACTS, buildNameChangeDocumentIntakeSnapshot } from './documentContract';
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
  it('treats marriage proof as a filed county record with certified-copy support', () => {
    expect(NAME_CHANGE_DOCUMENT_CONTRACTS.find((document) => document.kind === 'marriage_certificate')?.acceptedSignals).toEqual(
      expect.arrayContaining(['filed certificate record', 'certified copy', 'county clerk issuance', 'county recorder issuance']),
    );
  });

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
      missingExtractionFields: ['first_name', 'middle_name', 'last_name'],
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
      missingExtractionFields: ['first_name', 'middle_name', 'last_name', 'court_order_date'],
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
      missingExtractionFields: ['first_name', 'middle_name', 'last_name', 'case_number', 'court_order_date'],
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
      missingExtractionFields: ['first_name', 'middle_name', 'last_name'],
    });
    expect(snapshot.documents.find((document) => document.kind === 'court_order')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['case_number', 'court_order_date']),
    );
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

  it('prefers the reviewed duplicate with richer captured extraction truth when metadata ties', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-reviewed-sparse',
          document_kind: 'current_passport',
          display_name: 'Passport sparse',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-sparse-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
        {
          id: 'doc-reviewed-rich',
          document_kind: 'current_passport',
          display_name: 'Passport rich',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-rich-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
          extracted_snapshot: {
            fields: {
              issuance_date: { value: '2024-06-01' },
              first_name: { value: 'Taylor' },
              last_name: { value: 'Rivera' },
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'doc-reviewed-rich',
      displayName: 'Passport rich',
      capturedExtractionFields: ['issuance_date', 'first_name', 'last_name'],
      metadataReady: 0,
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

  it('prefers snapshot-backed reviewed documents even when they still carry draft placeholder ids', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-uploaded',
          document_kind: 'current_passport',
          display_name: 'Passport upload',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'passport-upload-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.92,
        },
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Passport reviewed from snapshot',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'current-passport-draft.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            metadata: {
              file_name_masked: 'passport-reviewed-•••.pdf',
              issuing_authority: 'U.S. Department of State',
              issuance_date: '2024-06-01T00:00:00Z',
              expiration_date: '2034-06-01T00:00:00Z',
              extraction_confidence: '0.94',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'draft-current_passport',
      displayName: 'Passport reviewed from snapshot',
      fileNameMasked: 'passport-reviewed-•••.pdf',
      intakeStatus: 'reviewed',
      metadataMissing: [],
      metadataReady: 1,
    });
  });

  it('surfaces the chosen canonical document identity for downstream workflows', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-court-order-review',
          document_kind: 'court_order',
          display_name: 'Filed court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'court-order-filed-•••.pdf',
          issuing_authority: 'San Diego Superior Court',
          issued_on: '2026-04-05',
          extraction_confidence: 0.95,
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      documentId: 'doc-court-order-review',
      displayName: 'Filed court order',
      fileNameMasked: 'court-order-filed-•••.pdf',
      intakeStatus: 'reviewed',
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
      extractionFieldCount: 2,
      missingExtractionFields: ['first_name', 'middle_name', 'last_name'],
    });
    expect(snapshot.documents.find((document) => document.kind === 'court_order')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['case_number', 'court_order_date']),
    );
  });

  it('does not borrow extracted fields from a weaker duplicate of the same contract kind', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-uploaded',
          document_kind: 'current_passport',
          display_name: 'Uploaded passport',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'passport-uploaded-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.9,
        },
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Reviewed passport shell',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-reviewed-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.94,
        },
      ],
      [
        {
          document_id: 'doc-passport-uploaded',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-passport-uploaded',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'draft-current_passport',
      intakeStatus: 'reviewed',
      extractionFieldCount: 0,
      capturedExtractionFields: [],
      missingExtractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    });
  });

  it('treats non-draft file-id aliases as canonical capture for the selected contract kind', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          extracted_snapshot: {
            fileName: 'passport-verified.pdf',
            issuingAuthority: 'U.S. Department of State',
            issuedOn: '2024-06-01',
            expiresOn: '2034-06-01',
            extractionConfidence: 0.94,
          },
        },
      ],
      [
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
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'draft-current_passport',
      intakeStatus: 'reviewed',
      extractionFieldCount: 3,
      capturedExtractionFields: ['first_name', 'last_name', 'issuance_date'],
      missingExtractionFields: ['middle_name'],
    });
  });

  it('promotes opaque snapshot-backed file ids into canonical passport capture truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'passport-upload-final.pdf',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          extracted_snapshot: {
            fields: {
              first_name: { value: 'Alex' },
              last_name: { value: 'Rivera' },
            },
            metadata: {
              fileName: 'passport-verified.pdf',
              issuingAuthority: 'U.S. Department of State',
              issuance_date: '2024-06-01',
              expiration_date: '2034-06-01',
              extractionConfidence: 0.94,
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'passport-upload-final.pdf',
      intakeStatus: 'reviewed',
      extractionFieldCount: 3,
      capturedExtractionFields: ['first_name', 'last_name', 'issuance_date'],
      missingExtractionFields: ['middle_name'],
    });
  });

  it('does not borrow extracted snapshot fields from a weaker duplicate of the same contract kind', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          extracted_snapshot: {
            fileName: 'passport-verified.pdf',
            issuingAuthority: 'U.S. Department of State',
            issuedOn: '2024-06-01',
            expiresOn: '2034-06-01',
            extractionConfidence: 0.94,
          },
        },
        {
          id: 'doc-passport-uploaded',
          document_kind: 'current_passport',
          display_name: 'Passport upload',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          extracted_snapshot: {
            fieldEntries: [
              { key: 'first_name', value: 'Alex' },
              { key: 'last_name', value: 'Jordan' },
            ],
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      documentId: 'draft-current_passport',
      intakeStatus: 'reviewed',
      extractionFieldCount: 1,
      capturedExtractionFields: ['issuance_date'],
      missingExtractionFields: ['first_name', 'middle_name', 'last_name'],
    });
    expect(snapshot.canonicalCase.documents.current_passport).toMatchObject({
      extractionFieldCount: 1,
      extractedFieldKeys: ['issuance_date'],
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

  it('surfaces canonical conflicts from reviewed extracted snapshots without separate extraction rows', () => {
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
          extracted_snapshot: {
            fields: {
              first_name: 'Alex',
              last_name: 'Rivera',
              spouse_last_name: 'Jordan-Smith',
              county: 'San Diego',
            },
            issuanceDate: '2026-04-05T00:00:00Z',
            certificate_no: 'MC-123',
          },
        },
      ],
      [],
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

  it('treats abbreviated county suffix values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-county-abbrev',
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
          document_id: 'doc-marriage-county-abbrev',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Orange Co.',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-county-abbrev',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-county-abbrev',
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

  it('treats punctuated labeled date values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-date',
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
          document_id: 'doc-marriage-date',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Orange',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-date',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-date',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on: 2026-04-05.',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats wrapped date values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-wrapped-date',
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
          document_id: 'doc-marriage-wrapped-date',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Orange',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped-date',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped-date',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on: (2026-04-05)',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats equals-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-equals',
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
          document_id: 'doc-marriage-equals',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county = orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-equals',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number = mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-equals',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on = 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats dash-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-dash',
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
          document_id: 'doc-marriage-dash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county — orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-dash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number — mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-dash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on — 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats dot-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-dot',
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
          document_id: 'doc-marriage-dot',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county. orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-dot',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number. mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-dot',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on. 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats pipe-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-pipe',
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
          document_id: 'doc-marriage-pipe',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county | orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-pipe',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number | mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-pipe',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on | 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats bullet-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-bullet',
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
          document_id: 'doc-marriage-bullet',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '• Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-bullet',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '1) Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-bullet',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '• Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats fullwidth-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-fullwidth',
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
          document_id: 'doc-marriage-fullwidth',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county：【orange county】',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number：【mc - 123】',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on：（2026-04-05）',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats checkbox-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-checkbox',
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
          document_id: 'doc-marriage-checkbox',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '[X] Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-checkbox',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '[ ] Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-checkbox',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '(x) Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats semicolon-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-semicolon',
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
          document_id: 'doc-marriage-semicolon',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county; orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-semicolon',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number； mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-semicolon',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on； 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats tilde-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-tilde',
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
          document_id: 'doc-marriage-tilde',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '∼ Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tilde',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '〜 Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tilde',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '~ Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats slash-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-slash',
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
          document_id: 'doc-marriage-slash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county / orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-slash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number / mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-slash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on / 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats tilde-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-tilde-separator',
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
          document_id: 'doc-marriage-tilde-separator',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county 〜 orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tilde-separator',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number ~ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tilde-separator',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on 〜 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats fullwidth-slash-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-fullwidth-slash',
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
          document_id: 'doc-marriage-fullwidth-slash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county ／ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth-slash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number ／ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth-slash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on ／ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats tight dash-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-tight-dash',
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
          document_id: 'doc-marriage-tight-dash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county—orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tight-dash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number—mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-tight-dash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on—2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats quote-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-quote-prefix',
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
          document_id: 'doc-marriage-quote-prefix',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '» Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-quote-prefix',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '› Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-quote-prefix',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '> Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats quote-and-checkbox-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-quote-checkbox',
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
          document_id: 'doc-marriage-quote-checkbox',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '> [x] Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-quote-checkbox',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '> [x] Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-quote-checkbox',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '> [x] Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('keeps verified extracted fields when a reviewed document replaces the draft placeholder id', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'marriage-certificate-upload',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'draft-marriage_certificate',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
        {
          document_id: 'draft-marriage_certificate',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2026-04-05',
          source_type: 'manual',
          is_verified: true,
        },
        {
          document_id: 'draft-marriage_certificate',
          field_key: 'county',
          field_label: 'Residence county',
          field_value_masked: 'san diego county',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      missingExtractionFields: ['first_name', 'last_name', 'spouse_last_name'],
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
    );
  });

  it('preserves verified extracted fields across matching document id swaps for the same kind', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'passport-upload-1',
          document_kind: 'current_passport',
          display_name: 'Passport upload',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: 'passport-upload-•••.pdf',
          extraction_confidence: 0.84,
        },
        {
          id: 'passport-reviewed-1',
          document_kind: 'current_passport',
          display_name: 'Passport reviewed',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-reviewed-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'passport-upload-1',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'manual',
          is_verified: true,
        },
        {
          document_id: 'passport-upload-1',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'current_passport')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['first_name', 'issuance_date']),
    );
  });

  it('treats kind-keyed extracted fields as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'marriage_certificate',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
        {
          document_id: 'marriage_certificate',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2026-04-05',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number', 'issuance_date']),
    );
  });

  it('treats document-suffixed kind keys as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'marriage certificate document',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats document-prefixed kind keys as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Current passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'uploaded passport document',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'current_passport')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['issuance_date']),
    );
  });

  it('treats file-extension draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'marriage certificate pdf',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats path-like draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'uploads/marriage certificate.pdf',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats query-like draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'uploads/marriage certificate.pdf?download=1',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats url-encoded draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'uploads/marriage%20certificate.pdf?token=abc',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats versioned file-name draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-current_passport',
          document_kind: 'current_passport',
          display_name: 'Current passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: 'U.S. Department of State',
          issued_on: '2024-06-01',
          expires_on: '2034-06-01',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'reviewed/passport upload v2.jpg',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '2024-06-01',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'current_passport')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['issuance_date']),
    );
  });

  it('treats query-filename draft aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'https://cdn.dayof.love/object/123?filename=marriage%20certificate.pdf&token=abc',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats content-disposition filename aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename%3D%22marriage%20certificate.pdf%22&token=abc',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats RFC5987 language-tagged content-disposition aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: "https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename*%3DUTF-8'en'marriage%2520certificate.pdf",
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats RFC2231 continuation content-disposition aliases as the canonical draft document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'draft-marriage_certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: 'Orange County Clerk',
          issued_on: '2026-04-05',
          extraction_confidence: 0.97,
        },
      ],
      [
        {
          document_id: 'https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename*0*%3DUTF-8%27%27marriage%2520%3B%20filename*1*%3Dcertificate.pdf',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'mc-123',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataReady: 1,
      canonicalConflicts: [],
    });
    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')?.capturedExtractionFields).toEqual(
      expect.arrayContaining(['certificate_number']),
    );
  });

  it('treats unicode checkbox-prefixed extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-unicode-checkbox',
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
          document_id: 'doc-marriage-unicode-checkbox',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: '✓ Residence county: orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-unicode-checkbox',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: '✓ Certificate number: mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-unicode-checkbox',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: '☑ Issued on: 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats wrapped extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-wrapped-values',
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
          document_id: 'doc-marriage-wrapped-values',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county: ‹orange county›',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped-values',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number: 《 mc - 123 》',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped-values',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on: 〈2026-04-05〉',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats fullwidth-hash-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-fullwidth-hash',
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
          document_id: 'doc-marriage-fullwidth-hash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county＃ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth-hash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number＃ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-fullwidth-hash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on＃ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats ideographic-dot-labeled extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-ideographic-dot',
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
          document_id: 'doc-marriage-ideographic-dot',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county。 orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-ideographic-dot',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number。 mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-ideographic-dot',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on。 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats small-form punctuation labels as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-small-form-punctuation',
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
          document_id: 'doc-marriage-small-form-punctuation',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county﹔ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-small-form-punctuation',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number﹔ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-small-form-punctuation',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on﹕ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats alternate colon labels as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-alt-colon',
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
          document_id: 'doc-marriage-alt-colon',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county꞉ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-colon',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number꞉ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-colon',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on∶ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats alternate slash labels as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-alt-slash',
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
          document_id: 'doc-marriage-alt-slash',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county⧸ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-slash',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number⧸ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-slash',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on⁄ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats presentation-form punctuation labels as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-presentation-punctuation',
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
          document_id: 'doc-marriage-presentation-punctuation',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county︔ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-presentation-punctuation',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate number﹦ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-presentation-punctuation',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued on︓ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats alternate slash-and-pipe labels as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-alt-slash-pipe',
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
          document_id: 'doc-marriage-alt-slash-pipe',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Residence county❘ orange county',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-slash-pipe',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate numberǀ mc - 123',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-alt-slash-pipe',
          field_key: 'issuance_date',
          field_label: 'Issued on',
          field_value_masked: 'Issued onᐟ 2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('treats labeled person-name values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', target_first_name: 'Alicia', target_middle_name: 'Quinn', target_last_name: 'Smith' }),
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
          field_key: 'middle_name',
          field_label: 'Middle name',
          field_value_masked: 'Middle name: quinn',
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
      capturedExtractionFields: expect.arrayContaining(['first_name', 'middle_name', 'last_name', 'case_number', 'court_order_date']),
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
  });

  it('treats punctuated labeled person and reference values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'court_order', target_first_name: 'Alicia', target_middle_name: 'Quinn', target_last_name: 'Smith' }),
      [
        {
          id: 'doc-court-order-punctuated',
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
          document_id: 'doc-court-order-punctuated',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'First name: alicia,',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order-punctuated',
          field_key: 'middle_name',
          field_label: 'Middle name',
          field_value_masked: 'Middle name: quinn,',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order-punctuated',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'New legal name - smith,',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order-punctuated',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: 'Case No. 24-cv-1188.',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order-punctuated',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.documents.find((document) => document.kind === 'court_order')).toMatchObject({
      capturedExtractionFields: expect.arrayContaining(['first_name', 'middle_name', 'last_name', 'case_number', 'court_order_date']),
      missingExtractionFields: [],
      canonicalConflicts: [],
    });
  });

  it('treats wrapped extracted values as canonical document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase({ legal_basis: 'marriage', county_residence: 'Orange' }),
      [
        {
          id: 'doc-marriage-wrapped',
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
          document_id: 'doc-marriage-wrapped',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'County: (orange county)',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'Certificate #: (mc - 123)',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage-wrapped',
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
      missingExtractionFields: expect.not.arrayContaining(['county', 'certificate_number', 'issuance_date']),
      canonicalConflicts: [],
    });
  });

  it('keeps optional other documents out of metadata-gap summary counts', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: undefined,
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
          id: undefined,
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

  it('counts extracted snapshot fields as canonical document truth for reviewed contracts', () => {
    const profile = makeCase();
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-record-1',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
        extracted_snapshot: {
          fields: {
            first_name: 'Alex',
            last_name: 'Rivera',
            spouse_last_name: 'Jordan',
            county: 'San Diego County',
          },
          issuanceDate: '2026-04-05T00:00:00Z',
          certificate_no: 'MC-441',
        },
      },
    ];

    const snapshot = buildNameChangeDocumentIntakeSnapshot(profile, documents, []);
    const contract = snapshot.documents.find((entry) => entry.kind === 'marriage_certificate');

    expect(contract).toMatchObject({
      kind: 'marriage_certificate',
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
    });
    expect(contract?.capturedExtractionFields).toHaveLength(6);
    expect(contract?.capturedExtractionFields).toEqual(expect.arrayContaining([
      'first_name',
      'last_name',
      'spouse_last_name',
      'issuance_date',
      'county',
      'certificate_number',
    ]));
  });

  it('treats snapshot metadata as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            issuingAuthority: 'U.S. Department of State',
            issuanceDate: '2024-06-01T00:00:00Z',
            expirationDate: '2034-06-01T00:00:00Z',
            confidence: 0.94,
            fields: {
              first_name: 'Alex',
              middle_name: 'Marie',
              last_name: 'Rivera',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: ['issuance_date', 'first_name', 'middle_name', 'last_name'],
    });
  });

  it('treats nested snapshot metadata fields as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-license',
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'driver-license-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            fields: {
              issuing_authority: 'California DMV',
              issued_on: '2025-03-04T00:00:00Z',
              expirationDate: '2030-03-04T00:00:00Z',
              extractionConfidence: '0.91',
              first_name: 'Alex',
              last_name: 'Rivera',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_drivers_license')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: ['middle_name'],
      capturedExtractionFields: ['issuance_date', 'first_name', 'last_name'],
    });
  });

  it('treats documentMetadata snapshot containers as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-marriage-certificate',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            documentMetadata: {
              issuing_authority: 'Orange County Clerk',
              issuance_date: '2026-04-12T00:00:00Z',
              extraction_confidence: '0.95',
              county: 'Orange',
              certificate_number: 'MC-12345',
            },
            fields: {
              first_name: 'Alex',
              last_name: 'Rivera',
              spouse_last_name: 'Jordan',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['county', 'certificate_number', 'issuance_date', 'first_name', 'last_name', 'spouse_last_name']),
    });
  });

  it('treats meta and documentInfo snapshot containers as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-meta',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            meta: {
              issuingAuthority: 'U.S. Department of State',
              issuanceDate: '2024-05-10T00:00:00Z',
            },
            documentInfo: {
              expirationDate: '2034-05-10T00:00:00Z',
              confidence: '0.93',
            },
            fields: {
              first_name: 'Alex',
              middle_name: 'Marie',
              last_name: 'Rivera',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats snapshot field arrays as canonical document truth for reviewed contracts', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-drivers-license-array',
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'driver-license-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            fields: [
              { field_key: 'first_name', value: 'Alex' },
              { key: 'middle_name', value: 'Marie' },
              { name: 'last_name', value: 'Rivera' },
            ],
            metadata: [
              { fieldKey: 'issuing_authority', value: 'California DMV' },
              { key: 'issuance_date', value: '2026-03-04T00:00:00Z' },
              { name: 'expiration_date', value: '2034-03-04T00:00:00Z' },
              { label: 'extraction_confidence', value: '0.87' },
            ],
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_drivers_license')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats issue and expiry metadata aliases as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-alias-metadata',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            issuingAgency: 'U.S. Department of State',
            issueDate: '2025-01-08T00:00:00Z',
            expiryDate: '2035-01-08T00:00:00Z',
            confidence: '0.91',
            fields: {
              first_name: 'Alex',
              middle_name: 'Marie',
              last_name: 'Rivera',
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats deeply nested snapshot value wrappers as canonical readiness truth for reviewed documents', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-deep-values',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            issuingAuthority: { value: { text: 'U.S. Department of State' } },
            issueDate: { value: { raw: '2025-01-08T00:00:00Z' } },
            expiryDate: { maskedValue: { value: '2035-01-08T00:00:00Z' } },
            confidence: { fieldValue: { text: '0.91' } },
            fields: {
              first_name: { value: { text: 'Alex' } },
              middle_name: { fieldValue: { raw: 'Marie' } },
              last_name: { maskedValue: { value: 'Rivera' } },
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats normalized and extracted value aliases as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-marriage-normalized-values',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'marriage-certificate-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            fields: [
              { field: 'spouse_last_name', normalizedValue: 'Jordan' },
              { fieldKey: 'county', extracted_value: 'San Diego County' },
              { key: 'certificate_number', displayValue: 'MC-441' },
            ],
            metadata: [
              { field: 'issuing_authority', normalizedValue: 'San Diego County Clerk' },
              { fieldKey: 'issuance_date', extractedValue: '2026-04-05T00:00:00Z' },
              { label: 'extraction_confidence', normalized_value: '0.97' },
            ],
            normalized_fields: {
              first_name: { normalized_value: 'Alex' },
              last_name: { extractedValue: 'Rivera' },
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'marriage_certificate')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['first_name', 'last_name', 'spouse_last_name', 'county', 'certificate_number', 'issuance_date']),
    });
  });

  it('treats root-level snapshot entry arrays as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-root-array',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: [
            { fieldKey: 'issuing_authority', value: 'U.S. Department of State' },
            { field: 'issuance_date', normalizedValue: '2024-06-01T00:00:00Z' },
            { key: 'expiration_date', extractedValue: '2034-06-01T00:00:00Z' },
            { label: 'extraction_confidence', value: '0.94' },
            { fieldKey: 'first_name', value: 'Alex' },
            { field: 'middle_name', normalizedValue: 'Marie' },
            { key: 'last_name', extractedValue: 'Rivera' },
          ],
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats stringified snapshot payloads as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-stringified-snapshot',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: JSON.stringify({
            fields: {
              first_name: { value: 'Alex' },
              middle_name: { normalizedValue: 'Marie' },
              last_name: { extractedValue: 'Rivera' },
            },
            metadata: {
              issuing_authority: 'U.S. Department of State',
              issuance_date: '2024-06-01T00:00:00Z',
              expiration_date: '2034-06-01T00:00:00Z',
              extraction_confidence: '0.94',
            },
          }),
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats wrapped snapshot payloads as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-wrapped-snapshot',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            payload: {
              data: {
                fields: {
                  first_name: { value: 'Alex' },
                  middle_name: { normalizedValue: 'Marie' },
                  last_name: { extractedValue: 'Rivera' },
                },
                metadata: {
                  issuing_authority: 'U.S. Department of State',
                  issuance_date: '2024-06-01T00:00:00Z',
                  expiration_date: '2034-06-01T00:00:00Z',
                  extraction_confidence: '0.94',
                },
              },
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats double-encoded and fenced snapshot payloads as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-double-encoded-snapshot',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: 'passport-•••.pdf',
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: JSON.stringify({
            payload: JSON.stringify({
              fields: {
                first_name: { value: 'Alex' },
                middle_name: { normalizedValue: 'Marie' },
                last_name: { extractedValue: 'Rivera' },
              },
              metadata: {
                issuing_authority: 'U.S. Department of State',
                issuance_date: '2024-06-01T00:00:00Z',
                expiration_date: '2034-06-01T00:00:00Z',
                extraction_confidence: '0.94',
              },
            }),
          }),
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['issuance_date', 'first_name', 'middle_name', 'last_name']),
    });
  });

  it('treats snapshot filenames as canonical reviewed document truth', () => {
    const snapshot = buildNameChangeDocumentIntakeSnapshot(
      makeCase(),
      [
        {
          id: 'doc-passport-snapshot-filename',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: null,
          issuing_authority: null,
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: {
            metadata: {
              file_name_masked: 'passport-reviewed-•••.pdf',
              issuing_authority: 'U.S. Department of State',
              issuance_date: '2024-06-01T00:00:00Z',
              expiration_date: '2034-06-01T00:00:00Z',
              extraction_confidence: '0.94',
            },
            fields: {
              first_name: { value: 'Alex' },
              middle_name: { normalizedValue: 'Marie' },
              last_name: { extractedValue: 'Rivera' },
            },
          },
        },
      ],
      [],
    );

    expect(snapshot.documents.find((document) => document.kind === 'current_passport')).toMatchObject({
      intakeStatus: 'reviewed',
      metadataMissing: [],
      missingExtractionFields: [],
      capturedExtractionFields: expect.arrayContaining(['first_name', 'middle_name', 'last_name']),
    });
  });
});
