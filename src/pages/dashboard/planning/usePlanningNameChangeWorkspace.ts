import { useCallback, useState } from 'react';

import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { syncNameChangeRemindersWithStepExecution } from '../../../lib/nameChange/reminders';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeReminderInput,
} from '../../../lib/nameChange/types';
import {
  annotateNameChangePlanStepsFromReminderChanges,
  appendNameChangeExecutionActivity,
  buildNameChangeWorkspaceBundle,
  defaultNameChangeCaseInput,
  deriveNameChangeWorkflowStatus,
  mergeNameChangePlanExecutionState,
  saveNameChangeWorkspace,
} from './nameChangeService';

type ToastFn = (message: string, variant?: 'success' | 'error' | 'info') => void;

interface NameChangeWorkspaceState {
  documents: NameChangeDocumentInput[];
  draft: NameChangeCaseInput;
  extractedFields: NameChangeExtractedFieldInput[];
  plan: NameChangePlan;
  reminders: NameChangeReminderInput[];
}

interface UsePlanningNameChangeWorkspaceArgs {
  isDemoMode: boolean;
  siteId: string | null;
  toast: ToastFn;
}

export function usePlanningNameChangeWorkspace({
  isDemoMode,
  siteId,
  toast,
}: UsePlanningNameChangeWorkspaceArgs) {
  const [draft, setDraft] = useState<NameChangeCaseInput>(defaultNameChangeCaseInput);
  const [documents, setDocuments] = useState<NameChangeDocumentInput[]>([]);
  const [extractedFields, setExtractedFields] = useState<NameChangeExtractedFieldInput[]>([]);
  const [plan, setPlan] = useState<NameChangePlan>(() => buildNameChangePlan({
    profile: defaultNameChangeCaseInput,
    documents: [],
    extractedFields: [],
  }));
  const [reminders, setReminders] = useState<NameChangeReminderInput[]>([]);
  const [saving, setSaving] = useState(false);

  const hydrateNameChangeWorkspace = useCallback((nextState: NameChangeWorkspaceState) => {
    setDraft(nextState.draft);
    setDocuments(nextState.documents);
    setExtractedFields(nextState.extractedFields);
    setPlan(nextState.plan);
    setReminders(nextState.reminders);
  }, []);

  const handleDraftChange = useCallback((updates: Partial<NameChangeCaseInput>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      const nextWorkspace = buildNameChangeWorkspaceBundle(next, documents, extractedFields, reminders);
      setPlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, plan));
      setReminders(nextWorkspace.reminders);
      return next;
    });
  }, [documents, extractedFields, plan, reminders]);

  const handleStructuredIntakeChange = useCallback((key: string, value: unknown) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        structured_intake: {
          ...prev.structured_intake,
          [key]: value,
        },
      };
      const nextWorkspace = buildNameChangeWorkspaceBundle(next, documents, extractedFields, reminders);
      setPlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, plan));
      setReminders(nextWorkspace.reminders);
      return next;
    });
  }, [documents, extractedFields, plan, reminders]);

  const handleDocumentsChange = useCallback((nextDocuments: NameChangeDocumentInput[]) => {
    setDocuments(nextDocuments);
    const nextWorkspace = buildNameChangeWorkspaceBundle(draft, nextDocuments, extractedFields, reminders);
    setPlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, plan));
    setReminders(nextWorkspace.reminders);
  }, [draft, extractedFields, plan, reminders]);

  const handleExtractedFieldsChange = useCallback((nextFields: NameChangeExtractedFieldInput[]) => {
    setExtractedFields(nextFields);
    const nextWorkspace = buildNameChangeWorkspaceBundle(draft, documents, nextFields, reminders);
    setPlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, plan));
    setReminders(nextWorkspace.reminders);
  }, [documents, draft, plan, reminders]);

  const handleStepExecutionStatusChange = useCallback((stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => {
    const now = new Date().toISOString();
    const nextPlan = mergeNameChangePlanExecutionState({
      ...plan,
      steps: plan.steps.map((step) => step.id === stepId ? {
        ...step,
        executionStatus,
        executionUpdatedAt: now,
        completedAt: executionStatus === 'complete' ? now : null,
      } : step),
    }, plan);
    setPlan(nextPlan);
    setReminders((prev) => syncNameChangeRemindersWithStepExecution(prev, stepId, executionStatus));
    setDraft((prev) => ({ ...prev, workflow_status: deriveNameChangeWorkflowStatus(nextPlan) }));
  }, [plan]);

  const handleStepExecutionNoteChange = useCallback((stepId: string, note: string) => {
    const now = new Date().toISOString();
    const nextPlan = mergeNameChangePlanExecutionState({
      ...plan,
      steps: plan.steps.map((step) => step.id === stepId ? {
        ...step,
        executionNote: note,
        executionUpdatedAt: now,
      } : step),
    }, plan);
    setPlan(nextPlan);
  }, [plan]);

  const handleRemindersChange = useCallback((
    nextReminders: NameChangeReminderInput[],
    context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' },
  ) => {
    const previousReminders = new Map(reminders.map((reminder) => [reminder.reminder_key, reminder]));
    const changedReminders = nextReminders.filter((reminder) => previousReminders.get(reminder.reminder_key)?.status !== reminder.status);
    setReminders(nextReminders);
    if (changedReminders.length === 0) return;

    setPlan((prev) => {
      const annotated = annotateNameChangePlanStepsFromReminderChanges(prev, changedReminders);

      if (changedReminders.length === 1) {
        const changedReminder = changedReminders[0];
        return appendNameChangeExecutionActivity(annotated, {
          title: `Reminder updated: ${changedReminder.label}`,
          executionStatus: changedReminder.status === 'dismissed' ? 'todo' : changedReminder.status === 'sent' ? 'complete' : 'in_progress',
          note: `Reminder status changed to ${changedReminder.status}`,
        });
      }

      const statusCounts = changedReminders.reduce<Record<string, number>>((counts, reminder) => {
        counts[reminder.status] = (counts[reminder.status] ?? 0) + 1;
        return counts;
      }, {});
      const dominantStatus = (Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'scheduled') as NameChangeReminderInput['status'];
      const title = context?.action === 'schedule-stale'
        ? `Scheduled stale reminders (${changedReminders.length})`
        : `Bulk reminder update (${changedReminders.length})`;

      return appendNameChangeExecutionActivity(annotated, {
        title,
        executionStatus: dominantStatus === 'dismissed' ? 'todo' : dominantStatus === 'sent' ? 'complete' : 'in_progress',
        note: changedReminders
          .map((reminder) => `${reminder.label} → ${reminder.status}`)
          .slice(0, 3)
          .join(' · '),
      });
    });
  }, [reminders]);

  const handleSaveNameChange = useCallback(async () => {
    if (isDemoMode) {
      toast('Demo mode saved the planner state locally.', 'success');
      return;
    }
    if (!siteId) {
      toast('Missing site context for name change planner.', 'error');
      return;
    }

    try {
      setSaving(true);
      const result = await saveNameChangeWorkspace(siteId, draft, documents, extractedFields, reminders, plan);
      setDraft((prev) => ({
        ...prev,
        workflow_status: result.caseRecord.workflow_status,
        latest_plan_summary: result.plan.summary as unknown as Record<string, unknown>,
      }));
      setPlan(result.plan);
      setReminders(result.reminders);
      toast('Name change planner saved.', 'success');
    } catch {
      toast('Couldn’t save the name change planner right now.', 'error');
    } finally {
      setSaving(false);
    }
  }, [documents, draft, extractedFields, isDemoMode, plan, reminders, siteId, toast]);

  return {
    handleDocumentsChange,
    handleDraftChange,
    handleExtractedFieldsChange,
    handleRemindersChange,
    handleSaveNameChange,
    handleStepExecutionNoteChange,
    handleStepExecutionStatusChange,
    handleStructuredIntakeChange,
    hydrateNameChangeWorkspace,
    nameChangeDocuments: documents,
    nameChangeDraft: draft,
    nameChangeExtractedFields: extractedFields,
    nameChangePlan: plan,
    nameChangeReminders: reminders,
    nameChangeSaving: saving,
  };
}
