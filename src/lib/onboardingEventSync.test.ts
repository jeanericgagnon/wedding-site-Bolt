import { describe, expect, it } from 'vitest';
import { filterMissingOnboardingEventSeeds } from './onboardingEventSync';

describe('filterMissingOnboardingEventSeeds', () => {
  it('skips seeds that match existing itinerary row names so manual edits are not stomped', () => {
    const existing = [
      { event_name: 'Welcome Dinner' },
      { event_name: 'Rehearsal Dinner' },
    ];

    const seeds = [
      { event_name: 'Welcome Dinner', notes: 'seed version' },
      { event_name: 'Rehearsal Dinner', notes: 'seed version' },
      { event_name: 'Wedding Ceremony', notes: 'seed version' },
    ];

    expect(filterMissingOnboardingEventSeeds(existing, seeds)).toEqual([
      { event_name: 'Wedding Ceremony', notes: 'seed version' },
    ]);
  });
});
