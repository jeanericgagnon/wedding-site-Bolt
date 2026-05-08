import { useCallback, useMemo, useState } from 'react';
import { canEditPlanningBudget, canEditPlanningTasks, canEditPlanningVendors, type PlannerAccessRole, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import { logAppAction } from '../../../lib/actionAudit';
import {
  buildStarterPlannerSuite,
  createBudgetItem,
  createTask,
  createVendor,
  deleteBudgetItem,
  deleteTask,
  deleteVendor,
  type PlanningBudgetItem,
  type PlanningTask,
  type PlanningVendor,
  type StarterPlannerSuite,
} from './planningService';

export interface StarterSuiteRun {
  taskIds: string[];
  budgetItemIds: string[];
  vendorIds: string[];
  createdAt: string;
}

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

type Params = {
  destinationWedding: boolean;
  guestCount: number;
  isDemoMode: boolean;
  planningPermissions: PlannerPermissionKey[] | null;
  planningRole: PlannerAccessRole;
  qaRunId: string;
  setBudgetItems: React.Dispatch<React.SetStateAction<PlanningBudgetItem[]>>;
  setTasks: React.Dispatch<React.SetStateAction<PlanningTask[]>>;
  setVendors: React.Dispatch<React.SetStateAction<PlanningVendor[]>>;
  siteId: string | null;
  tasks: PlanningTask[];
  budgetItems: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  toast: ToastFn;
  venueName: string | null;
  weddingDate: string | null;
};

export function usePlanningStarterSuiteActions({
  destinationWedding,
  guestCount,
  isDemoMode,
  planningPermissions,
  planningRole,
  qaRunId,
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
}: Params) {
  const [applyingStarterSuite, setApplyingStarterSuite] = useState(false);
  const [undoingStarterSuite, setUndoingStarterSuite] = useState(false);
  const [lastStarterSuiteRun, setLastStarterSuiteRun] = useState<StarterSuiteRun | null>(null);

  const starterSuite = useMemo<StarterPlannerSuite | null>(() => {
    if (!siteId) return null;
    return buildStarterPlannerSuite({
      weddingSiteId: siteId,
      weddingDateISO: weddingDate,
      venueName,
      guestCount,
      destinationWedding,
    });
  }, [destinationWedding, guestCount, siteId, venueName, weddingDate]);

  const handleApplyStarterSuite = useCallback(async () => {
    if (!siteId || !starterSuite || applyingStarterSuite) return;
    if (!canEditPlanningTasks(planningRole, planningPermissions) || !canEditPlanningBudget(planningRole, planningPermissions) || !canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add the full planner starter suite.', 'info');
      return;
    }

    setApplyingStarterSuite(true);
    try {
      const now = Date.now();
      const isStarterSuiteQa = qaRunId.length > 0;
      const qaSuffix = isStarterSuiteQa ? ` QA ${qaRunId}` : '';
      const shouldAddTasks = isStarterSuiteQa || tasks.length === 0;
      const shouldAddBudget = isStarterSuiteQa || budgetItems.length === 0;
      const shouldAddVendors = isStarterSuiteQa || vendors.length === 0;
      let createdTaskIds: string[] = [];
      let createdBudgetItemIds: string[] = [];
      let createdVendorIds: string[] = [];

      if (isDemoMode) {
        if (shouldAddTasks) {
          const createdTasks = starterSuite.tasks.map((task, index) => ({
            ...(task as PlanningTask),
            title: `${task.title ?? 'Starter task'}${qaSuffix}`,
            id: `demo-starter-task-${now}-${index}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          createdTaskIds = createdTasks.map((task) => task.id);
          setTasks((prev) => [...prev, ...createdTasks]);
        }
        if (shouldAddBudget) {
          const createdBudgetItems = starterSuite.budgetItems.map((item, index) => ({
            ...(item as PlanningBudgetItem),
            item_name: `${item.item_name ?? 'Starter budget line'}${qaSuffix}`,
            id: `demo-starter-budget-${now}-${index}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          createdBudgetItemIds = createdBudgetItems.map((item) => item.id);
          setBudgetItems((prev) => [...prev, ...createdBudgetItems]);
        }
        if (shouldAddVendors) {
          const createdVendors = starterSuite.vendors.map((vendor, index) => ({
            ...(vendor as PlanningVendor),
            name: `${vendor.name ?? 'Starter vendor'}${qaSuffix}`,
            id: `demo-starter-vendor-${now}-${index}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          createdVendorIds = createdVendors.map((vendor) => vendor.id);
          setVendors((prev) => [...prev, ...createdVendors]);
        }
      } else {
        const [createdTasks, createdBudgetItems, createdVendors] = await Promise.all([
          shouldAddTasks ? Promise.all(starterSuite.tasks.map((task) => createTask(siteId, { ...task, title: `${task.title ?? 'Starter task'}${qaSuffix}` }))) : Promise.resolve([]),
          shouldAddBudget ? Promise.all(starterSuite.budgetItems.map((item) => createBudgetItem(siteId, { ...item, item_name: `${item.item_name ?? 'Starter budget line'}${qaSuffix}` }))) : Promise.resolve([]),
          shouldAddVendors ? Promise.all(starterSuite.vendors.map((vendor) => createVendor(siteId, { ...vendor, name: `${vendor.name ?? 'Starter vendor'}${qaSuffix}` }))) : Promise.resolve([]),
        ]);
        if (createdTasks.length > 0) setTasks((prev) => [...prev, ...createdTasks]);
        if (createdBudgetItems.length > 0) setBudgetItems((prev) => [...prev, ...createdBudgetItems]);
        if (createdVendors.length > 0) setVendors((prev) => [...prev, ...createdVendors]);
        createdTaskIds = createdTasks.map((task) => task.id);
        createdBudgetItemIds = createdBudgetItems.map((item) => item.id);
        createdVendorIds = createdVendors.map((vendor) => vendor.id);
      }

      const addedGroups = [
        shouldAddTasks ? 'tasks' : null,
        shouldAddBudget ? 'budget' : null,
        shouldAddVendors ? 'vendors' : null,
      ].filter(Boolean);

      if (addedGroups.length > 0) {
        setLastStarterSuiteRun({
          taskIds: createdTaskIds,
          budgetItemIds: createdBudgetItemIds,
          vendorIds: createdVendorIds,
          createdAt: new Date().toISOString(),
        });
      }

      if (!isDemoMode && addedGroups.length > 0) {
        void logAppAction({
          weddingSiteId: siteId,
          area: 'planner',
          type: 'starter_suite_applied',
          summary: `Planner starter suite added ${addedGroups.join(', ')}.`,
          targetLabel: 'Planner starter suite',
          metadata: {
            taskCount: shouldAddTasks ? starterSuite.tasks.length : 0,
            budgetItemCount: shouldAddBudget ? starterSuite.budgetItems.length : 0,
            vendorCount: shouldAddVendors ? starterSuite.vendors.length : 0,
            weddingDate,
            guestCount,
            destinationWedding,
          },
        });
      }

      toast(addedGroups.length > 0 ? `Starter suite added: ${addedGroups.join(', ')}.` : 'Planner already has starter data.', 'success');
    } catch {
      toast('Couldn’t add the starter suite right now. Please try again.', 'error');
    } finally {
      setApplyingStarterSuite(false);
    }
  }, [
    applyingStarterSuite,
    budgetItems.length,
    destinationWedding,
    guestCount,
    isDemoMode,
    planningPermissions,
    planningRole,
    qaRunId,
    setBudgetItems,
    setTasks,
    setVendors,
    siteId,
    starterSuite,
    tasks.length,
    toast,
    vendors.length,
    weddingDate,
  ]);

  const handleUndoStarterSuite = useCallback(async () => {
    if (!siteId || !lastStarterSuiteRun || undoingStarterSuite) return;
    if (!canEditPlanningTasks(planningRole, planningPermissions) || !canEditPlanningBudget(planningRole, planningPermissions) || !canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot undo the full starter suite.', 'info');
      return;
    }

    setUndoingStarterSuite(true);
    try {
      const taskIds = new Set(lastStarterSuiteRun.taskIds);
      const budgetItemIds = new Set(lastStarterSuiteRun.budgetItemIds);
      const vendorIds = new Set(lastStarterSuiteRun.vendorIds);

      if (!isDemoMode) {
        await Promise.all([
          ...lastStarterSuiteRun.taskIds.map((id) => deleteTask(id)),
          ...lastStarterSuiteRun.budgetItemIds.map((id) => deleteBudgetItem(id)),
          ...lastStarterSuiteRun.vendorIds.map((id) => deleteVendor(id)),
        ]);
      }

      setTasks((prev) => prev.filter((task) => !taskIds.has(task.id)));
      setBudgetItems((prev) => prev.filter((item) => !budgetItemIds.has(item.id)));
      setVendors((prev) => prev.filter((vendor) => !vendorIds.has(vendor.id)));
      setLastStarterSuiteRun(null);

      if (!isDemoMode) {
        void logAppAction({
          weddingSiteId: siteId,
          area: 'planner',
          type: 'starter_suite_undone',
          summary: 'Planner starter suite changes were undone.',
          targetLabel: 'Planner starter suite',
          metadata: {
            taskCount: lastStarterSuiteRun.taskIds.length,
            budgetItemCount: lastStarterSuiteRun.budgetItemIds.length,
            vendorCount: lastStarterSuiteRun.vendorIds.length,
            createdAt: lastStarterSuiteRun.createdAt,
          },
        });
      }

      toast('Starter suite changes undone.', 'success');
    } catch {
      toast('Couldn’t undo the starter suite right now. Please try again.', 'error');
    } finally {
      setUndoingStarterSuite(false);
    }
  }, [
    isDemoMode,
    lastStarterSuiteRun,
    planningPermissions,
    planningRole,
    setBudgetItems,
    setTasks,
    setVendors,
    siteId,
    toast,
    undoingStarterSuite,
  ]);

  return {
    applyingStarterSuite,
    handleApplyStarterSuite,
    handleUndoStarterSuite,
    lastStarterSuiteRun,
    starterSuite,
    undoingStarterSuite,
  };
}
