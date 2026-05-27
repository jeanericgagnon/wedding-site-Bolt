import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { demoWeddingSite, demoPlanningTasks, demoBudgetItems, demoVendors, demoNameChangeCase, demoNameChangeDocuments, demoNameChangeExtractedFields, demoEvents } from '../../lib/demoData';
import { PLANNER_ROLE_OPTIONS, canEditPlanningBudget, canEditPlanningTasks, canEditPlanningVendors, writePlannerAccessRole, type PlannerAccessRole } from '../../lib/plannerAccess';
import {
  PlanningTask, PlanningBudgetItem, PlanningVendor,
  getWeddingSiteId, getWeddingDate,
  loadTasks, createTask, updateTask, deleteTask,
  loadBudgetItems, createBudgetItem, updateBudgetItem, deleteBudgetItem,
  loadVendors, createVendor, updateVendor, deleteVendor,
  generateMilestoneTasks,
} from './planning/planningService';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import { syncNameChangeRemindersWithStepExecution } from '../../lib/nameChange/reminders';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../lib/nameChange/types';
import { annotateNameChangePlanStepsFromReminderChanges, appendNameChangeExecutionActivity, buildNameChangeWorkspaceBundle, deriveNameChangeWorkflowStatus, hydrateNameChangeWorkspace, loadNameChangeWorkspace, defaultNameChangeCaseInput, mergeNameChangePlanExecutionState, saveNameChangeWorkspace } from './planning/nameChangeService';
import { PlanningOverviewTab } from './planning/PlanningOverviewTab';
import { TasksTab } from './planning/TasksTab';
import { BudgetTab } from './planning/BudgetTab';
import { VendorsTab } from './planning/VendorsTab';
import { NameChangePlannerTab } from './planning/NameChangePlannerTab';

type Tab = 'overview' | 'tasks' | 'budget' | 'vendors' | 'nameChange';

let planningLocationEventsPatched = false;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'nameChange', label: 'Name change' },
];

