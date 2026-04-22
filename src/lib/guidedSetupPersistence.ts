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

const VALID_GUIDED_SETUP_STEPS: GuidedSetupStep[] = ['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'guests', 'complete'];

const normalizeGuidedSetupFormData = (
  value: unknown,
  defaults: GuidedSetupFormData,
): GuidedSetupFormData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults };

  const next = { ...defaults };
  for (const [key, fieldValue] of Object.entries(value)) {
    if (key in defaults && typeof fieldValue === 'string') {
      next[key as keyof GuidedSetupFormData] = fieldValue;
    }
  }

  return next;
};

const cloneGuidedSetupDefaults = (defaults: GuidedSetupDraftSnapshot): GuidedSetupDraftSnapshot => ({
  currentStep: defaults.currentStep,
  coupleNames: { ...defaults.coupleNames },
  formData: { ...defaults.formData },
});

export const normalizeGuidedSetupDraftSnapshot = (
  value: unknown,
  defaults: GuidedSetupDraftSnapshot,
): GuidedSetupDraftSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return cloneGuidedSetupDefaults(defaults);
  const parsed = value as Partial<GuidedSetupDraftSnapshot>;

  return {
    currentStep: VALID_GUIDED_SETUP_STEPS.includes(parsed.currentStep as GuidedSetupStep) ? parsed.currentStep as GuidedSetupStep : defaults.currentStep,
    coupleNames: parsed.coupleNames && typeof parsed.coupleNames === 'object' && !Array.isArray(parsed.coupleNames)
      ? {
          name1: typeof parsed.coupleNames.name1 === 'string' ? parsed.coupleNames.name1 : defaults.coupleNames.name1,
          name2: typeof parsed.coupleNames.name2 === 'string' ? parsed.coupleNames.name2 : defaults.coupleNames.name2,
        }
      : { ...defaults.coupleNames },
    formData: normalizeGuidedSetupFormData(parsed.formData, defaults.formData),
  };
};
