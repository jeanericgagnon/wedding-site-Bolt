import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertSuggestions } from './coordinatorAlertSuggestions';

describe('coordinatorAlertSuggestions', () => {
  it('builds live and up-next suggestions when timeline context exists', () => {
    const suggestions = buildCoordinatorAlertSuggestions({
      liveEvent: { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      upNextEvent: { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' },
    });

    expect(suggestions.map((item) => item.key)).toEqual(['live:ceremony', 'up-next:cocktails', 'check-in']);
    expect(suggestions[0].audience).toBe('event:ceremony');
    expect(suggestions[1].subject).toContain('Cocktails');
  });

  it('still provides a generic arrival suggestion without timeline context', () => {
    const suggestions = buildCoordinatorAlertSuggestions({ liveEvent: null, upNextEvent: null });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].key).toBe('check-in');
  });
});
