import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

export type ApplyRsvpSubmitSuccessArgs = {
  applyToHousehold: boolean;
  guest: Guest;
  householdGuests: HouseholdGuest[];
  musicPlaylistUrl: string | null;
  normalizedExistingRsvp: ExistingRSVP;
  normalizeSelectedHouseholdGuestIds: (guestIds: string[], household: HouseholdGuest[]) => string[];
  onContinuityUpdate: () => void;
  rsvpDeadline: string | null;
  rsvpQuestions: RSVPQuestion[];
  rsvpSessionToken: string | null;
  selectedGuestIds: string[];
  selectGuest: (
    foundGuest: Guest,
    foundRsvp: ExistingRSVP | null,
    deadline?: string | null,
    questions?: RSVPQuestion[],
    meal?: RSVPMealConfig,
    household?: HouseholdGuest[],
    playlistUrl?: string | null,
    source?: 'manual' | 'token',
    sessionToken?: string | null,
  ) => void;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  submitSource: 'manual' | 'token';
  mealConfig: RSVPMealConfig;
};

export function applyRsvpSubmitSuccess({
  applyToHousehold,
  guest,
  householdGuests,
  mealConfig,
  musicPlaylistUrl,
  normalizedExistingRsvp,
  normalizeSelectedHouseholdGuestIds,
  onContinuityUpdate,
  rsvpDeadline,
  rsvpQuestions,
  rsvpSessionToken,
  selectedGuestIds,
  selectGuest,
  setApplyToHousehold,
  setSelectedHouseholdGuestIds,
  setStep,
  submitSource,
}: ApplyRsvpSubmitSuccessArgs) {
  const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(
    selectedGuestIds.filter((id) => id !== guest.id),
    householdGuests,
  );

  selectGuest(
    guest,
    normalizedExistingRsvp,
    rsvpDeadline,
    rsvpQuestions,
    mealConfig,
    householdGuests,
    musicPlaylistUrl,
    submitSource,
    rsvpSessionToken,
  );
  setApplyToHousehold(applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0);
  setSelectedHouseholdGuestIds(applyToHousehold ? normalizedSelectedHouseholdGuestIds : []);
  onContinuityUpdate();
  setStep('success');
}