export function resolvePlanningTabFromSearch(search: string): Tab | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  return TABS.some((candidate) => candidate.id === tab) ? (tab as Tab) : null;
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
  const [itineraryEventCount, setItineraryEventCount] = useState(0);
  const [privacyMode, setPrivacyMode] = useState<'public' | 'password_protected' | 'invite_only'>('public');
  const [pendingVendorForBudget, setPendingVendorForBudget] = useState<PlanningVendor | null>(null);
  const [planningRole, setPlanningRole] = useState<PlannerAccessRole>('owner');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
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
        setItineraryEventCount(demoEvents.length);
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
        }
      }
      try {
        const rawRole = localStorage.getItem(`dayof.planning.role.${id}`) as PlannerAccessRole | null;
        if (rawRole === 'owner' || rawRole === 'planner' || rawRole === 'coordinator' || rawRole === 'viewer') setPlanningRole(rawRole);
      } catch {
        setPlanningRole(activeSiteRole);
      }
      const wDate = await getWeddingDate();
      setWeddingDate(wDate);

      const [tasksData, budgetData, vendorsData, siteMeta, itineraryMeta] = await Promise.all([
        loadTasks(id),
        loadBudgetItems(id),
        loadVendors(id),
        supabase.from('wedding_sites').select('wedding_data, privacy_mode').eq('id', id).maybeSingle(),
        supabase.from('itinerary_events').select('id', { count: 'exact', head: true }).eq('wedding_site_id', id),
      ]);
      setTasks(tasksData);
      setBudgetItems(budgetData);
      setVendors(vendorsData);

      const weddingData = (siteMeta.data?.wedding_data as Record<string, unknown> | null) ?? null;
      const planningMeta = (weddingData?.planning as Record<string, unknown> | undefined) ?? {};
      setTotalBudget(Number(planningMeta.totalBudget) || 0);
      setItineraryEventCount(itineraryMeta.count ?? 0);
      setPrivacyMode(
        siteMeta.data?.privacy_mode === 'password_protected' || siteMeta.data?.privacy_mode === 'invite_only'
          ? siteMeta.data.privacy_mode
          : 'public',
      );

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
    } catch (err) {
      console.error(err);
      toast('Couldn’t load planning data right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadSeatingReadiness(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: attendingCount } = await supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_site_id', id)
        .in('rsvp_status', ['confirmed', 'attending']);

      const { data: seatingEventsData } = await supabase
        .from('seating_events')
        .select('id')
        .eq('wedding_site_id', id);

      let seatedCount = 0;
      if (seatingEventsData && seatingEventsData.length > 0) {
        const eventIds = seatingEventsData.map(e => e.id);
        const { count } = await supabase
          .from('seating_assignments')
          .select('id', { count: 'exact', head: true })
          .in('seating_event_id', eventIds)
          .eq('is_valid', true);
        seatedCount = count ?? 0;
      }

      const attending = attendingCount ?? 0;
      setSeatingReadiness({
        attending,
        seated: seatedCount,
        unassigned: Math.max(0, attending - seatedCount),
      });
    } catch {
      setSeatingReadiness({ attending: 0, seated: 0, unassigned: 0 });
    }
  }

  const handleAddTask = useCallback(async (task: Partial<PlanningTask>) => {
    if (!canEditPlanningTasks(planningRole)) {
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
  }, [siteId, toast, isDemoMode, planningRole]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    if (!canEditPlanningTasks(planningRole)) {
      toast('Your collaborator role cannot edit planning tasks.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch {
      toast('Couldn’t update that task. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!canEditPlanningTasks(planningRole)) {
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
  }, [toast, isDemoMode, planningRole]);

  const handleCreateMilestones = useCallback(async () => {
    if (!canEditPlanningTasks(planningRole)) {
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
  }, [siteId, weddingDate, toast, isDemoMode, planningRole]);

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole)) {
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
  }, [siteId, toast, isDemoMode, planningRole]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole)) {
      toast('Your collaborator role cannot edit budget items.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateBudgetItem(id, updates);
      setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch {
      toast('Couldn’t update that budget item. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    if (!canEditPlanningBudget(planningRole)) {
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
  }, [toast, isDemoMode, planningRole]);

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
    if (!canEditPlanningVendors(planningRole)) {
      toast('Your collaborator role cannot add vendors.', 'info');
      return;
    }
    if (!siteId) return;
    try {
      const created = isDemoMode ? ({ id: `demo-vendor-${Date.now()}`, wedding_site_id: siteId, vendor_type: vendor.vendor_type ?? 'Vendor', name: vendor.name ?? 'New vendor', contact_name: vendor.contact_name ?? '', email: vendor.email ?? '', phone: vendor.phone ?? '', website: vendor.website ?? '', contract_total: vendor.contract_total ?? 0, amount_paid: vendor.amount_paid ?? 0, balance_due: vendor.balance_due ?? 0, next_payment_due: vendor.next_payment_due ?? null, notes: vendor.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PlanningVendor) : await createVendor(siteId, vendor);
      setVendors(prev => [...prev, created]);
      setPendingVendorForBudget(created);
      toast('Vendor added', 'success');
    } catch {
      toast('Couldn’t add that vendor. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole]);

  const handleSaveTotalBudget = useCallback(async (value: number) => {
    if (!canEditPlanningBudget(planningRole)) {
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

      const { data: siteData } = await supabase
        .from('wedding_sites')
        .select('wedding_data')
        .eq('id', siteId)
        .maybeSingle();

      const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
      const planning = (weddingData.planning as Record<string, unknown> | undefined) ?? {};
      const nextWeddingData = {
        ...weddingData,
        planning: {
          ...planning,
          totalBudget: value,
        },
      };

      let { error } = await supabase
        .from('wedding_sites')
        .update({ wedding_data: nextWeddingData, updated_at: new Date().toISOString() })
        .eq('id', siteId);

      if (error?.message?.includes('wedding_data')) {
        const fallback = await supabase
          .from('wedding_sites')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', siteId);
        error = fallback.error;
      }

      if (error) throw error;
      setTotalBudget(value);
      toast('Total budget updated', 'success');
    } catch {
      toast('Couldn’t update total budget. Please try again.', 'error');
    }
  }, [siteId, toast, isDemoMode, planningRole]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    if (!canEditPlanningVendors(planningRole)) {
      toast('Your collaborator role cannot edit vendors.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateVendor(id, updates);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch {
      toast('Couldn’t update that vendor. Please try again.', 'error');
    }
  }, [toast, isDemoMode, planningRole]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    if (!canEditPlanningVendors(planningRole)) {
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
  }, [toast, isDemoMode, planningRole]);

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
    <DashboardLayout currentPage="planning">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-light rounded-xl">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Planning</h1>
            <p className="text-sm text-text-secondary">Keep tasks, budget, and vendors in one clear place for the couple and the planner they invite.</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <a href="/dashboard/coordinator" className="text-xs text-primary hover:text-primary-hover">Open planner command view</a>
              <a href="/dashboard/guests" className="text-xs text-primary hover:text-primary-hover">Open guest ops</a>
            </div>
          </div>
        </div>

        <div className="p-3 bg-surface-subtle/40 rounded-xl border border-border-subtle grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-text-primary">Section</label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="mt-1 w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TABS.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary">Planner access view</label>
            <select
              value={planningRole}
              onChange={(e) => setPlanningRole(e.target.value as PlannerAccessRole)}
              disabled={activeSiteRole !== 'owner'}
              className="mt-1 w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PLANNER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {activeSiteRole !== 'owner' && (
              <p className="mt-1 text-xs text-text-tertiary">Access view follows your actual collaborator role on this site.</p>
            )}
          </div>
        </div>

        {planningRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on — this workspace stays centered on tasks, vendors, budget, and event execution rather than couple account settings.
          </div>
        )}
        {planningRole === 'coordinator' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Coordinator view is on — timeline-facing tasks stay editable here, but budget and vendor records stay with the couple or planner.
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse" aria-hidden="true">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
              <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
              <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
            </div>
            <div className="h-56 rounded-2xl bg-surface-subtle border border-border-subtle" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <PlanningOverviewTab
                tasks={tasks}
                budgetItems={budgetItems}
                vendors={vendors}
                seatingReadiness={seatingReadiness}
                itineraryEventCount={itineraryEventCount}
                privacyMode={privacyMode}
                weddingDate={weddingDate}
                nameChangePlan={nameChangePlan}
                onTabChange={(tab) => setActiveTab(tab as Tab)}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksTab
                tasks={tasks}
                weddingDate={weddingDate}
                onAdd={handleAddTask}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onCreateMilestones={handleCreateMilestones}
                canEdit={canEditPlanningTasks(planningRole)}
              />
            )}
            {activeTab === 'budget' && (
              <BudgetTab
                items={budgetItems}
                vendors={vendors}
                totalBudget={totalBudget}
                onTotalBudgetChange={handleSaveTotalBudget}
                onAdd={handleAddBudgetItem}
                onUpdate={handleUpdateBudgetItem}
                onDelete={handleDeleteBudgetItem}
                canEdit={canEditPlanningBudget(planningRole)}
              />
            )}
            {activeTab === 'vendors' && (
              <VendorsTab
                vendors={vendors}
                onAdd={handleAddVendor}
                onUpdate={handleUpdateVendor}
                onDelete={handleDeleteVendor}
                canEdit={canEditPlanningVendors(planningRole)}
              />
            )}
            {activeTab === 'nameChange' && (
              <NameChangePlannerTab
                draft={nameChangeDraft}
                documents={nameChangeDocuments}
                extractedFields={nameChangeExtractedFields}
                plan={nameChangePlan}
                reminders={nameChangeReminders}
                saving={nameChangeSaving}
                onDraftChange={handleNameChangeDraft}
                onStructuredIntakeChange={handleStructuredIntake}
                onDocumentsChange={handleNameChangeDocuments}
                onExtractedFieldsChange={handleNameChangeExtractedFields}
                onRemindersChange={handleNameChangeReminders}
                onStepExecutionStatusChange={handleNameChangeStepExecutionStatus}
                onStepExecutionNoteChange={handleNameChangeStepExecutionNote}
                onSave={handleSaveNameChange}
              />
            )}
          </>
        )}

        {pendingVendorForBudget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-xl p-5">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Add this vendor to your budget?</h3>
              <p className="text-sm text-text-secondary mb-4">
                "{pendingVendorForBudget.name}" was added. Would you like to create a matching budget line too?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary"
                  onClick={() => setPendingVendorForBudget(null)}
                >
                  No thanks
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      await addVendorToBudget(pendingVendorForBudget);
                    } catch {
                      toast('Couldn’t add this vendor to budget right now. Please try again.', 'error');
                    } finally {
                      setPendingVendorForBudget(null);
                    }
                  }}
                >
                  Yes, add it to budget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
