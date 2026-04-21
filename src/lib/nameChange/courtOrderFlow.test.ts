import { describe, expect, it } from 'vitest';
import { buildNameChangeCourtOrderExecutionSnapshot } from './courtOrderFlow';
import type { NameChangeCaseInput, NameChangeDocumentInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'court_order',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: null,
    marriage_date: null,
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['court_order'],
    structured_intake: {
      spouseLastName: null,
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('court-order path review execution snapshot', () => {
  it('is ready when court-order proof and identity coverage are present', () => {
    const documents: NameChangeDocumentInput[] = [
      {
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
    ];

    const snapshot = buildNameChangeCourtOrderExecutionSnapshot(makeCase(), documents, []);
    expect(snapshot.recommendedFormCode).toBe('COURT-ORDER-PATH-REVIEW');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checklist.find((item) => item.key === 'court-order-path-readiness')).toMatchObject({ status: 'attention' });
  });

  it('blocks when court-order proof is still missing', () => {
    const snapshot = buildNameChangeCourtOrderExecutionSnapshot(makeCase(), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Court-order path is selected, but no court-order proof is represented in intake yet.');
  });

  it('blocks when county context is missing for court-order jurisdiction review', () => {
    const documents: NameChangeDocumentInput[] = [
      {
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
    ];

    const snapshot = buildNameChangeCourtOrderExecutionSnapshot(makeCase({ county_residence: null }), documents, []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('County context is still missing, so court-order jurisdiction review cannot be grounded yet.');
  });
});
