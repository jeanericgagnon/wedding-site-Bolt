import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';

async function insertWithDriftFallback<T extends Record<string, unknown>>(
  table: string,
  payload: T,
  driftFields: string[],
  select: string,
) {
  const mutablePayload: Record<string, unknown> = { ...payload };
  let error: { message?: string } | null = null;

  for (let i = 0; i <= driftFields.length; i += 1) {
    const result = await supabase.from(table).insert(mutablePayload).select(select).single();
    error = result.error;
    if (!error) return result.data;

    const field = driftFields.find((candidate) => error?.message?.includes(candidate));
    if (!field || !(field in mutablePayload)) break;
    delete mutablePayload[field];
  }

  throw error;
}

const PLANNING_TASK_SELECT = 'id, wedding_site_id, title, description, category, due_date, status, priority, owner_name, linked_event_id, linked_vendor_id, sort_order, created_at, updated_at' as const;
const PLANNING_VENDOR_SELECT = 'id, wedding_site_id, vendor_type, name, contact_name, email, phone, website, contract_total, amount_paid, balance_due, next_payment_due, document_url, document_label, notes, created_at, updated_at' as const;
const PLANNING_BUDGET_ITEM_SELECT = 'id, wedding_site_id, category, item_name, estimated_amount, actual_amount, paid_amount, due_date, vendor_id, notes, created_at, updated_at' as const;

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
  category?: string | null;
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
  document_url?: string | null;
  document_label?: string | null;
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
    .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
    .maybeSingle();
  return data?.id ?? null;
}

export async function getWeddingDate(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_sites')
    .select('wedding_date')
    .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
    .maybeSingle();
  return data?.wedding_date ?? null;
}

