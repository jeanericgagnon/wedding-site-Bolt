import type { ExistingRSVP, Guest, HouseholdGuest, RSVPMealConfig } from './rsvpTypes';

type RsvpFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
};

type RestoreLoadedRsvpStateArgs = {
  activeToken: string | null;
  applyToHousehold: boolean;
  buildNormalizedExistingRsvp: (
    formData: RsvpFormData,
    customAnswers: Record<string, string | string[]>,
    id: string,
    guestIds?: string[],
  ) => ExistingRSVP;
  buildNormalizedRsvpFormData: (
    guest: Guest,
    existingRsvp: ExistingRSVP,
    mealConfig: RSVPMealConfig,
  ) => RsvpFormData;
  customAnswers: Record<string, string | string[]>;
  dedupeGuestIds: (guestIds: string[]) => string[];
  formData: RsvpFormData;
  guest: Guest;
  householdGuests: HouseholdGuest[];
  mealConfig: RSVPMealConfig;
  normalizeSelectedHouseholdGuestIds: (guestIds: string[], household: HouseholdGuest[]) => string[];
  selectedHouseholdGuestIds: string[];
  setApplyToHousehold: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setExistingRsvp: React.Dispatch<React.SetStateAction<ExistingRSVP | null>>;
  setFormData: React.Dispatch<React.SetStateAction<RsvpFormData>>;
  setFormStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setSelectedHouseholdGuestIds: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<'search' | 'pick' | 'form' | 'success'>>;
  tokenLinkedSessionRef: React.MutableRefObject<boolean>;
};

export function restoreLoadedRsvpState({
  activeToken,
  applyToHousehold,
  buildNormalizedExistingRsvp,
  buildNormalizedRsvpFormData,
  customAnswers,
  dedupeGuestIds,
  formData,
  guest,
  householdGuests,
  mealConfig,
  normalizeSelectedHouseholdGuestIds,
  selectedHouseholdGuestIds,
  setApplyToHousehold,
  setCustomAnswers,
  setError,
  setExistingRsvp,
  setFormData,
  setFormStep,
  setSelectedHouseholdGuestIds,
  setStep,
  tokenLinkedSessionRef,
}: RestoreLoadedRsvpStateArgs) {
  const selectedGuestIds = applyToHousehold
    ? dedupeGuestIds([guest.id, ...selectedHouseholdGuestIds])
    : [guest.id];
  const normalizedExistingRsvp = buildNormalizedExistingRsvp(
    formData,
    customAnswers,
    'local-rsvp-confirmation',
    selectedGuestIds,
  );
  const normalizedSelectedHouseholdGuestIds = normalizeSelectedHouseholdGuestIds(
    selectedHouseholdGuestIds,
    householdGuests,
  );
  const shouldKeepHouseholdSelection = applyToHousehold && normalizedSelectedHouseholdGuestIds.length > 0;

  tokenLinkedSessionRef.current = !!activeToken;
  setError('');
  setFormData(buildNormalizedRsvpFormData(guest, normalizedExistingRsvp, mealConfig));
  setCustomAnswers(normalizedExistingRsvp.custom_answers || {});
  setApplyToHousehold(shouldKeepHouseholdSelection);
  setSelectedHouseholdGuestIds(
    shouldKeepHouseholdSelection ? normalizedSelectedHouseholdGuestIds : [],
  );
  setStep('form');
  setFormStep(1);
  setExistingRsvp(normalizedExistingRsvp);
}
