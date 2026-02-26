import { supabase } from '../../../lib/supabase';

async function insertWithDriftFallback<T extends Record<string, unknown>>(
  table: string,
  payload: T,
  driftFields: string[]
) {
  const mutablePayload: Record<string, unknown> = { ...payload };
  let error: { message?: string } | null = null;

  for (let i = 0; i <= driftFields.length; i += 1) {
    const result = await supabase.from(table).insert(mutablePayload).select().single();
    error = result.error;
    if (!error) return result.data;

    const field = driftFields.find((candidate) => error?.message?.includes(candidate));
    if (!field || !(field in mutablePayload)) break;
    delete mutablePayload[field];
  }

  throw error;
}

async function updateWithDriftFallback<T extends Record<string, unknown>>(
  table: string,
  id: string,
  payload: T,
  driftFields: string[]
) {
  const mutablePayload: Record<string, unknown> = { ...payload };
  let error: { message?: string } | null = null;

  for (let i = 0; i <= driftFields.length; i += 1) {
    const result = await supabase.from(table).update(mutablePayload).eq('id', id);
    error = result.error;
    if (!error) return;

    const field = driftFields.find((candidate) => error?.message?.includes(candidate));
    if (!field || !(field in mutablePayload)) break;
    delete mutablePayload[field];
  }

  throw error;
}

