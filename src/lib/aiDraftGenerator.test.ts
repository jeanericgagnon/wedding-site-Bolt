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
  it('generates a usable draft payload from a wedding profile', async () => {
    const draft = await generateDraftFromWeddingProfile(baseProfile);
    expect(draft.heroTitle).toBe('Alex & Jordan');
    expect(draft.heroSubtitle).toContain('San Diego, CA');
    expect(draft.storyBody).toContain('kept choosing each other');
    expect(draft.countdownTitle).toBe('Alex & Jordan');
    expect(draft.venueTitle).toBe('Venue Details');
    expect(draft.venueIntro.length).toBeGreaterThan(10);
    expect(draft.scheduleTitle).toBe('The Plan');
    expect(draft.scheduleIntro.length).toBeGreaterThan(10);
    expect(draft.galleryTitle).toBe('Moments to Remember');
    expect(draft.galleryIntro.length).toBeGreaterThan(10);
    expect(draft.rsvpTitle).toBe('Will You Be There?');
    expect(draft.rsvpIntro.length).toBeGreaterThan(10);
    expect(draft.registryIntro).toContain('gift enough');
    expect(draft.faqIntro).toContain('quick answers');
    expect(draft.travelIntro).toContain('San Diego, CA');
    expect(draft.accommodationsIntro).toContain('nearby places');
    expect(draft.dressCodeIntro).toContain('choose something that feels right');
    expect(draft.contactIntro).toContain('happy to help');
    expect(draft.directionsIntro).toContain('San Diego, CA');
    expect(draft.weddingPartyIntro).toContain('part of our story');
  });

  it('keeps a minimum quality floor for richer profiles', async () => {
    const draft = await generateDraftFromWeddingProfile(baseProfile);
    expect(draft.heroTitle.trim().length).toBeGreaterThan(3);
    expect(draft.heroSubtitle).toContain('Join us in');
    expect(draft.heroSubtitle).not.toBe('Join us in our favorite place on our wedding weekend');
    expect(draft.storyBody).not.toBe('Alex & Jordan are so excited to celebrate with the people they love most.');
    expect(draft.eventHeadline).toContain('Grand Estate');
    expect(draft.rsvpCallToAction).toContain('2027-05-01');
    expect(draft.countdownMessage).toContain('San Diego, CA');
    expect(draft.eventHeadline).not.toContain('our wedding weekend');
  });

  it('still returns non-broken homepage copy for sparse profiles', async () => {
    const sparse = createEmptyWeddingProfile();
    sparse.couple.displayNames = 'Taylor & Sam';

    const draft = await generateDraftFromWeddingProfile(sparse);
    expect(draft.heroTitle).toBe('Taylor & Sam');
    expect(draft.heroSubtitle.trim().length).toBeGreaterThan(10);
    expect(draft.storyBody.trim().length).toBeGreaterThan(20);
    expect(draft.countdownTitle).toBe('Taylor & Sam');
    expect(draft.countdownMessage.trim().length).toBeGreaterThan(15);
    expect(draft.venueTitle).toBe('Venue Details');
    expect(draft.venueIntro.trim().length).toBeGreaterThan(10);
    expect(draft.scheduleTitle).toBe('The Plan');
    expect(draft.scheduleIntro.trim().length).toBeGreaterThan(10);
    expect(draft.galleryTitle).toBe('Moments to Remember');
    expect(draft.galleryIntro.trim().length).toBeGreaterThan(10);
    expect(draft.rsvpTitle).toBe('Will You Be There?');
    expect(draft.rsvpIntro.trim().length).toBeGreaterThan(10);
    expect(draft.rsvpCallToAction.trim().length).toBeGreaterThan(10);
    expect(draft.eventHeadline.trim().length).toBeGreaterThan(10);
    expect(draft.registryIntro).toContain('gift enough');
    expect(draft.faqIntro).toContain('quick answers');
    expect(draft.travelIntro).toContain('planning details');
    expect(draft.accommodationsIntro).toContain('nearby places');
    expect(draft.dressCodeIntro).toContain('choose something that feels right');
    expect(draft.contactIntro).toContain('happy to help');
    expect(draft.directionsIntro).toContain('find your way');
    expect(draft.weddingPartyIntro).toContain('lucky to have beside us');
  });

  it('drops impossible persisted profile dates instead of leaking fake deterministic draft truth', async () => {
    const profile = {
      ...baseProfile,
      event: {
        ...baseProfile.event,
        date: '2027-02-30',
        rsvpDeadline: '2027-02-31',
      },
    };

    const draft = await generateDraftFromWeddingProfile(profile);

    expect(draft.heroSubtitle).toContain('our celebration weekend');
    expect(draft.heroSubtitle).not.toContain('2027-02-30');
    expect(draft.eventHeadline).toContain('San Diego, CA');
    expect(draft.eventHeadline).not.toContain('2027-02-30');
    expect(draft.rsvpCallToAction).toBe('We would love to hear from you');
  });

  it('keeps sparse fallback rails against placeholder-like event copy', async () => {
    const sparse = createEmptyWeddingProfile();
    sparse.couple.displayNames = 'Taylor & Sam';

    const draft = await generateDraftFromWeddingProfile(sparse);
    expect(draft.eventHeadline).not.toContain('[');
    expect(draft.eventHeadline).not.toMatch(/to be confirmed/i);
    expect(draft.eventHeadline).not.toMatch(/details will be updated/i);
  });

  it('merges generated draft content into wedding data', async () => {
    const merged = await mergeGeneratedDraftIntoWeddingData({}, baseProfile);
    expect((merged.couple as Record<string, unknown>).headline).toBe('Alex & Jordan');
    expect((merged.event as Record<string, unknown>).rsvpCallToAction).toContain('2027-05-01');
  });

  it('reuses a supplied generated draft instead of generating a second onboarding draft', async () => {
    const generated = await generateDraftFromWeddingProfile(baseProfile);
    const merged = await mergeGeneratedDraftIntoWeddingData({}, baseProfile, {
      ...generated,
      heroTitle: 'One generated draft only',
      heroSubtitle: 'Reused without another generation pass',
      storyBody: 'This copy came from the already generated draft.',
      eventHeadline: 'Already generated event line',
      rsvpCallToAction: 'Already generated RSVP line',
    });

    expect((merged.couple as Record<string, unknown>).headline).toBe('One generated draft only');
    expect((merged.couple as Record<string, unknown>).subheadline).toBe('Reused without another generation pass');
    expect((merged.couple as Record<string, unknown>).story).toBe('This copy came from the already generated draft.');
    expect((merged.event as Record<string, unknown>).headline).toBe('Already generated event line');
    expect((merged.event as Record<string, unknown>).rsvpCallToAction).toBe('Already generated RSVP line');
  });
});
