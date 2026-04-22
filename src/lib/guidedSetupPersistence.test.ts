import { describe, expect, it } from 'vitest';
import { normalizeGuidedSetupDraftSnapshot } from './guidedSetupPersistence';

const defaults = {
  currentStep: 'welcome' as const,
  coupleNames: { name1: '', name2: '' },
  formData: {
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
  },
};

describe('guidedSetupPersistence', () => {
  it('restores a valid guided setup draft snapshot', () => {
    const normalized = normalizeGuidedSetupDraftSnapshot({
      currentStep: 'travel',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: { city: 'San Diego', template: 'destination' },
    }, defaults);

    expect(normalized.currentStep).toBe('travel');
    expect(normalized.coupleNames.name1).toBe('Alex');
    expect(normalized.formData.city).toBe('San Diego');
    expect(normalized.formData.template).toBe('destination');
  });

  it('drops malformed guided setup draft pieces safely', () => {
    const normalized = normalizeGuidedSetupDraftSnapshot({
      currentStep: 'bogus',
      coupleNames: 'bad',
      formData: 'bad',
    }, defaults);

    expect(normalized).toEqual(defaults);
  });

  it('keeps only string form fields from persisted guided setup drafts', () => {
    const normalized = normalizeGuidedSetupDraftSnapshot({
      currentStep: 'design',
      coupleNames: { name1: 'Alex', name2: 42 },
      formData: {
        city: 'San Diego',
        template: ['destination'],
        colorScheme: 'sunset',
        mealOptions: false,
        ignoredKey: 'nope',
      },
    }, defaults);

    expect(normalized).toEqual({
      currentStep: 'design',
      coupleNames: { name1: 'Alex', name2: '' },
      formData: {
        ...defaults.formData,
        city: 'San Diego',
        colorScheme: 'sunset',
      },
    });
  });

  it('falls back to defaults when array-like draft blobs are stored', () => {
    expect(normalizeGuidedSetupDraftSnapshot([], defaults)).toEqual(defaults);
  });

  it('returns cloned defaults so invalid drafts cannot mutate the default object', () => {
    const normalized = normalizeGuidedSetupDraftSnapshot(null, defaults);
    normalized.coupleNames.name1 = 'Changed';
    normalized.formData.city = 'Paris';

    expect(defaults.coupleNames.name1).toBe('');
    expect(defaults.formData.city).toBe('');
  });
});
