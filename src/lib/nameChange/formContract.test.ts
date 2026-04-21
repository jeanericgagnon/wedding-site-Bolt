import { describe, expect, it } from 'vitest';
import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
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

describe('name change shared form contract builder', () => {
  it('builds payloads from shared field specs and respects optional fields', () => {
    const definition: NameChangeFormContractDefinition = {
      formCode: 'TEST',
      label: 'Test form',
      fieldSpecs: [
        { fieldKey: 'required.first', label: 'Required first', sourceTargetField: 'applicant.current_first_name' },
        { fieldKey: 'optional.middle', label: 'Optional middle', sourceTargetField: 'applicant.current_middle_name', required: false },
      ],
    };

    const snapshot = buildNameChangeFormPayloadSnapshot(definition, makeCase({ current_middle_name: null }), [], []);
    expect(snapshot.formCode).toBe('TEST');
    expect(snapshot.summary).toEqual({
      ready: 1,
      missing: 0,
      trustedReady: 1,
      lowConfidence: 0,
      extractedBacked: 0,
    });
  });

  it('counts extracted-backed values from autofill-prep sources', () => {
    const definition: NameChangeFormContractDefinition = {
      formCode: 'TEST',
      label: 'Test form',
      fieldSpecs: [
        { fieldKey: 'new.last', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
      ],
    };
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

    const snapshot = buildNameChangeFormPayloadSnapshot(definition, makeCase(), documents, extractedFields);
    expect(snapshot.fields[0]).toMatchObject({
      value: 'Jordan-Smith',
      source: 'extracted_field',
    });
    expect(snapshot.summary.extractedBacked).toBe(1);
    expect(snapshot.summary.trustedReady).toBe(0);
    expect(snapshot.summary.lowConfidence).toBe(1);
  });

  it('counts metadata-backed extracted values as trusted ready', () => {
    const definition: NameChangeFormContractDefinition = {
      formCode: 'TEST',
      label: 'Test form',
      fieldSpecs: [
        { fieldKey: 'new.last', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
      ],
    };
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

    const snapshot = buildNameChangeFormPayloadSnapshot(definition, makeCase(), documents, extractedFields);
    expect(snapshot.summary.trustedReady).toBe(1);
    expect(snapshot.summary.lowConfidence).toBe(0);
  });
});
