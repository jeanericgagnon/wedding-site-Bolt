import { describe, expect, it } from 'vitest';
import { buildNameChangeTargetChecklist } from './targetChecklist';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
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

describe('name change target checklist', () => {
  it('requires both current first and last name when a checklist item declares multiple target fields', () => {
    const checklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.ssa, makeCase({ current_last_name: '' }), [], []);
    expect(checklist.find((item) => item.key === 'current-legal-name')).toMatchObject({
      kind: 'field_presence',
      status: 'missing',
    });
  });

  it('requires both target surname and county when a checklist item declares multiple target fields', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const checklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.dmv, makeCase({ county_residence: null }), documents, []);
    expect(checklist.find((item) => item.key === 'target-surname-county')).toMatchObject({
      status: 'missing',
    });
  });

  it('still marks multi-field checklist items ready once all required fields are populated', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const checklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.dmv, makeCase(), documents, []);
    expect(checklist.find((item) => item.key === 'current-legal-name')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.key === 'target-surname-county')).toMatchObject({ status: 'ready' });
  });

  it('carries explicit next-action intent on checklist items', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'marriage-doc',
        field_key: 'spouse_surname',
        field_label: 'Spouse surname',
        field_value_masked: 'Jordan-Smythe',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const checklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.ssa, makeCase(), documents, extractedFields);
    expect(checklist.find((item) => item.key === 'canonical-extraction-alignment')).toMatchObject({
      kind: 'requirement',
      nextActionCategory: 'document',
      blocksReady: true,
      status: 'attention',
    });

    const courtOrderChecklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.courtOrder,
      makeCase({
        legal_basis: 'court_order',
        marriage_state: null,
        marriage_date: null,
        structured_intake: {
          spouseLastName: null,
          travelBookedSoon: false,
          wantsDocumentIntakeHelp: true,
        },
        change_reasons: ['court_order'],
      }),
      [
        {
          id: 'court-order-doc',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'court-order-doc',
          field_key: 'first_name',
          field_label: 'Target first name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'court-order-doc',
          field_key: 'last_name',
          field_label: 'Target last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'court-order-doc',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'court-order-doc',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );
    expect(courtOrderChecklist.find((item) => item.key === 'court-order-path-readiness')).toMatchObject({
      kind: 'requirement',
      nextActionCategory: 'review',
      status: 'missing',
    });
  });

  it('marks field-presence checklist items as attention when values exist but only from low-confidence sources', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'Target first name',
        field_value_masked: 'Taylor',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Target last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.courtOrder,
      makeCase({ legal_basis: 'court_order', target_first_name: '', target_last_name: '' }),
      documents,
      extractedFields,
    );
    expect(checklist.find((item) => item.key === 'target-legal-name')).toMatchObject({
      kind: 'field_presence',
      status: 'attention',
      reason: 'Target legal name is populated for the court-order path, but at least one field still needs stronger document support.',
    });
  });
});
