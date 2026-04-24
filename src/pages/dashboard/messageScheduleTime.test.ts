import { describe, expect, it } from 'vitest';

import { parseScheduleInputToIso, toScheduleInputValue } from './messageScheduleTime';

describe('message schedule time guards', () => {
  it('drops invalid persisted schedule timestamps instead of hydrating NaN datetime input values', () => {
    expect(toScheduleInputValue('not-a-date')).toBe('');
  });

  it('skips malformed schedule drafts instead of throwing Invalid time value', () => {
    expect(parseScheduleInputToIso('not-a-date')).toBeUndefined();
  });

  it('keeps valid schedule timestamps truthful', () => {
    expect(toScheduleInputValue('2026-06-21T18:30:00.000Z')).toMatch(/^2026-06-21T/);
    expect(parseScheduleInputToIso('2026-06-21T18:30')).toBe(new Date('2026-06-21T18:30').toISOString());
  });
});
