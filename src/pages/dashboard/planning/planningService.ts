import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { normalizeVendorMeta, type VendorMetaMap } from './vendorMetaStorage';

function requireRpcRecord<T>(data: unknown, functionName: string): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${functionName} returned an invalid record payload`);
  }
  return data as T;
}

const PLANNING_TASK_SELECT = 'id, wedding_site_id, title, description, category, due_date, status, priority, owner_name, linked_event_id, linked_vendor_id, sort_order, created_at, updated_at' as const;
const PLANNING_VENDOR_SELECT = 'id, wedding_site_id, vendor_type, name, contact_name, email, phone, website, contract_total, amount_paid, balance_due, next_payment_due, document_url, document_label, notes, internal_rating, rating_status, rating_notes, created_at, updated_at' as const;
const PLANNING_VENDOR_LEGACY_SELECT = 'id, wedding_site_id, vendor_type, name, contact_name, email, phone, website, contract_total, amount_paid, balance_due, next_payment_due, document_url, document_label, notes, created_at, updated_at' as const;
const PLANNING_VENDOR_PHONELESS_SELECT = 'id, wedding_site_id, vendor_type, name, contact_name, email, website, contract_total, amount_paid, balance_due, next_payment_due, document_url, document_label, notes, internal_rating, rating_status, rating_notes, created_at, updated_at' as const;
const PLANNING_VENDOR_PHONELESS_LEGACY_SELECT = 'id, wedding_site_id, vendor_type, name, contact_name, email, website, contract_total, amount_paid, balance_due, next_payment_due, document_url, document_label, notes, created_at, updated_at' as const;
const PLANNING_BUDGET_ITEM_SELECT = 'id, wedding_site_id, category, item_name, estimated_amount, actual_amount, paid_amount, due_date, vendor_id, notes, created_at, updated_at' as const;
const PLANNING_BUDGET_ITEM_LEGACY_SELECT = 'id, wedding_site_id, category, item_name, estimated_amount, actual_amount, paid_amount, vendor_id, notes, created_at, updated_at' as const;
const PLANNING_SITE_META_SELECT = 'wedding_data, venue_name, is_destination_wedding' as const;
const PLANNING_TOTAL_BUDGET_SELECT = 'wedding_data' as const;
const SEATING_READINESS_EVENT_SELECT = 'id' as const;
const ADDRESS_COLLECTION_SITE_SELECT = 'site_slug, site_url' as const;
const ADDRESS_COLLECTION_GUEST_SELECT = 'id, name, email, phone, household_id, mailing_address_line1, mailing_city, sms_consent' as const;
const SONG_REQUEST_SITE_SELECT = 'music_playlist_url, rsvp_custom_questions' as const;
const SONG_REQUEST_RSVP_SELECT = 'custom_answers, responded_at, guests!inner(name, wedding_site_id)' as const;

export const PLANNING_SONG_QUESTION_ID = 'song_request' as const;
export const MAX_PLANNING_ADDRESS_GUEST_ROWS = 5000;
export const MAX_PLANNING_SONG_REQUEST_ROWS = 2000;
export const MAX_PLANNING_TASK_ROWS = 500;
export const MAX_PLANNING_VENDOR_ROWS = 500;
export const MAX_PLANNING_BUDGET_ITEM_ROWS = 1000;
export const MAX_PLANNING_SEATING_EVENTS = 200;


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
  internal_rating?: number | null;
  rating_status?: string | null;
  rating_notes?: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeVendorCompatibilityRecord(
  vendor: Record<string, unknown>,
  options: { missingPhone?: boolean; missingRatingFields?: boolean } = {},
): PlanningVendor {
  return {
    ...vendor,
    phone: options.missingPhone ? '' : String(vendor.phone ?? ''),
    internal_rating: options.missingRatingFields ? null : (vendor.internal_rating as number | null | undefined) ?? null,
    rating_status: options.missingRatingFields ? null : (vendor.rating_status as string | null | undefined) ?? null,
    rating_notes: options.missingRatingFields ? null : (vendor.rating_notes as string | null | undefined) ?? null,
  } as PlanningVendor;
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

function normalizeBudgetItemCompatibilityRecord(
  item: Record<string, unknown>,
  options: { missingDueDate?: boolean } = {},
): PlanningBudgetItem {
  return {
    ...item,
    due_date: options.missingDueDate ? null : (item.due_date as string | null | undefined) ?? null,
  } as PlanningBudgetItem;
}

export interface PlanningSiteMeta {
  venueName: string | null;
  destinationWedding: boolean;
  totalBudget: number;
  vendorMeta: VendorMetaMap;
}

export interface PlanningSeatingReadiness {
  attending: number;
  seated: number;
  unassigned: number;
}

export interface PlanningAddressGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  household_id: string | null;
  mailing_address_line1?: string | null;
  mailing_city?: string | null;
  sms_consent?: boolean | null;
}

export interface PlanningAddressCollectionData {
  siteSlug: string;
  guests: PlanningAddressGuest[];
}

export interface PlanningSongQuestion {
  id?: string;
  label?: string;
  type?: string;
  required?: boolean;
}

export interface PlanningSongRequest {
  guestName: string;
  answer: string;
  respondedAt: string | null;
}

export interface PlanningSongRequestData {
  playlistUrl: string;
  hasQuestion: boolean;
  requests: PlanningSongRequest[];
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

export async function loadPlanningSiteMeta(weddingSiteId: string): Promise<PlanningSiteMeta> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(PLANNING_SITE_META_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (error) throw error;

  const weddingData = (data?.wedding_data as Record<string, unknown> | null) ?? null;
  const planningMeta = (weddingData?.planning as Record<string, unknown> | undefined) ?? {};

  return {
    venueName: (data?.venue_name as string | null) ?? null,
    destinationWedding: Boolean(data?.is_destination_wedding),
    totalBudget: Number(planningMeta.totalBudget) || 0,
    vendorMeta: normalizeVendorMeta(planningMeta.vendorMeta),
  };
}

export async function updatePlanningVendorMeta(weddingSiteId: string, vendorMeta: VendorMetaMap): Promise<void> {
  const { data: siteData, error: loadError } = await supabase
    .from('wedding_sites')
    .select(PLANNING_TOTAL_BUDGET_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (loadError) throw loadError;

  const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
  const planning = (weddingData.planning as Record<string, unknown> | undefined) ?? {};
  const nextWeddingData = {
    ...weddingData,
    planning: {
      ...planning,
      vendorMeta: normalizeVendorMeta(vendorMeta),
    },
  };

  let { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: weddingSiteId,
    p_patch: { wedding_data: nextWeddingData },
  });

  if (error?.message?.includes('wedding_data')) {
    const fallback = await supabase.rpc('wedding_site_settings_patch', {
      p_wedding_site_id: weddingSiteId,
      p_patch: {},
    });
    error = fallback.error;
  }

  if (error) throw error;
}

export async function loadPlanningGuestCount(weddingSiteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_site_id', weddingSiteId);
  if (error) throw error;
  return count ?? 0;
}

export async function loadPlanningSeatingReadiness(weddingSiteId: string): Promise<PlanningSeatingReadiness> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { attending: 0, seated: 0, unassigned: 0 };

  const { count: attendingCount, error: attendingError } = await supabase
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_site_id', weddingSiteId)
    .in('rsvp_status', ['confirmed', 'attending']);
  if (attendingError) throw attendingError;

  const { data: seatingEventsData, error: eventsError } = await supabase
    .from('seating_events')
    .select(SEATING_READINESS_EVENT_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .limit(MAX_PLANNING_SEATING_EVENTS);
  if (eventsError) throw eventsError;

  let seatedCount = 0;
  if (seatingEventsData && seatingEventsData.length > 0) {
    const eventIds = seatingEventsData.map(e => e.id);
    const { count, error: assignmentError } = await supabase
      .from('seating_assignments')
      .select('id', { count: 'exact', head: true })
      .in('seating_event_id', eventIds)
      .eq('is_valid', true);
    if (assignmentError) throw assignmentError;
    seatedCount = count ?? 0;
  }

  const attending = attendingCount ?? 0;
  return {
    attending,
    seated: seatedCount,
    unassigned: Math.max(0, attending - seatedCount),
  };
}

export async function updatePlanningTotalBudget(weddingSiteId: string, value: number): Promise<void> {
  const { data: siteData, error: loadError } = await supabase
    .from('wedding_sites')
    .select(PLANNING_TOTAL_BUDGET_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (loadError) throw loadError;

  const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
  const planning = (weddingData.planning as Record<string, unknown> | undefined) ?? {};
  const nextWeddingData = {
    ...weddingData,
    planning: {
      ...planning,
      totalBudget: value,
    },
  };

  let { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: weddingSiteId,
    p_patch: { wedding_data: nextWeddingData },
  });

  if (error?.message?.includes('wedding_data')) {
    const fallback = await supabase.rpc('wedding_site_settings_patch', {
      p_wedding_site_id: weddingSiteId,
      p_patch: {},
    });
    error = fallback.error;
  }

  if (error) throw error;
}

export function readPlanningSongAnswer(answers: Record<string, unknown> | null | undefined): string {
  if (!answers || typeof answers !== 'object') return '';
  const entries = Object.entries(answers);
  const songEntry = entries.find(([key]) => key.toLowerCase().includes('song') || key === PLANNING_SONG_QUESTION_ID);
  const value = songEntry?.[1];
  if (Array.isArray(value)) return value.join(', ');
  return typeof value === 'string' ? value : '';
}

export function hasPlanningSongQuestion(questions: unknown): boolean {
  if (!Array.isArray(questions)) return false;
  return questions.some((question) => {
    const item = question as PlanningSongQuestion;
    return item.id === PLANNING_SONG_QUESTION_ID || String(item.label ?? '').toLowerCase().includes('song');
  });
}

export async function loadAddressCollectionData(weddingSiteId: string): Promise<PlanningAddressCollectionData> {
  const [{ data: site, error: siteError }, { data: guests, error: guestsError }] = await Promise.all([
    supabase
      .from('wedding_sites')
      .select(ADDRESS_COLLECTION_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle(),
    supabase
      .from('guests')
      .select(ADDRESS_COLLECTION_GUEST_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('name', { ascending: true })
      .limit(MAX_PLANNING_ADDRESS_GUEST_ROWS),
  ]);
  if (siteError) throw siteError;
  if (guestsError) throw guestsError;

  return {
    siteSlug: String((site?.site_slug || site?.site_url || '') ?? ''),
    guests: (guests ?? []) as PlanningAddressGuest[],
  };
}

export async function loadSongRequestData(weddingSiteId: string): Promise<PlanningSongRequestData> {
  const [{ data: site, error: siteError }, { data: rsvps, error: rsvpError }] = await Promise.all([
    supabase
      .from('wedding_sites')
      .select(SONG_REQUEST_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle(),
    supabase
      .from('rsvps')
      .select(SONG_REQUEST_RSVP_SELECT)
      .eq('guests.wedding_site_id', weddingSiteId)
      .order('responded_at', { ascending: false })
      .limit(MAX_PLANNING_SONG_REQUEST_ROWS),
  ]);
  if (siteError) throw siteError;
  if (rsvpError) throw rsvpError;

  const requests = ((rsvps ?? []) as Array<{ custom_answers?: Record<string, unknown> | null; responded_at?: string | null; guests?: { name?: string } }>)
    .map((row) => ({
      guestName: row.guests?.name || 'Guest',
      answer: readPlanningSongAnswer(row.custom_answers),
      respondedAt: row.responded_at ?? null,
    }))
    .filter((row) => row.answer.trim().length > 0);

  return {
    playlistUrl: ((site?.music_playlist_url as string | null) ?? ''),
    hasQuestion: hasPlanningSongQuestion((site as { rsvp_custom_questions?: unknown } | null)?.rsvp_custom_questions),
    requests,
  };
}

export async function savePlanningPlaylistUrl(weddingSiteId: string, playlistUrl: string): Promise<void> {
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: weddingSiteId,
    p_patch: { music_playlist_url: playlistUrl.trim() || null },
  });
  if (error) throw error;
}

export async function ensurePlanningSongRequestQuestion(weddingSiteId: string): Promise<void> {
  const { data, error: loadError } = await supabase
    .from('wedding_sites')
    .select('rsvp_custom_questions')
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (loadError) throw loadError;

  const questions = Array.isArray((data as { rsvp_custom_questions?: unknown } | null)?.rsvp_custom_questions)
    ? ([...((data as { rsvp_custom_questions?: unknown[] }).rsvp_custom_questions ?? [])] as Array<Record<string, unknown>>)
    : [];
  if (!questions.some((question) => question.id === PLANNING_SONG_QUESTION_ID)) {
    questions.push({
      id: PLANNING_SONG_QUESTION_ID,
      label: 'What song will get you on the dance floor?',
      type: 'short_text',
      required: false,
    });
  }

  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: weddingSiteId,
    p_patch: { rsvp_custom_questions: questions },
  });
  if (error) throw error;
}

export async function loadTasks(weddingSiteId: string): Promise<PlanningTask[]> {
  const { data, error } = await supabase
    .from('planning_tasks')
    .select(PLANNING_TASK_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(MAX_PLANNING_TASK_ROWS);
  if (error) throw error;
  return (data ?? []) as PlanningTask[];
}

export async function createTask(weddingSiteId: string, task: Partial<PlanningTask>): Promise<PlanningTask> {
  const { data, error } = await supabase.rpc('planning_task_write', {
    p_wedding_site_id: weddingSiteId,
    p_task_id: null,
    p_payload: task,
  });
  if (error) throw error;
  return requireRpcRecord<PlanningTask>(data, 'planning_task_write');
}

export async function updateTask(id: string, updates: Partial<PlanningTask>): Promise<void> {
  const { error } = await supabase.rpc('planning_task_write', {
    p_wedding_site_id: null,
    p_task_id: id,
    p_payload: updates,
  });
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.rpc('planning_task_delete', {
    p_task_id: id,
  });
  if (error) throw error;
}

export async function loadVendors(weddingSiteId: string): Promise<PlanningVendor[]> {
  const query = (select: string) => supabase
    .from('planning_vendors')
    .select(select)
    .eq('wedding_site_id', weddingSiteId)
    .order('name', { ascending: true })
    .limit(MAX_PLANNING_VENDOR_ROWS);

  const { data, error } = await query(PLANNING_VENDOR_SELECT);
  if (!error) return ((data ?? []) as unknown) as PlanningVendor[];

  const missingRatingFields = ['internal_rating', 'rating_status', 'rating_notes'].some((field) => error.message?.includes(field));
  const missingPhone = error.message?.includes('planning_vendors.phone') || error.message?.includes('column phone does not exist');
  if (!missingRatingFields && !missingPhone) throw error;

  const fallbackSelect = missingPhone
    ? (missingRatingFields ? PLANNING_VENDOR_PHONELESS_LEGACY_SELECT : PLANNING_VENDOR_PHONELESS_SELECT)
    : PLANNING_VENDOR_LEGACY_SELECT;
  const fallback = await query(fallbackSelect);
  if (fallback.error) throw fallback.error;
  return (((fallback.data ?? []) as unknown) as Array<Record<string, unknown>>).map((vendor) => normalizeVendorCompatibilityRecord(vendor, {
    missingPhone,
    missingRatingFields,
  }));
}

export async function createVendor(weddingSiteId: string, vendor: Partial<PlanningVendor>): Promise<PlanningVendor> {
  const { data, error } = await supabase.rpc('planning_vendor_write', {
    p_wedding_site_id: weddingSiteId,
    p_vendor_id: null,
    p_payload: vendor,
  });
  if (error) throw error;
  return requireRpcRecord<PlanningVendor>(data, 'planning_vendor_write');
}

export async function updateVendor(id: string, updates: Partial<PlanningVendor>): Promise<void> {
  const { error } = await supabase.rpc('planning_vendor_write', {
    p_wedding_site_id: null,
    p_vendor_id: id,
    p_payload: updates,
  });
  if (error) throw error;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.rpc('planning_vendor_delete', {
    p_vendor_id: id,
  });
  if (error) throw error;
}

export async function loadBudgetItems(weddingSiteId: string): Promise<PlanningBudgetItem[]> {
  const query = (select: string) => supabase
    .from('planning_budget_items')
    .select(select)
    .eq('wedding_site_id', weddingSiteId)
    .order('category', { ascending: true })
    .order('item_name', { ascending: true })
    .limit(MAX_PLANNING_BUDGET_ITEM_ROWS);

  const { data, error } = await query(PLANNING_BUDGET_ITEM_SELECT);
  if (!error) return ((data ?? []) as unknown) as PlanningBudgetItem[];

  const missingDueDate = error.message?.includes('planning_budget_items.due_date') || error.message?.includes('column due_date does not exist');
  if (!missingDueDate) throw error;

  const fallback = await query(PLANNING_BUDGET_ITEM_LEGACY_SELECT);
  if (fallback.error) throw fallback.error;
  return (((fallback.data ?? []) as unknown) as Array<Record<string, unknown>>).map((item) => normalizeBudgetItemCompatibilityRecord(item, {
    missingDueDate,
  }));
}

export async function createBudgetItem(weddingSiteId: string, item: Partial<PlanningBudgetItem>): Promise<PlanningBudgetItem> {
  const { data, error } = await supabase.rpc('planning_budget_item_write', {
    p_wedding_site_id: weddingSiteId,
    p_item_id: null,
    p_payload: item,
  });
  if (error) throw error;
  return requireRpcRecord<PlanningBudgetItem>(data, 'planning_budget_item_write');
}

export async function updateBudgetItem(id: string, updates: Partial<PlanningBudgetItem>): Promise<void> {
  const { error } = await supabase.rpc('planning_budget_item_write', {
    p_wedding_site_id: null,
    p_item_id: id,
    p_payload: updates,
  });
  if (error) throw error;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('planning_budget_item_delete', {
    p_item_id: id,
  });
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
