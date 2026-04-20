import { describe, expect, it } from 'vitest';
import { evaluateNameChangeExecutionPrerequisites } from './executionPrerequisites';
import { buildNameChangePlan } from './engine';
import type { NameChangeCaseInput, NameChangeExecutionPrerequisiteRule, NameChangeDocumentInput } from './types';

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

const RULES: NameChangeExecutionPrerequisiteRule[] = [
  {
    key: 'ssa-complete',
    label: 'SSA complete first',
    required: true,
    requiredStepId: 'federal-ssa',
    requiredStatuses: ['complete'],
    missingReason: 'SSA is not complete.',
    attentionReason: 'SSA is underway.',
    satisfiedReason: 'SSA is complete.',
  },
];

describe('name change execution prerequisites', () => {
  it('returns missing when prerequisite step has not started', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const plan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const dependencies = evaluateNameChangeExecutionPrerequisites(RULES, plan);
    expect(dependencies[0]).toMatchObject({ status: 'missing', reason: 'SSA is not complete.' });
  });

  it('returns satisfied when prerequisite step is complete', () => {
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
    const dependencies = evaluateNameChangeExecutionPrerequisites(RULES, plan);
    expect(dependencies[0]).toMatchObject({ status: 'satisfied', reason: 'SSA is complete.' });
  });
});
