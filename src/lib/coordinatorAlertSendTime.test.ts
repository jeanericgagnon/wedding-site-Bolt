import { describe, expect, it } from 'vitest';

import { formatCoordinatorAlertSendTime, getCoordinatorAlertSendTimestamp } from './coordinatorAlertSendTime';

describe('coordinatorAlertSendTime', () => {
  it('sinks invalid persisted send times behind real scheduled alerts', () => {
    expect(getCoordinatorAlertSendTimestamp('not-a-date')).toBe(Number.POSITIVE_INFINITY);
  });

  it('formats invalid persisted send times with a clean fallback', () => {
    expect(formatCoordinatorAlertSendTime('not-a-date')).toBe('Unknown time');
  });

  it('keeps valid persisted send times truthful', () => {
    const value = '2026-04-22T16:00:00.000Z';
    expect(getCoordinatorAlertSendTimestamp(value)).toBe(new Date(value).getTime());
    expect(formatCoordinatorAlertSendTime(value)).toBe(new Date(value).toLocaleString());
  });
});
