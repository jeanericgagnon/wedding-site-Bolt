import type React from 'react';

import { RSVP_LOOKUP_ERROR_COPY, type ExistingRSVP, type Guest, type HouseholdGuest, type LookupResponse, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';
import { applyAmbiguousRsvpLookupState } from './applyAmbiguousRsvpLookupState';
import { classifyRsvpLookupResponse } from './classifyRsvpLookupResponse';

type ApplyTokenRsvpLookupResultArgs = {
  data?: unknown;
  error?: string;
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
  shouldPreserveVisibleState: boolean;
  tokenLinkedSessionRef: React.MutableRefObject<boolean>;
};

export function applyTokenRsvpLookupResult({
  data,
  error,
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
  shouldPreserveVisibleState,
  tokenLinkedSessionRef,
}: ApplyTokenRsvpLookupResultArgs) {
  if (error || !data) {
    if (shouldPreserveVisibleState) {
      tokenLinkedSessionRef.current = true;
      return;
    }
    tokenLinkedSessionRef.current = false;
    setError(normalizeRsvpGuestError(error));
    return;
  }

  const resolution = classifyRsvpLookupResponse(data as LookupResponse);

  if (resolution.kind === 'guest') {
    selectGuest(
      resolution.guest,
      resolution.existingRsvp,
      resolution.rsvpDeadline,
      resolution.rsvpQuestions,
      resolution.mealConfig,
      resolution.householdGuests,
      resolution.musicPlaylistUrl,
      'token',
      resolution.rsvpSession,
    );
    return;
  }

  if (resolution.kind === 'ambiguous') {
    if (shouldPreserveVisibleState) {
      tokenLinkedSessionRef.current = true;
      return;
    }
    tokenLinkedSessionRef.current = false;
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

  if (shouldPreserveVisibleState) {
    tokenLinkedSessionRef.current = true;
    return;
  }
  tokenLinkedSessionRef.current = false;
  setError(RSVP_LOOKUP_ERROR_COPY);
}
