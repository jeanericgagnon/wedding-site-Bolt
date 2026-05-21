import { describe, expect, it } from 'vitest';

import {
  formatTaskDueDate,
  isTaskDueBetween,
  isTaskDueOnOrBefore,
  toValidTaskDueDateOrNull,
} from './taskDueDate';

describe('taskDueDate', () => {
  it('rejects invalid persisted due dates', () => {
    expect(toValidTaskDueDateOrNull('not-a-date')).toBeNull();
    expect(toValidTaskDueDateOrNull('2027-02-30')).toBeNull();
    expect(isTaskDueOnOrBefore('not-a-date', new Date('2026-05-10T00:00:00.000Z'))).toBe(false);
    expect(isTaskDueOnOrBefore('2027-02-30', new Date('2026-05-10T00:00:00.000Z'))).toBe(false);
    expect(isTaskDueBetween('not-a-date', new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-10T00:00:00.000Z'))).toBe(false);
    expect(isTaskDueBetween('2027-02-30', new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-10T00:00:00.000Z'))).toBe(false);
    expect(formatTaskDueDate('not-a-date')).toBe('Unknown date');
    expect(formatTaskDueDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid persisted due dates truthful', () => {
    const value = '2026-05-05';
    const date = new Date(2026, 4, 5);
    expect(toValidTaskDueDateOrNull(value)?.getTime()).toBe(date.getTime());
    expect(isTaskDueOnOrBefore(value, new Date('2026-05-10T00:00:00.000Z'))).toBe(true);
    expect(isTaskDueBetween(value, new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-10T00:00:00.000Z'))).toBe(true);
    expect(formatTaskDueDate(value)).toBe(date.toLocaleDateString());
  });

  it('formats date-only task due dates as the saved local calendar day', () => {
    const value = '2026-05-15';
    const parsed = toValidTaskDueDateOrNull(value);

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(15);
    expect(formatTaskDueDate(value)).toBe(new Date(2026, 4, 15).toLocaleDateString());
  });
});
