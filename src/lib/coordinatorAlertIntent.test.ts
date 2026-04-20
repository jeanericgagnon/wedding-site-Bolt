import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorAlertIntentState, resolveCoordinatorPreferredAlertSuggestion } from './coordinatorAlertIntent';

describe('coordinatorAlertIntent', () => {
  const suggestions = [
    { key: 'live:ceremony', label: 'Update live event', subject: 'Ceremony is live', body: 'Body', audience: 'event:ceremony' },
    { key: 'check-in', label: 'Prompt arrivals', subject: 'Check-in reminder', body: 'Body', audience: 'all' },
  ];

  it('restores a valid saved suggestion key', () => {
    expect(normalizeCoordinatorAlertIntentState({ lastSuggestionKey: 'live:ceremony' })).toEqual({ lastSuggestionKey: 'live:ceremony' });
  });

  it('picks the saved suggestion when it still exists', () => {
    expect(resolveCoordinatorPreferredAlertSuggestion(suggestions, 'check-in')?.key).toBe('check-in');
  });

  it('falls back to the first available suggestion when saved intent is missing', () => {
    expect(resolveCoordinatorPreferredAlertSuggestion(suggestions, 'missing')?.key).toBe('live:ceremony');
  });
});
