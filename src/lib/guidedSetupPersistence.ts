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

export type GuidedSetupDraftSnapshot = {
  currentStep: GuidedSetupStep;
  coupleNames: { name1: string; name2: string };
  formData: GuidedSetupFormData;
};

export const GUIDED_SETUP_STORAGE_KEY = 'dayoflove:guided-setup-draft';

export const normalizeGuidedSetupDraftSnapshot = (
  value: unknown,
  defaults: GuidedSetupDraftSnapshot,
): GuidedSetupDraftSnapshot => {
  if (!value || typeof value !== 'object') return defaults;
  const parsed = value as Partial<GuidedSetupDraftSnapshot>;
  const validSteps: GuidedSetupStep[] = ['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'guests', 'complete'];

  return {
    currentStep: validSteps.includes(parsed.currentStep as GuidedSetupStep) ? parsed.currentStep as GuidedSetupStep : defaults.currentStep,
    coupleNames: parsed.coupleNames && typeof parsed.coupleNames === 'object'
      ? {
          name1: typeof parsed.coupleNames.name1 === 'string' ? parsed.coupleNames.name1 : defaults.coupleNames.name1,
          name2: typeof parsed.coupleNames.name2 === 'string' ? parsed.coupleNames.name2 : defaults.coupleNames.name2,
        }
      : defaults.coupleNames,
    formData: parsed.formData && typeof parsed.formData === 'object'
      ? { ...defaults.formData, ...parsed.formData }
      : defaults.formData,
  };
};
