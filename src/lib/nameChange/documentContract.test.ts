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
});
