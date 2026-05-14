import type React from 'react';

import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';
import { DEFAULT_MEAL_CONFIG } from './rsvpTypes';
import { lookupRsvpGuest } from './lookupRsvpGuest';

type DemoLookup = (searchValue: string) => unknown;
type LookupTransport = (body: object) => Promise<{ data?: unknown; error?: string; status?: number }>;

export async function runRsvpGuestLookup({
  activeLookupRequestRef,
  applyManualRsvpLookupResult,
  callValidateRsvpToken,
  demoLookup,
  fallbackGuest,
  lookupErrorMessage = 'Something interrupted the search. Please try again.',
  guestId,
  language,
  lookupSource,
  normalizeRsvpGuestError,
  requestId,
  rsvpSessionToken,
  searchValue,
  selectGuest,
  setAmbiguousGuests,
  setApplyToHousehold,
  setError,
  setHouseholdGuests,
  setLoading,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setSelectedHouseholdGuestIds,
  setStep,
  useDemoRsvp,
}: {
  activeLookupRequestRef: React.MutableRefObject<number>;
  applyManualRsvpLookupResult: (args: {
    data?: unknown;
    error?: string;
    fallbackGuest?: Guest;
    normalizeRsvpGuestError: (value: string | undefined) => string;
    selectGuest: (
      foundGuest: Guest,
      foundRsvp?: ExistingRSVP | null,
      deadline?: string | null,
      questions?: RSVPQuestion[],
      meal?: RSVPMealConfig,
      household?: HouseholdGuest[],
      playlistUrl?: string | null,
      source?: 'manual' | 'token',
      sessionToken?: string | null,
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
  }) => void;
  callValidateRsvpToken: LookupTransport;
  demoLookup: DemoLookup;
  fallbackGuest?: Guest;
  guestId?: string;
  language?: string | null;
  lookupErrorMessage?: string;
  lookupSource: 'search' | 'pick';
  normalizeRsvpGuestError: (value: string | undefined) => string;
  requestId: number;
  rsvpSessionToken?: string | null;
  searchValue?: string;
  selectGuest: (
    foundGuest: Guest,
    foundRsvp?: ExistingRSVP | null,
    deadline?: string | null,
    questions?: RSVPQuestion[],
    meal?: RSVPMealConfig,
    household?: HouseholdGuest[],
    playlistUrl?: string | null,
    source?: 'manual' | 'token',
    sessionToken?: string | null,
  ) => void;
  setAmbiguousGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setHouseholdGuests: React.Dispatch<React.SetStateAction<HouseholdGuest[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  useDemoRsvp: boolean;
}) {
  try {
    const lookupResp = await lookupRsvpGuest({
      callValidateRsvpToken,
      demoLookup,
      guestId,
      language,
      rsvpSessionToken,
      searchValue,
      useDemoRsvp,
    });

    if (activeLookupRequestRef.current !== requestId) return;

    applyManualRsvpLookupResult({
      data: lookupResp.data,
      error: lookupResp.error,
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
    });
  } catch {
    if (activeLookupRequestRef.current !== requestId) return;
    if (lookupSource === 'pick' && fallbackGuest) {
      selectGuest(fallbackGuest, null, null, [], DEFAULT_MEAL_CONFIG, [], null);
      return;
    }
    setError(lookupErrorMessage);
  } finally {
    if (activeLookupRequestRef.current === requestId) {
      setLoading(false);
    }
  }
}
