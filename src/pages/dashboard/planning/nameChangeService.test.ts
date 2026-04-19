import { describe, expect, it } from 'vitest';
import type { NameChangeCaseInput, NameChangeCaseRecord, NameChangeDocumentInput, NameChangeExtractedFieldInput } from '../../../lib/nameChange/types';
import {
  annotateNameChangePlanStepsFromReminderChanges,
  appendNameChangeExecutionActivity,
  buildNameChangeWorkspaceBundle,
  deriveNameChangeWorkflowStatus,
  defaultNameChangeCaseInput,
  hydrateNameChangeWorkspace,
  mapCaseRecordToNameChangeInput,
  mergeNameChangeReminders,
  mergeNameChangePlanExecutionState,
  normalizeNameChangeReminders,
  normalizeNameChangeCaseInput,
  normalizeNameChangeDocuments,
  normalizeNameChangeExtractedFields,
} from './nameChangeService';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: '  Alex  ',
    current_middle_name: '  Marie ',
    current_last_name: ' Rivera ',
    target_first_name: ' Alex ',
    target_middle_name: '  ',
    target_last_name: ' Jordan ',
    email: ' Alex@Example.COM ',
    phone_last4: '(555) 991-2481',
    county_residence: ' San Diego ',
    marriage_date: ' 2026-04-05 ',
    change_reasons: ['marriage', ' marriage ', ''],
    structured_intake: {
      spouseLastName: ' Jordan ',
      travelBookedSoon: 1,
      wantsDocumentIntakeHelp: undefined,
    },
    ...overrides,
  };
}

