import type React from 'react';
import type { applyTokenRsvpLookupResult as ApplyTokenRsvpLookupResultFn } from './applyTokenRsvpLookupResult';
import { RSVP_LOOKUP_ERROR_COPY, type ExistingRSVP, type Guest, type HouseholdGuest, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';
import { lookupRsvpToken } from './lookupRsvpToken';

type DemoLookup = (searchValue: string) => unknown;
type LookupTransport = (body: object) => Promise<{ data?: unknown; error?: string; status?: number }>;

export async function runRsvpTokenLookup({
  activeLookupRequestRef,
  applyTokenRsvpLookupResult,
  callValidateRsvpToken,
  demoLookup,
  loadInFlightRef,
  normalizeRsvpGuestError,
  requestId,
  selectGuest,
  language,
  setAmbiguousGuests,
  setApplyToHousehold,
  setError,
  setHouseholdGuests,
  setLoadCycle,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setSelectedHouseholdGuestIds,
  setStep,
  setTokenAutoLoading,
  shouldPreserveVisibleState,
  token,
  tokenLinkedSessionRef,
  useDemoRsvp,
}: {
  activeLookupRequestRef: React.MutableRefObject<number>;
  applyTokenRsvpLookupResult: typeof ApplyTokenRsvpLookupResultFn;
  callValidateRsvpToken: LookupTransport;
  demoLookup: DemoLookup;
  loadInFlightRef: React.MutableRefObject<boolean>;
  normalizeRsvpGuestError: (value: string | undefined) => string;
  requestId: number;
  language?: string | null;
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
  setLoadCycle: React.Dispatch<React.SetStateAction<number>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  setTokenAutoLoading: React.Dispatch<React.SetStateAction<boolean>>;
  shouldPreserveVisibleState: boolean;
  token: string;
  tokenLinkedSessionRef: React.MutableRefObject<boolean>;
  useDemoRsvp: boolean;
}) {
  try {
    const { data, error } = await lookupRsvpToken({
      callValidateRsvpToken,
      demoLookup,
      language,
      token,
      useDemoRsvp,
    });

    if (activeLookupRequestRef.current !== requestId) return;

    applyTokenRsvpLookupResult({
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
    });
  } catch {
    if (activeLookupRequestRef.current !== requestId) return;
    if (shouldPreserveVisibleState) {
      tokenLinkedSessionRef.current = true;
      return;
    }
    tokenLinkedSessionRef.current = false;
    setError(RSVP_LOOKUP_ERROR_COPY);
  } finally {
    if (activeLookupRequestRef.current === requestId) {
      loadInFlightRef.current = false;
      setTokenAutoLoading(false);
      setLoadCycle((cycle) => cycle + 1);
    }
  }
}
