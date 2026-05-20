import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOnboardingDraftStorageKey, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { readOnboardingDraftSnapshot } from './onboardingDraftPersistence';
import { GUIDED_SETUP_STORAGE_KEY, readGuidedSetupDraftSnapshot, type GuidedSetupDraftSnapshot } from './guidedSetupPersistence';
import {
  ONBOARDING_RESUME_HINT_STORAGE_KEY,
  ONBOARDING_RESUME_INDEX_STORAGE_KEY,
  readOnboardingResumeState,
  writeOnboardingResumeHint,
} from './onboardingResumeStorage';
import { QUICK_START_STORAGE_KEY, readQuickStartDraftSnapshot } from './quickStartStateTransfer';
import { readSetupDraft, SELECTED_TEMPLATE_KEY, SETUP_DRAFT_KEY } from './setupDraft';

describe('onboarding scoped storage migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:00:00.000Z'));
  });

  it('migrates legacy onboarding drafts into a user-scoped key on read', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({
      step: 'quick-2',
      initialSetupAnswers: { names: 'Alex & Jordan' },
    }));

    const restored = readOnboardingDraftSnapshot('user-a');

    expect(restored?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(buildOnboardingDraftStorageKey('user-a'))).toContain('Alex & Jordan');
  });

  it('migrates legacy quick start drafts into a user-scoped key on read', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      currentIndex: 2,
      followUpAnswers: {},
      showFollowUps: false,
      viewState: 'question',
    }));

    const restored = readQuickStartDraftSnapshot('user-a');

    expect(restored?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${QUICK_START_STORAGE_KEY}::user-a`)).toContain('Alex & Jordan');
  });

  it('migrates legacy guided setup drafts into a user-scoped key on read', () => {
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
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({
      currentStep: 'design',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: defaults.formData,
    }));

    const restored = readGuidedSetupDraftSnapshot(defaults, 'user-a');

    expect(restored?.currentStep).toBe('design');
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${GUIDED_SETUP_STORAGE_KEY}::user-a`)).toContain('"design"');
  });

  it('migrates legacy onboarding resume hints and indexes into user-scoped keys on read', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'question');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '7');

    expect(readOnboardingResumeState('user-a')).toEqual({ hint: 'question', index: 7 });
    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${ONBOARDING_RESUME_HINT_STORAGE_KEY}::user-a`)).toContain('question');
    expect(window.localStorage.getItem(`${ONBOARDING_RESUME_INDEX_STORAGE_KEY}::user-a`)).toContain('"index":7');
  });

  it('writes onboarding resume hints to the scoped key when a user scope is provided', () => {
    writeOnboardingResumeHint('first-incomplete', 'user-a');

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${ONBOARDING_RESUME_HINT_STORAGE_KEY}::user-a`)).toContain('first-incomplete');
  });

  it('migrates legacy setup drafts and selected templates into user-scoped keys on read', () => {
    window.localStorage.setItem(SELECTED_TEMPLATE_KEY, 'editorial-minimal');
    window.localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingCity: 'San Diego',
      selectedTemplateId: 'editorial-minimal',
    }));

    const restored = readSetupDraft('user-a');

    expect(restored.partnerOneFirstName).toBe('Alex');
    expect(window.localStorage.getItem(SETUP_DRAFT_KEY)).toBeNull();
    expect(window.localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${SETUP_DRAFT_KEY}::user-a`)).toContain('San Diego');
    expect(window.localStorage.getItem(`${SELECTED_TEMPLATE_KEY}::user-a`)).toContain('editorial-minimal');
  });
});
