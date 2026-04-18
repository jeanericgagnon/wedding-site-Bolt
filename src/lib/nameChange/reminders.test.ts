import { describe, expect, it } from 'vitest';
import { buildNameChangePlan } from './engine';
import { buildNameChangeReminderSuggestions } from './reminders';
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

describe('name change reminder suggestions', () => {
  it('builds sorted reminder suggestions from the generated plan', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders = buildNameChangeReminderSuggestions(plan);

    expect(reminders.find((reminder) => reminder.id === 'reminder-passport-followup')).toMatchObject({
      id: 'reminder-passport-followup',
      dependsOnStepId: 'federal-passport',
    });
    expect(reminders.map((reminder) => reminder.suggestedOffsetDays)).toEqual([...reminders.map((reminder) => reminder.suggestedOffsetDays)].sort((a, b) => a - b));
    expect(reminders.some((reminder) => reminder.id === 'reminder-irs-employer')).toBe(true);
    expect(reminders.some((reminder) => reminder.id === 'reminder-banks')).toBe(true);
  });

  it('raises passport follow-up urgency when the case is expedited', () => {
    const plan = buildNameChangePlan(makeInput({ urgency_level: 'expedited' }));
    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.find((reminder) => reminder.id === 'reminder-passport-followup')).toMatchObject({
      suggestedOffsetDays: 1,
      urgency: 'high',
    });
  });

  it('skips passport reminder when passport work is not needed', () => {
    const plan = buildNameChangePlan(makeInput({ passport_needs_update: false }));
    const reminders = buildNameChangeReminderSuggestions(plan);
    expect(reminders.some((reminder) => reminder.id === 'reminder-passport-followup')).toBe(false);
  });
});
