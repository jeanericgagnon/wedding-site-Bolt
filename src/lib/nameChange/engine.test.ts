import { describe, expect, it } from 'vitest';
import { buildNameChangePlan, evaluateCaliforniaNameChangeEligibility } from './engine';
import type { NameChangeEngineInput } from './types';

function makeInput(overrides: Partial<NameChangeEngineInput['profile']> = {}): NameChangeEngineInput {
  return {
    profile: {
      workflow_status: 'draft',
      launch_state: 'california',
      legal_basis: 'marriage',
      current_first_name: 'Alex',
      current_middle_name: 'Marie',
      current_last_name: 'Rivera',
      target_first_name: 'Alex',
      target_middle_name: 'Marie',
      target_last_name: 'Jordan',
      email: '',
      phone_last4: '',
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
      },
      latest_plan_summary: null,
      ...overrides,
    },
    documents: [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ],
    extractedFields: [],
  };
}

describe('name change engine', () => {
  it('keeps straightforward california marriage surname updates on marriage path', () => {
    const eligibility = evaluateCaliforniaNameChangeEligibility(makeInput());
    expect(eligibility.decision).toBe('approved_path');
    expect(eligibility.legalBasis).toBe('marriage');
  });

  it('falls back to court order when requested name is outside supported marriage combinations', () => {
    const eligibility = evaluateCaliforniaNameChangeEligibility(makeInput({ target_first_name: 'Avery', target_last_name: 'Moonbeam' }));
    expect(eligibility.decision).toBe('court_order_required');
    expect(eligibility.legalBasis).toBe('court_order');
  });

  it('builds federal-first workflow with passport and employer follow-through', () => {
    const plan = buildNameChangePlan(makeInput({ urgency_level: 'expedited' }));
    expect(plan.summary.legalPathLabel).toContain('marriage');
    expect(plan.summary.recommendedOrder[0]).toContain('Confirm certified marriage proof');
    expect(plan.summary.recommendedOrder[1]).toContain('Update Social Security first');
    expect(plan.steps.some((step) => step.title.includes('passport'))).toBe(true);
    const institutionsStep = plan.steps.find((step) => step.phase === 'institutional');
    expect(institutionsStep?.institutions).toContain('Employer payroll / HR');
  });

  it('surfaces blockers when the legal proof doc is missing', () => {
    const plan = buildNameChangePlan({ ...makeInput(), documents: [] });
    expect(plan.summary.blockers[0]).toContain('Certified marriage certificate');
    expect(plan.steps.find((step) => step.id === 'federal-ssa')?.status).toBe('blocked');
  });
});
