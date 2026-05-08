import type React from 'react';

import { DEFAULT_MEAL_CONFIG, RSVP_LOOKUP_ERROR_COPY, type ExistingRSVP, type Guest, type HouseholdGuest, type LookupResponse, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';
import { applyAmbiguousRsvpLookupState } from './applyAmbiguousRsvpLookupState';
import { classifyRsvpLookupResponse } from './classifyRsvpLookupResponse';

type ApplyManualRsvpLookupResultArgs = {
  data?: unknown;
  error?: string;
  fallbackGuest?: Guest;
  normalizeRsvpGuestError: (value: string | undefined) => string;
  selectGuest: (
    guest: Guest,
    existingRsvp?: ExistingRSVP | null,
    deadline?: string | null,
    questions?: RSVPQuestion[],
    mealConfig?: RSVPMealConfig,
    householdGuests?: HouseholdGuest[],
    musicPlaylistUrl?: string | null,
    source?: 'manual' | 'token',
    rsvpSession?: string | null,
  ) => void;
  setAmbiguousGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setHouseholdGuests: React.Dispatch<React.SetStateAction<HouseholdGuest[]>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
};

export function applyManualRsvpLookupResult({
  data,
  error,
  fallbackGuest,
  normalizeRsvpGuestError,
  selectGuest,
  setAmbiguousGuests,
  setApplyToHousehold,
  setError,
  setHouseholdGuests,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setSelectedHouseholdGuestIds,
  setStep,
}: ApplyManualRsvpLookupResultArgs) {
  if (error || !data) {
    if (fallbackGuest) {
      selectGuest(fallbackGuest, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
      return;
    }
    setError(normalizeRsvpGuestError(error));
    return;
  }

  const resolution = classifyRsvpLookupResponse(data as LookupResponse);

  if (resolution.kind === 'ambiguous') {
    if (fallbackGuest) {
      selectGuest(fallbackGuest, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
      return;
    }
    applyAmbiguousRsvpLookupState({
      guests: resolution.guests,
      householdGuests: resolution.householdGuests,
      mealConfig: resolution.mealConfig,
      musicPlaylistUrl: resolution.musicPlaylistUrl,
      rsvpDeadline: resolution.rsvpDeadline,
      rsvpQuestions: resolution.rsvpQuestions,
      setAmbiguousGuests,
      setApplyToHousehold,
      setHouseholdGuests,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setSelectedHouseholdGuestIds,
      setStep,
    });
    return;
  }

  if (resolution.kind === 'guest') {
    selectGuest(
      resolution.guest,
      resolution.existingRsvp,
      resolution.rsvpDeadline,
      resolution.rsvpQuestions,
      resolution.mealConfig,
      resolution.householdGuests,
      resolution.musicPlaylistUrl,
      'manual',
      resolution.rsvpSession,
    );
    return;
  }

  if (fallbackGuest) {
    selectGuest(fallbackGuest, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
    return;
  }

  setError(RSVP_LOOKUP_ERROR_COPY);
}
