import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateMilestoneTasks,
  hasPlanningSongQuestion,
  MAX_PLANNING_ADDRESS_GUEST_ROWS,
  MAX_PLANNING_BUDGET_ITEM_ROWS,
  MAX_PLANNING_SONG_REQUEST_ROWS,
  MAX_PLANNING_TASK_ROWS,
  MAX_PLANNING_VENDOR_ROWS,
  readPlanningSongAnswer,
} from './planningService';

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
  });

  it('keeps planning read-side guest, RSVP, task, vendor, and budget queries bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/planningService.ts'), 'utf8');

    expect(source).toContain('MAX_PLANNING_ADDRESS_GUEST_ROWS = 5000');
    expect(source).toContain('MAX_PLANNING_SONG_REQUEST_ROWS = 2000');
    expect(source).toContain('MAX_PLANNING_TASK_ROWS = 500');
    expect(source).toContain('MAX_PLANNING_VENDOR_ROWS = 500');
    expect(source).toContain('MAX_PLANNING_BUDGET_ITEM_ROWS = 1000');
    expect(source).toContain(".order('name', { ascending: true })\n      .limit(MAX_PLANNING_ADDRESS_GUEST_ROWS),");
    expect(source).toContain(".order('responded_at', { ascending: false })\n      .limit(MAX_PLANNING_SONG_REQUEST_ROWS),");
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_PLANNING_TASK_ROWS);");
    expect(source).toContain(".order('name', { ascending: true })\n    .limit(MAX_PLANNING_VENDOR_ROWS);");
    expect(source).toContain(".order('item_name', { ascending: true })\n    .limit(MAX_PLANNING_BUDGET_ITEM_ROWS);");
  });
});
