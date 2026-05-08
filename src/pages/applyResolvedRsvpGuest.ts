import type React from 'react';

import { applyRsvpGuestSelection } from './applyRsvpGuestSelection';
import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

type ApplyResolvedRsvpGuestArgs = {
  buildNormalizedRsvpFormData: (
    guest: Guest,
    existingRsvp: ExistingRSVP,
    mealConfig: RSVPMealConfig,
  ) => {
    attending: boolean;
    attendCeremony: boolean;
    attendReception: boolean;
    meal_choice: string;
    plus_one_name: string;
    children_count: number;
    notes: string;
  };
  deriveSelectedHouseholdGuestIds: (existingRsvp: ExistingRSVP | null, householdGuests: HouseholdGuest[]) => string[];
  deadline?: string | null;
  foundGuest: Guest;
  foundRsvp?: ExistingRSVP | null;
  getLegacyTestRsvpSessionToken: (value: unknown) => string | null;
  household?: HouseholdGuest[];
  meal?: RSVPMealConfig;
  musicPlaylistUrl?: string | null;
  normalizeCustomAnswers: (answers: Record<string, string | string[]>) => Record<string, string | string[]>;
  normalizeExistingRsvp: (existingRsvp: ExistingRSVP) => ExistingRSVP;
  questions?: RSVPQuestion[];
  sessionToken?: string | null;
  setActivePredictionIndex: React.Dispatch<React.SetStateAction<number>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setExistingRsvp: React.Dispatch<React.SetStateAction<ExistingRSVP | null>>;
  setFormData: React.Dispatch<React.SetStateAction<{
    attending: boolean;
    attendCeremony: boolean;
    attendReception: boolean;
    meal_choice: string;
    plus_one_name: string;
    children_count: number;
    notes: string;
  }>>;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setGuest: React.Dispatch<React.SetStateAction<Guest | null>>;
  setHouseholdGuests: React.Dispatch<React.SetStateAction<HouseholdGuest[]>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setRsvpSessionToken: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  shouldApplyToHousehold: (existingRsvp: ExistingRSVP, householdGuests: HouseholdGuest[], guestId: string) => boolean;
  source?: 'manual' | 'token';
  tokenLinkedSessionRef: React.MutableRefObject<boolean>;
};

export function applyResolvedRsvpGuest({
  buildNormalizedRsvpFormData,
  deriveSelectedHouseholdGuestIds,
  deadline = null,
  foundGuest,
  foundRsvp = null,
  getLegacyTestRsvpSessionToken,
  household = [],
  meal = { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] },
  musicPlaylistUrl = null,
  normalizeCustomAnswers,
  normalizeExistingRsvp,
  questions = [],
  sessionToken = null,
  setActivePredictionIndex,
  setApplyToHousehold,
  setCustomAnswers,
  setExistingRsvp,
  setFormData,
  setFormStep,
  setGuest,
  setHouseholdGuests,
  setMealConfig,
  setMusicPlaylistUrl,
  setRsvpDeadline,
  setRsvpQuestions,
  setRsvpSessionToken,
  setSelectedHouseholdGuestIds,
  setStep,
  shouldApplyToHousehold,
  source = 'manual',
  tokenLinkedSessionRef,
}: ApplyResolvedRsvpGuestArgs) {
  const normalizedRsvp = foundRsvp ? normalizeExistingRsvp(foundRsvp) : null;
  tokenLinkedSessionRef.current = source === 'token';
  const selectedGuestIds = deriveSelectedHouseholdGuestIds(normalizedRsvp, household);
  const applyToSelectedHousehold = normalizedRsvp
    ? shouldApplyToHousehold(normalizedRsvp, household, foundGuest.id)
    : household.length > 0;

  applyRsvpGuestSelection({
    customAnswers: normalizedRsvp?.custom_answers && typeof normalizedRsvp.custom_answers === 'object'
      ? normalizeCustomAnswers(normalizedRsvp.custom_answers as Record<string, string | string[]>)
      : {},
    deadline,
    existingFormData: normalizedRsvp ? buildNormalizedRsvpFormData(foundGuest, normalizedRsvp, meal) : null,
    foundGuest,
    household,
    meal,
    musicPlaylistUrl,
    normalizedRsvp,
    questions,
    selectedGuestIds,
    sessionToken: sessionToken ?? getLegacyTestRsvpSessionToken(foundGuest),
    setActivePredictionIndex,
    setApplyToHousehold,
    setCustomAnswers,
    setExistingRsvp,
    setFormData,
    setFormStep,
    setGuest,
    setHouseholdGuests,
    setMealConfig,
    setMusicPlaylistUrl,
    setRsvpDeadline,
    setRsvpQuestions,
    setRsvpSessionToken,
    setSelectedHouseholdGuestIds,
    setStep,
    useHouseholdSelection: applyToSelectedHousehold,
  });
}