describe('nameChangeService normalization', () => {
  it('normalizes case input into stable, save-safe values', () => {
    const normalized = normalizeNameChangeCaseInput(makeCase());
    expect(normalized.current_first_name).toBe('Alex');
    expect(normalized.current_middle_name).toBe('Marie');
    expect(normalized.target_middle_name).toBeNull();
    expect(normalized.email).toBe('alex@example.com');
    expect(normalized.phone_last4).toBe('2481');
    expect(normalized.county_residence).toBe('San Diego');
    expect(normalized.marriage_date).toBe('2026-04-05');
    expect(normalized.change_reasons).toEqual(['marriage']);
    expect(normalized.structured_intake).toMatchObject({
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    });
  });

  it('dedupes documents by kind and trims metadata', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: '  Marriage cert  ',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: ' cert.pdf ',
        issuing_authority: ' San Diego County ',
      },
      {
        document_kind: 'marriage_certificate',
        display_name: ' Final certificate ',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: ' final-cert.pdf ',
        issuing_authority: ' County Clerk ',
      },
    ];

    expect(normalizeNameChangeDocuments(documents)).toEqual([
      expect.objectContaining({
        document_kind: 'marriage_certificate',
        display_name: 'Final certificate',
        file_name_masked: 'final-cert.pdf',
        issuing_authority: 'County Clerk',
      }),
    ]);
  });

  it('drops blank extracted fields and dedupes by source + key', () => {
    const fields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: ' Spouse last name ',
        field_value_masked: ' Jordan ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: ' Jordan-Smith ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: '   ',
        source_type: 'manual',
        is_verified: false,
      },
    ];

    expect(normalizeNameChangeExtractedFields(fields)).toEqual([
      {
        document_id: null,
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
    ]);
  });

  it('hydrates loaded workspace through the same normalization path used for saves', () => {
    const caseRecord: NameChangeCaseRecord = {
      id: 'case-1',
      wedding_site_id: 'site-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...makeCase(),
      current_middle_name: '  Marie ',
      target_middle_name: null,
      email: ' Alex@Example.COM ',
      phone_last4: '(555) 991-2481',
      county_residence: ' San Diego ',
      marriage_state: 'California',
      marriage_date: ' 2026-04-05 ',
      latest_plan_summary: null,
    };
    const hydrated = hydrateNameChangeWorkspace({
      caseRecord,
      documents: [
        {
          id: 'doc-1',
          name_change_case_id: 'case-1',
          document_kind: 'marriage_certificate',
          display_name: '  Marriage cert  ',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
          file_name_masked: ' cert.pdf ',
          issuing_authority: ' San Diego County ',
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      extractedFields: [
        {
          id: 'field-1',
          name_change_case_id: 'case-1',
          document_id: null,
          field_key: 'spouse_last_name',
          field_label: ' Spouse surname ',
          field_value_masked: ' Jordan ',
          source_type: 'manual',
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      latestSnapshot: null,
      reminders: [],
    });

    expect(hydrated.draft).toEqual(mapCaseRecordToNameChangeInput(caseRecord));
    expect(hydrated.documents[0]).toMatchObject({ display_name: 'Marriage cert', file_name_masked: 'cert.pdf' });
    expect(hydrated.extractedFields[0]).toMatchObject({ field_value_masked: 'Jordan' });
    expect(hydrated.plan.summary.readinessPercent).toBeGreaterThan(0);
    expect(hydrated.reminders.length).toBeGreaterThan(0);
  });

  it('normalizes reminder inputs and dedupes by reminder key', () => {
    expect(normalizeNameChangeReminders([
      {
        reminder_key: ' reminder-banks ',
        label: '  Follow up on banks ',
        reason: '  Make sure account names match. ',
        depends_on_step_id: ' institution-banks ',
        suggested_offset_days: 4.6,
        urgency: 'medium',
        status: 'pending',
      },
      {
        reminder_key: 'reminder-banks',
        label: 'Banks follow-up',
        reason: 'Use the better copy',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 2,
        urgency: 'high',
        status: 'scheduled',
      },
    ])).toEqual([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks follow-up',
        reason: 'Use the better copy',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 2,
        urgency: 'high',
        status: 'scheduled',
      },
    ]);
  });

  it('builds a workspace bundle with generated reminders', () => {
    const bundle = buildNameChangeWorkspaceBundle(makeCase(), [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ], []);

    expect(bundle.plan.steps.some((step) => step.id === 'institution-banks')).toBe(true);
    expect(bundle.reminders.some((reminder) => reminder.reminder_key === 'reminder-banks')).toBe(true);
  });

  it('preserves explicit reminder statuses when building a workspace bundle', () => {
    const bundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], [
      {
        reminder_key: 'reminder-banks',
        label: 'Follow up on Banks and credit cards',
        reason: 'Persist this status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'scheduled',
      },
    ]);

    expect(bundle.reminders.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      reminder_key: 'reminder-banks',
      status: 'scheduled',
    });
    expect(bundle.reminders.length).toBeGreaterThan(1);
  });

  it('merges generated reminders with existing statuses instead of wiping them', () => {
    expect(mergeNameChangeReminders([
      {
        reminder_key: 'reminder-banks',
        label: 'Generated banks follow-up',
        reason: 'New generated guidance',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'pending',
      },
      {
        reminder_key: 'reminder-insurance',
        label: 'Generated insurance follow-up',
        reason: 'Generated guidance',
        depends_on_step_id: 'institution-insurance',
        suggested_offset_days: 7,
        urgency: 'medium',
        status: 'pending',
      },
    ], [
      {
        reminder_key: 'reminder-banks',
        label: 'Old banks follow-up',
        reason: 'Keep my status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 4,
        urgency: 'high',
        status: 'dismissed',
      },
      {
        reminder_key: 'reminder-passport-followup',
        label: 'Old passport follow-up',
        reason: 'Should drop if no longer generated',
        depends_on_step_id: 'federal-passport',
        suggested_offset_days: 1,
        urgency: 'high',
        status: 'scheduled',
      },
    ])).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'dismissed', label: 'Generated banks follow-up' }),
      expect.objectContaining({ reminder_key: 'reminder-insurance', status: 'pending' }),
    ]);
  });

  it('keeps reminder statuses stable when planner data changes but reminder keys remain', () => {
    const initialBundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], [
      {
        reminder_key: 'reminder-banks',
        label: 'Follow up on Banks and credit cards',
        reason: 'Persist this status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'scheduled',
      },
    ]);

    const updatedBundle = buildNameChangeWorkspaceBundle(
      makeCase({ county_residence: 'Orange County' }),
      [],
      [],
      initialBundle.reminders,
    );

    expect(updatedBundle.reminders.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      status: 'scheduled',
    });
  });

  it('merges existing plan execution state onto regenerated plan steps', () => {
    const initialBundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], []);
    const existingPlan = {
      ...initialBundle.plan,
      steps: initialBundle.plan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'complete' as const,
        executionNote: 'SSA update confirmed by mail',
        executionUpdatedAt: '2026-04-18T18:00:00.000Z',
        completedAt: '2026-04-18T18:00:00.000Z',
      } : step),
    };

    const mergedPlan = mergeNameChangePlanExecutionState(initialBundle.plan, existingPlan);
    expect(mergedPlan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      executionStatus: 'complete',
      executionNote: 'SSA update confirmed by mail',
      completedAt: '2026-04-18T18:00:00.000Z',
    });
    expect(mergedPlan.summary.executionCounts).toMatchObject({ complete: 1 });
  });

  it('hydrates execution status from the latest snapshot when present', () => {
    const hydrated = hydrateNameChangeWorkspace({
      caseRecord: {
        id: 'case-2',
        wedding_site_id: 'site-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...makeCase(),
        current_middle_name: '  Marie ',
        target_middle_name: null,
        email: ' Alex@Example.COM ',
        phone_last4: '(555) 991-2481',
        county_residence: ' San Diego ',
        marriage_state: 'California',
        marriage_date: ' 2026-04-05 ',
        latest_plan_summary: null,
      },
      documents: [],
      extractedFields: [],
      latestSnapshot: {
        id: 'snapshot-1',
        name_change_case_id: 'case-2',
        engine_version: 'test',
        created_at: new Date().toISOString(),
        plan_payload: {
          ...buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan,
          steps: buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan.steps.map((step) => step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step),
        },
      },
      reminders: [],
    });

    expect(hydrated.plan.steps.find((step) => step.id === 'state-dmv')).toMatchObject({ executionStatus: 'in_progress' });
  });

  it('derives draft workflow status when blockers remain', () => {
    const plan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    expect(deriveNameChangeWorkflowStatus(plan)).toBe('draft');
  });

  it('derives in-progress and complete workflow states from execution progress', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ], []).plan;

    const inProgressPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'in_progress' as const } : step),
    }, basePlan);
    expect(deriveNameChangeWorkflowStatus(inProgressPlan)).toBe('in_progress');

    const completePlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.status === 'blocked' ? step : { ...step, executionStatus: 'complete' as const }),
    }, basePlan);
    expect(deriveNameChangeWorkflowStatus(completePlan)).toBe('complete');
  });

  it('prefers explicit new execution note metadata over stale snapshot values', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const existingPlan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'Old note',
        executionUpdatedAt: '2026-04-18T18:00:00.000Z',
      } : step),
    };
    const generatedPlan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'complete' as const,
        executionNote: 'New completion note',
        executionUpdatedAt: '2026-04-18T19:00:00.000Z',
        completedAt: '2026-04-18T19:00:00.000Z',
      } : step),
    };

    const merged = mergeNameChangePlanExecutionState(generatedPlan, existingPlan);
    expect(merged.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      executionStatus: 'complete',
      executionNote: 'New completion note',
      executionUpdatedAt: '2026-04-18T19:00:00.000Z',
      completedAt: '2026-04-18T19:00:00.000Z',
    });
  });

  it('builds recent execution activity from updated workflow steps', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const merged = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => ({
        ...step,
        executionStatus: index === 0 ? 'complete' as const : index === 1 ? 'in_progress' as const : step.executionStatus,
        executionNote: index < 2 ? `note-${index}` : step.executionNote,
        executionUpdatedAt: index < 2 ? `2026-04-18T19:0${index}:00.000Z` : step.executionUpdatedAt,
        completedAt: index === 0 ? '2026-04-18T19:00:00.000Z' : step.completedAt,
      })),
    }, basePlan);

    expect(merged.summary.recentExecutionActivity).toEqual([
      expect.objectContaining({ stepId: merged.steps[1].id, source: 'step', executionStatus: 'in_progress', note: 'note-1', timestamp: '2026-04-18T19:01:00.000Z' }),
      expect.objectContaining({ stepId: merged.steps[0].id, source: 'step', executionStatus: 'complete', note: 'note-0', timestamp: '2026-04-18T19:00:00.000Z' }),
    ]);
    expect(merged.summary.activitySourceCounts).toEqual({ step: 2, reminder: 0 });
    expect(merged.summary.latestMovementPosture).toBe('step-led');
    expect(merged.summary.reminderChurnRisk).toBe('low');
    expect(merged.summary.hasRecentCompletion).toBe(true);
  });

  it('appends manual reminder activity into recent execution activity', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      stepId: null,
      source: 'reminder',
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });
    expect(updatedPlan.summary.activitySourceCounts).toEqual({ step: 0, reminder: 1 });
    expect(updatedPlan.summary.latestMovementPosture).toBe('reminder-led');
    expect(updatedPlan.summary.reminderChurnRisk).toBe('medium');
    expect(updatedPlan.summary.hasRecentCompletion).toBe(false);
  });

  it('marks latest movement posture as mixed when recent activity is balanced', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const planWithStep = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T19:00:00.000Z' }
        : step),
    }, basePlan);
    const mixedPlan = appendNameChangeExecutionActivity(planWithStep, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });

    expect(mixedPlan.summary.activitySourceCounts).toEqual({ step: 1, reminder: 1 });
    expect(mixedPlan.summary.latestMovementPosture).toBe('mixed');
    expect(mixedPlan.summary.reminderChurnRisk).toBe('low');
    expect(mixedPlan.summary.hasRecentCompletion).toBe(false);
  });

  it('flags high reminder churn when recent activity is dominated by reminder actions', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const churnPlan = [1, 2, 3, 4].reduce((plan, index) => appendNameChangeExecutionActivity(plan, {
      title: `Reminder updated ${index}`,
      executionStatus: 'in_progress',
      note: `Reminder status changed ${index}`,
      timestamp: `2026-04-18T20:0${index}:00.000Z`,
    }), basePlan);

    expect(churnPlan.summary.activitySourceCounts).toEqual({ step: 0, reminder: 4 });
    expect(churnPlan.summary.latestMovementPosture).toBe('reminder-led');
    expect(churnPlan.summary.reminderChurnRisk).toBe('high');
    expect(churnPlan.summary.hasRecentCompletion).toBe(false);
  });

  it('appends bulk reminder activity into recent execution activity', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Bulk reminder update (2)',
      executionStatus: 'in_progress',
      note: 'Follow up on Banks and credit cards → scheduled · Follow up on Health, auto, renters, and life insurance → scheduled',
      timestamp: '2026-04-18T20:05:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      stepId: null,
      source: 'reminder',
      title: 'Bulk reminder update (2)',
      executionStatus: 'in_progress',
      timestamp: '2026-04-18T20:05:00.000Z',
    });
  });

  it('can append a stale-reminder scheduling activity label distinctly', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Scheduled stale reminders (2)',
      executionStatus: 'in_progress',
      note: 'Follow up on Banks and credit cards → scheduled · Follow up on Health, auto, renters, and life insurance → scheduled',
      timestamp: '2026-04-18T20:06:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      source: 'reminder',
      title: 'Scheduled stale reminders (2)',
      timestamp: '2026-04-18T20:06:00.000Z',
    });
  });

  it('annotates dependent plan steps when reminder statuses change', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges(basePlan, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:10:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionNote: expect.stringContaining('Follow up on Banks and credit cards reminder → scheduled'),
      executionUpdatedAt: '2026-04-18T20:10:00.000Z',
    });
  });

  it('replaces prior reminder annotation fragments instead of endlessly appending them', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const firstPass = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionNote: 'Called SSA already · Follow up on Banks and credit cards reminder → pending' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:15:00.000Z');

    expect(firstPass.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionNote: 'Called SSA already · Follow up on Banks and credit cards reminder → scheduled',
      executionUpdatedAt: '2026-04-18T20:15:00.000Z',
    });
  });

  it('does not downgrade already-in-progress steps when reminder changes come through', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'complete' as const, executionNote: 'Bank updated already' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:20:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'complete',
      executionUpdatedAt: '2026-04-18T20:20:00.000Z',
    });
  });

  it('does not refresh step touch timestamps for dismissal-only reminder changes', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T20:00:00.000Z' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'dismissed',
      },
    ], '2026-04-18T21:00:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionUpdatedAt: '2026-04-18T20:00:00.000Z',
      executionNote: 'Follow up on Banks and credit cards reminder → dismissed',
    });
  });

  it('marks dependent steps complete when reminder changes are sent', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T20:00:00.000Z' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'sent',
      },
    ], '2026-04-18T21:30:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'complete',
      executionUpdatedAt: '2026-04-18T21:30:00.000Z',
      completedAt: '2026-04-18T21:30:00.000Z',
      executionNote: 'Follow up on Banks and credit cards reminder → sent',
    });
  });
});
