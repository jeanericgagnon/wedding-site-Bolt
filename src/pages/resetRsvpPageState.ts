import { DEFAULT_MEAL_CONFIG, type ExistingRSVP, type Guest, type HouseholdGuest, type RSVPMealConfig, type RSVPQuestion } from './rsvpTypes';

type RsvpFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
};

type ResetRsvpPageStateArgs = {
  formData?: RsvpFormData;
  searchValue?: string;
  setActivePredictionIndex: React.Dispatch<React.SetStateAction<number>>;
  setAmbiguousGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setExistingRsvp: React.Dispatch<React.SetStateAction<ExistingRSVP | null>>;
  setFormData: React.Dispatch<React.SetStateAction<RsvpFormData>>;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setGuest: React.Dispatch<React.SetStateAction<Guest | null>>;
  setHouseholdGuests: React.Dispatch<React.SetStateAction<HouseholdGuest[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMealConfig: React.Dispatch<React.SetStateAction<RSVPMealConfig>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpDeadline: React.Dispatch<React.SetStateAction<string | null>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestion[]>>;
  setRsvpSessionToken?: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setTokenAutoLoading?: React.Dispatch<React.SetStateAction<boolean>>;
};

const DEFAULT_FORM_DATA: RsvpFormData = {
  attending: true,
  attendCeremony: false,
  attendReception: false,
  meal_choice: '',
  plus_one_name: '',
  children_count: 0,
  notes: '',
};

export function resetRsvpPageState({
  formData = DEFAULT_FORM_DATA,
  searchValue = '',
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
}: ResetRsvpPageStateArgs) {
  setLoading(false);
  setSubmitting(false);
  setTokenAutoLoading?.(false);
  setStep('search');
  setActivePredictionIndex(-1);
  setError('');
  setGuest(null);
  setRsvpSessionToken?.(null);
  setExistingRsvp(null);
  setAmbiguousGuests([]);
  setRsvpDeadline(null);
  setMusicPlaylistUrl(null);
  setRsvpQuestions([]);
  setMealConfig(DEFAULT_MEAL_CONFIG);
  setHouseholdGuests([]);
  setApplyToHousehold(true);
  setSelectedHouseholdGuestIds([]);
  setFormData(formData);
  setCustomAnswers({});
  setFormStep(1);
  setSearchValue(searchValue);
}
