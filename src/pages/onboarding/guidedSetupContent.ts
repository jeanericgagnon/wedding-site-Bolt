export type GuidedSetupStep =
  | 'welcome'
  | 'basics'
  | 'events'
  | 'travel'
  | 'rsvp'
  | 'faq'
  | 'design'
  | 'guests'
  | 'complete';

export type GuidedSetupFormData = {
  weddingDate: string;
  venue: string;
  city: string;
  ourStory: string;
  ceremonyTime: string;
  receptionTime: string;
  attire: string;
  hotelRecommendations: string;
  parking: string;
  rsvpDeadline: string;
  mealOptions: string;
  registryLinks: string;
  customFaqs: string;
  template: string;
  colorScheme: string;
};

export type GuidedSetupDraftDefaults = {
  currentStep: GuidedSetupStep;
  coupleNames: { name1: string; name2: string };
  formData: GuidedSetupFormData;
};

export const guidedSetupSteps: GuidedSetupStep[] = [
  'welcome',
  'basics',
  'events',
  'travel',
  'rsvp',
  'faq',
  'design',
  'guests',
  'complete',
];

export const createEmptyGuidedSetupFormData = (): GuidedSetupFormData => ({
  weddingDate: '',
  venue: '',
  city: '',
  ourStory: '',
  ceremonyTime: '',
  receptionTime: '',
  attire: '',
  hotelRecommendations: '',
  parking: '',
  rsvpDeadline: '',
  mealOptions: '',
  registryLinks: '',
  customFaqs: '',
  template: 'modern',
  colorScheme: 'romantic',
});

export const createGuidedSetupDraftDefaults = (): GuidedSetupDraftDefaults => ({
  currentStep: 'welcome',
  coupleNames: { name1: '', name2: '' },
  formData: createEmptyGuidedSetupFormData(),
});
