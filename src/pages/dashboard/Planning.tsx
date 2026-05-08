import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { demoWeddingSite, demoGuests, demoPlanningTasks, demoBudgetItems, demoVendors, demoNameChangeCase, demoNameChangeDocuments, demoNameChangeExtractedFields } from '../../lib/demoData';
import { PLANNER_ROLE_OPTIONS, canEditPlanningBudget, canEditPlanningTasks, canEditPlanningVendors, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import {
  PlanningTask, PlanningBudgetItem, PlanningVendor,
  getWeddingSiteId, getWeddingDate,
  loadTasks, createTask, updateTask, deleteTask,
  loadBudgetItems, createBudgetItem, updateBudgetItem, deleteBudgetItem,
  loadVendors, createVendor, updateVendor, deleteVendor,
  generateMilestoneTasks,
  loadPlanningGuestCount,
  loadPlanningSeatingReadiness,
  loadPlanningSiteMeta,
  updatePlanningTotalBudget,
} from './planning/planningService';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import { syncNameChangeRemindersWithStepExecution } from '../../lib/nameChange/reminders';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../lib/nameChange/types';
import { annotateNameChangePlanStepsFromReminderChanges, appendNameChangeExecutionActivity, buildNameChangeWorkspaceBundle, deriveNameChangeWorkflowStatus, hydrateNameChangeWorkspace, loadNameChangeWorkspace, defaultNameChangeCaseInput, mergeNameChangePlanExecutionState, saveNameChangeWorkspace } from './planning/nameChangeService';
import { PlanningDashboardShell } from './planning/PlanningDashboardShell';
import { PendingVendorBudgetPrompt } from './planning/PendingVendorBudgetPrompt';
import { PlanningDashboardTabContent } from './planning/PlanningDashboardTabContent';
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
  const [pendingVendorForBudget, setPendingVendorForBudget] = useState<PlanningVendor | null>(null);
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

  const handleAddTask = useCallback(async (task: Partial<PlanningTask>) => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add planning tasks.', 'info');
      return;
    }
    if (!siteId) return;
    try {
      if (isDemoMode) {
        const created = {
          id: `demo-task-${Date.now()}`,
          wedding_site_id: siteId,
          title: task.title ?? 'New task',
          description: task.description ?? '',
          due_date: task.due_date ?? null,
          status: (task.status ?? 'todo') as PlanningTask['status'],
          priority: (task.priority ?? 'medium') as PlanningTask['priority'],
          owner_name: task.owner_name ?? '',
          category: task.category ?? null,
          linked_event_id: null,
          linked_vendor_id: null,
          sort_order: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PlanningTask;
        setTasks(prev => [...prev, created]);
        toast('Task added', 'success');
        return;
      }
      const created = await createTask(siteId, task);
      setTasks(prev => [...prev, created]);
      toast('Task added', 'success');
    } catch {
      toast('Couldn’t add that task. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole, planningPermissions]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit planning tasks.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch {
      toast('Couldn’t update that task. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete planning tasks.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast('Task deleted', 'success');
    } catch {
      toast('Couldn’t remove that task. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

  const handleCreateMilestones = useCallback(async () => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot generate milestone tasks.', 'info');
      return;
    }
    if (!siteId || !weddingDate) return;
    try {
      const milestones = generateMilestoneTasks(siteId, weddingDate);
      if (isDemoMode) {
        const created = milestones.slice(0, 6).map((m, idx) => ({
          ...(m as PlanningTask),
          id: `demo-milestone-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setTasks(prev => [...prev, ...created]);
        toast(`Added ${created.length} milestone tasks`, 'success');
        return;
      }
      const created = await Promise.all(milestones.map(m => createTask(siteId, m)));
      setTasks(prev => [...prev, ...created]);
      toast(`Added ${created.length} milestone tasks`, 'success');
    } catch {
      toast('Couldn’t generate milestones right now. Please try again.', 'error');
    }
  }, [siteId, weddingDate, toast, isDemoMode, planningRole, planningPermissions]);

  const openTaskCount = useMemo(() => tasks.filter((task) => task.status !== 'done').length, [tasks]);
  const paidTotal = useMemo(() => budgetItems.reduce((sum, item) => sum + Number(item.paid_amount ?? 0), 0), [budgetItems]);
  const estimatedTotal = useMemo(() => budgetItems.reduce((sum, item) => sum + Number(item.estimated_amount ?? 0), 0), [budgetItems]);
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

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add budget items.', 'info');
      return;
    }
    if (!siteId) return;
    try {
      const created = isDemoMode ? ({ id: `demo-budget-${Date.now()}`, wedding_site_id: siteId, category: item.category ?? 'General', item_name: item.item_name ?? 'New item', estimated_amount: item.estimated_amount ?? 0, actual_amount: item.actual_amount ?? 0, paid_amount: item.paid_amount ?? 0, due_date: item.due_date ?? null, vendor_id: null, notes: item.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PlanningBudgetItem) : await createBudgetItem(siteId, item);
      setBudgetItems(prev => [...prev, created]);
      toast('Budget item added', 'success');
    } catch {
      toast('Couldn’t add that budget item. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole, planningPermissions]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit budget items.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateBudgetItem(id, updates);
      setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch {
      toast('Couldn’t update that budget item. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete budget items.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteBudgetItem(id);
      setBudgetItems(prev => prev.filter(i => i.id !== id));
      toast('Budget item deleted', 'success');
    } catch {
      toast('Couldn’t remove that budget item. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

  const addVendorToBudget = useCallback(async (vendor: PlanningVendor) => {
    if (!siteId) return;

    const estimated = Number(vendor.contract_total) || 0;
    const paid = Number(vendor.amount_paid) || 0;
    const category = vendor.vendor_type || 'Vendor';

    const createdItem = isDemoMode
      ? ({
          id: `demo-budget-${Date.now()}`,
          wedding_site_id: siteId,
          category,
          item_name: vendor.name,
          estimated_amount: estimated,
          actual_amount: paid,
          paid_amount: paid,
          due_date: vendor.next_payment_due || null,
          vendor_id: vendor.id,
          notes: vendor.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PlanningBudgetItem)
      : await createBudgetItem(siteId, {
          category,
          item_name: vendor.name,
          estimated_amount: estimated,
          actual_amount: paid,
          paid_amount: paid,
          due_date: vendor.next_payment_due || null,
          vendor_id: vendor.id,
          notes: vendor.notes || '',
        });

    setBudgetItems(prev => [...prev, createdItem]);
    toast('Vendor also added to budget', 'success');
  }, [siteId, toast, isDemoMode]);

  const handleAddVendor = useCallback(async (vendor: Partial<PlanningVendor>) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add vendors.', 'info');
      return;
    }
    if (!siteId) return;
    try {
      const created = isDemoMode ? ({ id: `demo-vendor-${Date.now()}`, wedding_site_id: siteId, vendor_type: vendor.vendor_type ?? 'Vendor', name: vendor.name ?? 'New vendor', contact_name: vendor.contact_name ?? '', email: vendor.email ?? '', phone: vendor.phone ?? '', website: vendor.website ?? '', contract_total: vendor.contract_total ?? 0, amount_paid: vendor.amount_paid ?? 0, balance_due: vendor.balance_due ?? Math.max(0, (vendor.contract_total ?? 0) - (vendor.amount_paid ?? 0)), next_payment_due: vendor.next_payment_due ?? null, document_label: vendor.document_label ?? '', document_url: vendor.document_url ?? '', notes: vendor.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PlanningVendor) : await createVendor(siteId, vendor);
      setVendors(prev => [...prev, created]);
      setPendingVendorForBudget(created);
      toast('Vendor added', 'success');
    } catch {
      toast('Couldn’t add that vendor. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole, planningPermissions]);

  const handleSaveTotalBudget = useCallback(async (value: number) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot update the total budget.', 'info');
      return;
    }
    if (!siteId) return;
    try {
      if (isDemoMode) {
        setTotalBudget(value);
        toast('Total budget updated', 'success');
        return;
      }

      await updatePlanningTotalBudget(siteId, value);
      setTotalBudget(value);
      toast('Total budget updated', 'success');
    } catch {
      toast('Couldn’t update total budget. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole, planningPermissions]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit vendors.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateVendor(id, updates);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch {
      toast('Couldn’t update that vendor. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete vendors.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteVendor(id);
      setVendors(prev => prev.filter(v => v.id !== id));
      toast('Vendor deleted', 'success');
    } catch {
      toast('Couldn’t remove that vendor. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole, planningPermissions]);

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
