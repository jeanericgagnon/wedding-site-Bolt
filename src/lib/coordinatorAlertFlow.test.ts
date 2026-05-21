import { describe, expect, it } from 'vitest';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor, validateCoordinatorAlertForm } from './coordinatorAlertFlow';

describe('coordinatorAlertFlow', () => {
  const baseForm = {
    subject: 'Weather update',
    body: 'Ceremony is moving inside.',
    audience: 'all',
    channel: 'sms' as const,
    scheduleType: 'now' as const,
    scheduleDate: '',
    scheduleTime: '',
  };

  it('rejects scheduled alerts without a valid future time', () => {
    expect(validateCoordinatorAlertForm({ ...baseForm, scheduleType: 'later', scheduleDate: '', scheduleTime: '' }, 12)).toBe('Pick a valid date and time.');
    expect(validateCoordinatorAlertForm({ ...baseForm, scheduleType: 'later', scheduleDate: '2027-02-30', scheduleTime: '08:00' }, 12)).toBe('Pick a valid date and time.');
    expect(validateCoordinatorAlertForm({ ...baseForm, scheduleType: 'later', scheduleDate: '2027-02-28', scheduleTime: '24:00' }, 12)).toBe('Pick a valid date and time.');
    expect(validateCoordinatorAlertForm({ ...baseForm, scheduleType: 'later', scheduleDate: '2026-04-19', scheduleTime: '08:00' }, 12, new Date('2026-04-19T09:00:00'))).toBe('Scheduled alerts need a future time.');
  });

  it('returns an iso timestamp for valid scheduled alerts', () => {
    expect(resolveCoordinatorScheduledFor({ ...baseForm, scheduleType: 'later', scheduleDate: '2026-04-19', scheduleTime: '18:30' })).toBe('2026-04-19T18:30:00');
  });

  it('dedupes identical queued alerts while keeping newest first', () => {
    const next = { id: '2', subject: 'Weather update', audience: 'all', channel: 'sms' as const, queuedAt: '2026-04-19T09:00:00.000Z', sendAt: null };
    expect(appendCoordinatorAlertLogItem([
      { id: '1', subject: 'Weather update', audience: 'all', channel: 'sms' as const, queuedAt: '2026-04-19T08:55:00.000Z', sendAt: null },
      { id: 'x', subject: 'Parking update', audience: 'all', channel: 'email' as const, queuedAt: '2026-04-19T08:40:00.000Z', sendAt: null },
    ], next)).toEqual([
      next,
      { id: 'x', subject: 'Parking update', audience: 'all', channel: 'email' as const, queuedAt: '2026-04-19T08:40:00.000Z', sendAt: null },
    ]);
  });
});
