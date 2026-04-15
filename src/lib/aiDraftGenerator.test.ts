import { describe, expect, it } from 'vitest';
import { generateDraftFromWeddingProfile, mergeGeneratedDraftIntoWeddingData } from './aiDraftGenerator';
import { createEmptyWeddingProfile } from './weddingProfile';

const baseProfile = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
  event: {
    ...createEmptyWeddingProfile().event,
    date: '2027-06-12',
    venueName: 'Grand Estate',
    venueLocation: 'San Diego, CA',
    rsvpDeadline: '2027-05-01',
  },
  story: { ...createEmptyWeddingProfile().story, summary: 'We met in college and kept choosing each other.' },
};

describe('aiDraftGenerator', () => {
  it('generates a usable draft payload from a wedding profile', () => {
    const draft = generateDraftFromWeddingProfile(baseProfile);
    expect(draft.heroTitle).toBe('Alex & Jordan');
    expect(draft.heroSubtitle).toContain('San Diego, CA');
    expect(draft.storyBody).toContain('kept choosing each other');
  });

  it('merges generated draft content into wedding data', () => {
    const merged = mergeGeneratedDraftIntoWeddingData({}, baseProfile);
    expect((merged.couple as Record<string, unknown>).headline).toBe('Alex & Jordan');
    expect((merged.event as Record<string, unknown>).rsvpCallToAction).toContain('2027-05-01');
  });
});
