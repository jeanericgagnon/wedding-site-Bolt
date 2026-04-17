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
  guestFeel?: string;
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
  guestFeel: '',
  weekendEventsRaw: '',
  ceremonyArrivalTime: '',
  guestCountBand: '',
  plusOnePolicy: '',
  rsvpDeadline: '',
  mealChoice: '',
  registryIntent: '',
  optionalStory: '',
});


export const initialSetupAnswersToOnboardingFormShape = (answers: InitialSetupAnswers) => ({
  partnerNames: answers.names,
  partnerLabels: answers.labelPreference === 'bride-groom' ? 'groom|bride' : answers.labelPreference === 'bride-bride' ? 'bride|bride' : answers.labelPreference === 'groom-groom' ? 'groom|groom' : 'none|none',
  weddingDate: answers.whenWhere.split(/\s+[—-]\s+/)[0] || '',
  venueLocation: answers.whenWhere.split(/\s+[—-]\s+/).slice(1).join(' — '),
  venueName: answers.venueNameOrTbd,
  theme: answers.style,
  story: answers.optionalStory,
  guestExperience: answers.guestFeel,
  weekendEvents: answers.weekendEventsRaw,
  ceremonyTime: answers.ceremonyArrivalTime,
  guestCount: answers.guestCountBand,
  plusOnePolicy: answers.plusOnePolicy,
  mealChoice: answers.mealChoice,
  registryIntent: answers.registryIntent,
  extraGuestNotes: '',
  rsvpDeadline: answers.rsvpDeadline,
  registryLink: '',
});


export const createEmptyOnboardingFormShapeFromInitialSetup = () => initialSetupAnswersToOnboardingFormShape(createEmptyInitialSetupAnswers());
