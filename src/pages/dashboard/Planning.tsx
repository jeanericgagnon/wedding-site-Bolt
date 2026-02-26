import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoPlanningTasks, demoBudgetItems, demoVendors } from '../../lib/demoData';
import {
  PlanningTask, PlanningBudgetItem, PlanningVendor,
  getWeddingSiteId, getWeddingDate,
  loadTasks, createTask, updateTask, deleteTask,
  loadBudgetItems, createBudgetItem, updateBudgetItem, deleteBudgetItem,
  loadVendors, createVendor, updateVendor, deleteVendor,
  generateMilestoneTasks,
} from './planning/planningService';
import { PlanningOverviewTab } from './planning/PlanningOverviewTab';
import { TasksTab } from './planning/TasksTab';
import { BudgetTab } from './planning/BudgetTab';
import { VendorsTab } from './planning/VendorsTab';

type Tab = 'overview' | 'tasks' | 'budget' | 'vendors';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'vendors', label: 'Vendors' },
];

export const DashboardPlanning: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [budgetItems, setBudgetItems] = useState<PlanningBudgetItem[]>([]);
  const [vendors, setVendors] = useState<PlanningVendor[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [seatingReadiness, setSeatingReadiness] = useState({ attending: 0, seated: 0, unassigned: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, [isDemoMode]);

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
        return;
      }

      const id = await getWeddingSiteId();
      if (!id) return;
      setSiteId(id);
      const wDate = await getWeddingDate();
      setWeddingDate(wDate);

      const [tasksData, budgetData, vendorsData, siteMeta] = await Promise.all([
        loadTasks(id),
        loadBudgetItems(id),
        loadVendors(id),
        supabase.from('wedding_sites').select('wedding_data').eq('id', id).maybeSingle(),
      ]);
      setTasks(tasksData);
      setBudgetItems(budgetData);
      setVendors(vendorsData);

      const weddingData = (siteMeta.data?.wedding_data as Record<string, unknown> | null) ?? null;
      const planningMeta = (weddingData?.planning as Record<string, unknown> | undefined) ?? {};
      setTotalBudget(Number(planningMeta.totalBudget) || 0);

      await loadSeatingReadiness(id);
    } catch (err) {
      console.error(err);
      toast('Failed to load planning data', 'error');
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
    }
  }

  const handleAddTask = useCallback(async (task: Partial<PlanningTask>) => {
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
      toast('Failed to add task', 'error');
    }
  }, [siteId, toast, isDemoMode]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    try {
      if (!isDemoMode) await updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch {
      toast('Failed to update task', 'error');
    }
  }, [toast, isDemoMode]);

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      if (!isDemoMode) await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast('Task deleted', 'success');
    } catch {
      toast('Failed to delete task', 'error');
    }
  }, [toast, isDemoMode]);

  const handleGenerateMilestones = useCallback(async () => {
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
      toast('Failed to generate milestones', 'error');
    }
  }, [siteId, weddingDate, toast, isDemoMode]);

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!siteId) return;
    try {
      const created = isDemoMode ? ({ id: `demo-budget-${Date.now()}`, wedding_site_id: siteId, category: item.category ?? 'General', item_name: item.item_name ?? 'New item', estimated_amount: item.estimated_amount ?? 0, actual_amount: item.actual_amount ?? 0, paid_amount: item.paid_amount ?? 0, due_date: item.due_date ?? null, vendor_id: null, notes: item.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PlanningBudgetItem) : await createBudgetItem(siteId, item);
      setBudgetItems(prev => [...prev, created]);
      toast('Budget item added', 'success');
    } catch {
      toast('Failed to add budget item', 'error');
    }
  }, [siteId, toast, isDemoMode]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    try {
      if (!isDemoMode) await updateBudgetItem(id, updates);
      setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch {
      toast('Failed to update budget item', 'error');
    }
  }, [toast, isDemoMode]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    try {
      if (!isDemoMode) await deleteBudgetItem(id);
      setBudgetItems(prev => prev.filter(i => i.id !== id));
      toast('Budget item deleted', 'success');
    } catch {
      toast('Failed to delete budget item', 'error');
    }
  }, [toast, isDemoMode]);

  const handleAddVendor = useCallback(async (vendor: Partial<PlanningVendor>) => {
    if (!siteId) return;
    try {
      const created = isDemoMode ? ({ id: `demo-vendor-${Date.now()}`, wedding_site_id: siteId, vendor_type: vendor.vendor_type ?? 'Vendor', name: vendor.name ?? 'New vendor', contact_name: vendor.contact_name ?? '', email: vendor.email ?? '', phone: vendor.phone ?? '', website: vendor.website ?? '', contract_total: vendor.contract_total ?? 0, amount_paid: vendor.amount_paid ?? 0, balance_due: vendor.balance_due ?? 0, next_payment_due: vendor.next_payment_due ?? null, notes: vendor.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PlanningVendor) : await createVendor(siteId, vendor);
      setVendors(prev => [...prev, created]);
      toast('Vendor added', 'success');
    } catch {
      toast('Failed to add vendor', 'error');
    }
  }, [siteId, toast, isDemoMode]);

  const handleSaveTotalBudget = useCallback(async (value: number) => {
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

      const { error } = await supabase
        .from('wedding_sites')
        .update({ wedding_data: nextWeddingData, updated_at: new Date().toISOString() })
        .eq('id', siteId);

      if (error) throw error;
      setTotalBudget(value);
      toast('Total budget updated', 'success');
    } catch {
      toast('Failed to update total budget', 'error');
    }
  }, [siteId, toast, isDemoMode]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    try {
      if (!isDemoMode) await updateVendor(id, updates);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch {
      toast('Failed to update vendor', 'error');
    }
  }, [toast, isDemoMode]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    try {
      if (!isDemoMode) await deleteVendor(id);
      setVendors(prev => prev.filter(v => v.id !== id));
      toast('Vendor deleted', 'success');
    } catch {
      toast('Failed to delete vendor', 'error');
    }
  }, [toast, isDemoMode]);

  return (
    <DashboardLayout currentPage="planning">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-light rounded-xl">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Planning</h1>
            <p className="text-sm text-text-secondary">Tasks, budget, and vendor management</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-surface-subtle rounded-xl border border-border-subtle w-full overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
                onGenerateMilestones={handleGenerateMilestones}
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
              />
            )}
            {activeTab === 'vendors' && (
              <VendorsTab
                vendors={vendors}
                onAdd={handleAddVendor}
                onUpdate={handleUpdateVendor}
                onDelete={handleDeleteVendor}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