export interface PlanningTask {
  id: string;
  wedding_site_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  owner_name: string;
  linked_event_id: string | null;
  linked_vendor_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanningVendor {
  id: string;
  wedding_site_id: string;
  vendor_type: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  contract_total: number;
  amount_paid: number;
  balance_due: number;
  next_payment_due: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningBudgetItem {
  id: string;
  wedding_site_id: string;
  category: string;
  item_name: string;
  estimated_amount: number;
  actual_amount: number;
  paid_amount: number;
  due_date: string | null;
  vendor_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export async function getWeddingSiteId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getWeddingDate(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_sites')
    .select('wedding_date')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.wedding_date ?? null;
}

export async function loadTasks(weddingSiteId: string): Promise<PlanningTask[]> {
  const { data, error } = await supabase
    .from('planning_tasks')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanningTask[];
}

export async function createTask(weddingSiteId: string, task: Partial<PlanningTask>): Promise<PlanningTask> {
  const { data, error } = await supabase
    .from('planning_tasks')
    .insert({ ...task, wedding_site_id: weddingSiteId })
    .select()
    .single();
  if (error) throw error;
  return data as PlanningTask;
}

export async function updateTask(id: string, updates: Partial<PlanningTask>): Promise<void> {
  const { error } = await supabase
    .from('planning_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('planning_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function loadVendors(weddingSiteId: string): Promise<PlanningVendor[]> {
  const { data, error } = await supabase
    .from('planning_vendors')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanningVendor[];
}

export async function createVendor(weddingSiteId: string, vendor: Partial<PlanningVendor>): Promise<PlanningVendor> {
  const data = await insertWithDriftFallback(
    'planning_vendors',
    { ...vendor, wedding_site_id: weddingSiteId },
    ['vendor_type', 'email', 'contract_total', 'balance_due', 'next_payment_due', 'notes', 'phone']
  );
  return data as PlanningVendor;
}

export async function updateVendor(id: string, updates: Partial<PlanningVendor>): Promise<void> {
  await updateWithDriftFallback(
    'planning_vendors',
    id,
    { ...updates, updated_at: new Date().toISOString() },
    ['vendor_type', 'email', 'contract_total', 'balance_due', 'next_payment_due', 'notes', 'phone']
  );
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from('planning_vendors').delete().eq('id', id);
  if (error) throw error;
}

export async function loadBudgetItems(weddingSiteId: string): Promise<PlanningBudgetItem[]> {
  const { data, error } = await supabase
    .from('planning_budget_items')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .order('category', { ascending: true })
    .order('item_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanningBudgetItem[];
}

export async function createBudgetItem(weddingSiteId: string, item: Partial<PlanningBudgetItem>): Promise<PlanningBudgetItem> {
  const data = await insertWithDriftFallback(
    'planning_budget_items',
    { ...item, wedding_site_id: weddingSiteId },
    ['estimated_amount', 'actual_amount', 'vendor_id', 'due_date', 'notes']
  );
  return data as PlanningBudgetItem;
}

export async function updateBudgetItem(id: string, updates: Partial<PlanningBudgetItem>): Promise<void> {
  await updateWithDriftFallback(
    'planning_budget_items',
    id,
    { ...updates, updated_at: new Date().toISOString() },
    ['estimated_amount', 'actual_amount', 'vendor_id', 'due_date', 'notes']
  );
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from('planning_budget_items').delete().eq('id', id);
  if (error) throw error;
}

export interface MilestoneTask {
  title: string;
  description: string;
  monthsBefore: number;
  priority: 'low' | 'medium' | 'high';
}

const MILESTONE_TEMPLATES: MilestoneTask[] = [
  { title: 'Set wedding budget', description: 'Determine overall budget and allocate by category', monthsBefore: 12, priority: 'high' },
  { title: 'Create guest list', description: 'Draft initial guest list with contact info', monthsBefore: 12, priority: 'high' },
  { title: 'Book venue', description: 'Research, visit, and book ceremony and reception venues', monthsBefore: 12, priority: 'high' },
  { title: 'Hire wedding photographer', description: 'Research photographers, review portfolios, book', monthsBefore: 12, priority: 'high' },
  { title: 'Choose wedding date', description: 'Finalize and confirm the wedding date', monthsBefore: 12, priority: 'high' },
  { title: 'Book officiant', description: 'Find and book a ceremony officiant', monthsBefore: 9, priority: 'high' },
  { title: 'Book caterer', description: 'Research catering options and schedule tastings', monthsBefore: 9, priority: 'high' },
  { title: 'Book wedding band or DJ', description: 'Research musicians and DJs for reception', monthsBefore: 9, priority: 'high' },
  { title: 'Choose wedding party', description: 'Ask bridesmaids, groomsmen, and other wedding party members', monthsBefore: 9, priority: 'medium' },
  { title: 'Begin dress/attire shopping', description: 'Shop for wedding dress and attire for the couple', monthsBefore: 9, priority: 'high' },
  { title: 'Send save-the-dates', description: 'Mail or email save-the-dates to all guests', monthsBefore: 6, priority: 'high' },
  { title: 'Book florist', description: 'Research florists and plan floral arrangements', monthsBefore: 6, priority: 'medium' },
  { title: 'Book honeymoon travel', description: 'Research and book honeymoon destination and accommodations', monthsBefore: 6, priority: 'medium' },
  { title: 'Set up wedding website', description: 'Create and publish your wedding website with details for guests', monthsBefore: 6, priority: 'medium' },
  { title: 'Create wedding registry', description: 'Set up gift registry at preferred stores', monthsBefore: 6, priority: 'medium' },
  { title: 'Send formal invitations', description: 'Mail formal invitations with RSVP deadline', monthsBefore: 3, priority: 'high' },
  { title: 'Book hair and makeup artists', description: 'Book stylists for the couple and wedding party', monthsBefore: 3, priority: 'high' },
  { title: 'Finalize catering menu', description: 'Confirm menu selections and guest dietary requirements', monthsBefore: 3, priority: 'high' },
  { title: 'Plan ceremony details', description: 'Write vows, choose readings, plan processional/recessional', monthsBefore: 3, priority: 'medium' },
  { title: 'Purchase wedding rings', description: 'Shop for and order wedding bands', monthsBefore: 3, priority: 'high' },
  { title: 'Confirm all vendors', description: 'Contact all vendors to confirm bookings and logistics', monthsBefore: 1, priority: 'high' },
  { title: 'Create day-of timeline', description: 'Build detailed hour-by-hour schedule for wedding day', monthsBefore: 1, priority: 'high' },
  { title: 'Finalize seating chart', description: 'Assign all guests to tables', monthsBefore: 1, priority: 'high' },
  { title: 'Get marriage license', description: 'Apply for and obtain marriage license', monthsBefore: 1, priority: 'high' },
  { title: 'Final dress fitting', description: 'Complete final alterations and pickup', monthsBefore: 1, priority: 'medium' },
  { title: 'Deliver vendor payments', description: 'Pay remaining balances to all vendors', monthsBefore: 0.5, priority: 'high' },
  { title: 'Pack for honeymoon', description: 'Prepare luggage and travel documents', monthsBefore: 0.25, priority: 'medium' },
  { title: 'Rehearsal dinner', description: 'Host rehearsal and rehearsal dinner', monthsBefore: 0.25, priority: 'high' },
];

export function generateMilestoneTasks(weddingSiteId: string, weddingDateISO: string): Partial<PlanningTask>[] {
  const weddingDate = new Date(weddingDateISO);
  return MILESTONE_TEMPLATES.map((t) => {
    const dueDate = new Date(weddingDate);
    dueDate.setDate(dueDate.getDate() - Math.round(t.monthsBefore * 30));
    return {
      wedding_site_id: weddingSiteId,
      title: t.title,
      description: t.description,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'todo' as const,
      priority: t.priority,
      owner_name: '',
      sort_order: Math.round(t.monthsBefore * 100),
    };
  });
}
