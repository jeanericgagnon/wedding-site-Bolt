import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { demoWeddingSite, demoGuests, demoBudgetItems, demoVendors, demoNameChangeCase, demoNameChangeDocuments, demoNameChangeExtractedFields } from '../../lib/demoData';
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
import type { VendorMetaMap } from './planning/vendorMetaStorage';
import { buildNameChangePlan } from '../../lib/nameChange/engine';
import { syncNameChangeRemindersWithStepExecution } from '../../lib/nameChange/reminders';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../lib/nameChange/types';
import { buildNameChangeWorkspaceBundle, hydrateNameChangeWorkspace as hydrateLoadedNameChangeWorkspace, loadNameChangeWorkspace, defaultNameChangeCaseInput, mergeNameChangePlanExecutionState } from './planning/nameChangeService';
import { PlanningDashboardShell } from './planning/PlanningDashboardShell';
import { PendingVendorBudgetPrompt } from './planning/PendingVendorBudgetPrompt';
import { PlanningDashboardTabContent } from './planning/PlanningDashboardTabContent';
import { usePlanningDashboardActions } from './planning/usePlanningDashboardActions';
import { usePlanningNameChangeWorkspace } from './planning/usePlanningNameChangeWorkspace';
import { usePlanningStarterSuiteActions } from './planning/usePlanningStarterSuiteActions';
import { readDemoPlanningState, writeDemoPlanningState } from './planning/planningDemoState';

type Tab = 'overview' | 'tasks' | 'budget' | 'payments' | 'vendors' | 'songs' | 'addresses' | 'nameChange';

export function resolvePlanningTabFromSearch(search: string): Tab | null {
  const tabs: Tab[] = ['overview', 'tasks', 'budget', 'payments', 'vendors', 'songs', 'addresses', 'nameChange'];
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  return tabs.includes(tab as Tab) ? (tab as Tab) : null;
}

