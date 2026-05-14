import { useCallback, useState } from 'react';
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
        setTasks((prev) => [...prev, created]);
        toast('Task added', 'success');
        return;
      }
      const created = await createTask(siteId, task);
      setTasks((prev) => [...prev, created]);
      toast('Task added', 'success');
    } catch {
      toast('Couldn’t add that task. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setTasks, siteId, toast]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit planning tasks.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateTask(id, updates);
      setTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
    } catch {
      toast('Couldn’t update that task. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setTasks, toast]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete planning tasks.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast('Task deleted', 'success');
    } catch {
      toast('Couldn’t remove that task. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setTasks, toast]);

  const handleCreateMilestones = useCallback(async () => {
    if (!canEditPlanningTasks(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot generate milestone tasks.', 'info');
      return;
    }
    if (!siteId || !weddingDate) return;
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
      setTasks((prev) => [...prev, ...created]);
      toast(`Added ${created.length} milestone tasks`, 'success');
    } catch {
      toast('Couldn’t generate milestones right now. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setTasks, siteId, toast, weddingDate]);

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add budget items.', 'info');
      return;
    }
    if (!siteId) return;
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
      setBudgetItems((prev) => [...prev, created]);
      toast('Budget item added', 'success');
    } catch {
      toast('Couldn’t add that budget item. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setBudgetItems, siteId, toast]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit budget items.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateBudgetItem(id, updates);
      setBudgetItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
    } catch {
      toast('Couldn’t update that budget item. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setBudgetItems, toast]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    if (!canEditPlanningBudget(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete budget items.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteBudgetItem(id);
      setBudgetItems((prev) => prev.filter((item) => item.id !== id));
      toast('Budget item deleted', 'success');
    } catch {
      toast('Couldn’t remove that budget item. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setBudgetItems, toast]);

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

    setBudgetItems((prev) => [...prev, createdItem]);
    toast('Vendor also added to budget', 'success');
  }, [isDemoMode, setBudgetItems, siteId, toast]);

  const handleAddVendor = useCallback(async (vendor: Partial<PlanningVendor>) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot add vendors.', 'info');
      return;
    }
    if (!siteId) return;
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
      setVendors((prev) => [...prev, created]);
      setPendingVendorForBudget(created);
      toast('Vendor added', 'success');
    } catch {
      toast('Couldn’t add that vendor. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setVendors, siteId, toast]);

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
  }, [isDemoMode, planningPermissions, planningRole, setTotalBudget, siteId, toast]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot edit vendors.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await updateVendor(id, updates);
      setVendors((prev) => prev.map((vendor) => vendor.id === id ? { ...vendor, ...updates } : vendor));
    } catch {
      toast('Couldn’t update that vendor. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setVendors, toast]);

  const handleSaveVendorMeta = useCallback(async (meta: VendorMetaMap) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot update vendor reminders.', 'info');
      return;
    }
    if (!siteId) return;
    setVendorMeta(meta);
    try {
      if (!isDemoMode) await updatePlanningVendorMeta(siteId, meta);
    } catch {
      toast('Couldn’t save vendor reminder details. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setVendorMeta, siteId, toast]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    if (!canEditPlanningVendors(planningRole, planningPermissions)) {
      toast('Your collaborator role cannot delete vendors.', 'info');
      return;
    }
    try {
      if (!isDemoMode) await deleteVendor(id);
      setVendors((prev) => prev.filter((vendor) => vendor.id !== id));
      toast('Vendor deleted', 'success');
    } catch {
      toast('Couldn’t remove that vendor. Please try again.', 'error');
    }
  }, [isDemoMode, planningPermissions, planningRole, setVendors, toast]);

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
