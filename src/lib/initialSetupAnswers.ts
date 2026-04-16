export type LabelPreference = 'names-only' | 'bride-groom' | 'bride-bride' | 'groom-groom' | 'custom';
export type GuestCountBand = 'under-50' | '50-100' | '100-150' | '150-250' | '250-plus' | '';
export type PlusOnePolicy = 'none' | 'some' | 'all' | '';
export type MealChoicePolicy = 'yes' | 'no' | '';
export type RegistryIntent = 'cash' | 'gifts' | 'both' | 'unsure' | 'none-for-now' | '';

export type InitialSetupAnswers = {
  names: string;
  labelPreference: LabelPreference;
  customLabelPartnerOne?: string;
  customLabelPartnerTwo?: string;
  whenWhere: string;
  venueNameOrTbd: string;
  style: string;
  weekendEventsRaw: string;
  ceremonyArrivalTime: string;
  guestCountBand: GuestCountBand;
  plusOnePolicy: PlusOnePolicy;
  rsvpDeadline: string;
  mealChoice: MealChoicePolicy;
  registryIntent: RegistryIntent;
  optionalStory: string;
};

export const createEmptyInitialSetupAnswers = (): InitialSetupAnswers => ({
  names: '',
  labelPreference: 'names-only',
  customLabelPartnerOne: '',
  customLabelPartnerTwo: '',
  whenWhere: '',
  venueNameOrTbd: '',
  style: '',
  weekendEventsRaw: '',
  ceremonyArrivalTime: '',
  guestCountBand: '',
  plusOnePolicy: '',
  rsvpDeadline: '',
  mealChoice: '',
  registryIntent: '',
  optionalStory: '',
});
