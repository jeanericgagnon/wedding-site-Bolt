import { describe, expect, it } from 'vitest';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
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
      capturedExtractionFields: expect.arrayContaining(['issuance_date']),
    });
    expect(snapshot.summary.metadataReady).toBe(1);
    expect(snapshot.summary.autofillReady).toBe(0);
    expect(snapshot.summary.extractionGaps).toBe(1);
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
          storage_mode: 'uploaded_blob',
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
      storageMode: 'uploaded_blob',
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
      extractionFieldCount: 1,
      capturedExtractionFields: ['issuance_date'],
    });
  });
});
