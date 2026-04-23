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
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
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
    expect(plan.summary.readinessPercent).toBeGreaterThan(0);
    expect(plan.summary.executionCounts).toMatchObject({ todo: plan.steps.length, in_progress: 0, complete: 0 });
    expect(plan.steps.some((step) => step.title.includes('passport'))).toBe(true);
    const institutionsStep = plan.steps.find((step) => step.phase === 'institutional');
    expect(institutionsStep?.institutions).toContain('Employer payroll / HR');
    expect(plan.steps.find((step) => step.id === 'institution-irs-employer')?.timing).toContain('SSA');
  });

  it('surfaces blockers when the legal proof doc is missing', () => {
    const plan = buildNameChangePlan({ ...makeInput(), documents: [] });
    expect(plan.summary.blockers[0]).toContain('Certified marriage certificate');
    expect(plan.summary.missingInputs).toContain('Certified marriage certificate metadata');
    expect(plan.summary.nextBestAction).toContain('Fill:');
    expect(plan.steps.find((step) => step.id === 'federal-ssa')?.status).toBe('blocked');
  });

  it('keeps legal-proof steps blocked until intake proof is reviewed', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      documents: [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
    });

    expect(plan.summary.blockers).toContain('Certified marriage certificate is in intake but still needs review.');
    expect(plan.summary.missingInputs).toContain('Certified marriage certificate review');
    expect(plan.steps.find((step) => step.id === 'eligibility-proof')).toMatchObject({
      status: 'blocked',
      blockers: ['Certified marriage certificate is in intake but still needs review.'],
    });
    expect(plan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      status: 'blocked',
      blockers: ['Legal proof needs to be ready before SSA.'],
    });
  });

  it('pushes travel-sensitive caution notes when upcoming travel is flagged', () => {
    const plan = buildNameChangePlan(makeInput({ structured_intake: { spouseLastName: 'Jordan', travelBookedSoon: true, wantsDocumentIntakeHelp: true } }));
    expect(plan.summary.cautionNotes.some((note) => note.includes('Upcoming travel'))).toBe(true);
    expect(plan.steps.find((step) => step.id === 'institution-tsa-precheck')?.description).toContain('Best timing');
  });

  it('omits employment rollout institutions when the user is not employed', () => {
    const plan = buildNameChangePlan(makeInput({ employment_status: 'not_employed' }));
    expect(plan.steps.some((step) => step.id === 'institution-irs-employer')).toBe(false);
    expect(plan.steps.some((step) => step.id === 'institution-professional-licenses')).toBe(false);
  });

  it('treats legacy court-order proof aliases as real legal proof for guided execution', () => {
    const plan = buildNameChangePlan({
      ...makeInput({ legal_basis: 'court_order' }),
      documents: [
        {
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
    });

    expect(plan.summary.blockers).toEqual([]);
    expect(plan.steps.find((step) => step.id === 'eligibility-proof')).toMatchObject({
      status: 'ready',
      blockers: [],
    });
    expect(plan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      status: 'ready',
      blockers: [],
    });
  });

  it('keeps court-order plans blocked until alias proof is reviewed', () => {
    const plan = buildNameChangePlan({
      ...makeInput({ legal_basis: 'court_order' }),
      documents: [
        {
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
    });

    expect(plan.summary.blockers).toContain('Court order packet or signed order is in intake but still needs review.');
    expect(plan.summary.missingInputs).toContain('Court order packet or signed order review');
    expect(plan.steps.find((step) => step.id === 'eligibility-proof')).toMatchObject({
      status: 'blocked',
      blockers: ['Court order packet or signed order is in intake but still needs review.'],
    });
  });
});
