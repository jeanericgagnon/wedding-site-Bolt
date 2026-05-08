import { DEFAULT_MEAL_CONFIG, type ExistingRSVP, type Guest, type HouseholdGuest, type LookupResponse, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';

interface BaseLookupResolution {
  existingRsvp: ExistingRSVP | null;
  householdGuests: HouseholdGuest[];
  mealConfig: RSVPMealConfig;
  musicPlaylistUrl: string | null;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSession: string | null;
}

export type RsvpLookupResolution =
  | ({ kind: 'guest'; guest: Guest } & BaseLookupResolution)
  | ({ kind: 'ambiguous'; guests: Guest[] } & BaseLookupResolution)
  | { kind: 'not_found' };

export function classifyRsvpLookupResponse(result: LookupResponse): RsvpLookupResolution {
  const shared = {
    existingRsvp: result.existingRsvp,
    householdGuests: result.householdGuests ?? [],
    mealConfig: result.rsvpMealConfig ?? DEFAULT_MEAL_CONFIG,
    musicPlaylistUrl: result.musicPlaylistUrl ?? null,
    rsvpDeadline: result.rsvpDeadline,
    rsvpQuestions: result.rsvpQuestions ?? [],
    rsvpSession: result.rsvpSession ?? null,
  };

  if (result.guest) {
    return {
      kind: 'guest',
      guest: result.guest,
      ...shared,
    };
  }

  if (result.guests?.length === 1) {
    return {
      kind: 'guest',
      guest: result.guests[0],
      ...shared,
    };
  }

  if (result.guests && result.guests.length > 1) {
    return {
      kind: 'ambiguous',
      guests: result.guests,
      ...shared,
    };
  }

  return { kind: 'not_found' };
}
