import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { demoWeddingSite, demoGuests, demoPlanningTasks, demoBudgetItems, demoVendors, demoNameChangeCase, demoNameChangeDocuments, demoNameChangeExtractedFields } from '../../lib/demoData';
import { PLANNER_ROLE_OPTIONS, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import {
  PlanningTask, PlanningBudgetItem, PlanningVendor,
  getWeddingSiteId, getWeddingDate,
  loadTasks,
  loadBudgetItems,
  loadVendors,
  loadPlanningGuestCount,
  loadPlanningSeatingReadiness,
  loadPlanningSiteMeta,
} from './planning/planningService';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import { syncNameChangeRemindersWithStepExecution } from '../../lib/nameChange/reminders';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../lib/nameChange/types';
import { annotateNameChangePlanStepsFromReminderChanges, appendNameChangeExecutionActivity, buildNameChangeWorkspaceBundle, deriveNameChangeWorkflowStatus, hydrateNameChangeWorkspace, loadNameChangeWorkspace, defaultNameChangeCaseInput, mergeNameChangePlanExecutionState, saveNameChangeWorkspace } from './planning/nameChangeService';
import { PlanningDashboardShell } from './planning/PlanningDashboardShell';
import { PendingVendorBudgetPrompt } from './planning/PendingVendorBudgetPrompt';
import { PlanningDashboardTabContent } from './planning/PlanningDashboardTabContent';
import { usePlanningDashboardActions } from './planning/usePlanningDashboardActions';
import { usePlanningStarterSuiteActions } from './planning/usePlanningStarterSuiteActions';

type Tab = 'overview' | 'tasks' | 'budget' | 'payments' | 'vendors' | 'songs' | 'addresses' | 'nameChange';

let planningLocationEventsPatched = false;

export function resolvePlanningTabFromSearch(search: string): Tab | null {
  const tabs: Tab[] = ['overview', 'tasks', 'budget', 'payments', 'vendors', 'songs', 'addresses', 'nameChange'];
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  return tabs.includes(tab as Tab) ? (tab as Tab) : null;
}

export function ensurePlanningLocationEventsPatched() {
  if (planningLocationEventsPatched || typeof window === 'undefined') return;

  const dispatchLocationChange = () => {
    window.dispatchEvent(new Event('dayof:locationchange'));
  };

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = ((...args: Parameters<History['pushState']>) => {
    originalPushState(...args);
    dispatchLocationChange();
  }) as History['pushState'];

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    originalReplaceState(...args);
    dispatchLocationChange();
  }) as History['replaceState'];

  planningLocationEventsPatched = true;
}

