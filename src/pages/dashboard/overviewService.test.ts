import { describe, expect, it } from 'vitest';
import {
  MAX_OVERVIEW_COLLABORATOR_LINK_ROWS,
  MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS,
  MAX_OVERVIEW_INTERACTIVE_VOTES,
  MAX_OVERVIEW_RECENT_RSVPS,
  buildOverviewDismissalsWeddingData,
} from './overviewService';

describe('overviewService', () => {
  it('exports stable overview service bounds', () => {
    expect(MAX_OVERVIEW_RECENT_RSVPS).toBe(5);
    expect(MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS).toBe(8);
    expect(MAX_OVERVIEW_INTERACTIVE_VOTES).toBe(500);
    expect(MAX_OVERVIEW_COLLABORATOR_LINK_ROWS).toBe(1);
  });

  it('preserves existing wedding data while setting intelligence dismissals', () => {
    expect(buildOverviewDismissalsWeddingData(
      {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          intelligenceDismissals: ['old'],
        },
      },
      ['next-a', 'next-b'],
    )).toEqual({
      couple: { name: 'Alex and Jordan' },
      meta: {
        existing: true,
        intelligenceDismissals: ['next-a', 'next-b'],
      },
    });
  });
});
