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
    expect(draft.countdownTitle).toBe('Alex & Jordan');
    expect(draft.venueTitle).toBe('Venue');
    expect(draft.scheduleTitle).toBe('Schedule');
    expect(draft.galleryTitle).toBe('Photos');
    expect(draft.rsvpTitle).toBe('RSVP');
  });

  it('keeps a minimum quality floor for richer profiles', () => {
    const draft = generateDraftFromWeddingProfile(baseProfile);
    expect(draft.heroTitle.trim().length).toBeGreaterThan(3);
    expect(draft.heroSubtitle).toContain('Join us in');
    expect(draft.heroSubtitle).not.toBe('Join us in our favorite place on our wedding weekend');
    expect(draft.storyBody).not.toBe('Alex & Jordan are so excited to celebrate with the people they love most.');
    expect(draft.eventHeadline).toContain('Grand Estate');
    expect(draft.rsvpCallToAction).toContain('2027-05-01');
    expect(draft.countdownMessage).toContain('San Diego, CA');
    expect(draft.eventHeadline).not.toContain('our wedding weekend');
  });

  it('still returns non-broken homepage copy for sparse profiles', () => {
    const sparse = createEmptyWeddingProfile();
    sparse.couple.displayNames = 'Taylor & Sam';

    const draft = generateDraftFromWeddingProfile(sparse);
    expect(draft.heroTitle).toBe('Taylor & Sam');
    expect(draft.heroSubtitle.trim().length).toBeGreaterThan(10);
    expect(draft.storyBody.trim().length).toBeGreaterThan(20);
    expect(draft.countdownTitle).toBe('Taylor & Sam');
    expect(draft.countdownMessage.trim().length).toBeGreaterThan(15);
    expect(draft.venueTitle).toBe('Venue');
    expect(draft.scheduleTitle).toBe('Schedule');
    expect(draft.galleryTitle).toBe('Photos');
    expect(draft.rsvpTitle).toBe('RSVP');
    expect(draft.rsvpCallToAction.trim().length).toBeGreaterThan(10);
    expect(draft.eventHeadline.trim().length).toBeGreaterThan(10);
  });

  it('merges generated draft content into wedding data', () => {
    const merged = mergeGeneratedDraftIntoWeddingData({}, baseProfile);
    expect((merged.couple as Record<string, unknown>).headline).toBe('Alex & Jordan');
    expect((merged.event as Record<string, unknown>).rsvpCallToAction).toContain('2027-05-01');
  });
});
