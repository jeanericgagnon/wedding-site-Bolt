import { describe, expect, it } from 'vitest';
import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import { buildNameChangePlan } from './engine';
import type { NameChangeCaseInput, NameChangeDocumentInput } from './types';

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

describe('name change target execution snapshot', () => {
  it('builds shared SSA execution snapshots with form payload + checklist', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.targetLabel).toContain('Social Security');
    expect(snapshot.recommendedFormCode).toBe('SSA-SS5');
    expect(snapshot.formPayload.formCode).toBe('SSA-SS5');
    expect(snapshot.checklist.length).toBeGreaterThan(0);
  });

  it('builds shared DMV execution snapshots with sequencing awareness', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('DMV');
    expect(snapshot.recommendedFormCode).toBe('CA-DL-44');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'satisfied' });
  });
});
