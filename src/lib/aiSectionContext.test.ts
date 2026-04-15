import { describe, expect, it } from 'vitest';
import { createEmptyWeddingProfile } from './weddingProfile';
import { buildSectionPromptPayloads } from './aiSectionContext';

describe('aiSectionContext', () => {
  it('uses light-fill for sparse registry/travel shaping', () => {
    const profile = createEmptyWeddingProfile();
    profile.couple.displayNames = 'Taylor & Sam';

    const payloads = buildSectionPromptPayloads(profile);
    expect(payloads.registryIntro.mode).toBe('light-fill');
    expect(payloads.travelIntro.mode).toBe('light-fill');
    expect(payloads.storyBody.mode).toBe('light-fill');
  });

  it('uses fill mode when richer section context exists', () => {
    const profile = createEmptyWeddingProfile();
    profile.couple.displayNames = 'Alex & Jordan';
    profile.story.summary = 'We met in college.';
    profile.event.venueLocation = 'San Diego, CA';
    profile.registry.url = 'https://registry.example.com';
    profile.guestExperience.travelSupportLevel = 'high';

    const payloads = buildSectionPromptPayloads(profile);
    expect(payloads.registryIntro.mode).toBe('fill');
    expect(payloads.faqIntro.mode).toBe('fill');
    expect(payloads.travelIntro.mode).toBe('fill');
    expect(payloads.accommodationsIntro.mode).toBe('fill');
    expect(payloads.storyBody.mode).toBe('fill');
    expect(payloads.weddingPartyIntro.mode).toBe('fill');
    expect(payloads.rsvpCallToAction.mode).toBe('light-fill');
    expect(payloads.directionsIntro.mode).toBe('fill');
  });

  it('uses fill mode for RSVP when a deadline exists', () => {
    const profile = createEmptyWeddingProfile();
    profile.event.rsvpDeadline = '2027-05-01';

    const payloads = buildSectionPromptPayloads(profile);
    expect(payloads.rsvpCallToAction.mode).toBe('fill');
  });
});
