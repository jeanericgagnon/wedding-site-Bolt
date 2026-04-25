import { describe, expect, it } from 'vitest';
import {
  buildItinerarySeedFromStructuredEvents,
  buildRsvpEventSeedFromStructuredEvents,
  applyInitialSetupAnswersToWeddingProfile,
} from './weddingProfile';

describe('weekend event seed pipeline', () => {
  it('parses weekend events, preserves locations, and derives dated itinerary seeds', () => {
    const profile = applyInitialSetupAnswersToWeddingProfile({
      names: 'Eric & Kara',
      labelPreference: 'bride-groom',
      whenWhere: '2027-01-17 — Sayulita, Mexico',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'tropical relaxed',
      weekendEventsRaw: 'Friday pickleball tournament, Friday welcome dinner, Saturday rehearsal dinner, Sunday wedding',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      childrenAllowed: 'unsure',
      rsvpDeadline: '2026-10-17',
      mealChoice: 'yes',
      registryIntent: 'unsure',
      optionalStory: 'We met on Hinge and finally met for real after a concert idea turned into an actual plan.',
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
    expect(itinerarySeeds[0].dress_code).toBeNull();
    expect(rsvpSeeds[2].label).toBe('rehearsal dinner');
    expect(rsvpSeeds[2].locationName).toBe('Casa Rosada');
    expect(rsvpSeeds.every((event) => event.rsvpEnabled)).toBe(true);
  });

  it('drops invalid wedding dates instead of seeding bogus itinerary dates', () => {
    const profile = applyInitialSetupAnswersToWeddingProfile({
      names: 'Eric & Kara',
      labelPreference: 'bride-groom',
      whenWhere: '2027-01-17 — Sayulita, Mexico',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'tropical relaxed',
      weekendEventsRaw: 'Friday welcome dinner, Sunday wedding',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      childrenAllowed: 'unsure',
      rsvpDeadline: '2026-10-17',
      mealChoice: 'yes',
      registryIntent: 'unsure',
      optionalStory: 'We met on Hinge and finally met for real after a concert idea turned into an actual plan.',
    });

    profile.event.date = 'not-a-date';

    const itinerarySeeds = buildItinerarySeedFromStructuredEvents(profile);

    expect(itinerarySeeds.map((event) => event.event_date)).toEqual([null, null]);
  });

  it('drops impossible persisted wedding dates instead of rolling them into fake itinerary dates', () => {
    const profile = applyInitialSetupAnswersToWeddingProfile({
      names: 'Eric & Kara',
      labelPreference: 'bride-groom',
      whenWhere: '2027-01-17 — Sayulita, Mexico',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'tropical relaxed',
      weekendEventsRaw: 'Friday welcome dinner, Sunday wedding',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      childrenAllowed: 'unsure',
      rsvpDeadline: '2026-10-17',
      mealChoice: 'yes',
      registryIntent: 'unsure',
      optionalStory: 'We met on Hinge and finally met for real after a concert idea turned into an actual plan.',
    });

    profile.event.date = '2027-02-30';

    const itinerarySeeds = buildItinerarySeedFromStructuredEvents(profile);

    expect(itinerarySeeds.map((event) => event.event_date)).toEqual([null, null]);
  });
});