export const DashboardPlanning: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [budgetItems, setBudgetItems] = useState<PlanningBudgetItem[]>([]);
  const [vendors, setVendors] = useState<PlanningVendor[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [seatingReadiness, setSeatingReadiness] = useState({ attending: 0, seated: 0, unassigned: 0 });
  const [guestCount, setGuestCount] = useState(0);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [destinationWedding, setDestinationWedding] = useState(false);
  const [planningRole, setPlanningRole] = useState<PlannerAccessRole>('owner');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [planningPermissions, setPlanningPermissions] = useState<PlannerPermissionKey[] | null>(null);
  const [starterSuiteQaRunId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('starterSuiteQa') ?? '';
  });
  const [nameChangeDraft, setNameChangeDraft] = useState<NameChangeCaseInput>(defaultNameChangeCaseInput);
  const [nameChangeDocuments, setNameChangeDocuments] = useState<NameChangeDocumentInput[]>([]);
  const [nameChangeExtractedFields, setNameChangeExtractedFields] = useState<NameChangeExtractedFieldInput[]>([]);
  const [nameChangePlan, setNameChangePlan] = useState<NameChangePlan>(() => buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] }));
  const [nameChangeReminders, setNameChangeReminders] = useState<NameChangeReminderInput[]>([]);
  const [nameChangeSaving, setNameChangeSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, [isDemoMode, user]);

  useEffect(() => {
    ensurePlanningLocationEventsPatched();

    const syncTabFromLocation = () => {
      const tabFromSearch = resolvePlanningTabFromSearch(window.location.search);
      if (tabFromSearch) {
        setActiveTab(tabFromSearch);
      }
    };

    syncTabFromLocation();
    window.addEventListener('popstate', syncTabFromLocation);
    window.addEventListener('dayof:locationchange', syncTabFromLocation);

    return () => {
      window.removeEventListener('popstate', syncTabFromLocation);
      window.removeEventListener('dayof:locationchange', syncTabFromLocation);
    };
  }, []);

  useEffect(() => {
    if (!siteId) return;
    writePlannerAccessRole('planning', siteId, planningRole);
  }, [siteId, planningRole]);

  async function loadAll() {
    try {
      if (isDemoMode) {
        setSiteId(demoWeddingSite.id);
        setWeddingDate(demoWeddingSite.wedding_date);
        setTasks(demoPlanningTasks as unknown as PlanningTask[]);
        setBudgetItems(demoBudgetItems as unknown as PlanningBudgetItem[]);
        setVendors(demoVendors as unknown as PlanningVendor[]);
        setTotalBudget(30000);
        setSeatingReadiness({ attending: 68, seated: 52, unassigned: 16 });
        setGuestCount(demoGuests.length);
        setVenueName(demoWeddingSite.venue_name);
        setDestinationWedding(Boolean((demoWeddingSite as { is_destination_wedding?: boolean }).is_destination_wedding));
        const demoCase: NameChangeCaseInput = {
          ...defaultNameChangeCaseInput,
          ...demoNameChangeCase,
          change_reasons: [...demoNameChangeCase.change_reasons],
          structured_intake: { ...demoNameChangeCase.structured_intake },
        };
        const demoDocuments = [...demoNameChangeDocuments] as unknown as NameChangeDocumentInput[];
        const demoFields = [...demoNameChangeExtractedFields] as unknown as NameChangeExtractedFieldInput[];
        setNameChangeDraft(demoCase);
        setNameChangeDocuments(demoDocuments);
        setNameChangeExtractedFields(demoFields);
        const demoWorkspace = buildNameChangeWorkspaceBundle(demoCase, demoDocuments, demoFields);
        setNameChangePlan(mergeNameChangePlanExecutionState(demoWorkspace.plan, null));
        setNameChangeReminders(demoWorkspace.reminders);
        return;
      }

      const id = await getWeddingSiteId();
      if (!id) return;
      setSiteId(id);
      if (user) {
        const activeSite = await resolveActiveSiteForUser(user.id);
        if (activeSite?.id === id) {
          setActiveSiteRole(activeSite.role);
          setPlanningRole(activeSite.role);
          setPlanningPermissions(activeSite.permissions ?? null);
        }
      }
      const storedRole = readPlannerAccessRole('planning', id);
      if (storedRole) setPlanningRole(storedRole);
      const wDate = await getWeddingDate();
      setWeddingDate(wDate);

      const [tasksData, budgetData, vendorsData, siteMeta, guestCountResult] = await Promise.all([
        loadTasks(id),
        loadBudgetItems(id),
        loadVendors(id),
        loadPlanningSiteMeta(id),
        loadPlanningGuestCount(id),
      ]);
      setTasks(tasksData);
      setBudgetItems(budgetData);
      setVendors(vendorsData);
      setGuestCount(guestCountResult);
      setVenueName(siteMeta.venueName);
      setDestinationWedding(siteMeta.destinationWedding);
      setTotalBudget(siteMeta.totalBudget);

      await loadSeatingReadiness(id);

      const workspace = await loadNameChangeWorkspace(id);
      if (workspace.caseRecord) {
        const hydrated = hydrateNameChangeWorkspace(workspace);
        setNameChangeDraft(hydrated.draft);
        setNameChangeDocuments(hydrated.documents);
        setNameChangeExtractedFields(hydrated.extractedFields);
        setNameChangePlan(hydrated.plan);
        setNameChangeReminders(hydrated.reminders);
      }
    } catch {
      toast('Couldn’t load planning data right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadSeatingReadiness(id: string) {
    try {
      setSeatingReadiness(await loadPlanningSeatingReadiness(id));
    } catch {
    }
  }

  const openTaskCount = useMemo(() => tasks.filter((task) => task.status !== 'done').length, [tasks]);
  const paidTotal = useMemo(() => budgetItems.reduce((sum, item) => sum + Number(item.paid_amount ?? 0), 0), [budgetItems]);
  const estimatedTotal = useMemo(() => budgetItems.reduce((sum, item) => sum + Number(item.estimated_amount ?? 0), 0), [budgetItems]);
  const {
    addVendorToBudget,
    handleAddBudgetItem,
    handleAddTask,
    handleAddVendor,
    handleCreateMilestones,
    handleDeleteBudgetItem,
    handleDeleteTask,
    handleDeleteVendor,
    handleSaveTotalBudget,
    handleUpdateBudgetItem,
    handleUpdateTask,
    handleUpdateVendor,
    pendingVendorForBudget,
    setPendingVendorForBudget,
  } = usePlanningDashboardActions({
    isDemoMode,
    planningPermissions,
    planningRole,
    setBudgetItems,
    setTasks,
    setTotalBudget,
    setVendors,
    siteId,
    toast,
    weddingDate,
  });
  const {
    applyingStarterSuite,
    handleApplyStarterSuite,
    handleUndoStarterSuite,
    lastStarterSuiteRun,
    starterSuite,
    undoingStarterSuite,
  } = usePlanningStarterSuiteActions({
    destinationWedding,
    guestCount,
    isDemoMode,
    planningPermissions,
    planningRole,
    qaRunId: starterSuiteQaRunId,
    setBudgetItems,
    setTasks,
    setVendors,
    siteId,
    tasks,
    budgetItems,
    vendors,
    toast,
    venueName,
    weddingDate,
  });

  const handleNameChangeDraft = useCallback((updates: Partial<NameChangeCaseInput>) => {
    setNameChangeDraft((prev) => {
      const next = { ...prev, ...updates }; 
      const nextWorkspace = buildNameChangeWorkspaceBundle(next, nameChangeDocuments, nameChangeExtractedFields, nameChangeReminders);
      setNameChangePlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, nameChangePlan));
      setNameChangeReminders(nextWorkspace.reminders);
      return next;
    });
  }, [nameChangeDocuments, nameChangeExtractedFields, nameChangePlan, nameChangeReminders]);

  const handleStructuredIntake = useCallback((key: string, value: unknown) => {
    setNameChangeDraft((prev) => {
      const next = {
        ...prev,
        structured_intake: {
          ...prev.structured_intake,
          [key]: value,
        },
      };
      const nextWorkspace = buildNameChangeWorkspaceBundle(next, nameChangeDocuments, nameChangeExtractedFields, nameChangeReminders);
      setNameChangePlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, nameChangePlan));
      setNameChangeReminders(nextWorkspace.reminders);
      return next;
    });
  }, [nameChangeDocuments, nameChangeExtractedFields, nameChangePlan, nameChangeReminders]);

  const handleNameChangeDocuments = useCallback((nextDocuments: NameChangeDocumentInput[]) => {
    setNameChangeDocuments(nextDocuments);
    const nextWorkspace = buildNameChangeWorkspaceBundle(nameChangeDraft, nextDocuments, nameChangeExtractedFields, nameChangeReminders);
    setNameChangePlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, nameChangePlan));
    setNameChangeReminders(nextWorkspace.reminders);
  }, [nameChangeDraft, nameChangeExtractedFields, nameChangePlan, nameChangeReminders]);

  const handleNameChangeExtractedFields = useCallback((nextFields: NameChangeExtractedFieldInput[]) => {
    setNameChangeExtractedFields(nextFields);
    const nextWorkspace = buildNameChangeWorkspaceBundle(nameChangeDraft, nameChangeDocuments, nextFields, nameChangeReminders);
    setNameChangePlan(mergeNameChangePlanExecutionState(nextWorkspace.plan, nameChangePlan));
    setNameChangeReminders(nextWorkspace.reminders);
  }, [nameChangeDraft, nameChangeDocuments, nameChangePlan, nameChangeReminders]);

  const handleNameChangeStepExecutionStatus = useCallback((stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => {
    const now = new Date().toISOString();
    const nextPlan = mergeNameChangePlanExecutionState({
      ...nameChangePlan,
      steps: nameChangePlan.steps.map((step) => step.id === stepId ? {
        ...step,
        executionStatus,
        executionUpdatedAt: now,
        completedAt: executionStatus === 'complete' ? now : null,
      } : step),
    }, nameChangePlan);
    setNameChangePlan(nextPlan);
    setNameChangeReminders((prev) => syncNameChangeRemindersWithStepExecution(prev, stepId, executionStatus));
    setNameChangeDraft((prev) => ({ ...prev, workflow_status: deriveNameChangeWorkflowStatus(nextPlan) }));
  }, [nameChangePlan]);

  const handleNameChangeStepExecutionNote = useCallback((stepId: string, note: string) => {
    const now = new Date().toISOString();
    const nextPlan = mergeNameChangePlanExecutionState({
      ...nameChangePlan,
      steps: nameChangePlan.steps.map((step) => step.id === stepId ? {
        ...step,
        executionNote: note,
        executionUpdatedAt: now,
      } : step),
    }, nameChangePlan);
    setNameChangePlan(nextPlan);
  }, [nameChangePlan]);

  const handleNameChangeReminders = useCallback((nextReminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => {
    const previousReminders = new Map(nameChangeReminders.map((reminder) => [reminder.reminder_key, reminder]));
    const changedReminders = nextReminders.filter((reminder) => previousReminders.get(reminder.reminder_key)?.status !== reminder.status);
    setNameChangeReminders(nextReminders);
    if (changedReminders.length === 0) return;

    setNameChangePlan((prev) => {
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
  }, [nameChangeReminders]);

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
      setNameChangeSaving(true);
      const result = await saveNameChangeWorkspace(siteId, nameChangeDraft, nameChangeDocuments, nameChangeExtractedFields, nameChangeReminders, nameChangePlan);
      setNameChangeDraft((prev) => ({ ...prev, workflow_status: result.caseRecord.workflow_status, latest_plan_summary: result.plan.summary as unknown as Record<string, unknown> }));
      setNameChangePlan(result.plan);
      setNameChangeReminders(result.reminders);
      toast('Name change planner saved.', 'success');
    } catch {
      toast('Couldn’t save the name change planner right now.', 'error');
    } finally {
      setNameChangeSaving(false);
    }
  }, [isDemoMode, nameChangeDraft, nameChangeDocuments, nameChangeExtractedFields, nameChangeReminders, siteId, toast]);

  return (
    <PlanningDashboardShell
      activeSiteRole={activeSiteRole}
      activeTab={activeTab}
      estimatedTotal={estimatedTotal}
      onPlanningRoleChange={setPlanningRole}
      onTabChange={setActiveTab}
      openTaskCount={openTaskCount}
      paidTotal={paidTotal}
      planningRole={planningRole}
      tasksCount={tasks.length}
      vendorsCount={vendors.length}
    >
        <PlanningDashboardTabContent
          activeTab={activeTab}
          applyingStarterSuite={applyingStarterSuite}
          budgetItems={budgetItems}
          isDemoMode={isDemoMode}
          lastStarterSuiteRun={lastStarterSuiteRun}
          loading={loading}
          nameChangeDocuments={nameChangeDocuments}
          nameChangeDraft={nameChangeDraft}
          nameChangeExtractedFields={nameChangeExtractedFields}
          nameChangePlan={nameChangePlan}
          nameChangeReminders={nameChangeReminders}
          nameChangeSaving={nameChangeSaving}
          planningPermissions={planningPermissions}
          planningRole={planningRole}
          seatingReadiness={seatingReadiness}
          siteId={siteId}
          starterSuite={starterSuite}
          tasks={tasks}
          totalBudget={totalBudget}
          undoingStarterSuite={undoingStarterSuite}
          vendors={vendors}
          weddingDate={weddingDate}
          onAddBudgetItem={handleAddBudgetItem}
          onAddTask={handleAddTask}
          onAddVendor={handleAddVendor}
          onApplyStarterSuite={handleApplyStarterSuite}
          onCreateMilestones={handleCreateMilestones}
          onDeleteBudgetItem={handleDeleteBudgetItem}
          onDeleteTask={handleDeleteTask}
          onDeleteVendor={handleDeleteVendor}
          onDraftChange={handleNameChangeDraft}
          onDocumentsChange={handleNameChangeDocuments}
          onExtractedFieldsChange={handleNameChangeExtractedFields}
          onRemindersChange={handleNameChangeReminders}
          onSaveNameChange={handleSaveNameChange}
          onSaveTotalBudget={handleSaveTotalBudget}
          onStepExecutionNoteChange={handleNameChangeStepExecutionNote}
          onStepExecutionStatusChange={handleNameChangeStepExecutionStatus}
          onStructuredIntakeChange={handleStructuredIntake}
          onTabChange={setActiveTab}
          onUndoStarterSuite={handleUndoStarterSuite}
          onUpdateBudgetItem={handleUpdateBudgetItem}
          onUpdateTask={handleUpdateTask}
          onUpdateVendor={handleUpdateVendor}
        />

        {pendingVendorForBudget && (
          <PendingVendorBudgetPrompt
            vendor={pendingVendorForBudget}
            onClose={() => setPendingVendorForBudget(null)}
            onConfirm={async () => {
              try {
                await addVendorToBudget(pendingVendorForBudget);
              } catch {
                toast('Couldn’t add this vendor to budget right now. Please try again.', 'error');
              } finally {
                setPendingVendorForBudget(null);
              }
            }}
          />
        )}
    </PlanningDashboardShell>
  );
};
