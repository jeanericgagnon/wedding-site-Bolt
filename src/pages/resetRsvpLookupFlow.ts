import type React from 'react';

import { DEFAULT_MEAL_CONFIG, type ExistingRSVP, type Guest, type HouseholdGuest, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';

interface ResetRsvpLookupFlowOptions {
  invalidateActiveSubmit: () => void;
  searchValue?: string;
  setActivePredictionIndex: React.Dispatch<React.SetStateAction<number>>;
  setAmbiguousGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
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
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setRsvpSessionToken?: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchValue?: React.Dispatch<React.SetStateAction<string>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}

export function resetRsvpLookupFlow({
  invalidateActiveSubmit,
  searchValue,
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
}: ResetRsvpLookupFlowOptions) {
  invalidateActiveSubmit();
  setLoading(true);
  setSubmitting(false);
  setActivePredictionIndex(-1);
  setError('');
  setStep('search');
  setGuest(null);
  setRsvpSessionToken?.(null);
  setExistingRsvp(null);
  setAmbiguousGuests([]);
  setRsvpDeadline(null);
  setMusicPlaylistUrl(null);
  setFormData({
    attending: true,
    attendCeremony: false,
    attendReception: false,
    meal_choice: '',
    plus_one_name: '',
    children_count: 0,
    notes: '',
  });
  setCustomAnswers({});
  setRsvpQuestions([]);
  setMealConfig(DEFAULT_MEAL_CONFIG);
  setHouseholdGuests([]);
  setApplyToHousehold(true);
  setSelectedHouseholdGuestIds([]);
  setFormStep(1);
  if (setSearchValue && typeof searchValue === 'string') {
    setSearchValue(searchValue);
  }
}
