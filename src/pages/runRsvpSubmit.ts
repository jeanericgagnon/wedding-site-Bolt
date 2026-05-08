import type React from 'react';

import type { applyRsvpSubmitSuccess as ApplyRsvpSubmitSuccessFn } from './applyRsvpSubmitSuccess';
import type { buildRsvpSubmitSuccessArgs as BuildRsvpSubmitSuccessArgsFn } from './buildRsvpSubmitSuccessArgs';
import { RSVP_SUBMIT_ERROR_COPY, type ExistingRSVP, type Guest, type HouseholdGuest, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';

type RsvpFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
};

export async function runRsvpSubmit({
  activeSubmitRequestRef,
  applyDemoRsvpSubmit,
  applyRsvpSubmitSuccess,
  applyToHousehold,
  buildNormalizedExistingRsvp,
  buildRsvpSubmitPayload,
  buildRsvpSubmitSuccessArgs,
  customAnswers,
  dedupeGuestIds,
  existingRsvp,
  formData,
  guest,
  householdGuests,
  ignoreNextLocalContinuityEventRef,
  mealConfig,
  musicPlaylistUrl,
  normalizeCustomAnswers,
  normalizeRsvpSubmitError,
  normalizeSelectedHouseholdGuestIds,
  notifyRsvpContinuityUpdate,
  requestId,
  rsvpDeadline,
  rsvpQuestions,
  rsvpSessionToken,
  selectGuest,
  selectedHouseholdGuestIds,
  setApplyToHousehold,
  setError,
  setLoading,
  setSelectedHouseholdGuestIds,
  setStep,
  setSubmitting,
  submitInFlightRef,
  submitRsvpResponse,
  tokenLinkedSession,
  useDemoRsvp,
  validateRsvpSubmitReadiness,
}: {
  activeSubmitRequestRef: React.MutableRefObject<number>;
  applyDemoRsvpSubmit: (args: { payload: ExistingRSVP; targetGuestIds: string[] }) => void;
  applyRsvpSubmitSuccess: typeof ApplyRsvpSubmitSuccessFn;
  applyToHousehold: boolean;
  buildNormalizedExistingRsvp: (formData: RsvpFormData, customAnswers: Record<string, string | string[]>, id: string, guestIds?: string[]) => ExistingRSVP;
  buildRsvpSubmitPayload: (args: {
    applyToHousehold: boolean;
    buildNormalizedExistingRsvp: (formData: RsvpFormData, customAnswers: Record<string, string | string[]>, id: string, guestIds?: string[]) => ExistingRSVP;
    customAnswers: Record<string, string | string[]>;
    dedupeGuestIds: (guestIds: string[]) => string[];
    existingRsvpId: string;
    formData: RsvpFormData;
    guestId: string;
    normalizeCustomAnswers: (answers: Record<string, string | string[]>) => Record<string, string | string[]>;
    selectedHouseholdGuestIds: string[];
  }) => {
    childrenCount: number;
    mealChoice: string;
    normalizedCustomAnswers: Record<string, string | string[]>;
    normalizedExistingRsvp: ExistingRSVP;
    notes: string;
    plusOneCount: number;
    plusOneName: string;
    targetGuestIds: string[];
  };
  buildRsvpSubmitSuccessArgs: typeof BuildRsvpSubmitSuccessArgsFn;
  customAnswers: Record<string, string | string[]>;
  dedupeGuestIds: (guestIds: string[]) => string[];
  existingRsvp: ExistingRSVP | null;
  formData: RsvpFormData;
  guest: Guest | null;
  householdGuests: HouseholdGuest[];
  ignoreNextLocalContinuityEventRef: React.MutableRefObject<boolean>;
  mealConfig: RSVPMealConfig;
  musicPlaylistUrl: string | null;
  normalizeCustomAnswers: (answers: Record<string, string | string[]>) => Record<string, string | string[]>;
  normalizeRsvpSubmitError: (message?: string | null) => string;
  normalizeSelectedHouseholdGuestIds: (guestIds: string[], household: HouseholdGuest[]) => string[];
  notifyRsvpContinuityUpdate: () => void;
  requestId: number;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSessionToken: string | null;
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
  selectedHouseholdGuestIds: string[];
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  submitInFlightRef: React.MutableRefObject<boolean>;
  submitRsvpResponse: (args: {
    applyToHousehold: boolean;
    attending: boolean;
    attendCeremony: boolean;
    attendReception: boolean;
    childrenCount: number;
    customAnswers: Record<string, string | string[]>;
    guestId: string;
    mealChoice: string | null;
    notes: string | null;
    plusOneCount: number;
    plusOneName: string | null;
    rsvpSession: string | null;
    targetGuestIds: string[];
  }) => Promise<{ error?: string; submitSucceeded: boolean }>;
  tokenLinkedSession: boolean;
  useDemoRsvp: boolean;
  validateRsvpSubmitReadiness: (args: {
    applyToHousehold: boolean;
    deadlinePassed: boolean;
    existingRsvpPresent: boolean;
    formData: RsvpFormData;
    guest: Guest | null;
    householdGuestCount: number;
    rsvpSessionToken: string | null;
    selectedHouseholdGuestCount: number;
  }) => string | null | 'missing-guest';
}) {
  try {
    const deadlinePassed = !!rsvpDeadline && Number.isFinite(Date.parse(rsvpDeadline)) && new Date(rsvpDeadline).getTime() < Date.now();
    const submitReadinessError = validateRsvpSubmitReadiness({
      applyToHousehold,
      deadlinePassed,
      existingRsvpPresent: !!existingRsvp,
      formData,
      guest,
      householdGuestCount: householdGuests.length,
      rsvpSessionToken,
      selectedHouseholdGuestCount: selectedHouseholdGuestIds.length,
    });

    if (submitReadinessError === 'missing-guest') return;

    if (submitReadinessError) {
      if (activeSubmitRequestRef.current !== requestId) return;
      setError(submitReadinessError);
      return;
    }

    if (!guest) return;

    const submitPayload = buildRsvpSubmitPayload({
      applyToHousehold,
      buildNormalizedExistingRsvp,
      customAnswers,
      dedupeGuestIds,
      existingRsvpId: existingRsvp?.id ?? 'submitted-rsvp',
      formData,
      guestId: guest.id,
      normalizeCustomAnswers,
      selectedHouseholdGuestIds,
    });

    if (useDemoRsvp) {
      const targetIds = submitPayload.targetGuestIds;
      const payload = buildNormalizedExistingRsvp(formData, customAnswers, `demo-rsvp-${guest.id}`, targetIds);
      applyDemoRsvpSubmit({ payload, targetGuestIds: targetIds });
      if (activeSubmitRequestRef.current !== requestId) return;
      applyRsvpSubmitSuccess(buildRsvpSubmitSuccessArgs({
        applyToHousehold,
        guest,
        householdGuests,
        ignoreNextLocalContinuityEventRef,
        mealConfig,
        musicPlaylistUrl,
        normalizedExistingRsvp: payload,
        normalizeSelectedHouseholdGuestIds,
        notifyRsvpContinuityUpdate,
        rsvpDeadline,
        rsvpQuestions,
        rsvpSessionToken,
        selectedGuestIds: targetIds,
        selectGuest,
        setApplyToHousehold,
        setSelectedHouseholdGuestIds,
        setStep,
        tokenLinkedSession,
      }));
      return;
    }

    const { error: err, submitSucceeded } = await submitRsvpResponse({
      applyToHousehold,
      attending: formData.attending,
      attendCeremony: formData.attendCeremony,
      attendReception: formData.attendReception,
      childrenCount: submitPayload.childrenCount,
      customAnswers: submitPayload.normalizedCustomAnswers,
      guestId: guest.id,
      mealChoice: submitPayload.mealChoice || null,
      notes: submitPayload.notes || null,
      plusOneCount: submitPayload.plusOneCount,
      plusOneName: submitPayload.plusOneName || null,
      rsvpSession: rsvpSessionToken,
      targetGuestIds: submitPayload.targetGuestIds,
    });

    if (err || !submitSucceeded) {
      if (activeSubmitRequestRef.current !== requestId) return;
      setError(normalizeRsvpSubmitError(err));
      return;
    }

    if (activeSubmitRequestRef.current !== requestId) return;
    applyRsvpSubmitSuccess(buildRsvpSubmitSuccessArgs({
      applyToHousehold,
      guest,
      householdGuests,
      ignoreNextLocalContinuityEventRef,
      mealConfig,
      musicPlaylistUrl,
      normalizedExistingRsvp: submitPayload.normalizedExistingRsvp,
      normalizeSelectedHouseholdGuestIds,
      notifyRsvpContinuityUpdate,
      rsvpDeadline,
      rsvpQuestions,
      rsvpSessionToken,
      selectedGuestIds: submitPayload.targetGuestIds,
      selectGuest,
      setApplyToHousehold,
      setSelectedHouseholdGuestIds,
      setStep,
      tokenLinkedSession,
    }));
  } catch {
    if (activeSubmitRequestRef.current !== requestId) return;
    setError(RSVP_SUBMIT_ERROR_COPY);
  } finally {
    if (activeSubmitRequestRef.current === requestId) {
      submitInFlightRef.current = false;
      setLoading(false);
      setSubmitting(false);
    }
  }
}
