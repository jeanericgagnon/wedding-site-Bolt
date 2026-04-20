import { describe, expect, it } from 'vitest';
import { resolveCoordinatorTimelineAlertIntent } from './coordinatorTimelineAlertIntent';

describe('coordinatorTimelineAlertIntent', () => {
  const suggestions = [
    { key: 'live:ceremony', label: 'Update live event', subject: 'Ceremony is live', body: 'Body', audience: 'event:ceremony' },
    { key: 'up-next:cocktails', label: 'Cue next event', subject: 'Cocktails is coming up', body: 'Body', audience: 'event:cocktails' },
    { key: 'check-in', label: 'Prompt arrivals', subject: 'Check-in reminder', body: 'Body', audience: 'all' },
  ];

  it('prefers the live-event suggestion when available', () => {
    expect(resolveCoordinatorTimelineAlertIntent(suggestions, 'ceremony')).toBe('live:ceremony');
  });

  it('falls back to up-next suggestion when live suggestion is absent', () => {
    expect(resolveCoordinatorTimelineAlertIntent(suggestions, 'cocktails')).toBe('up-next:cocktails');
  });

  it('returns null when no event-bound suggestion exists', () => {
    expect(resolveCoordinatorTimelineAlertIntent(suggestions, 'dinner')).toBeNull();
  });
});
