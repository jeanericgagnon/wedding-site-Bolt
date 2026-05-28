import { useCallback, useEffect, useRef, useState } from 'react';
import { canEditPlanningBudget, canEditPlanningTasks, canEditPlanningVendors, type PlannerAccessRole, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import {
  PlanningTask,
  PlanningBudgetItem,
  PlanningVendor,
  createTask,
  updateTask,
  deleteTask,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  createVendor,
  updateVendor,
  deleteVendor,
  generateMilestoneTasks,
  updatePlanningTotalBudget,
  updatePlanningVendorMeta,
} from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';
import {
  PLANNING_BUDGET_ADD_RETRY_ERROR,
  PLANNING_BUDGET_DELETE_RETRY_ERROR,
  PLANNING_BUDGET_UPDATE_RETRY_ERROR,
  PLANNING_MILESTONE_GENERATE_RETRY_ERROR,
  PLANNING_TASK_ADD_RETRY_ERROR,
  PLANNING_TASK_DELETE_RETRY_ERROR,
  PLANNING_TASK_UPDATE_RETRY_ERROR,
  PLANNING_TOTAL_BUDGET_UPDATE_RETRY_ERROR,
  PLANNING_VENDOR_ADD_RETRY_ERROR,
  PLANNING_VENDOR_BUDGET_ADD_RETRY_ERROR,
  PLANNING_VENDOR_DELETE_RETRY_ERROR,
  PLANNING_VENDOR_META_SAVE_RETRY_ERROR,
  PLANNING_VENDOR_UPDATE_RETRY_ERROR,
  mapPlanningDashboardError,
} from './planningErrorCopy';

type ToastFn = (message: string, variant?: 'success' | 'error' | 'info') => void;

interface UsePlanningDashboardActionsArgs {
  isDemoMode: boolean;
  planningPermissions: PlannerPermissionKey[] | null;
  planningRole: PlannerAccessRole;
  setBudgetItems: React.Dispatch<React.SetStateAction<PlanningBudgetItem[]>>;
  setTasks: React.Dispatch<React.SetStateAction<PlanningTask[]>>;
  setTotalBudget: React.Dispatch<React.SetStateAction<number>>;
  setVendorMeta: React.Dispatch<React.SetStateAction<VendorMetaMap>>;
  setVendors: React.Dispatch<React.SetStateAction<PlanningVendor[]>>;
  siteId: string | null;
  toast: ToastFn;
  weddingDate: string | null;
}

export function usePlanningDashboardActions({
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
}: UsePlanningDashboardActionsArgs) {
  const [pendingVendorForBudget, setPendingVendorForBudget] = useState<PlanningVendor | null>(null);
  const actionContextVersionRef = useRef(0);
  const canUseTasks = canEditPlanningTasks(planningRole) && (!planningPermissions || planningPermissions.includes('planning'));
  const canUseBudget = canEditPlanningBudget(planningRole) && (!planningPermissions || planningPermissions.includes('budget'));
  const canUseVendors = canEditPlanningVendors(planningRole) && (!planningPermissions || planningPermissions.includes('vendors'));

  useEffect(() => {
    actionContextVersionRef.current += 1;
    setPendingVendorForBudget(null);
  }, [isDemoMode, planningPermissions, planningRole, siteId]);

  const handleAddTask = useCallback(async (task: Partial<PlanningTask>) => {
    if (!canUseTasks) {
      toast('Your collaborator role cannot add planning tasks.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
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
        setTasks((prev) => [...prev, created]);
        toast('Task added', 'success');
        return;
      }
      const created = await createTask(siteId, task);
      if (!isCurrentAction()) return;
      setTasks((prev) => [...prev, created]);
      toast('Task added', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_TASK_ADD_RETRY_ERROR), 'error');
    }
  }, [canUseTasks, isDemoMode, setTasks, siteId, toast]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    if (!canUseTasks) {
      toast('Your collaborator role cannot edit planning tasks.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await updateTask(id, updates);
      if (!isCurrentAction()) return;
      setTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_TASK_UPDATE_RETRY_ERROR), 'error');
    }
  }, [canUseTasks, isDemoMode, setTasks, toast]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!canUseTasks) {
      toast('Your collaborator role cannot delete planning tasks.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await deleteTask(id);
      if (!isCurrentAction()) return;
      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast('Task deleted', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_TASK_DELETE_RETRY_ERROR), 'error');
    }
  }, [canUseTasks, isDemoMode, setTasks, toast]);

  const handleCreateMilestones = useCallback(async () => {
    if (!canUseTasks) {
      toast('Your collaborator role cannot generate milestone tasks.', 'info');
      return;
    }
    if (!siteId || !weddingDate) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      const milestones = generateMilestoneTasks(siteId, weddingDate);
      if (isDemoMode) {
        const created = milestones.slice(0, 6).map((milestone, index) => ({
          ...(milestone as PlanningTask),
          id: `demo-milestone-${Date.now()}-${index}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setTasks((prev) => [...prev, ...created]);
        toast(`Added ${created.length} milestone tasks`, 'success');
        return;
      }
      const created = await Promise.all(milestones.map((milestone) => createTask(siteId, milestone)));
      if (!isCurrentAction()) return;
      setTasks((prev) => [...prev, ...created]);
      toast(`Added ${created.length} milestone tasks`, 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_MILESTONE_GENERATE_RETRY_ERROR), 'error');
    }
  }, [canUseTasks, isDemoMode, setTasks, siteId, toast, weddingDate]);

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!canUseBudget) {
      toast('Your collaborator role cannot add budget items.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      const created = isDemoMode
        ? ({
            id: `demo-budget-${Date.now()}`,
            wedding_site_id: siteId,
            category: item.category ?? 'General',
            item_name: item.item_name ?? 'New item',
            estimated_amount: item.estimated_amount ?? 0,
            actual_amount: item.actual_amount ?? 0,
            paid_amount: item.paid_amount ?? 0,
            due_date: item.due_date ?? null,
            vendor_id: null,
            notes: item.notes ?? '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as PlanningBudgetItem)
        : await createBudgetItem(siteId, item);
      if (!isCurrentAction()) return;
      setBudgetItems((prev) => [...prev, created]);
      toast('Budget item added', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_BUDGET_ADD_RETRY_ERROR), 'error');
    }
  }, [canUseBudget, isDemoMode, setBudgetItems, siteId, toast]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    if (!canUseBudget) {
      toast('Your collaborator role cannot edit budget items.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await updateBudgetItem(id, updates);
      if (!isCurrentAction()) return;
      setBudgetItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_BUDGET_UPDATE_RETRY_ERROR), 'error');
    }
  }, [canUseBudget, isDemoMode, setBudgetItems, toast]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    if (!canUseBudget) {
      toast('Your collaborator role cannot delete budget items.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await deleteBudgetItem(id);
      if (!isCurrentAction()) return;
      setBudgetItems((prev) => prev.filter((item) => item.id !== id));
      toast('Budget item deleted', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_BUDGET_DELETE_RETRY_ERROR), 'error');
    }
  }, [canUseBudget, isDemoMode, setBudgetItems, toast]);

  const addVendorToBudget = useCallback(async (vendor: PlanningVendor) => {
    if (!canUseBudget) {
      toast('Your collaborator role cannot add budget items.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;

    try {
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

      if (!isCurrentAction()) return;
      setBudgetItems((prev) => [...prev, createdItem]);
      toast('Vendor also added to budget', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_VENDOR_BUDGET_ADD_RETRY_ERROR), 'error');
    }
  }, [canUseBudget, isDemoMode, setBudgetItems, siteId, toast]);

  const handleAddVendor = useCallback(async (vendor: Partial<PlanningVendor>) => {
    if (!canUseVendors) {
      toast('Your collaborator role cannot add vendors.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      const created = isDemoMode
        ? ({
            id: `demo-vendor-${Date.now()}`,
            wedding_site_id: siteId,
            vendor_type: vendor.vendor_type ?? 'Vendor',
            name: vendor.name ?? 'New vendor',
            contact_name: vendor.contact_name ?? '',
            email: vendor.email ?? '',
            phone: vendor.phone ?? '',
            website: vendor.website ?? '',
            contract_total: vendor.contract_total ?? 0,
            amount_paid: vendor.amount_paid ?? 0,
            balance_due: vendor.balance_due ?? Math.max(0, (vendor.contract_total ?? 0) - (vendor.amount_paid ?? 0)),
            next_payment_due: vendor.next_payment_due ?? null,
            document_label: vendor.document_label ?? '',
            document_url: vendor.document_url ?? '',
            notes: vendor.notes ?? '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as PlanningVendor)
        : await createVendor(siteId, vendor);
      if (!isCurrentAction()) return;
      setVendors((prev) => [...prev, created]);
      setPendingVendorForBudget(created);
      toast('Vendor added', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_VENDOR_ADD_RETRY_ERROR), 'error');
    }
  }, [canUseVendors, isDemoMode, setVendors, siteId, toast]);

  const handleSaveTotalBudget = useCallback(async (value: number) => {
    if (!canUseBudget) {
      toast('Your collaborator role cannot update the total budget.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (isDemoMode) {
        setTotalBudget(value);
        toast('Total budget updated', 'success');
        return;
      }

      await updatePlanningTotalBudget(siteId, value);
      if (!isCurrentAction()) return;
      setTotalBudget(value);
      toast('Total budget updated', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_TOTAL_BUDGET_UPDATE_RETRY_ERROR), 'error');
    }
  }, [canUseBudget, isDemoMode, setTotalBudget, siteId, toast]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    if (!canUseVendors) {
      toast('Your collaborator role cannot edit vendors.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await updateVendor(id, updates);
      if (!isCurrentAction()) return;
      setVendors((prev) => prev.map((vendor) => vendor.id === id ? { ...vendor, ...updates } : vendor));
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_VENDOR_UPDATE_RETRY_ERROR), 'error');
    }
  }, [canUseVendors, isDemoMode, setVendors, toast]);

  const handleSaveVendorMeta = useCallback(async (meta: VendorMetaMap) => {
    if (!canUseVendors) {
      toast('Your collaborator role cannot update vendor reminders.', 'info');
      return;
    }
    if (!siteId) return;
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    let previousMeta: VendorMetaMap | null = null;
    setVendorMeta((prev) => {
      previousMeta = prev;
      return meta;
    });
    try {
      if (!isDemoMode) await updatePlanningVendorMeta(siteId, meta);
    } catch (error) {
      if (!isCurrentAction()) return;
      if (previousMeta) setVendorMeta(previousMeta);
      toast(mapPlanningDashboardError(error, PLANNING_VENDOR_META_SAVE_RETRY_ERROR), 'error');
    }
  }, [canUseVendors, isDemoMode, setVendorMeta, siteId, toast]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    if (!canUseVendors) {
      toast('Your collaborator role cannot delete vendors.', 'info');
      return;
    }
    const actionContextVersion = actionContextVersionRef.current;
    const isCurrentAction = () => actionContextVersion === actionContextVersionRef.current;
    try {
      if (!isDemoMode) await deleteVendor(id);
      if (!isCurrentAction()) return;
      setVendors((prev) => prev.filter((vendor) => vendor.id !== id));
      toast('Vendor deleted', 'success');
    } catch (error) {
      if (!isCurrentAction()) return;
      toast(mapPlanningDashboardError(error, PLANNING_VENDOR_DELETE_RETRY_ERROR), 'error');
    }
  }, [canUseVendors, isDemoMode, setVendors, toast]);

  return {
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
  };
}
