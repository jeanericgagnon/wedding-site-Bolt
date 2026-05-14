import { demoBudgetItems, demoPlanningTasks, demoVendors } from '../../../lib/demoData';
import type { PlanningBudgetItem, PlanningVendor } from './planningService';
import type { PlanningTask } from './planningService';
import { normalizeVendorMeta, type VendorMetaMap } from './vendorMetaStorage';

export const DEMO_PLANNING_STATE_STORAGE_KEY = 'dayof.demo.planning.state.v1';

interface PlanningDemoStateEnvelope {
  savedAtISO: string;
  value: {
    totalBudget: number;
    tasks: PlanningTask[];
    budgetItems: PlanningBudgetItem[];
    vendors: PlanningVendor[];
    vendorMeta: VendorMetaMap;
  };
}

export interface PlanningDemoStateSnapshot {
  totalBudget: number;
  tasks: PlanningTask[];
  budgetItems: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  vendorMeta: VendorMetaMap;
}

const DEFAULT_TOTAL_BUDGET = 30000;
const MAX_DEMO_TASKS = 240;
const MAX_DEMO_BUDGET_ITEMS = 200;
const MAX_DEMO_VENDORS = 120;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const defaultPlanningDemoState = (): PlanningDemoStateSnapshot => ({
  totalBudget: DEFAULT_TOTAL_BUDGET,
  tasks: cloneJson(demoPlanningTasks as unknown as PlanningTask[]),
  budgetItems: cloneJson(demoBudgetItems as unknown as PlanningBudgetItem[]),
  vendors: cloneJson(demoVendors as unknown as PlanningVendor[]),
  vendorMeta: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeBudgetItems = (value: unknown): PlanningBudgetItem[] => {
  if (!Array.isArray(value)) return defaultPlanningDemoState().budgetItems;
  return value.slice(0, MAX_DEMO_BUDGET_ITEMS).flatMap((rawItem) => {
    if (!isRecord(rawItem) || typeof rawItem.id !== 'string' || typeof rawItem.item_name !== 'string') return [];
    return [{
      id: rawItem.id,
      wedding_site_id: typeof rawItem.wedding_site_id === 'string' ? rawItem.wedding_site_id : 'demo-site-id',
      category: typeof rawItem.category === 'string' ? rawItem.category : 'General',
      item_name: rawItem.item_name,
      estimated_amount: Number(rawItem.estimated_amount) || 0,
      actual_amount: Number(rawItem.actual_amount) || 0,
      paid_amount: Number(rawItem.paid_amount) || 0,
      due_date: typeof rawItem.due_date === 'string' && rawItem.due_date.trim() ? rawItem.due_date.trim() : null,
      vendor_id: typeof rawItem.vendor_id === 'string' && rawItem.vendor_id.trim() ? rawItem.vendor_id.trim() : null,
      notes: typeof rawItem.notes === 'string' ? rawItem.notes : '',
      created_at: typeof rawItem.created_at === 'string' ? rawItem.created_at : new Date().toISOString(),
      updated_at: typeof rawItem.updated_at === 'string' ? rawItem.updated_at : new Date().toISOString(),
    }];
  });
};

const normalizeTasks = (value: unknown): PlanningTask[] => {
  if (!Array.isArray(value)) return defaultPlanningDemoState().tasks;
  return value.slice(0, MAX_DEMO_TASKS).flatMap((rawTask) => {
    if (!isRecord(rawTask) || typeof rawTask.id !== 'string' || typeof rawTask.title !== 'string') return [];
    const status = rawTask.status === 'todo' || rawTask.status === 'in_progress' || rawTask.status === 'done'
      ? rawTask.status
      : 'todo';
    const priority = rawTask.priority === 'low' || rawTask.priority === 'medium' || rawTask.priority === 'high'
      ? rawTask.priority
      : 'medium';
    return [{
      id: rawTask.id,
      wedding_site_id: typeof rawTask.wedding_site_id === 'string' ? rawTask.wedding_site_id : 'demo-site-id',
      title: rawTask.title,
      description: typeof rawTask.description === 'string' ? rawTask.description : '',
      category: typeof rawTask.category === 'string' && rawTask.category.trim() ? rawTask.category : null,
      due_date: typeof rawTask.due_date === 'string' && rawTask.due_date.trim() ? rawTask.due_date.trim() : null,
      status,
      priority,
      owner_name: typeof rawTask.owner_name === 'string' ? rawTask.owner_name : '',
      linked_event_id: typeof rawTask.linked_event_id === 'string' && rawTask.linked_event_id.trim() ? rawTask.linked_event_id.trim() : null,
      linked_vendor_id: typeof rawTask.linked_vendor_id === 'string' && rawTask.linked_vendor_id.trim() ? rawTask.linked_vendor_id.trim() : null,
      sort_order: Number(rawTask.sort_order) || 0,
      created_at: typeof rawTask.created_at === 'string' ? rawTask.created_at : new Date().toISOString(),
      updated_at: typeof rawTask.updated_at === 'string' ? rawTask.updated_at : new Date().toISOString(),
    }];
  });
};

const normalizeVendors = (value: unknown): PlanningVendor[] => {
  if (!Array.isArray(value)) return defaultPlanningDemoState().vendors;
  return value.slice(0, MAX_DEMO_VENDORS).flatMap((rawVendor) => {
    if (!isRecord(rawVendor) || typeof rawVendor.id !== 'string' || typeof rawVendor.name !== 'string') return [];
    const contractTotal = Number(rawVendor.contract_total) || 0;
    const amountPaid = Number(rawVendor.amount_paid) || 0;
    const providedBalance = Number(rawVendor.balance_due);
    return [{
      id: rawVendor.id,
      wedding_site_id: typeof rawVendor.wedding_site_id === 'string' ? rawVendor.wedding_site_id : 'demo-site-id',
      vendor_type: typeof rawVendor.vendor_type === 'string' ? rawVendor.vendor_type : 'Vendor',
      name: rawVendor.name,
      contact_name: typeof rawVendor.contact_name === 'string' ? rawVendor.contact_name : '',
      email: typeof rawVendor.email === 'string' ? rawVendor.email : '',
      phone: typeof rawVendor.phone === 'string' ? rawVendor.phone : '',
      website: typeof rawVendor.website === 'string' ? rawVendor.website : '',
      contract_total: contractTotal,
      amount_paid: amountPaid,
      balance_due: Number.isFinite(providedBalance) ? providedBalance : Math.max(0, contractTotal - amountPaid),
      next_payment_due: typeof rawVendor.next_payment_due === 'string' && rawVendor.next_payment_due.trim() ? rawVendor.next_payment_due.trim() : null,
      document_url: typeof rawVendor.document_url === 'string' && rawVendor.document_url.trim() ? rawVendor.document_url.trim() : null,
      document_label: typeof rawVendor.document_label === 'string' && rawVendor.document_label.trim() ? rawVendor.document_label.trim() : null,
      notes: typeof rawVendor.notes === 'string' ? rawVendor.notes : '',
      internal_rating: Number.isFinite(Number(rawVendor.internal_rating)) ? Number(rawVendor.internal_rating) : null,
      rating_status: typeof rawVendor.rating_status === 'string' && rawVendor.rating_status.trim() ? rawVendor.rating_status.trim() : null,
      rating_notes: typeof rawVendor.rating_notes === 'string' && rawVendor.rating_notes.trim() ? rawVendor.rating_notes.trim() : null,
      created_at: typeof rawVendor.created_at === 'string' ? rawVendor.created_at : new Date().toISOString(),
      updated_at: typeof rawVendor.updated_at === 'string' ? rawVendor.updated_at : new Date().toISOString(),
    }];
  });
};

export function readDemoPlanningState(storageKey = DEMO_PLANNING_STATE_STORAGE_KEY): PlanningDemoStateSnapshot {
  const defaults = defaultPlanningDemoState();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.value)) {
      window.localStorage.removeItem(storageKey);
      return defaults;
    }

    const totalBudget = Number(parsed.value.totalBudget);
    const tasks = normalizeTasks(parsed.value.tasks);
    const budgetItems = normalizeBudgetItems(parsed.value.budgetItems);
    const vendors = normalizeVendors(parsed.value.vendors);
    const vendorMeta = normalizeVendorMeta(parsed.value.vendorMeta);

    const snapshot: PlanningDemoStateSnapshot = {
      totalBudget: Number.isFinite(totalBudget) && totalBudget >= 0 ? totalBudget : defaults.totalBudget,
      tasks: tasks.length > 0 ? tasks : defaults.tasks,
      budgetItems: budgetItems.length > 0 ? budgetItems : defaults.budgetItems,
      vendors: vendors.length > 0 ? vendors : defaults.vendors,
      vendorMeta,
    };

    writeDemoPlanningState(snapshot, storageKey);
    return snapshot;
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaults;
  }
}

export function writeDemoPlanningState(
  input: PlanningDemoStateSnapshot,
  storageKey = DEMO_PLANNING_STATE_STORAGE_KEY,
): PlanningDemoStateSnapshot {
  const snapshot: PlanningDemoStateSnapshot = {
    totalBudget: Math.max(0, Number(input.totalBudget) || 0),
    tasks: normalizeTasks(input.tasks),
    budgetItems: normalizeBudgetItems(input.budgetItems),
    vendors: normalizeVendors(input.vendors),
    vendorMeta: normalizeVendorMeta(input.vendorMeta),
  };

  if (typeof window !== 'undefined') {
    const envelope: PlanningDemoStateEnvelope = {
      savedAtISO: new Date().toISOString(),
      value: snapshot,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  }

  return snapshot;
}
