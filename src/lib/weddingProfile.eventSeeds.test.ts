import { describe, expect, it } from 'vitest';
import {
  buildItinerarySeedFromStructuredEvents,
  buildRsvpEventSeedFromStructuredEvents,
  onboardingFormToProfile,
} from './weddingProfile';

describe('weekend event seed pipeline', () => {
  it('parses weekend events, preserves locations, and derives dated itinerary seeds', () => {
    const profile = onboardingFormToProfile({
      partnerNames: 'Eric & Kara',
      partnerLabels: 'groom|bride',
      weddingDate: '2027-01-17',
      venueName: 'Amor Boutique Hotel',
      venueLocation: 'Sayulita, Mexico',
      story: 'We met on Hinge and finally met for real after a concert idea turned into an actual plan.',
      guestExperience: 'Relaxed, warm, cheerful.',
      weekendEvents: 'Friday pickleball tournament, Friday welcome dinner, Saturday rehearsal dinner, Sunday wedding',
      extraGuestNotes: 'Dress code is tropical formal.',
      rsvpDeadline: '2026-10-17',
      registryLink: 'Coming soon',
      theme: 'tropical relaxed',
    });

    profile.event.structuredWeekendEvents[0].locationName = 'Narwhal Pickleball Club';
    profile.event.structuredWeekendEvents[1].locationName = 'Amor Boutique Hotel';
    profile.event.structuredWeekendEvents[2].locationName = 'Casa Rosada';
    profile.event.structuredWeekendEvents[3].locationName = 'Amor Boutique Hotel';

    const itinerarySeeds = buildItinerarySeedFromStructuredEvents(profile);
    const rsvpSeeds = buildRsvpEventSeedFromStructuredEvents(profile);

    expect(profile.event.structuredWeekendEvents).toHaveLength(4);
    expect(profile.event.structuredWeekendEvents.map((event) => event.title)).toEqual([
      'pickleball tournament',
      'welcome dinner',
      'rehearsal dinner',
      'wedding',
    ]);

    expect(itinerarySeeds.map((event) => event.event_date)).toEqual([
      '2027-01-15',
      '2027-01-15',
      '2027-01-16',
      '2027-01-17',
    ]);
    expect(itinerarySeeds[0].location_name).toBe('Narwhal Pickleball Club');
    expect(itinerarySeeds[0].dress_code).toBe('Tropical formal');
    expect(rsvpSeeds[2].label).toBe('rehearsal dinner');
    expect(rsvpSeeds[2].locationName).toBe('Casa Rosada');
    expect(rsvpSeeds.every((event) => event.rsvpEnabled)).toBe(true);
  });
});
