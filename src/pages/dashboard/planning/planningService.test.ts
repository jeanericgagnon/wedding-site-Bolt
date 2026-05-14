import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTask,
  deleteTask,
  generateMilestoneTasks,
  hasPlanningSongQuestion,
  loadBudgetItems,
  loadPlanningSiteMeta,
  loadVendors,
  MAX_PLANNING_ADDRESS_GUEST_ROWS,
  MAX_PLANNING_BUDGET_ITEM_ROWS,
  MAX_PLANNING_SEATING_EVENTS,
  MAX_PLANNING_SONG_REQUEST_ROWS,
  MAX_PLANNING_TASK_ROWS,
  MAX_PLANNING_VENDOR_ROWS,
  readPlanningSongAnswer,
  updatePlanningVendorMeta,
  updateTask,
} from './planningService';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

function makePlanningVendorQuery(result: { data: unknown; error: { message?: string } | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => result),
  };

  return chain;
}

function makePlanningBudgetQuery(result: { data: unknown; error: { message?: string } | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => result),
  };

  return chain;
}

function makePlanningSiteMetaQuery(result: { data: unknown; error: { message?: string } | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };

  return chain;
}

describe('generateMilestoneTasks', () => {
  it('drops impossible wedding dates instead of generating rolled milestone deadlines', () => {
    expect(generateMilestoneTasks('site-123', '2027-02-30')).toEqual([]);
    expect(generateMilestoneTasks('site-123', 'not-a-date')).toEqual([]);
  });

  it('keeps valid wedding dates and generates milestone deadlines', () => {
    const tasks = generateMilestoneTasks('site-123', '2027-06-12');

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]?.wedding_site_id).toBe('site-123');
    expect(tasks.every((task) => typeof task.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.due_date))).toBe(true);
  });
});

