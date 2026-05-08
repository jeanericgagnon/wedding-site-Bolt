import type React from 'react';

import type { Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

interface ApplyAmbiguousRsvpLookupStateOptions {
  guests: Guest[];
  householdGuests?: HouseholdGuest[];
  mealConfig: RSVPMealConfig;
  musicPlaylistUrl?: string | null;
  rsvpDeadline?: string | null;
  rsvpQuestions?: RSVPQuestion[];
  setAmbiguousGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setHouseholdGuests: React.Dispatch<React.SetStateAction<HouseholdGuest[]>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
}

export function applyAmbiguousRsvpLookupState({
  guests,
  householdGuests = [],
  mealConfig,
  musicPlaylistUrl = null,
  rsvpDeadline = null,
  rsvpQuestions = [],
  setAmbiguousGuests,
  setApplyToHousehold,
  setHouseholdGuests,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setSelectedHouseholdGuestIds,
  setStep,
}: ApplyAmbiguousRsvpLookupStateOptions) {
  setAmbiguousGuests(guests);
  setRsvpDeadline(rsvpDeadline);
  setRsvpQuestions(rsvpQuestions);
  setMealConfig(mealConfig);
  setMusicPlaylistUrl(musicPlaylistUrl);
  setHouseholdGuests(householdGuests);
  setApplyToHousehold(householdGuests.length > 0);
  setSelectedHouseholdGuestIds(householdGuests.map((guest) => guest.id));
  setStep('pick');
}
