import { describe, expect, it } from 'vitest';
import { buildNameChangePlan } from './engine';
import { buildNameChangeReminderSuggestions, bulkUpdateNameChangeReminderStatus, deriveNameChangeReminderAttention, mapReminderSuggestionsToInputs, summarizeNameChangeReminderAttention, summarizeNameChangeReminders, syncNameChangeRemindersWithStepExecution, updateNameChangeReminderStatus } from './reminders';
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

  it('maps reminder suggestions into persistence-ready inputs', () => {
    const plan = buildNameChangePlan(makeInput());
    const inputs = mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan));
    expect(inputs.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      status: 'pending',
      depends_on_step_id: 'institution-banks',
    });
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

  it('derives reminder attention items from open reminders tied to incomplete steps', () => {
    const plan = buildNameChangePlan(makeInput());
    const reminders = [
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
      stalePriority: 'mixed',
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
