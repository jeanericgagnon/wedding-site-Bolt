import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_SETUP_DRAFT_RETENTION_MS, GUIDED_SETUP_STORAGE_KEY, MAX_GUIDED_SETUP_NAME_LENGTH, MAX_GUIDED_SETUP_TEXT_LENGTH, normalizeGuidedSetupDraftSnapshot, persistGuidedSetupDraftSnapshot, readGuidedSetupDraftSnapshot, type GuidedSetupDraftSnapshot } from './guidedSetupPersistence';

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
  beforeEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

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

  it('timestamps meaningful guided setup drafts when persisted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00.000Z'));

    persistGuidedSetupDraftSnapshot({
      currentStep: 'basics',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: defaults.formData,
    }, defaults);

    expect(JSON.parse(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-02-14T12:00:00.000Z');
  });

  it('clears expired guided setup drafts on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({
      currentStep: 'travel',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: defaults.formData,
      savedAtISO: new Date(Date.now() - GUIDED_SETUP_DRAFT_RETENTION_MS - 1).toISOString(),
    }));

    expect(readGuidedSetupDraftSnapshot(defaults)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
  });

  it('migrates legacy guided setup drafts without a timestamp on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T15:30:00.000Z'));
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({
      currentStep: 'rsvp',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: defaults.formData,
    }));

    const restored = readGuidedSetupDraftSnapshot(defaults);

    expect(restored?.currentStep).toBe('rsvp');
    expect(JSON.parse(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-03-01T15:30:00.000Z');
  });

  it('bounds names and freeform setup copy before local storage restore', () => {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({
      currentStep: 'faq',
      coupleNames: { name1: ` ${'A'.repeat(MAX_GUIDED_SETUP_NAME_LENGTH + 10)} `, name2: ' Jordan ' },
      formData: {
        ...defaults.formData,
        ourStory: ` ${'story '.repeat(600)} `,
      },
    }));

    const restored = readGuidedSetupDraftSnapshot(defaults);

    expect(restored?.coupleNames.name1).toHaveLength(MAX_GUIDED_SETUP_NAME_LENGTH);
    expect(restored?.coupleNames.name2).toBe('Jordan');
    expect(restored?.formData.ourStory.length).toBeLessThanOrEqual(MAX_GUIDED_SETUP_TEXT_LENGTH);
  });
});