export const DashboardPlanning: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [searchParams] = useSearchParams();
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
  const [vendorMeta, setVendorMeta] = useState<VendorMetaMap>({});
  const [planningRole, setPlanningRole] = useState<PlannerAccessRole>('owner');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [planningPermissions, setPlanningPermissions] = useState<PlannerPermissionKey[] | null>(null);
  const starterSuiteQaRunId = searchParams.get('starterSuiteQa') ?? '';
  const previousUserIdRef = useRef<string | null>(null);
  const previousSiteIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const {
    handleDocumentsChange,
    handleDraftChange,
    handleExtractedFieldsChange,
    handleRemindersChange,
    handleSaveNameChange,
    handleStepExecutionNoteChange,
    handleStepExecutionStatusChange,
    handleStructuredIntakeChange,
    hydrateNameChangeWorkspace,
    nameChangeDocuments,
    nameChangeDraft,
    nameChangeExtractedFields,
    nameChangePlan,
    nameChangeReminders,
    nameChangeSaving,
  } = usePlanningNameChangeWorkspace({
    isDemoMode,
    siteId,
    toast,
  });

  const resetPlanningDashboardState = useCallback(() => {
    setSiteId(null);
    setWeddingDate(null);
    setTasks([]);
    setBudgetItems([]);
    setVendors([]);
    setTotalBudget(0);
    setSeatingReadiness({ attending: 0, seated: 0, unassigned: 0 });
    setGuestCount(0);
    setVenueName(null);
    setDestinationWedding(false);
    setVendorMeta({});
    setPlanningRole('owner');
    setActiveSiteRole('owner');
    setPlanningPermissions(null);

    const emptyCase: NameChangeCaseInput = {
      ...defaultNameChangeCaseInput,
      change_reasons: [...defaultNameChangeCaseInput.change_reasons],
      structured_intake: { ...defaultNameChangeCaseInput.structured_intake },
    };
    const emptyWorkspace = buildNameChangeWorkspaceBundle(emptyCase, [], []);
    hydrateNameChangeWorkspace({
      draft: emptyCase,
      documents: [],
      extractedFields: [],
      plan: mergeNameChangePlanExecutionState(emptyWorkspace.plan, null),
      reminders: emptyWorkspace.reminders,
    });
  }, [hydrateNameChangeWorkspace]);

  useEffect(() => {
    loadAll();
  }, [isDemoMode, user]);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserIdRef.current !== userId) {
      if (previousUserIdRef.current) {
        resetPlanningDashboardState();
        previousSiteIdRef.current = null;
      }
      previousUserIdRef.current = userId;
    }
  }, [resetPlanningDashboardState, user?.id]);

  useEffect(() => {
    const tabFromSearch = resolvePlanningTabFromSearch(searchParams.toString());
    setActiveTab(tabFromSearch ?? 'overview');
  }, [searchParams]);

  useEffect(() => {
    if (!siteId) return;
    writePlannerAccessRole('planning', siteId, planningRole);
  }, [siteId, planningRole]);

  useEffect(() => {
    if (!isDemoMode || loading) return;
    writeDemoPlanningState({
      totalBudget,
      tasks,
      budgetItems,
      vendors,
      vendorMeta,
    });
  }, [isDemoMode, loading, totalBudget, tasks, budgetItems, vendors, vendorMeta]);

  async function loadAll() {
    try {
      setLoading(true);
      if (isDemoMode) {
        const demoPlanningState = readDemoPlanningState();
        const demoSiteId = demoWeddingSite.id;
        const storedRole = readPlannerAccessRole('planning', demoSiteId);
        previousSiteIdRef.current = demoSiteId;
        setSiteId(demoWeddingSite.id);
        setWeddingDate(demoWeddingSite.wedding_date);
        setActiveSiteRole('owner');
        setPlanningRole(storedRole ?? 'owner');
        setPlanningPermissions(null);
        setTasks(demoPlanningState.tasks);
        setBudgetItems(demoPlanningState.budgetItems);
        setVendors(demoPlanningState.vendors);
        setTotalBudget(demoPlanningState.totalBudget);
        setVendorMeta(demoPlanningState.vendorMeta);
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
        const demoWorkspace = buildNameChangeWorkspaceBundle(demoCase, demoDocuments, demoFields);
        hydrateNameChangeWorkspace({
          draft: demoCase,
          documents: demoDocuments,
          extractedFields: demoFields,
          plan: mergeNameChangePlanExecutionState(demoWorkspace.plan, null),
          reminders: demoWorkspace.reminders,
        });
        return;
      }

      if (!user) {
        previousSiteIdRef.current = null;
        resetPlanningDashboardState();
        return;
      }

      const id = await getWeddingSiteId();
      if (!id) {
        previousSiteIdRef.current = null;
        resetPlanningDashboardState();
        return;
      }
      if (previousSiteIdRef.current && previousSiteIdRef.current !== id) {
        resetPlanningDashboardState();
      }
      previousSiteIdRef.current = id;
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
      setVendorMeta(siteMeta.vendorMeta);

      await loadSeatingReadiness(id);

      const workspace = await loadNameChangeWorkspace(id);
      if (workspace.caseRecord) {
        const hydrated = hydrateLoadedNameChangeWorkspace(workspace);
        hydrateNameChangeWorkspace(hydrated);
      } else {
        const emptyCase: NameChangeCaseInput = {
          ...defaultNameChangeCaseInput,
          change_reasons: [...defaultNameChangeCaseInput.change_reasons],
          structured_intake: { ...defaultNameChangeCaseInput.structured_intake },
        };
        const emptyWorkspace = buildNameChangeWorkspaceBundle(emptyCase, [], []);
        hydrateNameChangeWorkspace({
          draft: emptyCase,
          documents: [],
          extractedFields: [],
          plan: mergeNameChangePlanExecutionState(emptyWorkspace.plan, null),
          reminders: emptyWorkspace.reminders,
        });
      }
    } catch {
      previousSiteIdRef.current = null;
      resetPlanningDashboardState();
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
    handleSaveVendorMeta,
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
    setVendorMeta,
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
          vendorMeta={vendorMeta}
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
          onDraftChange={handleDraftChange}
          onDocumentsChange={handleDocumentsChange}
          onExtractedFieldsChange={handleExtractedFieldsChange}
          onRemindersChange={handleRemindersChange}
          onSaveNameChange={handleSaveNameChange}
          onSaveTotalBudget={handleSaveTotalBudget}
          onSaveVendorMeta={handleSaveVendorMeta}
          onStepExecutionNoteChange={handleStepExecutionNoteChange}
          onStepExecutionStatusChange={handleStepExecutionStatusChange}
          onStructuredIntakeChange={handleStructuredIntakeChange}
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
