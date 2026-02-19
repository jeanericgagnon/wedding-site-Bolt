import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [budgetItems, setBudgetItems] = useState<PlanningBudgetItem[]>([]);
  const [vendors, setVendors] = useState<PlanningVendor[]>([]);
  const [seatingReadiness, setSeatingReadiness] = useState({ attending: 0, seated: 0, unassigned: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const id = await getWeddingSiteId();
      if (!id) return;
      setSiteId(id);
      const wDate = await getWeddingDate();
      setWeddingDate(wDate);

      const [tasksData, budgetData, vendorsData] = await Promise.all([
        loadTasks(id),
        loadBudgetItems(id),
        loadVendors(id),
      ]);
      setTasks(tasksData);
      setBudgetItems(budgetData);
      setVendors(vendorsData);

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
        .eq('rsvp_status', 'attending');

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
      const created = await createTask(siteId, task);
      setTasks(prev => [...prev, created]);
      toast('Task added', 'success');
    } catch {
      toast('Failed to add task', 'error');
    }
  }, [siteId, toast]);

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<PlanningTask>) => {
    try {
      await updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch {
      toast('Failed to update task', 'error');
    }
  }, [toast]);

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast('Task deleted', 'success');
    } catch {
      toast('Failed to delete task', 'error');
    }
  }, [toast]);

  const handleGenerateMilestones = useCallback(async () => {
    if (!siteId || !weddingDate) return;
    try {
      const milestones = generateMilestoneTasks(siteId, weddingDate);
      const created = await Promise.all(milestones.map(m => createTask(siteId, m)));
      setTasks(prev => [...prev, ...created]);
      toast(`Added ${created.length} milestone tasks`, 'success');
    } catch {
      toast('Failed to generate milestones', 'error');
    }
  }, [siteId, weddingDate, toast]);

  const handleAddBudgetItem = useCallback(async (item: Partial<PlanningBudgetItem>) => {
    if (!siteId) return;
    try {
      const created = await createBudgetItem(siteId, item);
      setBudgetItems(prev => [...prev, created]);
      toast('Budget item added', 'success');
    } catch {
      toast('Failed to add budget item', 'error');
    }
  }, [siteId, toast]);

  const handleUpdateBudgetItem = useCallback(async (id: string, updates: Partial<PlanningBudgetItem>) => {
    try {
      await updateBudgetItem(id, updates);
      setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch {
      toast('Failed to update budget item', 'error');
    }
  }, [toast]);

  const handleDeleteBudgetItem = useCallback(async (id: string) => {
    try {
      await deleteBudgetItem(id);
      setBudgetItems(prev => prev.filter(i => i.id !== id));
      toast('Budget item deleted', 'success');
    } catch {
      toast('Failed to delete budget item', 'error');
    }
  }, [toast]);

  const handleAddVendor = useCallback(async (vendor: Partial<PlanningVendor>) => {
    if (!siteId) return;
    try {
      const created = await createVendor(siteId, vendor);
      setVendors(prev => [...prev, created]);
      toast('Vendor added', 'success');
    } catch {
      toast('Failed to add vendor', 'error');
    }
  }, [siteId, toast]);

  const handleUpdateVendor = useCallback(async (id: string, updates: Partial<PlanningVendor>) => {
    try {
      await updateVendor(id, updates);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch {
      toast('Failed to update vendor', 'error');
    }
  }, [toast]);

  const handleDeleteVendor = useCallback(async (id: string) => {
    try {
      await deleteVendor(id);
      setVendors(prev => prev.filter(v => v.id !== id));
      toast('Vendor deleted', 'success');
    } catch {
      toast('Failed to delete vendor', 'error');
    }
  }, [toast]);

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
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
