import { describe, expect, it } from 'vitest';
import { buildNameChangePlan } from './engine';
import { buildNameChangeReminderSuggestions, bulkUpdateNameChangeReminderStatus, deriveNameChangeReminderAttention, mapReminderSuggestionsToInputs, summarizeNameChangeReminderAttention, summarizeNameChangeReminders, syncNameChangeRemindersWithStepExecution, updateNameChangeReminderStatus } from './reminders';
import type { NameChangeEngineInput, NameChangeReminderInput } from './types';

type ProfileOverrides = Partial<Omit<NameChangeEngineInput['profile'], 'structured_intake'>> & {
  structured_intake?: Partial<NameChangeEngineInput['profile']['structured_intake']>;
};

function makeInput(overrides: ProfileOverrides = {}): NameChangeEngineInput {
  const { structured_intake: structuredIntakeOverrides, ...profileOverrides } = overrides;
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
        ...structuredIntakeOverrides,
      },
      latest_plan_summary: null,
      ...profileOverrides,
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

describe('name change reminder suggestions', () => {
  it('builds sorted reminder suggestions from the generated plan', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders = buildNameChangeReminderSuggestions(plan);

    expect(reminders.find((reminder) => reminder.id === 'reminder-legal-proof-followup')).toMatchObject({
      id: 'reminder-legal-proof-followup',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-passport-followup')).toMatchObject({
      id: 'reminder-passport-followup',
      dependsOnStepId: 'federal-passport',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-ssa-followup')).toMatchObject({
      dependsOnStepId: 'federal-ssa',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-dmv-followup')).toMatchObject({
      dependsOnStepId: 'state-dmv',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-institutions-rollout')).toMatchObject({
      dependsOnStepId: 'institutions-rollout',
    });
    expect(reminders.map((reminder) => reminder.suggestedOffsetDays)).toEqual([...reminders.map((reminder) => reminder.suggestedOffsetDays)].sort((a, b) => a - b));
    expect(reminders.some((reminder) => reminder.id === 'reminder-irs-employer')).toBe(true);
    expect(reminders.some((reminder) => reminder.id === 'reminder-banks')).toBe(true);
    expect(reminders.some((reminder) => reminder.id === 'reminder-medical-records')).toBe(true);
    expect(reminders.find((reminder) => reminder.id === 'reminder-category-confirm-legal_government')).toMatchObject({
      dependsOnStepId: 'institution-county-recorder-property',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-category-confirm-travel_mobility')).toMatchObject({
      dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-ssa')).toMatchObject({
      dependsOnStepId: 'federal-ssa',
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-passport')).toMatchObject({
      dependsOnStepId: 'federal-passport',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-payroll')).toMatchObject({
      dependsOnStepId: 'institution-retirement-benefits',
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-category-confirm-work_insurance')).toMatchObject({
      dependsOnStepId: 'institution-professional-licenses',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-tax')).toMatchObject({
      label: 'Confirm tax and government records are aligned across filing and status systems',
      reason: 'Verify that tax, county, and immigration-facing records are lined up so filings, notices, and status checks do not split across names.',
      dependsOnStepId: 'institution-uscis-immigration-records',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-account-rollout')).toMatchObject({
      dependsOnStepId: 'institution-phone-digital-identity',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-professional-licenses')).toMatchObject({
      dependsOnStepId: 'institution-professional-licenses',
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-downstream-rollout')).toMatchObject({
      dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
      urgency: 'medium',
    });
  });

  it('raises passport follow-up urgency when the case is expedited', () => {
    const plan = buildNameChangePlan(makeInput({ urgency_level: 'expedited' }));
    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.find((reminder) => reminder.id === 'reminder-legal-proof-followup')).toMatchObject({
      suggestedOffsetDays: 1,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-passport-followup')).toMatchObject({
      suggestedOffsetDays: 1,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-ssa-followup')).toMatchObject({
      suggestedOffsetDays: 1,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-dmv-followup')).toMatchObject({
      suggestedOffsetDays: 2,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-institutions-rollout')).toMatchObject({
      suggestedOffsetDays: 6,
      urgency: 'medium',
    });
  });

  it('skips passport reminder when passport work is not needed', () => {
    const plan = buildNameChangePlan(makeInput({ passport_needs_update: false }));
    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.some((reminder) => reminder.id === 'reminder-passport-followup')).toBe(false);
    expect(reminders.some((reminder) => reminder.id === 'reminder-milestone-confirm-milestone-passport')).toBe(false);
  });

  it('suppresses reminders for steps already complete', () => {
    const basePlan = buildNameChangePlan(makeInput());
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step,
      ),
    };

    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.some((reminder) => reminder.id === 'reminder-ssa-followup')).toBe(false);
  });

  it('tightens reminder timing once a dependent step is already in progress', () => {
    const basePlan = buildNameChangePlan(makeInput());
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const reminder = buildNameChangeReminderSuggestions(plan).find((item) => item.id === 'reminder-dmv-followup');
    expect(reminder).toMatchObject({
      suggestedOffsetDays: 2,
      urgency: 'medium',
    });
    expect(reminder?.reason).toContain('already in progress');
  });

  it('maps reminder suggestions into persistence-ready inputs', () => {
    const plan = buildNameChangePlan(makeInput());
    const inputs = mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan));
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      status: 'pending',
      depends_on_step_id: 'institution-banks',
      suggested_offset_days: 4,
      urgency: 'medium',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-banks',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-ssa-followup')).toMatchObject({
      status: 'pending',
      depends_on_step_id: 'federal-ssa',
      section_key: 'core-government',
      focus_target_id: 'execution-card-ssa',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-milestone-confirm-milestone-tax')).toMatchObject({
      depends_on_step_id: 'institution-uscis-immigration-records',
      section_key: 'core-government',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-legalGovernment',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-irs-employer')).toMatchObject({
      depends_on_step_id: 'institution-irs-employer',
      section_key: 'work-identity',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-employer',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-milestone-confirm-milestone-payroll')).toMatchObject({
      depends_on_step_id: 'institution-retirement-benefits',
      section_key: 'work-identity',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-employer',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-category-confirm-work_insurance')).toMatchObject({
      depends_on_step_id: 'institution-professional-licenses',
      section_key: 'work-identity',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-licenses',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-category-confirm-financial')).toMatchObject({
      depends_on_step_id: 'institution-credit-bureaus',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-banks',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-category-confirm-personal_lifestyle')).toMatchObject({
      depends_on_step_id: 'institution-courtesy-social-sync',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-courtesy',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-milestone-confirm-milestone-account-rollout')).toMatchObject({
      depends_on_step_id: 'institution-phone-digital-identity',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-utilities',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-milestone-confirm-milestone-professional-licenses')).toMatchObject({
      depends_on_step_id: 'institution-professional-licenses',
      section_key: 'work-identity',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-licenses',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-category-confirm-travel_mobility')).toMatchObject({
      depends_on_step_id: 'institution-frequent-flyer-hotel-rail',
      section_key: 'cleanup',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-tsa',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-milestone-confirm-milestone-downstream-rollout')).toMatchObject({
      depends_on_step_id: 'institution-frequent-flyer-hotel-rail',
      section_key: 'cleanup',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-tsa',
    });
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-voter-registration')).toMatchObject({
      section_key: 'cleanup',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-voter',
    });
  });

  it('routes travel-booking reminders into cleanup travel execution', () => {
    const plan = buildNameChangePlan(makeInput({
      urgency_level: 'expedited',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    }));

    expect(mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan)).find((reminder) => reminder.reminder_key === 'reminder-travel-bookings')).toMatchObject({
      depends_on_step_id: 'federal-passport',
      section_key: 'cleanup',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-tsa',
    });
  });

  it('applies institution-family reminder tuning for downstream lanes', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput()));

    expect(reminders.find((reminder) => reminder.id === 'reminder-irs-employer')).toMatchObject({
      suggestedOffsetDays: 1,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-insurance')).toMatchObject({
      suggestedOffsetDays: 7,
      urgency: 'medium',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-voter-registration')).toMatchObject({
      suggestedOffsetDays: 10,
      urgency: 'medium',
    });
  });

  it('adds edge-case reminders for travel timing, international passports, court orders, and exact surname formatting', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput({
      urgency_level: 'expedited',
      legal_basis: 'court_order',
      is_us_citizen: false,
      target_last_name: 'Rivera-Jordan',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    })));

    expect(reminders.find((reminder) => reminder.id === 'reminder-travel-bookings')).toMatchObject({
      dependsOnStepId: 'federal-passport',
      suggestedOffsetDays: 0,
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-international-passport')).toMatchObject({
      dependsOnStepId: 'federal-passport',
      urgency: 'high',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-travel-passport-branch')).toMatchObject({
      dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
      urgency: 'high',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-tsa',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-court-order-packet')).toMatchObject({
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-courtOrder',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-name-format-consistency')).toMatchObject({
      dependsOnStepId: 'federal-ssa',
      urgency: 'high',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
    expect(reminders.find((reminder) => reminder.id === 'reminder-travel-name-format-consistency')).toMatchObject({
      dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
      urgency: 'high',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-tsa',
    });
  });

  it('keys international-passport and court-order reminders off edge-case guidance', () => {
    const plan = buildNameChangePlan(makeInput({
      legal_basis: 'court_order',
      is_us_citizen: false,
      passport_needs_update: true,
    }));

    expect(plan.summary.edgeCaseGuidance?.map((item) => item.id)).toEqual(expect.arrayContaining([
      'edge-non-us-passport',
      'edge-court-order-path',
    ]));

    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.find((reminder) => reminder.id === 'reminder-international-passport')).toBeTruthy();
    expect(reminders.find((reminder) => reminder.id === 'reminder-court-order-packet')).toBeTruthy();

    const planWithoutEdgeGuidance = {
      ...plan,
      summary: {
        ...plan.summary,
        edgeCaseGuidance: plan.summary.edgeCaseGuidance?.filter(
          (item) => item.id !== 'edge-non-us-passport' && item.id !== 'edge-court-order-path',
        ) ?? [],
      },
    };

    const remindersWithoutEdgeGuidance = buildNameChangeReminderSuggestions(planWithoutEdgeGuidance);
    expect(remindersWithoutEdgeGuidance.find((reminder) => reminder.id === 'reminder-international-passport')).toBeUndefined();
    expect(remindersWithoutEdgeGuidance.find((reminder) => reminder.id === 'reminder-travel-passport-branch')).toBeUndefined();
    expect(remindersWithoutEdgeGuidance.find((reminder) => reminder.id === 'reminder-court-order-packet')).toBeUndefined();
    expect(remindersWithoutEdgeGuidance.find((reminder) => reminder.id === 'reminder-travel-name-format-consistency')).toBeUndefined();
  });

  it('adds a first-passport branch reminder when the case needs a new passport packet', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput({
      passport_needs_update: true,
      is_us_citizen: true,
      has_us_passport: false,
    })));

    expect(reminders.find((reminder) => reminder.id === 'reminder-first-passport-branch')).toMatchObject({
      label: 'Prep the first-passport packet instead of a renewal shortcut',
      dependsOnStepId: 'federal-passport',
      urgency: 'high',
      suggestedOffsetDays: 2,
      sectionKey: 'core-government',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-passport',
    });
  });

  it('adds county-record and out-of-state proof reminders when marriage proof handling needs grounding', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan({
      ...makeInput({ marriage_state: 'Nevada' }),
      documents: [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Certified marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      extractedFields: [],
    }));

    expect(reminders.find((reminder) => reminder.id === 'reminder-county-office-variation')).toMatchObject({
      label: 'Confirm the issuing county record path before filing follow-through',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'medium',
      suggestedOffsetDays: 2,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });

    expect(reminders.find((reminder) => reminder.id === 'reminder-out-of-state-proof-grounding')).toMatchObject({
      label: 'Ground the out-of-state certificate county, number, and issuing authority before downstream filing',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
      suggestedOffsetDays: 1,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
  });

  it('adds a document-mismatch reminder when reviewed proof extracts conflict with case truth', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan({
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
    }));

    expect(reminders.find((reminder) => reminder.id === 'reminder-document-name-mismatch')).toMatchObject({
      label: 'Resolve document-name conflicts before trusting downstream filing',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
      suggestedOffsetDays: 1,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
  });

  it('adds a packet-warning reminder when marriage intake target legal name does not fit the shortcut path', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput({
      legal_basis: 'marriage',
      target_first_name: 'Alicia',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    })));

    expect(reminders.find((reminder) => reminder.id === 'reminder-marriage-name-mismatch')).toMatchObject({
      label: 'Resolve the target legal-name path before filing',
      reason: 'If the requested target legal name falls outside the California marriage shortcut, confirm the right packet and sequence before filing.',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
      suggestedOffsetDays: 1,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });

    expect(reminders.find((reminder) => reminder.id === 'reminder-mismatch-recovery')).toMatchObject({
      label: 'Reset the legal-proof path before continuing downstream updates',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'high',
      suggestedOffsetDays: 1,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
  });

  it('adds a separate-chain reminder when both partners are changing names', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput({
      legal_basis: 'marriage',
      structured_intake: {
        spouseLastName: 'Jordan',
        bothPartnersChangeName: true,
        wantsDocumentIntakeHelp: true,
      },
    })));

    expect(reminders.find((reminder) => reminder.id === 'reminder-both-partners-changing')).toMatchObject({
      label: 'Keep each partner on a separate name-change execution chain',
      dependsOnStepId: 'eligibility-proof',
      urgency: 'medium',
      suggestedOffsetDays: 2,
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
  });

  it('adds an immediate reminder when case legal-name setup is still incomplete', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput({
      target_middle_name: '',
    })));

    expect(reminders.find((reminder) => reminder.id === 'reminder-case-legal-name-setup')).toMatchObject({
      label: 'Finish case legal-name setup before downstream filing',
      dependsOnStepId: 'eligibility-proof',
      suggestedOffsetDays: 0,
      urgency: 'high',
      reason: 'Case setup is still missing target middle name. Lock the current and target legal-name fields before trusting packet prep, sequencing, or reminder timing.',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
    });
  });

  it('does not add a case-setup reminder when legal-name setup is complete', () => {
    const reminders = buildNameChangeReminderSuggestions(buildNameChangePlan(makeInput()));
    expect(reminders.some((reminder) => reminder.id === 'reminder-case-legal-name-setup')).toBe(false);
  });

  it('summarizes reminder status counts', () => {
    const summary = summarizeNameChangeReminders([
      {
        reminder_key: 'a',
        label: 'A',
        reason: 'A',
        depends_on_step_id: 'step-a',
        suggested_offset_days: 1,
        urgency: 'high',
        status: 'pending',
      },
      {
        reminder_key: 'b',
        label: 'B',
        reason: 'B',
        depends_on_step_id: 'step-b',
        suggested_offset_days: 3,
        urgency: 'high',
        status: 'scheduled',
      },
      {
        reminder_key: 'c',
        label: 'C',
        reason: 'C',
        depends_on_step_id: 'step-c',
        suggested_offset_days: 8,
        urgency: 'low',
        status: 'dismissed',
      },
    ]);

    expect(summary).toEqual({
      total: 3,
      pending: 1,
      scheduled: 1,
      sent: 0,
      dismissed: 1,
      highUrgencyOpen: 2,
      staleAttentionOpen: 0,
    });
  });

  it('updates reminder status by key', () => {
    expect(updateNameChangeReminderStatus([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'pending',
      },
    ], 'reminder-banks', 'scheduled')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'scheduled' }),
    ]);
  });

  it('bulk-updates reminder status for a selected set of keys', () => {
    expect(bulkUpdateNameChangeReminderStatus([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'pending',
      },
      {
        reminder_key: 'reminder-insurance',
        label: 'Insurance',
        reason: 'Reason',
        depends_on_step_id: 'institution-insurance',
        suggested_offset_days: 7,
        urgency: 'medium',
        status: 'pending',
      },
    ], ['reminder-banks'], 'dismissed')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'dismissed' }),
      expect.objectContaining({ reminder_key: 'reminder-insurance', status: 'pending' }),
    ]);
  });

  it('syncs dependent reminder status when a step moves in progress or complete', () => {
    const reminders: NameChangeReminderInput[] = [
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium' as const,
        status: 'pending' as const,
      },
      {
        reminder_key: 'reminder-passport-followup',
        label: 'Passport',
        reason: 'Reason',
        depends_on_step_id: 'federal-passport',
        suggested_offset_days: 1,
        urgency: 'high' as const,
        status: 'dismissed' as const,
      },
    ];

    expect(syncNameChangeRemindersWithStepExecution(reminders, 'institution-banks', 'in_progress')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'scheduled' }),
      expect.objectContaining({ reminder_key: 'reminder-passport-followup', status: 'dismissed' }),
    ]);

    expect(syncNameChangeRemindersWithStepExecution(reminders, 'institution-banks', 'complete')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'sent' }),
      expect.objectContaining({ reminder_key: 'reminder-passport-followup', status: 'dismissed' }),
    ]);
  });

  it('reopens non-dismissed reminders when a step resets to todo', () => {
    expect(syncNameChangeRemindersWithStepExecution([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'scheduled',
      },
      {
        reminder_key: 'reminder-insurance',
        label: 'Insurance',
        reason: 'Reason',
        depends_on_step_id: 'institution-insurance',
        suggested_offset_days: 7,
        urgency: 'medium',
        status: 'dismissed',
      },
    ], 'institution-banks', 'todo')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'pending' }),
      expect.objectContaining({ reminder_key: 'reminder-insurance', status: 'dismissed' }),
    ]);
  });

  it('keeps milestone confirmation reminders open after the dependent step completes', () => {
    expect(syncNameChangeRemindersWithStepExecution([
      {
        reminder_key: 'reminder-milestone-confirm-milestone-ssa',
        label: 'Confirm SSA',
        reason: 'Reason',
        depends_on_step_id: 'federal-ssa',
        suggested_offset_days: 3,
        urgency: 'high',
        status: 'scheduled',
      },
      {
        reminder_key: 'reminder-ssa-followup',
        label: 'Follow up SSA',
        reason: 'Reason',
        depends_on_step_id: 'federal-ssa',
        suggested_offset_days: 3,
        urgency: 'medium',
        status: 'scheduled',
      },
    ], 'federal-ssa', 'complete')).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-milestone-confirm-milestone-ssa', status: 'pending' }),
      expect.objectContaining({ reminder_key: 'reminder-ssa-followup', status: 'sent' }),
    ]);
  });

  it('does not generate downstream follow-up reminders while the plan is still blocked upstream', () => {
    const blockedInput = makeInput({
      has_certified_marriage_certificate: false,
      passport_needs_update: true,
      has_us_passport: true,
    } as ProfileOverrides);
    const plan = buildNameChangePlan({
      ...blockedInput,
      documents: [],
    });

    const suggestions = buildNameChangeReminderSuggestions(plan);

    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-legal-proof-followup')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-ssa-followup')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-dmv-followup')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-passport-followup')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-milestone-confirm-milestone-legal-proof')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-milestone-confirm-milestone-ssa')).toBe(false);
  });

  it('drops milestone confirmation reminders once that milestone is already complete', () => {
    const basePlan = buildNameChangePlan(makeInput());
    const suggestions = buildNameChangeReminderSuggestions({
      ...basePlan,
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-ssa'
          ? { ...milestone, status: 'complete' as const }
          : milestone),
      },
    });

    expect(suggestions.some((suggestion) => suggestion.id === 'reminder-milestone-confirm-milestone-ssa')).toBe(false);
  });

  it('derives reminder attention items from open reminders tied to incomplete steps', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders: NameChangeReminderInput[] = [
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium' as const,
        status: 'scheduled' as const,
      },
      {
        reminder_key: 'reminder-passport-followup',
        label: 'Passport',
        reason: 'Reason',
        depends_on_step_id: 'federal-passport',
        suggested_offset_days: 1,
        urgency: 'high' as const,
        status: 'sent' as const,
      },
    ];

    const attention = deriveNameChangeReminderAttention(reminders, {
      ...plan,
      steps: plan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T10:00:00.000Z' }
        : step),
    }, '2026-04-18T12:00:00.000Z');

    expect(attention).toEqual([
      expect.objectContaining({
        reminderKey: 'reminder-banks',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        priorityTier: 'normal',
        actionability: 'actionable_now',
        isStale: false,
        lastTouchedAt: '2026-04-18T10:00:00.000Z',
      }),
    ]);
  });

  it('flags reminder attention as stale when workflow touch is missing or old', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders = [
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium' as const,
        status: 'pending' as const,
      },
      {
        reminder_key: 'reminder-insurance',
        label: 'Insurance',
        reason: 'Reason',
        depends_on_step_id: 'institution-insurance',
        suggested_offset_days: 7,
        urgency: 'low' as const,
        status: 'pending' as const,
      },
    ];

    const attention = deriveNameChangeReminderAttention(reminders, {
      ...plan,
      steps: plan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'todo' as const, executionUpdatedAt: '2026-04-14T12:00:00.000Z' }
        : step),
    }, '2026-04-18T12:00:00.000Z');

    expect(attention[0]).toMatchObject({ reminderKey: 'reminder-banks', isStale: true, priorityTier: 'elevated', actionability: 'blocked_by_untouched_step' });
    expect(attention.some((item) => item.reminderKey === 'reminder-insurance' && item.isStale)).toBe(true);
  });

  it('treats invalid persisted workflow touch timestamps as stale reminder attention', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders: NameChangeReminderInput[] = [
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'pending',
      },
    ];
    const planWithStep = (executionUpdatedAt: string) => ({
      ...plan,
      steps: plan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'todo' as const, executionUpdatedAt }
        : step),
    });

    const attention = deriveNameChangeReminderAttention(reminders, planWithStep('not-a-date'), '2026-04-18T12:00:00.000Z');

    expect(attention).toEqual([
      expect.objectContaining({
        reminderKey: 'reminder-banks',
        lastTouchedAt: 'not-a-date',
        isStale: true,
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
      }),
    ]);

    expect(deriveNameChangeReminderAttention(reminders, planWithStep('2027-02-30'), '2026-04-18T12:00:00.000Z')).toEqual([
      expect.objectContaining({
        reminderKey: 'reminder-banks',
        lastTouchedAt: '2027-02-30',
        isStale: true,
        priorityTier: 'elevated',
      }),
    ]);
  });

  it('marks untouched stale high-urgency attention as critical', () => {
    const plan = buildNameChangePlan(makeInput());
    const attention = deriveNameChangeReminderAttention([
      {
        reminder_key: 'reminder-passport-followup',
        label: 'Passport',
        reason: 'Reason',
        depends_on_step_id: 'federal-passport',
        suggested_offset_days: 1,
        urgency: 'high',
        status: 'pending',
      },
    ], plan, '2026-04-18T12:00:00.000Z');

    expect(attention[0]).toMatchObject({ priorityTier: 'critical', dependentStepExecutionStatus: 'todo' });
  });

  it('keeps milestone confirmation reminders in attention after the dependent step is complete', () => {
    const plan = buildNameChangePlan(makeInput());
    const attention = deriveNameChangeReminderAttention([
      {
        reminder_key: 'reminder-milestone-confirm-milestone-photo-id',
        label: 'Confirm ID',
        reason: 'Reason',
        depends_on_step_id: 'state-dmv',
        suggested_offset_days: 5,
        urgency: 'high',
        status: 'pending',
      },
    ], {
      ...plan,
      steps: plan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'complete' as const, executionUpdatedAt: '2026-04-14T12:00:00.000Z' }
        : step),
    }, '2026-04-18T12:00:00.000Z');

    expect(attention[0]).toMatchObject({
      reminderKey: 'reminder-milestone-confirm-milestone-photo-id',
      dependentStepExecutionStatus: 'complete',
      priorityTier: 'elevated',
      actionability: 'actionable_now',
      isStale: true,
    });
  });

  it('carries reminder planner routing metadata into attention items', () => {
    const plan = buildNameChangePlan(makeInput());
    const attention = deriveNameChangeReminderAttention([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks',
        reason: 'Reason',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 4,
        urgency: 'medium',
        status: 'pending',
        section_key: 'institutional',
        planner_intent: 'open_execution_card',
        focus_target_id: 'execution-card-banks',
      },
    ], plan, '2026-04-18T12:00:00.000Z');

    expect(attention[0]).toMatchObject({
      sectionKey: 'institutional',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-banks',
    });
  });

  it('summarizes reminder attention counts for stale and high urgency items', () => {
    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'high',
        suggestedOffsetDays: 1,
        lastTouchedAt: null,
        isStale: true,
      },
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'low',
        suggestedOffsetDays: 5,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: true,
      },
    ])).toEqual({
      total: 2,
      stale: 2,
      staleTodo: 1,
      staleInProgress: 1,
      highUrgency: 1,
      critical: 0,
      elevated: 0,
      normal: 2,
      actionableNow: 0,
      blockedByUntouchedStep: 0,
      blockedAndStale: 0,
      actionablePriority: 0,
      actionableNormal: 0,
      actionableAndStale: 0,
      actionableStalePriority: 0,
      actionableStaleNormal: 0,
      blockedStalePriority: 0,
      blockedStaleNormal: 0,
      dominantRiskLane: 'mixed',
      staleActionablePosture: 'mixed',
      blockedStalePosture: 'mixed',
      attentionPosture: 'mixed',
      stalePriority: 'mixed',
      agingWithoutExecution: true,
      agingWithoutExecutionLane: 'mixed',
      agingWithoutExecutionPosture: 'mixed',
      actionableFreshPosture: 'none',
    });
  });

  it('counts blocked-and-stale attention separately', () => {
    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        priorityTier: 'normal',
        actionability: 'actionable_now',
        suggestedOffsetDays: 5,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: true,
      },
    ]).blockedAndStale).toBe(1);
  });

  it('counts actionable priority vs normal items separately', () => {
    const summary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'high',
        priorityTier: 'elevated',
        actionability: 'actionable_now',
        suggestedOffsetDays: 1,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: false,
      },
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'low',
        priorityTier: 'normal',
        actionability: 'actionable_now',
        suggestedOffsetDays: 5,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: false,
      },
    ]);

    expect(summary.actionablePriority).toBe(1);
    expect(summary.actionableNormal).toBe(1);
    expect(summary.actionableAndStale).toBe(0);
    expect(summary.actionableStalePriority).toBe(0);
    expect(summary.actionableStaleNormal).toBe(0);
    expect(summary.agingWithoutExecution).toBe(false);
    expect(summary.actionableFreshPosture).toBe('fresh-heavy');
  });

  it('counts actionable-and-stale attention separately', () => {
    const summary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'actionable_now',
        suggestedOffsetDays: 2,
        lastTouchedAt: '2026-04-14T12:00:00.000Z',
        isStale: true,
      },
    ]);

    expect(summary.actionableAndStale).toBe(1);
    expect(summary.actionableStalePriority).toBe(1);
    expect(summary.actionableStaleNormal).toBe(0);
    expect(summary.staleActionablePosture).toBe('priority-heavy');
    expect(summary.blockedStalePriority).toBe(0);
    expect(summary.blockedStaleNormal).toBe(0);
    expect(summary.agingWithoutExecution).toBe(true);
    expect(summary.actionableFreshPosture).toBe('stale-heavy');
  });

  it('classifies blocked stale posture from blocked stale priority vs normal items', () => {
    const summary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'high',
        priorityTier: 'critical',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 1,
        lastTouchedAt: null,
        isStale: true,
      },
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'low',
        priorityTier: 'normal',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 5,
        lastTouchedAt: null,
        isStale: true,
      },
    ]);

    expect(summary.blockedStalePriority).toBe(1);
    expect(summary.blockedStaleNormal).toBe(1);
    expect(summary.blockedStalePosture).toBe('mixed');
    expect(summary.agingWithoutExecution).toBe(true);
  });

  it('does not mark aging-without-execution when recent starts or completions exist', () => {
    const summary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
    ], { hasRecentStart: true, hasRecentCompletion: false });

    expect(summary.agingWithoutExecution).toBe(false);
    expect(summary.agingWithoutExecutionLane).toBe('none');
    expect(summary.agingWithoutExecutionPosture).toBe('none');
  });

  it('classifies aging-without-execution lane toward blocked stale or stale actionable', () => {
    const blockedSummary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
    ]);

    const actionableSummary = summarizeNameChangeReminderAttention([
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'actionable_now',
        suggestedOffsetDays: 2,
        lastTouchedAt: '2026-04-14T12:00:00.000Z',
        isStale: true,
      },
    ]);

    expect(blockedSummary.agingWithoutExecutionLane).toBe('blocked-stale');
    expect(blockedSummary.agingWithoutExecutionPosture).toBe('blocked-heavy');
    expect(blockedSummary.actionableFreshPosture).toBe('none');
    expect(actionableSummary.agingWithoutExecutionLane).toBe('stale-actionable');
    expect(actionableSummary.agingWithoutExecutionPosture).toBe('actionable-heavy');
    expect(actionableSummary.actionableFreshPosture).toBe('stale-heavy');
  });

  it('classifies dominant risk lane across blocked stale, stale actionable, and routine actionable', () => {
    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'normal',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 3,
        lastTouchedAt: null,
        isStale: true,
      },
      {
        reminderKey: 'c',
        label: 'C',
        dependsOnStepId: 'step-c',
        dependentStepTitle: 'Step C',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        priorityTier: 'normal',
        actionability: 'actionable_now',
        suggestedOffsetDays: 4,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: false,
      },
    ]).dominantRiskLane).toBe('blocked-stale');
  });

  it('classifies attention posture as blocked-heavy or actionable-heavy', () => {
    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        priorityTier: 'elevated',
        actionability: 'blocked_by_untouched_step',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
    ]).attentionPosture).toBe('blocked-heavy');

    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        priorityTier: 'normal',
        actionability: 'actionable_now',
        suggestedOffsetDays: 5,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: false,
      },
    ]).attentionPosture).toBe('actionable-heavy');
  });

  it('classifies stale priority toward untouched or moving work', () => {
    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'a',
        label: 'A',
        dependsOnStepId: 'step-a',
        dependentStepTitle: 'Step A',
        dependentStepExecutionStatus: 'todo',
        reminderStatus: 'pending',
        urgency: 'medium',
        suggestedOffsetDays: 2,
        lastTouchedAt: null,
        isStale: true,
      },
    ]).stalePriority).toBe('untouched');

    expect(summarizeNameChangeReminderAttention([
      {
        reminderKey: 'b',
        label: 'B',
        dependsOnStepId: 'step-b',
        dependentStepTitle: 'Step B',
        dependentStepExecutionStatus: 'in_progress',
        reminderStatus: 'scheduled',
        urgency: 'medium',
        suggestedOffsetDays: 5,
        lastTouchedAt: '2026-04-18T12:00:00.000Z',
        isStale: true,
      },
    ]).stalePriority).toBe('moving');
  });
});