describe('planning song request helpers', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('reads song answers from current and legacy RSVP custom-answer shapes', () => {
    expect(readPlanningSongAnswer({ song_request: 'September - Earth, Wind & Fire' })).toBe('September - Earth, Wind & Fire');
    expect(readPlanningSongAnswer({ 'Dance song': ['Dancing Queen', 'September'] })).toBe('Dancing Queen, September');
    expect(readPlanningSongAnswer({ meal: 'Chicken' })).toBe('');
    expect(readPlanningSongAnswer(null)).toBe('');
  });

  it('detects existing song request questions without duplicating by label-only variants', () => {
    expect(hasPlanningSongQuestion([{ id: 'song_request', label: 'Anything' }])).toBe(true);
    expect(hasPlanningSongQuestion([{ id: 'custom-1', label: 'What song will get you dancing?' }])).toBe(true);
    expect(hasPlanningSongQuestion([{ id: 'meal', label: 'Meal choice' }])).toBe(false);
    expect(hasPlanningSongQuestion(null)).toBe(false);
  });

  it('exports stable planning query caps', () => {
    expect(MAX_PLANNING_ADDRESS_GUEST_ROWS).toBe(5000);
    expect(MAX_PLANNING_SONG_REQUEST_ROWS).toBe(2000);
    expect(MAX_PLANNING_TASK_ROWS).toBe(500);
    expect(MAX_PLANNING_VENDOR_ROWS).toBe(500);
    expect(MAX_PLANNING_BUDGET_ITEM_ROWS).toBe(1000);
    expect(MAX_PLANNING_SEATING_EVENTS).toBe(200);
  });

  it('keeps planning read-side guest, RSVP, task, vendor, and budget queries bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/planningService.ts'), 'utf8');

    expect(source).toContain('MAX_PLANNING_ADDRESS_GUEST_ROWS = 5000');
    expect(source).toContain('MAX_PLANNING_SONG_REQUEST_ROWS = 2000');
    expect(source).toContain('MAX_PLANNING_TASK_ROWS = 500');
    expect(source).toContain('MAX_PLANNING_VENDOR_ROWS = 500');
    expect(source).toContain('MAX_PLANNING_BUDGET_ITEM_ROWS = 1000');
    expect(source).toContain('MAX_PLANNING_SEATING_EVENTS = 200');
    expect(source).toContain(".order('name', { ascending: true })\n      .limit(MAX_PLANNING_ADDRESS_GUEST_ROWS),");
    expect(source).toContain(".order('responded_at', { ascending: false })\n      .limit(MAX_PLANNING_SONG_REQUEST_ROWS),");
    expect(source).toContain(".eq('wedding_site_id', weddingSiteId)\n    .limit(MAX_PLANNING_SEATING_EVENTS);");
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_PLANNING_TASK_ROWS);");
    expect(source).toContain(".order('name', { ascending: true })\n    .limit(MAX_PLANNING_VENDOR_ROWS);");
    expect(source).toContain(".order('item_name', { ascending: true })\n    .limit(MAX_PLANNING_BUDGET_ITEM_ROWS);");
    expect(source).toContain("supabase.rpc('planning_task_write'");
    expect(source).toContain("supabase.rpc('planning_task_delete'");
    expect(source).toContain("supabase.rpc('planning_vendor_write'");
    expect(source).toContain("supabase.rpc('planning_vendor_delete'");
    expect(source).toContain("supabase.rpc('planning_budget_item_write'");
    expect(source).toContain("supabase.rpc('planning_budget_item_delete'");
    expect(source).toContain("supabase.rpc('wedding_site_settings_patch'");
    expect(source).not.toContain(".from('planning_tasks')\n    .insert(");
    expect(source).not.toContain(".from('planning_tasks')\n    .update(");
    expect(source).not.toContain(".from('planning_tasks').delete()");
    expect(source).not.toContain(".from('planning_vendors').delete()");
    expect(source).not.toContain(".from('planning_budget_items').delete()");
    expect(source).not.toContain(".from('wedding_sites')\n    .update({ wedding_data: nextWeddingData");
    expect(source).not.toContain(".from('wedding_sites')\n    .update({ music_playlist_url:");
    expect(source).not.toContain(".from('wedding_sites')\n    .update({ rsvp_custom_questions:");
  });

  it('persists planning task writes through RPCs', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { id: 'task-1', title: 'Task' }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(createTask('site-1', { title: 'Task', status: 'todo' })).resolves.toEqual(expect.objectContaining({ id: 'task-1' }));
    expect(rpcMock).toHaveBeenNthCalledWith(1, 'planning_task_write', {
      p_wedding_site_id: 'site-1',
      p_task_id: null,
      p_payload: { title: 'Task', status: 'todo' },
    });

    await expect(updateTask('task-1', { status: 'done' })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'planning_task_write', {
      p_wedding_site_id: null,
      p_task_id: 'task-1',
      p_payload: { status: 'done' },
    });

    await expect(deleteTask('task-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'planning_task_delete', {
      p_task_id: 'task-1',
    });
  });

  it('falls back when the live planning_vendors schema is missing phone', async () => {
    const initialQuery = makePlanningVendorQuery({
      data: null,
      error: { message: 'column planning_vendors.phone does not exist' },
    });
    const fallbackQuery = makePlanningVendorQuery({
      data: [{
        id: 'vendor-1',
        wedding_site_id: 'site-1',
        vendor_type: 'florist',
        name: 'Bloom',
        contact_name: 'Jamie',
        email: 'jamie@example.com',
        website: 'https://bloom.example.com',
        contract_total: 1200,
        amount_paid: 600,
        balance_due: 600,
        next_payment_due: null,
        document_url: null,
        document_label: null,
        notes: 'Bring extra stems',
        internal_rating: 5,
        rating_status: 'booked',
        rating_notes: 'Strong fit',
        created_at: '2026-05-13T00:00:00.000Z',
        updated_at: '2026-05-13T00:00:00.000Z',
      }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(initialQuery)
      .mockReturnValueOnce(fallbackQuery);

    await expect(loadVendors('site-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'vendor-1',
        phone: '',
        internal_rating: 5,
        rating_status: 'booked',
        rating_notes: 'Strong fit',
      }),
    ]);

    expect(initialQuery.select).toHaveBeenCalledWith(expect.stringContaining('phone'));
    expect(fallbackQuery.select).toHaveBeenCalledWith(expect.not.stringContaining('phone'));
  });

  it('falls back when the live planning_budget_items schema is missing due_date', async () => {
    const initialQuery = makePlanningBudgetQuery({
      data: null,
      error: { message: 'column planning_budget_items.due_date does not exist' },
    });
    const fallbackQuery = makePlanningBudgetQuery({
      data: [{
        id: 'budget-1',
        wedding_site_id: 'site-1',
        category: 'venue',
        item_name: 'Venue deposit',
        estimated_amount: 2000,
        actual_amount: 1800,
        paid_amount: 1200,
        vendor_id: 'vendor-1',
        notes: 'Legacy row',
        created_at: '2026-05-13T00:00:00.000Z',
        updated_at: '2026-05-13T00:00:00.000Z',
      }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(initialQuery)
      .mockReturnValueOnce(fallbackQuery);

    await expect(loadBudgetItems('site-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'budget-1',
        due_date: null,
        actual_amount: 1800,
        vendor_id: 'vendor-1',
      }),
    ]);

    expect(initialQuery.select).toHaveBeenCalledWith(expect.stringContaining('due_date'));
    expect(fallbackQuery.select).toHaveBeenCalledWith(expect.not.stringContaining('due_date'));
  });

  it('loads vendor reminder metadata from planning wedding data safely', async () => {
    const siteMetaQuery = makePlanningSiteMetaQuery({
      data: {
        venue_name: 'Harbor House',
        is_destination_wedding: true,
        wedding_data: {
          planning: {
            totalBudget: 42000,
            vendorMeta: {
              ' vendor-1 ': {
                nextFollowUp: '2026-05-20T00:00:00.000Z',
                reminderChannel: 'email',
                reminderLeadDays: 7,
                reminderLastQueuedAt: '2026-05-10T18:00:00.000Z',
              },
              broken: {
                reminderChannel: 'fax',
              },
            },
          },
        },
      },
      error: null,
    });
    fromMock.mockReturnValueOnce(siteMetaQuery);

    await expect(loadPlanningSiteMeta('site-1')).resolves.toEqual({
      venueName: 'Harbor House',
      destinationWedding: true,
      totalBudget: 42000,
      vendorMeta: {
        'vendor-1': {
          nextFollowUp: '2026-05-20',
          reminderChannel: 'email',
          reminderLeadDays: 7,
          reminderLastQueuedAt: '2026-05-10T18:00:00.000Z',
        },
      },
    });
  });

  it('persists vendor reminder metadata through wedding site settings patch RPC', async () => {
    const siteMetaQuery = makePlanningSiteMetaQuery({
      data: {
        wedding_data: {
          planning: {
            totalBudget: 24000,
          },
        },
      },
      error: null,
    });
    fromMock.mockReturnValueOnce(siteMetaQuery);
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(updatePlanningVendorMeta('site-1', {
      ' vendor-1 ': {
        nextFollowUp: '2026-05-22T00:00:00.000Z',
        reminderChannel: 'phone',
        reminderLeadDays: 3,
      },
    })).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('wedding_site_settings_patch', {
      p_wedding_site_id: 'site-1',
      p_patch: {
        wedding_data: {
          planning: {
            totalBudget: 24000,
            vendorMeta: {
              'vendor-1': {
                nextFollowUp: '2026-05-22',
                reminderChannel: 'phone',
                reminderLeadDays: 3,
              },
            },
          },
        },
      },
    });
  });
});
