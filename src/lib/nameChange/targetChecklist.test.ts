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
    expect(checklist.find((item) => item.key === 'target-legal-name-county')).toMatchObject({
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
    expect(checklist.find((item) => item.key === 'target-legal-name-county')).toMatchObject({ status: 'ready' });
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

    const sharedInstitutionChecklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.banks, makeCase(), documents, extractedFields);
    expect(sharedInstitutionChecklist.find((item) => item.key === 'canonical-extraction-alignment')).toMatchObject({
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
        current_middle_name: '',
        target_middle_name: '',
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

  it('keeps first-passport checklist support missing until citizenship proof exists in intake', () => {
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

    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.passport,
      makeCase({ has_us_passport: false, passport_needs_update: true }),
      documents,
      [],
    );

    expect(checklist.find((item) => item.key === 'passport-support-doc')).toMatchObject({
      kind: 'requirement',
      nextActionCategory: 'document',
      blocksReady: true,
      status: 'missing',
      reason: 'First-passport follow-through needs citizenship proof in intake before the DS-11 branch can actually run.',
    });
  });

  it('treats target middle name as part of target legal-name readiness when canonical truth includes one', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
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
        field_key: 'middle_name',
        field_label: 'Target middle name',
        field_value_masked: 'Quinn',
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
    ];

    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.dmv,
      makeCase({
        legal_basis: 'court_order',
        marriage_state: null,
        marriage_date: null,
        target_middle_name: 'Marie',
        structured_intake: {
          spouseLastName: null,
          travelBookedSoon: false,
          wantsDocumentIntakeHelp: true,
        },
        change_reasons: ['court_order'],
      }),
      documents,
      extractedFields,
    );
    expect(checklist.find((item) => item.key === 'target-legal-name-county')).toMatchObject({
      status: 'attention',
      reason: 'Target legal name + county available is populated, but at least one field still comes from a low-confidence source.',
    });
  });

  it('does not require target middle name when only extracted fields carry it outside canonical truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-05',
        extraction_confidence: 0.98,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
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
        field_key: 'middle_name',
        field_label: 'Target middle name',
        field_value_masked: 'Quinn',
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
    ];

    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.courtOrder,
      makeCase({
        legal_basis: 'court_order',
        marriage_state: null,
        marriage_date: null,
        target_middle_name: null,
        structured_intake: {
          spouseLastName: null,
          travelBookedSoon: false,
          wantsDocumentIntakeHelp: true,
        },
        change_reasons: ['court_order'],
      }),
      documents,
      extractedFields,
    );

    expect(checklist.find((item) => item.key === 'target-legal-name')).toMatchObject({
      status: 'ready',
      reason: 'Target legal name is available for the court-order path.',
    });
  });

  it('treats current middle name as part of shared current legal-name readiness when canonical truth includes one', () => {
    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.banks,
      makeCase({ current_middle_name: null }),
      [
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
        {
          document_kind: 'bank_statement',
          display_name: 'Bank statement',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [],
    );

    expect(checklist.find((item) => item.key === 'current-legal-name')).toMatchObject({
      status: 'ready',
    });

    const checklistWithMiddle = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.banks,
      makeCase(),
      [
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
        {
          document_kind: 'bank_statement',
          display_name: 'Bank statement',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [],
    );

    expect(checklistWithMiddle.find((item) => item.key === 'current-legal-name')).toMatchObject({
      status: 'ready',
      reason: 'Current legal name is available for banks and credit cards prep.',
    });
  });

  it('treats snapshot-backed opaque court-order uploads as ready checklist grounding', () => {
    const checklist = buildNameChangeTargetChecklist(
      NAME_CHANGE_EXECUTION_TARGETS.courtOrder,
      makeCase({
        legal_basis: 'court_order',
        marriage_state: null,
        marriage_date: null,
        current_middle_name: '',
        target_middle_name: '',
        structured_intake: {
          spouseLastName: null,
          travelBookedSoon: false,
          wantsDocumentIntakeHelp: true,
        },
        change_reasons: ['court_order'],
      }),
      [
        {
          id: 'court-order-upload-final.pdf',
          document_kind: 'court_order',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          extracted_snapshot: {
            fields: {
              first_name: { value: 'Alex' },
              last_name: { value: 'Jordan' },
              case_number: { value: '24-CV-1188' },
              court_order_date: { value: '2026-04-12' },
            },
          },
        },
      ],
      [],
    );

    expect(checklist.find((item) => item.key === 'court-order-reference-extraction')).toMatchObject({ status: 'ready' });
  });
});
