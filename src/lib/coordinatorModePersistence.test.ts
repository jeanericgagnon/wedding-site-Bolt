import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorAlertLog, normalizeCoordinatorQnaItems, normalizeCoordinatorTimelineState } from './coordinatorModePersistence';

describe('coordinatorModePersistence', () => {
  it('keeps only valid timeline states', () => {
    expect(normalizeCoordinatorTimelineState({ a: 'live', b: 'bogus', '': 'done' })).toEqual({ a: 'live' });
  });

  it('drops malformed alert log entries', () => {
    expect(normalizeCoordinatorAlertLog([
      { id: '1', subject: 'Update', audience: 'all', channel: 'sms', queuedAt: '2026-04-19T08:00:00.000Z' },
      { id: '2', subject: 'Bad', audience: 'all', channel: 'push', queuedAt: '2026-04-19T08:00:00.000Z' },
    ])).toEqual([
      { id: '1', subject: 'Update', audience: 'all', channel: 'sms', queuedAt: '2026-04-19T08:00:00.000Z' },
    ]);
  });

  it('drops malformed q&a entries', () => {
    expect(normalizeCoordinatorQnaItems([
      { id: 'q1', question: 'Where do I park?', status: 'new' },
      { id: 'q2', question: 'Bad', status: 'pending' },
    ])).toEqual([
      { id: 'q1', question: 'Where do I park?', status: 'new' },
    ]);
  });
});