export async function loadTasks(weddingSiteId: string): Promise<PlanningTask[]> {
  const { data, error } = await supabase
    .from('planning_tasks')
    .select(PLANNING_TASK_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanningTask[];
}

export async function createTask(weddingSiteId: string, task: Partial<PlanningTask>): Promise<PlanningTask> {
  const data = await insertWithDriftFallback(
    'planning_tasks',
    { ...task, wedding_site_id: weddingSiteId },
    ['category'],
    PLANNING_TASK_SELECT,
  );
  return data as unknown as PlanningTask;
}

export async function updateTask(id: string, updates: Partial<PlanningTask>): Promise<void> {
  await updateWithDriftFallback(
    'planning_tasks',
    id,
    { ...updates, updated_at: new Date().toISOString() },
    ['category']
  );
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('planning_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function loadVendors(weddingSiteId: string): Promise<PlanningVendor[]> {
  const { data, error } = await supabase
    .from('planning_vendors')
    .select(PLANNING_VENDOR_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanningVendor[];
}

export async function createVendor(weddingSiteId: string, vendor: Partial<PlanningVendor>): Promise<PlanningVendor> {
  const data = await insertWithDriftFallback(
    'planning_vendors',
    { ...vendor, wedding_site_id: weddingSiteId },
    ['vendor_type', 'email', 'contract_total', 'balance_due', 'next_payment_due', 'document_url', 'document_label', 'notes', 'phone'],
    PLANNING_VENDOR_SELECT,
  );
  return data as unknown as PlanningVendor;
}

export async function updateVendor(id: string, updates: Partial<PlanningVendor>): Promise<void> {
  await updateWithDriftFallback(
    'planning_vendors',
    id,
    { ...updates, updated_at: new Date().toISOString() },
    ['vendor_type', 'email', 'contract_total', 'balance_due', 'next_payment_due', 'document_url', 'document_label', 'notes', 'phone']
  );
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from('planning_vendors').delete().eq('id', id);
  if (error) throw error;
}

export async function loadBudgetItems(weddingSiteId: string): Promise<PlanningBudgetItem[]> {
  const { data, error } = await supabase
    .from('planning_budget_items')
    .select(PLANNING_BUDGET_ITEM_SELECT)
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
    ['estimated_amount', 'actual_amount', 'vendor_id', 'due_date', 'notes'],
    PLANNING_BUDGET_ITEM_SELECT,
  );
  return data as unknown as PlanningBudgetItem;
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

export interface StarterPlannerSuite {
  tasks: Partial<PlanningTask>[];
  budgetItems: Partial<PlanningBudgetItem>[];
  vendors: Partial<PlanningVendor>[];
  timelineSeeds: Array<{
    title: string;
    time: string;
    durationMinutes: number;
    owner: string;
  }>;
  rsvpQuestionSeeds: Array<{
    label: string;
    type: 'text' | 'single_choice' | 'multi_choice';
    options?: string[];
  }>;
  travelFaqSeeds: Array<{
    question: string;
    answer: string;
  }>;
  photoBucketSeeds: Array<{
    name: string;
    parent?: string;
    reason: string;
  }>;
  guestImportSuggestions: string[];
  rationale: string[];
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

const normalizeMilestoneWeddingDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
};

export function generateMilestoneTasks(weddingSiteId: string, weddingDateISO: string): Partial<PlanningTask>[] {
  const normalizedWeddingDate = normalizeMilestoneWeddingDate(weddingDateISO);
  if (!normalizedWeddingDate) return [];

  const weddingDate = new Date(`${normalizedWeddingDate}T12:00:00Z`);
  return MILESTONE_TEMPLATES.map((t) => {
    const dueDate = new Date(weddingDate);
    dueDate.setUTCDate(dueDate.getUTCDate() - Math.round(t.monthsBefore * 30));
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

function addDays(isoDate: string, dayDelta: number): string | null {
  const normalized = normalizeMilestoneWeddingDate(isoDate);
  if (!normalized) return null;
  const date = new Date(`${normalized}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

function dateBeforeWedding(weddingDateISO: string | null, fallbackDaysBefore: number): string | null {
  if (!weddingDateISO) return null;
  return addDays(weddingDateISO, -fallbackDaysBefore);
}

export function buildStarterPlannerSuite(input: {
  weddingSiteId: string;
  weddingDateISO: string | null;
  venueName?: string | null;
  guestCount?: number | null;
  destinationWedding?: boolean | null;
}): StarterPlannerSuite {
  const guestCount = Math.max(0, Number(input.guestCount) || 0);
  const destinationWedding = Boolean(input.destinationWedding);
  const weddingSiteId = input.weddingSiteId;
  const venueLabel = input.venueName?.trim() || 'venue';

  const tasks: Partial<PlanningTask>[] = [
    {
      wedding_site_id: weddingSiteId,
      title: 'Confirm venue arrival details',
      description: `Lock parking, rideshare, entrance, ceremony arrival time, and vendor load-in notes for ${venueLabel}.`,
      category: 'Logistics',
      due_date: dateBeforeWedding(input.weddingDateISO, 45),
      status: 'todo',
      priority: 'high',
      owner_name: '',
      sort_order: 100,
    },
    {
      wedding_site_id: weddingSiteId,
      title: 'Review RSVP deadline and reminders',
      description: 'Check the reply deadline, meal questions, guest rules, and the reminder audience before sending.',
      category: 'Guests',
      due_date: dateBeforeWedding(input.weddingDateISO, 60),
      status: 'todo',
      priority: 'high',
      owner_name: '',
      sort_order: 110,
    },
    {
      wedding_site_id: weddingSiteId,
      title: 'Build day-of timeline draft',
      description: 'Add ceremony, cocktail hour, dinner, speeches, first dance, open dance floor, and sendoff with buffer time.',
      category: 'Reception',
      due_date: dateBeforeWedding(input.weddingDateISO, 35),
      status: 'todo',
      priority: 'high',
      owner_name: '',
      sort_order: 120,
    },
    {
      wedding_site_id: weddingSiteId,
      title: 'Turn on guest photo collection',
      description: 'Set up photo groups, place the wedding link where guests will see it, and decide whether the recap should be public or private.',
      category: 'Guests',
      due_date: dateBeforeWedding(input.weddingDateISO, 21),
      status: 'todo',
      priority: 'medium',
      owner_name: '',
      sort_order: 130,
    },
    {
      wedding_site_id: weddingSiteId,
      title: 'Confirm vendor payment status',
      description: 'Match contracts, balances, due dates, and day-of contacts so final payments are not scattered.',
      category: 'Vendors',
      due_date: dateBeforeWedding(input.weddingDateISO, 30),
      status: 'todo',
      priority: 'medium',
      owner_name: '',
      sort_order: 140,
    },
  ];

  if (destinationWedding) {
    tasks.push({
      wedding_site_id: weddingSiteId,
      title: 'Check travel and hotel guidance',
      description: 'Confirm hotel blocks, shuttle timing, airport notes, welcome event details, and emergency contacts.',
      category: 'Travel',
      due_date: dateBeforeWedding(input.weddingDateISO, 75),
      status: 'todo',
      priority: 'high',
      owner_name: '',
      sort_order: 150,
    });
  }

  const estimatedGuestMultiplier = guestCount > 0 ? guestCount : 100;
  const cateringEstimate = Math.round(estimatedGuestMultiplier * 165);
  const budgetItems: Partial<PlanningBudgetItem>[] = [
    {
      wedding_site_id: weddingSiteId,
      category: 'Venue',
      item_name: 'Venue rental and fees',
      estimated_amount: 8500,
      actual_amount: 0,
      paid_amount: 0,
      due_date: dateBeforeWedding(input.weddingDateISO, 30),
      vendor_id: null,
      notes: 'Starter estimate. Replace with the contract amount once confirmed.',
    },
    {
      wedding_site_id: weddingSiteId,
      category: 'Catering',
      item_name: 'Food and beverage',
      estimated_amount: cateringEstimate,
      actual_amount: 0,
      paid_amount: 0,
      due_date: dateBeforeWedding(input.weddingDateISO, 21),
      vendor_id: null,
      notes: guestCount > 0 ? `Estimated from ${guestCount} guests.` : 'Estimated from a 100 guest baseline.',
    },
    {
      wedding_site_id: weddingSiteId,
      category: 'Photography',
      item_name: 'Photo coverage',
      estimated_amount: 5500,
      actual_amount: 0,
      paid_amount: 0,
      due_date: dateBeforeWedding(input.weddingDateISO, 14),
      vendor_id: null,
      notes: 'Use this for photographer contract and final balance tracking.',
    },
    {
      wedding_site_id: weddingSiteId,
      category: 'Music & Entertainment',
      item_name: 'DJ or band',
      estimated_amount: 2500,
      actual_amount: 0,
      paid_amount: 0,
      due_date: dateBeforeWedding(input.weddingDateISO, 14),
      vendor_id: null,
      notes: 'Tie this to the entertainment vendor once selected.',
    },
  ];

  const vendors: Partial<PlanningVendor>[] = [
    {
      wedding_site_id: weddingSiteId,
      vendor_type: 'Venue',
      name: input.venueName?.trim() || 'Venue team',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      contract_total: 0,
      amount_paid: 0,
      balance_due: 0,
      next_payment_due: dateBeforeWedding(input.weddingDateISO, 30),
      notes: 'Add venue contact, contract link, load-in rules, and day-of contact.',
    },
    {
      wedding_site_id: weddingSiteId,
      vendor_type: 'Photographer',
      name: 'Photographer',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      contract_total: 0,
      amount_paid: 0,
      balance_due: 0,
      next_payment_due: dateBeforeWedding(input.weddingDateISO, 14),
      notes: 'Add shot list, arrival time, final payment, and gallery delivery notes.',
    },
    {
      wedding_site_id: weddingSiteId,
      vendor_type: 'DJ',
      name: 'DJ or band',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      contract_total: 0,
      amount_paid: 0,
      balance_due: 0,
      next_payment_due: dateBeforeWedding(input.weddingDateISO, 14),
      notes: 'Add playlist, announcements, do-not-play list, and setup time.',
    },
  ];

  const timelineSeeds = [
    { title: 'Guest arrival', time: '4:00 PM', durationMinutes: 30, owner: 'Venue / planner' },
    { title: 'Ceremony', time: '4:30 PM', durationMinutes: 30, owner: 'Officiant' },
    { title: 'Cocktail hour', time: '5:00 PM', durationMinutes: 60, owner: 'Catering / bar' },
    { title: 'Dinner service', time: '6:15 PM', durationMinutes: 75, owner: 'Catering' },
    { title: 'Toasts', time: '7:30 PM', durationMinutes: 25, owner: 'Planner / MC' },
    { title: 'First dance', time: '8:00 PM', durationMinutes: 10, owner: 'DJ / band' },
    { title: 'Open dance floor', time: '8:10 PM', durationMinutes: 120, owner: 'DJ / band' },
    { title: 'Sendoff', time: '10:30 PM', durationMinutes: 20, owner: 'Planner / photo team' },
  ];

  const rsvpQuestionSeeds = [
    { label: 'Do you have any dietary restrictions or allergies?', type: 'text' as const },
    { label: 'Which events will you attend?', type: 'multi_choice' as const, options: ['Welcome drinks', 'Wedding ceremony', 'Reception', 'Farewell brunch'] },
    { label: 'Is there anything we should know before the weekend?', type: 'text' as const },
  ];

  const travelFaqSeeds = [
    {
      question: 'Where should guests park or arrive?',
      answer: `Add parking, rideshare, entrance, and arrival notes${input.venueName ? ` for ${input.venueName}` : ''}.`,
    },
    {
      question: 'What should guests wear?',
      answer: 'Add dress code, weather notes, and any venue-specific shoe or terrain guidance.',
    },
    ...(destinationWedding ? [{
      question: 'What travel details should guests know?',
      answer: 'Add airport, hotel block, shuttle, welcome event, and local contact details.',
    }] : []),
  ];

  const photoBucketSeeds = [
    { name: 'Ceremony', reason: 'Keeps aisle, vows, and guest reaction photos easy to find.' },
    { name: 'Cocktail hour', reason: 'Captures guest candids before dinner.' },
    { name: 'Reception', reason: 'Groups dinner, speeches, cake, and dance floor moments.' },
    { name: 'Dance floor', parent: 'Reception', reason: 'Useful for recap and slideshow highlights.' },
    { name: 'Guest reactions', reason: 'Finds the emotional photos guests actually remember.' },
    ...(destinationWedding ? [{ name: 'Weekend events', reason: 'Covers welcome drinks, brunch, and travel-weekend memories.' }] : []),
  ];

  const guestImportSuggestions = [
    'Include first name, last name, email, phone, household name, plus-one allowance, and an existing invitation link if you already have one.',
    'Add event access columns for welcome party, ceremony, reception, and brunch if not every guest is invited to every event.',
    'Keep mailing address fields separate so label export and address collection can cleanly fill gaps.',
  ];

  return {
    tasks,
    budgetItems,
    vendors,
    timelineSeeds,
    rsvpQuestionSeeds,
    travelFaqSeeds,
    photoBucketSeeds,
    guestImportSuggestions,
    rationale: [
      'Starts with logistics, guests, timeline, photos, vendors, and budget because those make the rest of planning easier.',
      guestCount > 0 ? `Uses ${guestCount} guests for first-pass catering math.` : 'Uses conservative starter estimates until the guest count is imported.',
      input.weddingDateISO ? 'Due dates are anchored to the wedding date.' : 'Due dates stay blank until the wedding date is confirmed.',
    ],
  };
}
