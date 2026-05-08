import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';
import { resetRsvpPageState } from './resetRsvpPageState';

type RsvpFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
};

type SharedResetArgs = {
  setActivePredictionIndex: Dispatch<SetStateAction<number>>;
  setAmbiguousGuests: Dispatch<SetStateAction<Guest[]>>;
  setApplyToHousehold: Dispatch<SetStateAction<boolean>>;
  setCustomAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
  setError: Dispatch<SetStateAction<string>>;
  setExistingRsvp: Dispatch<SetStateAction<ExistingRSVP | null>>;
  setFormData: Dispatch<SetStateAction<RsvpFormData>>;
  setFormStep: Dispatch<SetStateAction<1 | 2 | 3>>;
  setGuest: Dispatch<SetStateAction<Guest | null>>;
  setHouseholdGuests: Dispatch<SetStateAction<HouseholdGuest[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setMealConfig: Dispatch<SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: Dispatch<SetStateAction<string | null>>;
  setRsvpDeadline: Dispatch<SetStateAction<string | null>>;
  setRsvpQuestions: Dispatch<SetStateAction<RSVPQuestion[]>>;
  setRsvpSessionToken: Dispatch<SetStateAction<string | null>>;
  setSearchValue: Dispatch<SetStateAction<string>>;
  setSelectedHouseholdGuestIds: Dispatch<SetStateAction<string[]>>;
  setStep: Dispatch<SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setTokenAutoLoading: Dispatch<SetStateAction<boolean>>;
};

type PrepareRsvpTokenLookupStateArgs = SharedResetArgs & {
  activeLookupRequestRef: MutableRefObject<number>;
  activeSubmitRequestRef: MutableRefObject<number>;
  ignoreNextLocalContinuityEventRef: MutableRefObject<boolean>;
  loadInFlightRef: MutableRefObject<boolean>;
  pendingContinuityRefreshRef: MutableRefObject<boolean>;
  preserveVisibleState: boolean;
  submitInFlightRef: MutableRefObject<boolean>;
  token: string;
  tokenLinkedSessionRef: MutableRefObject<boolean>;
};

type PreparedEmptyLookupState = {
  kind: 'empty';
};

type PreparedActiveLookupState = {
  kind: 'lookup';
  requestId: number;
  shouldPreserveVisibleState: boolean;
};

const TOKEN_LOOKUP_FORM_DATA: RsvpFormData = {
  attending: true,
  attendCeremony: true,
  attendReception: true,
  meal_choice: '',
  plus_one_name: '',
  children_count: 0,
  notes: '',
};

export function prepareRsvpTokenLookupState({
  activeLookupRequestRef,
  activeSubmitRequestRef,
  ignoreNextLocalContinuityEventRef,
  loadInFlightRef,
  pendingContinuityRefreshRef,
  preserveVisibleState,
  setActivePredictionIndex,
  setAmbiguousGuests,
  setApplyToHousehold,
  setCustomAnswers,
  setError,
  setExistingRsvp,
  setFormData,
  setFormStep,
  setGuest,
  setHouseholdGuests,
  setLoading,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setRsvpSessionToken,
  setSearchValue,
  setSelectedHouseholdGuestIds,
  setStep,
  setSubmitting,
  setTokenAutoLoading,
  submitInFlightRef,
  token,
  tokenLinkedSessionRef,
}: PrepareRsvpTokenLookupStateArgs): PreparedActiveLookupState | PreparedEmptyLookupState {
  if (!token) {
    activeLookupRequestRef.current += 1;
    activeSubmitRequestRef.current += 1;
    submitInFlightRef.current = false;
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    tokenLinkedSessionRef.current = false;
    loadInFlightRef.current = false;
    resetRsvpPageState({
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSearchValue,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
      setTokenAutoLoading,
    });
    return { kind: 'empty' };
  }

  const requestId = activeLookupRequestRef.current + 1;
  activeLookupRequestRef.current = requestId;
  activeSubmitRequestRef.current += 1;
  loadInFlightRef.current = true;
  submitInFlightRef.current = false;
  pendingContinuityRefreshRef.current = false;
  ignoreNextLocalContinuityEventRef.current = false;
  const shouldPreserveVisibleState = preserveVisibleState && tokenLinkedSessionRef.current;

  setLoading(false);
  setTokenAutoLoading(!shouldPreserveVisibleState);
  setSubmitting(false);

  if (!shouldPreserveVisibleState) {
    resetRsvpPageState({
      formData: TOKEN_LOOKUP_FORM_DATA,
      searchValue: token,
      setActivePredictionIndex,
      setAmbiguousGuests,
      setApplyToHousehold,
      setCustomAnswers,
      setError,
      setExistingRsvp,
      setFormData,
      setFormStep,
      setGuest,
      setHouseholdGuests,
      setLoading,
      setMealConfig,
      setMusicPlaylistUrl,
      setRsvpDeadline,
      setRsvpQuestions,
      setRsvpSessionToken,
      setSearchValue,
      setSelectedHouseholdGuestIds,
      setStep,
      setSubmitting,
    });
  }

  return {
    kind: 'lookup',
    requestId,
    shouldPreserveVisibleState,
  };
}
