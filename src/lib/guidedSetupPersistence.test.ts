import { describe, expect, it } from 'vitest';
import { normalizeGuidedSetupDraftSnapshot, type GuidedSetupDraftSnapshot } from './guidedSetupPersistence';

const defaults: GuidedSetupDraftSnapshot = {
  currentStep: 'welcome',
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

describe('normalizeGuidedSetupDraftSnapshot', () => {
  it('drops invalid persisted date inputs instead of restoring junk into guided setup state', () => {
    const snapshot = normalizeGuidedSetupDraftSnapshot({
      currentStep: 'rsvp',
      formData: {
        weddingDate: 'not-a-date',
        rsvpDeadline: '2026-02-30',
      },
    }, defaults);

    expect(snapshot.formData.weddingDate).toBe('');
    expect(snapshot.formData.rsvpDeadline).toBe('');
  });

  it('keeps valid persisted date inputs intact', () => {
    const snapshot = normalizeGuidedSetupDraftSnapshot({
      currentStep: 'rsvp',
      formData: {
        weddingDate: '2026-09-12',
        rsvpDeadline: '2026-08-15',
      },
    }, defaults);

    expect(snapshot.formData.weddingDate).toBe('2026-09-12');
    expect(snapshot.formData.rsvpDeadline).toBe('2026-08-15');
  });
});
