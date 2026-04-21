import { describe, expect, it } from 'vitest';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeDocumentRepairQueue } from './documentRepairQueue';
import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
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

describe('name change document repair queue', () => {
  it('prioritizes required docs with thin metadata and linked blocking field risks', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), documents, extractedFields);
    const snapshots = [
      buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields),
      buildNameChangeTargetExecutionSnapshot('passport', makeCase(), documents, extractedFields),
    ];

    const queue = buildNameChangeDocumentRepairQueue(intake, snapshots);
    expect(queue[0]).toMatchObject({
      kind: 'marriage_certificate',
      severity: 'blocking',
    });
    expect(queue[0].impactSummary).toContain('metadata gaps');
    expect(queue[0].impactedTargets.length).toBeGreaterThan(0);
    expect(queue[0].impactedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetLabel: expect.any(String),
        label: expect.any(String),
      }),
    ]));
    expect(queue[0].nextActions).toEqual(expect.arrayContaining([
      expect.stringContaining('Fill metadata:'),
      expect.stringContaining('Capture extraction fields:'),
      expect.stringContaining('Recheck impacted packet fields:'),
    ]));
  });

  it('surfaces required not-started docs even before field lineage exists', () => {
    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), [], []);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), [], []),
    ]);

    expect(queue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'marriage_certificate',
        severity: 'blocking',
        intakeStatus: 'not_started',
        nextActions: expect.arrayContaining([
          expect.stringContaining('Add certified marriage certificate to intake'),
        ]),
      }),
    ]));
  });
});
