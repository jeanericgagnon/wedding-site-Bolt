import { describe, expect, it } from 'vitest';
import {
  buildNameChangePlan,
  evaluateCaliforniaNameChangeEligibility,
  formatAccountUpdateChecklistGuidanceLine,
  getAccountUpdateTemplateActionLabel,
  getAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateCopyLabel,
  getAccountUpdateTemplateReadinessActionLabel,
  getAccountUpdateTemplateReadinessIntroLine,
  getAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateReadinessSubjectPrefix,
  getAccountUpdateTemplateStateLine,
  getAccountUpdateTemplateStatusLabel,
  getAccountUpdateTemplateStatusLine,
  getDefaultAccountUpdateBlockingProofHopLabel,
  getFallbackBlockingProofHopLabel,
  normalizeAccountUpdateChecklistItems,
  formatAccountUpdateProofLine,
  normalizeAccountUpdateProofItems,
} from './engine';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
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
  it('omits empty proof-document lines from account-update template bodies', () => {
    expect(formatAccountUpdateProofLine([], 'I am ready to send the current packet.')).toBe('');
  });

  it('keeps readiness-aware proof copy when account-update proof documents exist', () => {
    expect(formatAccountUpdateProofLine(
      ['Certified legal name-change proof', 'Updated photo ID or DMV receipt'],
      'The updated ID is the current gating proof item.',
    )).toBe('I can provide Certified legal name-change proof, Updated photo ID or DMV receipt. The updated ID is the current gating proof item.');
  });

  it('normalizes account-update proof documents before template surfaces use them', () => {
    expect(normalizeAccountUpdateProofItems([
      ' Certified legal name-change proof. ',
      'Certified legal name-change proof',
      'Updated photo ID or DMV receipt.',
      '',
    ])).toEqual(['Certified legal name-change proof', 'Updated photo ID or DMV receipt']);
  });

  it('normalizes account-update checklist items without repeating the same proof sentence', () => {
    expect(normalizeAccountUpdateChecklistItems([
      'Certified legal name-change proof',
      ' Certified legal name-change proof. ',
      'Wait to send until SSA is the next cleared proof hop.',
      'Wait to send until SSA is the next cleared proof hop',
      '   ',
    ])).toEqual([
      'Certified legal name-change proof',
      'Wait to send until SSA is the next cleared proof hop.',
    ]);
  });

  it('omits punctuation-only checklist guidance snippets when formatting engine template copy', () => {
    expect(formatAccountUpdateChecklistGuidanceLine(' . ', '.')).toBe('');
    expect(formatAccountUpdateChecklistGuidanceLine('Use this to learn the payroll intake path while SSA alignment is still upstream.', ' . ')).toBe(
      'Use this to learn the payroll intake path while SSA alignment is still upstream.',
    );
  });

  it('falls back to generic proof-hop labels when blocker labels are blank whitespace', () => {
    expect(getFallbackBlockingProofHopLabel('in_progress', '   ')).toBe('current proof pending');
    expect(getFallbackBlockingProofHopLabel('upcoming', '   ')).toBe('next proof hop pending');
    expect(getFallbackBlockingProofHopLabel('blocked', '   ')).toBe('proof chain pending');
  });

  it('maps default blocking proof-hop labels by template and readiness', () => {
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-payroll', 'in_progress')).toBe('SSA pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-tax', 'upcoming')).toBe('SSA pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-bank', 'upcoming')).toBe('ID pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-insurance', 'in_progress')).toBe('ID pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-digital-identity', 'upcoming')).toBe('ID pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-licenses', 'in_progress')).toBe('ID pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-travel', 'upcoming')).toBe('passport pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-bank', 'blocked')).toBe('legal proof pending');
    expect(getDefaultAccountUpdateBlockingProofHopLabel('template-payroll', 'ready')).toBeUndefined();
  });

  it('shares the base readiness action labels across template surfaces', () => {
    expect(getAccountUpdateTemplateReadinessActionLabel('ready')).toBe('send now');
    expect(getAccountUpdateTemplateReadinessActionLabel('complete')).toBe('confirm sync');
    expect(getAccountUpdateTemplateReadinessActionLabel('in_progress')).toBe('draft now, send after current proof clears');
    expect(getAccountUpdateTemplateReadinessActionLabel('upcoming')).toBe('ask before next proof hop');
    expect(getAccountUpdateTemplateReadinessActionLabel('blocked')).toBe('ask intake rules now');
  });

  it('shares explicit readiness subject prefixes across template bodies', () => {
    expect(getAccountUpdateTemplateReadinessSubjectPrefix('ready')).toBe('Send now (proof packet ready)');
    expect(getAccountUpdateTemplateReadinessSubjectPrefix('complete')).toBe('Confirm sync (proof chain complete)');
    expect(getAccountUpdateTemplateReadinessSubjectPrefix('in_progress')).toBe('Draft now, send after current proof clears');
  });

  it('shares readiness intro lines across template bodies', () => {
    expect(getAccountUpdateTemplateReadinessIntroLine('ready')).toBe('My proof packet is ready, so I can submit this update now.');
    expect(getAccountUpdateTemplateReadinessIntroLine('complete')).toBe('My proof chain should already be complete, so I mainly need to confirm the downstream sync.');
    expect(getAccountUpdateTemplateReadinessIntroLine('upcoming', 'SSA pending')).toBe('I am prepping this ask now, but I am not sending the final packet until the next proof hop clears (SSA pending).');
    expect(getAccountUpdateTemplateReadinessIntroLine('blocked', 'legal proof pending')).toBe('I am only collecting the intake rules for now until the proof chain is ready (legal proof pending).');
  });

  it('shares template audience, action, and status lines across generated bodies and planner surfaces', () => {
    expect(getAccountUpdateTemplateAudienceLine('Bank accounts')).toBe('Audience: Bank accounts.');
    expect(getAccountUpdateTemplateAudienceLine('Bank accounts', { terminalPeriod: false })).toBe('Audience: Bank accounts');
    expect(getAccountUpdateTemplateAudienceLine('   ')).toBe('');
    expect(getAccountUpdateTemplateActionLabel('ready', 'Bank accounts')).toBe('Send bank accounts update (proof packet ready)');
    expect(getAccountUpdateTemplateActionLabel('complete', 'Bank accounts')).toBe('Confirm bank accounts sync (proof chain complete)');
    expect(getAccountUpdateTemplateActionLabel('upcoming', 'Employer payroll / HR', 'SSA pending')).toBe('Ask employer payroll / HR before next proof hop (SSA pending)');
    expect(getAccountUpdateTemplateActionLabel('blocked', 'Tax agencies')).toBe('Ask tax agencies intake rules now (proof chain pending)');
    expect(getAccountUpdateTemplateCopyLabel('ready')).toBe('Copy proof-ready send text');
    expect(getAccountUpdateTemplateCopyLabel('complete')).toBe('Copy proof-complete confirmation');
    expect(getAccountUpdateTemplateCopyLabel('in_progress')).toBe('Copy staged draft');
    expect(getAccountUpdateTemplateCopyLabel('upcoming')).toBe('Copy next-step draft');
    expect(getAccountUpdateTemplateCopyLabel('blocked')).toBe('Copy intake script');
    expect(getAccountUpdateTemplateCopyLabel('ready', true)).toBe('Copied');
    expect(getAccountUpdateTemplateReadinessLabel('ready')).toBe('You have enough upstream proof to send this now.');
    expect(getAccountUpdateTemplateReadinessLabel('in_progress', 'SSA pending')).toBe(
      'The upstream identity work is already moving, so this outreach can be drafted now and sent as soon as the current step lands (SSA pending).',
    );
    expect(getAccountUpdateTemplateReadinessLabel('complete')).toBe(
      'The core proof chain is already complete, so this should be a clean confirmation/update pass.',
    );
    expect(getAccountUpdateTemplateReadinessLabel('blocked')).toBe(
      'The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real (proof chain pending).',
    );
    expect(getAccountUpdateTemplateStatusLabel('ready')).toBe('send now (proof packet ready)');
    expect(getAccountUpdateTemplateStatusLabel('complete')).toBe('confirm sync (proof chain complete)');
    expect(getAccountUpdateTemplateStatusLabel('upcoming', 'SSA pending')).toBe('ask before next proof hop · SSA pending');
    expect(getAccountUpdateTemplateStatusLabel('blocked', 'legal proof pending')).toBe('ask intake rules now · legal proof pending');
    expect(getAccountUpdateTemplateStateLine('in_progress', 'Legal proof pending')).toBe(
      'Template state: draft now and wait for legal proof pending to clear before sending.',
    );
    expect(getAccountUpdateTemplateStateLine('upcoming', 'SSA pending')).toBe(
      'Template state: prep the ask now and wait for SSA pending to clear before sending.',
    );
    expect(getAccountUpdateTemplateStateLine('blocked')).toBe('Template state: intake-only until the proof chain is ready.');
    expect(getAccountUpdateTemplateStatusLine('ready')).toBe('Status: send now (proof packet ready).');
    expect(getAccountUpdateTemplateStatusLine('ready', undefined, { terminalPeriod: false })).toBe('Status: send now (proof packet ready)');
  });

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
        expect.objectContaining({
          id: 'track-rollout',
          sequenceLabel: '5 · account rollout',
          status: 'upcoming',
          featureTag: 'rollout',
          dependsOnStepIds: expect.arrayContaining([
            'state-dmv',
            'institution-irs-records',
            'institution-irs-employer',
            'institution-banks',
            'institution-insurance',
            'institution-phone-digital-identity',
            'institution-frequent-flyer-hotel-rail',
          ]),
        }),
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
        'Disability insurance and leave teams',
        'Workers comp, leave, and claims teams',
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
        expect.objectContaining({ id: 'milestone-ssa', status: 'ready', dependsOnStepIds: ['eligibility-proof', 'federal-ssa'] }),
        expect.objectContaining({ id: 'milestone-photo-id', status: 'upcoming' }),
        expect.objectContaining({ id: 'milestone-passport', status: 'upcoming', dependsOnStepIds: ['federal-ssa', 'state-dmv', 'federal-passport'] }),
        expect.objectContaining({ id: 'milestone-payroll', status: 'upcoming', dependsOnStepIds: ['federal-ssa', 'institution-irs-employer', 'institution-retirement-benefits'] }),
        expect.objectContaining({
          id: 'milestone-tax',
          status: 'upcoming',
          label: 'Tax and government records are ready to align with SSA and legal proof',
          dependsOnStepIds: ['federal-ssa', 'institution-irs-records', 'institution-state-tax-agency', 'institution-county-recorder-property', 'institution-uscis-immigration-records'],
        }),
        expect.objectContaining({
          id: 'milestone-account-rollout',
          status: 'upcoming',
          dependsOnStepIds: [
            'state-dmv',
            'institution-banks',
            'institution-investments-loans',
            'institution-student-loans-financial-aid',
            'institution-mortgage-property-records',
            'institution-credit-bureaus',
            'institution-insurance',
            'institution-disability-insurance',
            'institution-workers-comp-leave',
            'institution-medical-records',
            'institution-utilities-housing',
            'institution-phone-digital-identity',
          ],
        }),
        expect.objectContaining({
          id: 'milestone-professional-licenses',
          status: 'upcoming',
          dependsOnStepIds: ['state-dmv', 'institution-professional-licenses'],
        }),
        expect.objectContaining({
          id: 'milestone-downstream-rollout',
          status: 'upcoming',
          dependsOnStepIds: [
            'state-dmv',
            'institution-medical-records',
            'institution-utilities-housing',
            'institution-phone-digital-identity',
            'institution-subscriptions-social',
            'institution-school-alumni-records',
            'institution-professional-licenses',
            'institution-voter-registration',
            'institution-tsa-precheck',
            'institution-travel-hospitality',
            'institution-dmv-registration-title',
            'institution-frequent-flyer-hotel-rail',
          ],
        }),
      ]),
    );
    expect(plan.summary.accountUpdateTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audience: 'Employer payroll / HR',
          subject: 'Ask before next proof hop (SSA pending): Name change update for payroll and benefits',
          readiness: 'upcoming',
          dependsOnStepIds: expect.arrayContaining(['federal-ssa', 'institution-irs-employer']),
          proofChecklist: expect.arrayContaining(['Certified legal name-change proof', 'Updated Social Security record or SSA receipt']),
        }),
        expect.objectContaining({
          audience: 'Bank or credit card support',
          dependsOnStepIds: expect.arrayContaining([
            'institution-investments-loans',
            'institution-student-loans-financial-aid',
            'institution-mortgage-property-records',
          ]),
          proofChecklist: expect.arrayContaining(['Updated photo ID or DMV receipt']),
        }),
        expect.objectContaining({
          audience: 'Insurance or subscription support',
          dependsOnStepIds: expect.arrayContaining([
            'institution-disability-insurance',
            'institution-workers-comp-leave',
            'institution-medical-records',
          ]),
        }),
        expect.objectContaining({
          audience: 'Tax agency, county recorder, immigration, or government record support',
          dependsOnStepIds: expect.arrayContaining(['institution-state-tax-agency', 'institution-county-recorder-property', 'institution-uscis-immigration-records']),
        }),
        expect.objectContaining({
          audience: 'Airline, hotel, loyalty, DMV title/registration, auto insurance, or travel support',
          readiness: 'upcoming',
          dependsOnStepIds: expect.arrayContaining(['institution-dmv-registration-title']),
        }),
        expect.objectContaining({
          audience: 'Phone, utilities, housing, alumni, social/profile, or primary digital identity support',
          dependsOnStepIds: expect.arrayContaining([
            'institution-utilities-housing',
            'institution-subscriptions-social',
            'institution-school-alumni-records',
            'institution-courtesy-social-sync',
          ]),
        }),
        expect.objectContaining({ audience: 'Licensing board or credentialing support', dependsOnStepIds: ['state-dmv', 'institution-professional-licenses'] }),
      ]),
    );
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Alex Marie Rivera');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Alex Marie Jordan');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.readinessLabel).toBe('Your legal proof is grounded, but this still depends on the next ID or agency hop before it is ready to send (SSA pending).');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('My legal proof is in hand, but SSA/payroll alignment is still upstream');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Audience: Employer payroll / HR.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('I am prepping this ask now, but I am not sending the final packet until the next proof hop clears (SSA pending).');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Status: ask before next proof hop · SSA pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Blocked by: SSA pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Current blocker: SSA pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Do not send yet; legal proof is grounded, but SSA is still the missing proof hop. Blocking hop: SSA pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('I can provide Certified legal name-change proof, Updated Social Security record or SSA receipt, Updated photo ID if payroll or benefits asks for one. My legal proof is in hand, but SSA/payroll alignment is still upstream, so I mainly need your intake path and hold timing.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Proof checklist I am tracking: Certified legal name-change proof, Updated Social Security record or SSA receipt, Updated photo ID if payroll or benefits asks for one, Use this to learn the payroll intake path while SSA alignment is still upstream, Wait to send until SSA is the next cleared proof hop.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Use this to learn the payroll intake path while SSA alignment is still upstream');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Please confirm the intake path, hold timing, and whether you can pre-note the request while SSA alignment is still upstream.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.requestSummary).toBe('Please confirm the intake path, hold timing, and whether you can pre-note the request while SSA alignment is still upstream.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofReadinessSummary).toBe('Do not send yet; legal proof is grounded, but SSA is still the missing proof hop. Blocking hop: SSA pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.blockingProofHopLabel).toBe('SSA pending');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.checklistHighlight).toBe('Use this to learn the payroll intake path while SSA alignment is still upstream.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.checklistStatusNote).toBe('Wait to send until SSA is the next cleared proof hop.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofDocuments).toEqual([
      'Certified legal name-change proof',
      'Updated Social Security record or SSA receipt',
      'Updated photo ID if payroll or benefits asks for one',
    ]);
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofChecklist.at(-1)).toBe('Wait to send until SSA is the next cleared proof hop.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofChecklist).toEqual(expect.arrayContaining(['Use this to learn the payroll intake path while SSA alignment is still upstream.']));
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Wait to send until SSA is the next cleared proof hop.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('whether an interim DMV receipt works');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('Blocked by: ID pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('Current blocker: ID pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('Do not send yet; legal proof is grounded, but the photo-ID hop is still missing.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('I can provide Certified legal name-change proof, Updated photo ID or DMV receipt, Replacement card / account reissue instructions. My legal proof is ready, but the photo-ID update is still upstream, so I mainly need your exact submission requirements and whether an interim DMV receipt works.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('Confirm whether legal proof alone or an interim DMV receipt is enough to start');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('Please confirm whether legal proof alone or an interim DMV receipt is enough to start, and whether cards or checks need a second pass later.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.proofChecklist).toEqual(expect.arrayContaining(['Confirm whether legal proof alone or an interim DMV receipt is enough to start.']));
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.body).toContain('Please confirm your hold/change policy and mismatch handling for bookings, title records, and auto policies before I touch any of them while passport timing is still upstream.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.body).toContain('I am prepping this ask now, but I am not sending the final packet until the next proof hop clears (passport pending).');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.audience).toBe('Airline, hotel, loyalty, DMV title/registration, auto insurance, or travel support');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.subject).toBe('Ask before next proof hop (passport pending): Please align my travel, loyalty, vehicle title, and auto-policy records with my legal name change');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.proofChecklist).toEqual(expect.arrayContaining(['Confirm hold/change policy before touching bookings, title records, or auto policies while passport timing is still upstream.']));
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('Please confirm whether legal proof alone can start utilities, phone, housing, social/profile, display-name sync, or recovery updates before the updated ID lands.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('display-name/social identity sync');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('I am prepping this ask now, but I am not sending the final packet until the next proof hop clears (ID pending).');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.proofChecklist).toEqual(expect.arrayContaining(['Confirm whether legal proof alone can start utilities, phone, housing, social/profile, display-name sync, or recovery updates.']));
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.dependsOnStepIds).toEqual(expect.arrayContaining(['institution-courtesy-social-sync']));
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-licenses')?.body).toContain('Please confirm the board-specific document rules now so I know whether the next ID/license hop is enough to start.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-licenses')?.proofChecklist).toEqual(expect.arrayContaining(['Ask for the board-specific document rules before the ID/license path lands.']));
    expect(plan.summary.institutionCategoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'legal_government', status: 'upcoming', institutionKeys: expect.arrayContaining(['uscis-immigration-records', 'irs-records', 'state-tax-agency', 'county-recorder-property']) }),
        expect.objectContaining({ id: 'financial', status: 'upcoming', institutionKeys: expect.arrayContaining(['banks', 'investments-loans', 'student-loans-financial-aid', 'mortgage-property-records', 'credit-bureaus']) }),
        expect.objectContaining({ id: 'work_insurance', status: 'upcoming', institutionKeys: expect.arrayContaining(['irs-employer', 'retirement-benefits', 'insurance', 'workers-comp-leave', 'professional-licenses']) }),
        expect.objectContaining({ id: 'personal_lifestyle', status: 'upcoming', institutionKeys: expect.arrayContaining(['phone-digital-identity', 'school-alumni-records', 'subscriptions-social', 'courtesy-social-sync']) }),
        expect.objectContaining({ id: 'travel_mobility', status: 'upcoming', institutionKeys: expect.arrayContaining(['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail']) }),
      ]),
    );
    expect(plan.summary.institutionCategoryCoverage?.find((category) => category.id === 'personal_lifestyle')?.institutionKeys).not.toContain('professional-licenses');
  });

  it('surfaces blockers when the legal proof doc is missing', () => {
    const plan = buildNameChangePlan({ ...makeInput(), documents: [] });
    expect(plan.summary.blockers[0]).toContain('Certified marriage certificate');
    expect(plan.summary.executionTracks?.every((track) => track.status === 'blocked')).toBe(true);
    expect(plan.summary.missingInputs).toContain('Certified marriage certificate details');
    expect(plan.summary.nextBestAction).toContain('Fill:');
    expect(plan.steps.find((step) => step.id === 'federal-ssa')?.status).toBe('blocked');
    expect(plan.summary.milestoneChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'milestone-legal-proof', status: 'blocked' }),
        expect.objectContaining({ id: 'milestone-ssa', status: 'blocked' }),
      ]),
    );
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')).toMatchObject({
      readiness: 'blocked',
      readinessLabel: 'The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real (legal proof pending).',
      audience: 'Tax agency, county recorder, immigration, or government record support',
      dependsOnStepIds: expect.arrayContaining(['institution-county-recorder-property', 'institution-uscis-immigration-records']),
      proofChecklist: expect.arrayContaining(['Certified legal name-change proof still needs review before most downstream updates will stick']),
    });
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('I need my tax and government-facing records updated to match my legal name');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('I need your process first and will send the legal proof packet once it is ready');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('I am only collecting the intake rules for now until the proof chain is ready (legal proof pending).');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Audience: Tax agency, county recorder, immigration, or government record support.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Status: ask intake rules now · legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Blocked by: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Current blocker: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Do not send yet; the legal proof chain still needs to clear before tax or government updates can stick.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('I can provide Certified legal name-change proof still needs review before most downstream updates will stick, Updated Social Security record or SSA confirmation, Any employer payroll confirmation or filing reference already on file. The core proof chain is still upstream, so I need your process first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Any employer payroll confirmation or filing reference already on file');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.body).toContain('Please just confirm the tax/government process for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.requestSummary).toBe('Please just confirm the tax/government process for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.proofReadinessSummary).toBe('Do not send yet; the legal proof chain still needs to clear before tax or government updates can stick. Blocking hop: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.blockingProofHopLabel).toBe('legal proof pending');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.proofChecklist.at(-1)).toBe('Gather the tax/government process only until legal proof is fully grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.subject).toBe('Ask intake rules now (legal proof pending): Align my tax and government records with my legal name change');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-tax')?.requestSummary).toBe('Please just confirm the tax/government process for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.blockingProofHopLabel).toBe('legal proof pending');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.subject).toBe('Ask intake rules now (legal proof pending): Name change update for payroll and benefits');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.requestSummary).toBe('Please just confirm the intake path and payroll timing for now so I can come back once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofReadinessSummary).toBe('Do not send yet; the legal proof chain still needs to clear before payroll updates can stick. Blocking hop: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.checklistHighlight).toBe('Hold documents for now and only confirm payroll timing + intake rules.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofDocuments).toEqual([
      'Certified legal name-change proof still needs review before most downstream updates will stick',
      'Updated Social Security record or SSA receipt',
      'Updated photo ID if payroll or benefits asks for one',
    ]);
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofChecklist.at(-1)).toBe('Gather the intake path only until legal proof is fully grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.body).toContain('Gather the intake path only until legal proof is fully grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.requestSummary).toBe('Please just send the exact bank/card document rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.body).toContain('I need your exact document rules first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-insurance')?.requestSummary).toBe('Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-insurance')?.body).toContain('I need your exact evidence rules first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.blockingProofHopLabel).toBe('legal proof pending');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('Blocked by: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('Current blocker: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.subject).toBe('Ask intake rules now (legal proof pending): Update my account holder name to match my legal records');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.requestSummary).toBe('Please just share the verification rules for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-digital-identity')?.body).toContain('I need your verification rules first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-licenses')?.requestSummary).toBe('Please just share the board submission rules for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-licenses')?.body).toContain('I need the board submission rules first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.blockingProofHopLabel).toBe('legal proof pending');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.body).toContain('Blocked by: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.body).toContain('Current blocker: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.subject).toBe('Ask intake rules now (legal proof pending): Please align my travel, loyalty, vehicle title, and auto-policy records with my legal name change');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.proofReadinessSummary).toBe('Do not send yet; the legal proof chain still needs to clear before travel-profile evidence will stick. Blocking hop: legal proof pending.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.checklistHighlight).toBe('Ask for mismatch policy and booking rules before the legal proof packet is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.checklistStatusNote).toBe('Gather mismatch and booking rules only until legal proof is fully grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.proofChecklist.at(-1)).toBe('Gather mismatch and booking rules only until legal proof is fully grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.requestSummary).toBe('Please just share your mismatch policy and acceptable temporary-proof rules for now so I can return once the legal proof packet is grounded.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.body).toContain('I need your mismatch policy first and will send the legal proof packet once it is ready.');
    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-travel')?.proofChecklist).toContain('Ask for mismatch policy and booking rules before the legal proof packet is ready.');
  });

  it('uses question-style subject framing for upcoming account-update templates', () => {
    const plan = buildNameChangePlan(makeInput());

    expect(plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')).toMatchObject({
      readiness: 'upcoming',
      subject: 'Ask before next proof hop (SSA pending): Name change update for payroll and benefits',
    });
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

  it('requires filed marriage record and certified copies before government execution', () => {
    const plan = buildNameChangePlan(makeInput());
    const legalProofStep = plan.steps.find((step) => step.id === 'eligibility-proof');

    expect(legalProofStep?.description).toContain('filed by the county');
    expect(legalProofStep?.evidenceNeeded).toEqual(
      expect.arrayContaining([
        'Filed marriage certificate record',
        'Certified marriage certificate copies',
        'County clerk / recorder or vital-records issuing authority',
      ]),
    );
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

    expect(plan.summary.blockers).toContain('Marriage certificate is present, but the county, certificate number, or issuing authority is not ready yet for out-of-state follow-through.');
    expect(plan.summary.missingInputs).toContain('Out-of-state marriage certificate county, certificate number, and issuing authority');
    expect(plan.steps.find((step) => step.id === 'eligibility-proof')).toMatchObject({
      status: 'blocked',
      blockers: ['Marriage certificate is present, but the county, certificate number, or issuing authority is not ready yet for out-of-state follow-through.'],
    });
    expect(plan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      status: 'blocked',
      blockers: ['Legal proof needs to be ready before SSA.'],
    });
    expect(plan.summary.edgeCaseGuidance).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'edge-out-of-state-proof',
        detail: 'County, certificate-number, and issuing-authority proof still need to be grounded before the free assistant can safely treat the marriage certificate as execution-ready proof.',
      }),
      expect.objectContaining({
        id: 'edge-resident-id-jurisdiction-handoff',
        label: 'Resident-ID jurisdiction handoff',
      }),
    ]));
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
        expect.objectContaining({ id: 'edge-global-entry-followthrough', severity: 'info' }),
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
        expect.objectContaining({ id: 'edge-court-order-certified-copy' }),
      ]),
    );
  });

  it('warns when the current photo-ID lane is weaker than a Real ID-ready handoff', () => {
    const plan = buildNameChangePlan(makeInput({ has_real_id_license: false }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge-real-id-followthrough',
          severity: 'warning',
        }),
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

  it('surfaces combination-surname guidance when the rollout depends on exact spacing rather than a hyphen', () => {
    const plan = buildNameChangePlan(makeInput({
      current_last_name: 'Rivera',
      target_last_name: 'Rivera Jordan',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    }));

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'edge-combination-name-format', severity: 'info' }),
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

  it('surfaces document-name mismatch guidance when extracted proof disagrees with canonical case truth', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      documents: [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          id: 'doc-passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      extractedFields: [
        {
          document_id: 'doc-marriage',
          field_key: 'spouse_last_name',
          field_label: 'Spouse last name',
          field_value_masked: 'Jordan-Smith',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-passport',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alicia',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    });

    expect(plan.summary.edgeCaseGuidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge-document-name-mismatch',
          label: 'Document name mismatch across proof set',
          detail: 'Structured case truth conflicts with extracted document values in 2 places: Current first name vs passport extraction, Target last name vs marriage certificate spouse surname.',
          severity: 'warning',
        }),
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

  it('tracks target-status overview counts in the plan summary', () => {
    const plan = buildNameChangePlan(makeInput());
    const overview = plan.summary.targetStatusOverview;

    expect(overview).toMatchObject({
      inProgress: 0,
      complete: 0,
      ready: expect.any(Number),
      blocked: expect.any(Number),
      missingProofTargets: expect.any(Number),
      attentionProofTargets: expect.any(Number),
      touchedByExecution: 0,
      touchedByReminder: 0,
      latestUpdatedAt: null,
      latestMilestoneAt: null,
      latestTouchedAt: null,
      latestTouchedSource: null,
    });
    expect((overview?.todo ?? 0) + (overview?.ready ?? 0) + (overview?.blocked ?? 0) + (overview?.inProgress ?? 0) + (overview?.complete ?? 0)).toBe(Object.keys(NAME_CHANGE_EXECUTION_TARGETS).length);
  });

  it('rolls target proof debt into the plan summary overview', () => {
    const plan = buildNameChangePlan(makeInput());

    expect(plan.summary.targetStatusOverview).toMatchObject({
      missingProofTargets: expect.any(Number),
      attentionProofTargets: expect.any(Number),
    });
    expect((plan.summary.targetStatusOverview?.missingProofTargets ?? 0) + (plan.summary.targetStatusOverview?.attentionProofTargets ?? 0)).toBeGreaterThan(0);
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

  it('tracks reminder-driven latest movement in the target-status overview', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      reminders: [
        {
          reminder_key: 'ssa-follow-up',
          label: 'SSA follow-up',
          reason: 'Receipt still missing',
          depends_on_step_id: 'federal-ssa',
          suggested_offset_days: 7,
          urgency: 'high',
          status: 'pending',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
      ],
    });

    expect(plan.summary.targetStatusOverview).toMatchObject({
      touchedByExecution: 0,
      touchedByReminder: 1,
      latestUpdatedAt: null,
      latestReminderAt: '2026-04-24T22:20:00.000Z',
      latestTouchedAt: '2026-04-24T22:20:00.000Z',
      latestTouchedSource: 'reminder',
    });
  });

  it('counts reminder-touched targets in the overview summary', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      reminders: [
        {
          reminder_key: 'ssa-follow-up',
          label: 'SSA follow-up',
          reason: 'Receipt still missing',
          depends_on_step_id: 'federal-ssa',
          suggested_offset_days: 7,
          urgency: 'high',
          status: 'pending',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
      ],
    });

    expect(plan.summary.targetStatusOverview).toMatchObject({
      touchedByExecution: 0,
      touchedByReminder: 1,
      latestUpdatedAt: null,
      latestReminderAt: '2026-04-24T22:20:00.000Z',
      latestTouchedAt: '2026-04-24T22:20:00.000Z',
      latestTouchedSource: 'reminder',
    });
  });

  it('counts target reminders even when they are not tied to a specific step id', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      reminders: [
        {
          reminder_key: 'ssa-follow-up',
          label: 'SSA follow-up',
          reason: 'Receipt still missing',
          urgency: 'high',
          status: 'pending',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
      ],
    });

    expect(plan.summary.targetStatusOverview).toMatchObject({
      touchedByReminder: 1,
      latestMilestoneAt: null,
      latestReminderAt: '2026-04-24T22:20:00.000Z',
      latestTouchedAt: '2026-04-24T22:20:00.000Z',
      latestTouchedSource: 'reminder',
    });
  });

  it('keeps invalid persisted reminder timing from outranking real target-status activity in the overview summary', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      reminders: [
        {
          reminder_key: 'ssa-bad-follow-up',
          label: 'Broken reminder payload',
          reason: 'Bad imported timestamp',
          urgency: 'high',
          status: 'pending',
          focus_target_id: 'ssa',
          updated_at: 'not-a-date',
        },
        {
          reminder_key: 'ssa-good-follow-up',
          label: 'SSA follow-up',
          reason: 'Receipt still missing',
          urgency: 'high',
          status: 'pending',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
      ],
    });

    expect(plan.summary.targetStatusOverview).toMatchObject({
      latestUpdatedAt: null,
      latestReminderAt: '2026-04-24T22:20:00.000Z',
      latestTouchedAt: '2026-04-24T22:20:00.000Z',
      latestTouchedSource: 'reminder',
    });
  });

  it('ignores sent reminders in the overview reminder-touch summary', () => {
    const plan = buildNameChangePlan({
      ...makeInput(),
      reminders: [
        {
          reminder_key: 'ssa-follow-up',
          label: 'SSA follow-up sent',
          reason: 'Follow-up email already sent',
          urgency: 'high',
          status: 'sent',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
      ],
    });

    expect(plan.summary.targetStatusOverview).toMatchObject({
      touchedByReminder: 0,
      latestReminderAt: null,
      latestTouchedAt: null,
      latestTouchedSource: null,
    });
  });

});
