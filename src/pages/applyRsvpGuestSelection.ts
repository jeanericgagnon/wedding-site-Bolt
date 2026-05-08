import type React from 'react';

import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig, RSVPQuestion } from './rsvpTypes';

interface RsvpFormData {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
}

interface ApplyRsvpGuestSelectionOptions {
  customAnswers: Record<string, string | string[]>;
  deadline?: string | null;
  existingFormData: RsvpFormData | null;
  foundGuest: Guest;
  household?: HouseholdGuest[];
  meal: RSVPMealConfig;
  musicPlaylistUrl?: string | null;
  normalizedRsvp: ExistingRSVP | null;
  questions?: RSVPQuestion[];
  selectedGuestIds: string[];
  sessionToken: string | null;
  setActivePredictionIndex: React.Dispatch<React.SetStateAction<number>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setExistingRsvp: React.Dispatch<React.SetStateAction<ExistingRSVP | null>>;
  setFormData: React.Dispatch<React.SetStateAction<RsvpFormData>>;
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
  useHouseholdSelection: boolean;
}

export function applyRsvpGuestSelection({
  customAnswers,
  deadline = null,
  existingFormData,
  foundGuest,
  household = [],
  meal,
  musicPlaylistUrl = null,
  normalizedRsvp,
  questions = [],
  selectedGuestIds,
  sessionToken,
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
  useHouseholdSelection,
}: ApplyRsvpGuestSelectionOptions) {
  setGuest(foundGuest);
  setRsvpSessionToken(sessionToken);
  setFormStep(1);
  setActivePredictionIndex(-1);
  setRsvpDeadline(deadline);
  setRsvpQuestions(questions);
  setMealConfig(meal);
  setMusicPlaylistUrl(musicPlaylistUrl);
  setHouseholdGuests(household);
  setApplyToHousehold(useHouseholdSelection);
  setSelectedHouseholdGuestIds(useHouseholdSelection ? selectedGuestIds : []);

  if (normalizedRsvp) {
    setExistingRsvp(normalizedRsvp);
    setFormData(existingFormData ?? {
      attending: normalizedRsvp.attending,
      attendCeremony: !!normalizedRsvp.attending_ceremony,
      attendReception: !!normalizedRsvp.attending_reception,
      meal_choice: normalizedRsvp.meal_choice ?? '',
      plus_one_name: normalizedRsvp.plus_one_name ?? '',
      children_count: Number(normalizedRsvp.children_count ?? 0),
      notes: normalizedRsvp.notes ?? '',
    });
    setCustomAnswers(customAnswers);
  } else {
    setExistingRsvp(null);
    setFormData({
      attending: true,
      attendCeremony: !!foundGuest.invited_to_ceremony,
      attendReception: !!foundGuest.invited_to_reception,
      meal_choice: '',
      plus_one_name: '',
      children_count: 0,
      notes: '',
    });
    setCustomAnswers({});
  }

  setStep('form');
}
