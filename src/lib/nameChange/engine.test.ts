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
    expect(plan.summary.recommendedOrder[2]).toContain('Update your California DMV record');
    expect(plan.summary.recommendedOrder[3]).toContain('passport');
    expect(plan.summary.executionTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-legal-proof', sequenceLabel: '1 · proof first', status: 'ready', featureTag: 'core' }),
        expect.objectContaining({ id: 'track-ssa', sequenceLabel: '2 · federal anchor', status: 'ready' }),
        expect.objectContaining({ id: 'track-photo-id', sequenceLabel: '3 · photo ID chain', status: 'upcoming' }),
        expect.objectContaining({ id: 'track-passport', sequenceLabel: '4 · travel identity', status: 'upcoming', featureTag: 'travel' }),
        expect.objectContaining({ id: 'track-rollout', sequenceLabel: '5 · account rollout', status: 'upcoming', featureTag: 'rollout' }),
      ]),
    );
    expect(plan.summary.readinessPercent).toBeGreaterThan(0);
    expect(plan.summary.executionCounts).toMatchObject({ todo: plan.steps.length, in_progress: 0, complete: 0 });
    expect(plan.steps.some((step) => step.title.includes('passport'))).toBe(true);
    const institutionsStep = plan.steps.find((step) => step.phase === 'institutional');
    expect(institutionsStep?.institutions).toContain('Employer payroll / HR');
    expect(institutionsStep?.institutions).toEqual(
      expect.arrayContaining([
        'USCIS / immigration records',
        'IRS name / tax record alignment',
        'State tax agency and withholding records',
        'Banks and credit cards',
        'Investment, retirement, and loan accounts',
        'Student loans, servicers, and financial aid portals',
        'Mortgage, property title, and homeowner records',
        'Credit bureau identity file monitoring',
        'Retirement plan, pension, and beneficiary records',
        'Health, dental, vision, auto, renters, and life insurance',
        'Disability insurance and leave administrators',
        'Workers comp, leave, and claims administrators',
        'California voter registration',
        'County recorder, deed, and local property filings',
        'TSA PreCheck, Global Entry, and airline profiles',
        'Hotel loyalty, car registration/title, and auto insurance follow-through',
        'Vehicle registration and title records',
        'Frequent flyer, hotel, rail, and cruise loyalty accounts',
        'Professional licenses and certifications',
        'Phone plan, email/domain, and primary digital identity',
        'School, alumni, and transcript records',
        'Subscriptions, social profiles, and lifestyle memberships',
      ]),
    );
    expect(plan.steps.find((step) => step.id === 'institution-uscis-immigration-records')?.timing).toContain('legal proof');
    expect(plan.steps.find((step) => step.id === 'institution-state-tax-agency')?.timing).toContain('payroll');
    expect(plan.steps.find((step) => step.id === 'institution-credit-bureaus')?.timing).toContain('credit cards');
    expect(plan.steps.find((step) => step.id === 'institution-retirement-benefits')?.institutions).toContain('Retirement plan, pension, and beneficiary records');
    expect(plan.steps.find((step) => step.id === 'institution-frequent-flyer-hotel-rail')?.timing).toContain('passport');
    expect(plan.steps.find((step) => step.id === 'institution-irs-employer')?.timing).toContain('SSA');
    expect(plan.steps.find((step) => step.id === 'institution-irs-records')?.timing).toContain('SSA');
    expect(plan.steps.find((step) => step.id === 'institution-tsa-precheck')?.institutions).toContain('TSA PreCheck, Global Entry, and airline profiles');
    expect(plan.summary.milestoneChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'milestone-legal-proof', status: 'ready', dependsOnStepIds: ['eligibility-proof'] }),
        expect.objectContaining({ id: 'milestone-account-rollout', status: 'upcoming' }),
      ]),
    );
    expect(plan.summary.accountUpdateTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: 'Employer payroll / HR', subject: 'Name change update for payroll and benefits' }),
        expect.objectContaining({ audience: 'Bank or credit card support' }),
        expect.objectContaining({ audience: 'Insurance or subscription support' }),
        expect.objectContaining({ audience: 'Airline, hotel, loyalty, or travel support' }),
        expect.objectContaining({ audience: 'Phone, utilities, or primary digital identity support' }),
      ]),
    );
    expect(plan.summary.institutionCategoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'legal_government', institutionKeys: expect.arrayContaining(['uscis-immigration-records', 'irs-records', 'state-tax-agency', 'county-recorder-property']) }),
        expect.objectContaining({ id: 'financial', institutionKeys: expect.arrayContaining(['banks', 'investments-loans', 'student-loans-financial-aid', 'mortgage-property-records', 'credit-bureaus']) }),
        expect.objectContaining({ id: 'work_insurance', institutionKeys: expect.arrayContaining(['irs-employer', 'retirement-benefits', 'insurance', 'workers-comp-leave']) }),
        expect.objectContaining({ id: 'personal_lifestyle', institutionKeys: expect.arrayContaining(['phone-digital-identity', 'school-alumni-records', 'subscriptions-social']) }),
        expect.objectContaining({ id: 'travel_mobility', institutionKeys: expect.arrayContaining(['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail']) }),
      ]),
    );
  });

  it('surfaces blockers when the legal proof doc is missing', () => {
    const plan = buildNameChangePlan({ ...makeInput(), documents: [] });
    expect(plan.summary.blockers[0]).toContain('Certified marriage certificate');
    expect(plan.summary.executionTracks?.every((track) => track.status === 'blocked')).toBe(true);
    expect(plan.summary.missingInputs).toContain('Certified marriage certificate metadata');
    expect(plan.summary.nextBestAction).toContain('Fill:');
    expect(plan.steps.find((step) => step.id === 'federal-ssa')?.status).toBe('blocked');
    expect(plan.summary.milestoneChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'milestone-legal-proof', status: 'blocked' }),
        expect.objectContaining({ id: 'milestone-ssa', status: 'blocked' }),
      ]),
    );
  });

  it('surfaces conditional middle-name gaps when middle-name truth is already in play', () => {
    const plan = buildNameChangePlan(makeInput({
      current_middle_name: 'Marie',
      target_middle_name: '',
    }));

    expect(plan.summary.missingInputs).toContain('Target middle name');
    expect(plan.summary.nextBestAction).toBe('Fill: Target middle name');
  });

  it('does not require middle names when neither current nor target middle name is in play', () => {
    const plan = buildNameChangePlan(makeInput({
      current_middle_name: '',
      target_middle_name: '',
    }));

    expect(plan.summary.missingInputs).not.toContain('Current middle name');
    expect(plan.summary.missingInputs).not.toContain('Target middle name');
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

  it('keeps marriage-path steps blocked when out-of-state certificate grounding is still missing', () => {
    const plan = buildNameChangePlan({
      ...makeInput({ marriage_state: 'Nevada' }),
      documents: [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      extractedFields: [],
    });

    expect(plan.summary.blockers).toContain('Marriage certificate is present, but no grounded county or certificate-number extraction is represented yet for out-of-state follow-through.');
    expect(plan.summary.missingInputs).toContain('Out-of-state marriage certificate reference fields');
    expect(plan.steps.find((step) => step.id === 'eligibility-proof')).toMatchObject({
      status: 'blocked',
      blockers: ['Marriage certificate is present, but no grounded county or certificate-number extraction is represented yet for out-of-state follow-through.'],
    });
    expect(plan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      status: 'blocked',
      blockers: ['Legal proof needs to be ready before SSA.'],
    });
  });

  it('pushes travel-sensitive caution notes when upcoming travel is flagged', () => {
    const plan = buildNameChangePlan(makeInput({ structured_intake: { spouseLastName: 'Jordan', travelBookedSoon: true, wantsDocumentIntakeHelp: true } }));
    expect(plan.summary.cautionNotes.some((note) => note.includes('Upcoming travel'))).toBe(true);
    expect(plan.summary.executionTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-passport', summary: expect.stringContaining('Travel is on the board') }),
      ]),
    );
    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-travel-timing', severity: 'warning' }),
        expect.objectContaining({ id: 'edge-passport-branch', label: 'Passport renewal branch', severity: 'info' }),
      ]),
    );
    expect(plan.steps.find((step) => step.id === 'institution-tsa-precheck')?.description).toContain('Best timing');
    expect(plan.steps.find((step) => step.id === 'federal-passport')?.description).toContain('Renew or amend the existing U.S. passport carefully');
  });

  it('surfaces edge-case guidance for non-us passports and court-order workflow', () => {
    const plan = buildNameChangePlan(makeInput({
      is_us_citizen: false,
      target_first_name: 'Avery',
      target_last_name: 'Moonbeam',
    }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-non-us-passport', severity: 'warning' }),
        expect.objectContaining({ id: 'edge-passport-branch', label: 'Non-U.S. passport branch', severity: 'warning' }),
        expect.objectContaining({ id: 'edge-court-order-path', severity: 'info' }),
      ]),
    );
  });

  it('adds county-office variation handling for marriage proof grounding', () => {
    const plan = buildNameChangePlan(makeInput());

    expect(plan.steps.find((step) => step.id === 'eligibility-proof')?.description).toContain('county clerk or recorder');
    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-county-office-variation', label: 'County clerk / recorder variation', severity: 'info' }),
      ]),
    );
  });

  it('branches passport guidance for first-passport cases', () => {
    const plan = buildNameChangePlan(makeInput({ has_us_passport: false, passport_needs_update: true }));

    expect(plan.steps.find((step) => step.id === 'federal-passport')).toMatchObject({
      title: 'Apply for a passport in the new name',
    });
    expect(plan.steps.find((step) => step.id === 'federal-passport')?.description).toContain('first-passport branch');
    expect(plan.summary.executionTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-passport', summary: expect.stringContaining('First-passport work should start') }),
      ]),
    );
    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-passport-branch', label: 'First-passport branch', severity: 'info' }),
      ]),
    );
  });

  it('surfaces hyphenation and dual-surname guidance for exact-format rollout cases', () => {
    const plan = buildNameChangePlan(makeInput({
      current_last_name: 'Rivera',
      target_last_name: 'Rivera-Jordan',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-hyphenated-name', severity: 'info' }),
        expect.objectContaining({ id: 'edge-dual-name-path', severity: 'info' }),
      ]),
    );
  });

  it('surfaces target-name mismatch guidance when a marriage intake falls outside the california shortcut path', () => {
    const plan = buildNameChangePlan(makeInput({
      legal_basis: 'marriage',
      target_first_name: 'Alicia',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge-marriage-name-mismatch',
          label: 'Marriage shortcut target-name mismatch',
          detail: 'The requested target legal name does not fit the straight California marriage shortcut, so treat this as a court-order workflow unless the target name is corrected.',
          severity: 'warning',
        }),
        expect.objectContaining({
          id: 'edge-mismatch-recovery',
          label: 'Mismatch recovery needs court-order proof',
          severity: 'warning',
        }),
        expect.objectContaining({ id: 'edge-court-order-path', severity: 'info' }),
      ]),
    );
  });

  it('surfaces separate execution guidance when both partners are changing names', () => {
    const plan = buildNameChangePlan(makeInput({ change_reasons: ['marriage', 'both_partners_change_name'] }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-both-partners-changing', severity: 'info' }),
      ]),
    );
  });

  it('surfaces separate execution guidance from structured dual-partner intake', () => {
    const plan = buildNameChangePlan(makeInput({
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
        bothPartnersChangeName: true,
      },
    }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-both-partners-changing', severity: 'info' }),
      ]),
    );
    expect(plan.summary.dualPartnerProofTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dual-partner-ssa-proof',
          dependsOnStepIds: ['dual-partner-ssa-partner-a-proof', 'dual-partner-ssa-partner-b-proof'],
          requiredProof: ['Partner A SSA confirmation', 'Partner B SSA confirmation'],
        }),
        expect.objectContaining({
          id: 'dual-partner-dmv-proof',
          dependsOnStepIds: ['dual-partner-dmv-partner-a-proof', 'dual-partner-dmv-partner-b-proof'],
          requiredProof: ['Partner A updated photo ID', 'Partner B updated photo ID'],
        }),
        expect.objectContaining({
          id: 'dual-partner-rollout-proof',
          dependsOnStepIds: ['dual-partner-rollout-partner-a-proof', 'dual-partner-rollout-partner-b-proof'],
          requiredProof: expect.arrayContaining(['Partner A account confirmations', 'Partner B account confirmations']),
        }),
      ]),
    );
    expect(plan.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dual-partner-ssa-partner-a-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner A SSA confirmation or receipt']),
        }),
        expect.objectContaining({
          id: 'dual-partner-ssa-partner-b-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner B SSA confirmation or receipt']),
        }),
        expect.objectContaining({
          id: 'dual-partner-dmv-partner-a-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner A updated photo ID']),
        }),
        expect.objectContaining({
          id: 'dual-partner-dmv-partner-b-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner B updated photo ID']),
        }),
        expect.objectContaining({
          id: 'dual-partner-rollout-partner-a-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner A account confirmations']),
        }),
        expect.objectContaining({
          id: 'dual-partner-rollout-partner-b-proof',
          executionStatus: 'todo',
          evidenceNeeded: expect.arrayContaining(['Partner B account confirmations']),
        }),
      ]),
    );
  });

  it('omits employment rollout institutions when the user is not employed', () => {
    const plan = buildNameChangePlan(makeInput({ employment_status: 'not_employed' }));
    expect(plan.steps.some((step) => step.id === 'institution-irs-employer')).toBe(false);
    expect(plan.steps.some((step) => step.id === 'institution-professional-licenses')).toBe(false);
    expect(plan.steps.some((step) => step.id === 'institution-disability-insurance')).toBe(false);
    expect(plan.steps.some((step) => step.id === 'institution-retirement-benefits')).toBe(false);
    expect(plan.steps.some((step) => step.id === 'institution-workers-comp-leave')).toBe(false);
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
