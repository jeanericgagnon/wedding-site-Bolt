import type { MutableRefObject } from 'react';
import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';
import type { ApplyRsvpSubmitSuccessArgs } from './applyRsvpSubmitSuccess';

type BuildRsvpSubmitSuccessArgs = {
  applyToHousehold: boolean;
  guest: Guest;
  householdGuests: HouseholdGuest[];
  ignoreNextLocalContinuityEventRef: MutableRefObject<boolean>;
  mealConfig: RSVPMealConfig;
  musicPlaylistUrl: string | null;
  normalizedExistingRsvp: ExistingRSVP;
  normalizeSelectedHouseholdGuestIds: ApplyRsvpSubmitSuccessArgs['normalizeSelectedHouseholdGuestIds'];
  notifyRsvpContinuityUpdate: () => void;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSessionToken: string | null;
  selectedGuestIds: string[];
  selectGuest: ApplyRsvpSubmitSuccessArgs['selectGuest'];
  setApplyToHousehold: ApplyRsvpSubmitSuccessArgs['setApplyToHousehold'];
  setSelectedHouseholdGuestIds: ApplyRsvpSubmitSuccessArgs['setSelectedHouseholdGuestIds'];
  setStep: ApplyRsvpSubmitSuccessArgs['setStep'];
  tokenLinkedSession: boolean;
};

export function buildRsvpSubmitSuccessArgs({
  applyToHousehold,
  guest,
  householdGuests,
  ignoreNextLocalContinuityEventRef,
  mealConfig,
  musicPlaylistUrl,
  normalizedExistingRsvp,
  normalizeSelectedHouseholdGuestIds,
  notifyRsvpContinuityUpdate,
  rsvpDeadline,
  rsvpQuestions,
  rsvpSessionToken,
  selectedGuestIds,
  selectGuest,
  setApplyToHousehold,
  setSelectedHouseholdGuestIds,
  setStep,
  tokenLinkedSession,
}: BuildRsvpSubmitSuccessArgs): ApplyRsvpSubmitSuccessArgs {
  return {
    applyToHousehold,
    guest,
    householdGuests,
    mealConfig,
    musicPlaylistUrl,
    normalizedExistingRsvp,
    normalizeSelectedHouseholdGuestIds,
    onContinuityUpdate: () => {
      ignoreNextLocalContinuityEventRef.current = true;
      notifyRsvpContinuityUpdate();
    },
    rsvpDeadline,
    rsvpQuestions,
    rsvpSessionToken,
    selectedGuestIds,
    selectGuest,
    setApplyToHousehold,
    setSelectedHouseholdGuestIds,
    setStep,
    submitSource: tokenLinkedSession ? 'token' : 'manual',
  };
}
