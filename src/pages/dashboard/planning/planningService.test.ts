import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTask,
  deleteTask,
  generateMilestoneTasks,
  hasPlanningSongQuestion,
  MAX_PLANNING_ADDRESS_GUEST_ROWS,
  MAX_PLANNING_BUDGET_ITEM_ROWS,
  MAX_PLANNING_SEATING_EVENTS,
  MAX_PLANNING_SONG_REQUEST_ROWS,
  MAX_PLANNING_TASK_ROWS,
  MAX_PLANNING_VENDOR_ROWS,
  readPlanningSongAnswer,
  updateTask,
} from './planningService';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: rpcMock,
  },
}));

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
    expect(source).not.toContain(".from('planning_tasks')\n    .insert(");
    expect(source).not.toContain(".from('planning_tasks')\n    .update(");
    expect(source).not.toContain(".from('planning_tasks').delete()");
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
});
