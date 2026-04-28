import { describe, expect, it } from 'vitest';
import { generateMilestoneTasks } from './planningService';

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
