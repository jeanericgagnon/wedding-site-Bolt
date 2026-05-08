import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { ONBOARDING_DRAFT_RETENTION_MS, hasActiveOnboardingDraftSnapshot, hasStoredOnboardingDraftPayload, normalizeOnboardingDraftSnapshot, persistOnboardingDraftSnapshot, readOnboardingDraftSnapshot } from './onboardingDraftPersistence';

describe('onboardingDraftPersistence', () => {
  beforeEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('preserves follow-up review state across a saved draft round-trip', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      step: 'quick-3',
      conversationIndex: 12,
      showFollowUpReview: true,
      followUpAnswers: {
        'venue-clarity': 'At the bluff overlooking the ocean.',
        'event-location-1': 'Welcome party at the pool terrace.',
      },
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        weekendEventsRaw: 'Friday welcome party, Saturday wedding',
      },
      initialSetupFollowUps: {
        venueClarification: 'Ocean bluff ceremony',
        eventLocations: {
          friday: 'Pool terrace',
        },
        eventTimes: {
          friday: '6:00 PM',
        },
      },
    });

    expect(normalized.step).toBe('quick-3');
    expect(normalized.conversationIndex).toBe(12);
    expect(normalized.showFollowUpReview).toBe(true);
    expect(normalized.followUpAnswers['venue-clarity']).toBe('At the bluff overlooking the ocean.');
    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.initialSetupFollowUps.venueClarification).toBe('Ocean bluff ceremony');
    expect(normalized.initialSetupFollowUps.eventLocations.friday).toBe('Pool terrace');
    expect(normalized.initialSetupFollowUps.eventTimes.friday).toBe('6:00 PM');
  });

  it('timestamps persisted onboarding drafts for bounded local storage retention', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00.000Z'));

    persistOnboardingDraftSnapshot({
      step: 'quick-1',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
      },
    });

    expect(JSON.parse(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-02-14T12:00:00.000Z');
  });

  it('clears expired onboarding drafts on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({
      step: 'quick-2',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
      },
      savedAtISO: new Date(Date.now() - ONBOARDING_DRAFT_RETENTION_MS - 1).toISOString(),
    }));

    expect(readOnboardingDraftSnapshot()).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('separates raw draft payload presence from active retained drafts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({
      step: 'quick-2',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
      },
      savedAtISO: new Date(Date.now() - ONBOARDING_DRAFT_RETENTION_MS - 1).toISOString(),
    }));

    expect(hasStoredOnboardingDraftPayload()).toBe(true);
    expect(hasActiveOnboardingDraftSnapshot()).toBe(false);
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('migrates legacy onboarding drafts without a timestamp on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T15:30:00.000Z'));
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({
      step: 'quick-1',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
      },
    }));

    const restored = readOnboardingDraftSnapshot();

    expect(restored?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(JSON.parse(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-03-01T15:30:00.000Z');
  });

  it('drops malformed records instead of crashing hydration', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      followUpAnswers: ['bad'],
      initialSetupFollowUps: {
        eventLocations: ['wrong'],
        eventTimes: null,
      },
    });

    expect(normalized.followUpAnswers).toEqual({});
    expect(normalized.initialSetupFollowUps.eventLocations).toEqual({});
    expect(normalized.initialSetupFollowUps.eventTimes).toEqual({});
  });

  it('trims and filters handoff answers before restoring review state', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      step: 'quick-3',
      showFollowUpReview: true,
      followUpAnswers: {
        ' venue-clarity ': ' At the bluff overlooking the ocean. ',
        lodging: '   ',
      },
      initialSetupFollowUps: {
        venueClarification: '  Ocean bluff ceremony  ',
        eventLocations: {
          friday: ' Pool terrace ',
          saturday: 7,
        },
        eventTimes: {
          friday: ' 6:00 PM ',
          sunday: null,
        },
      },
    });

    expect(normalized.showFollowUpReview).toBe(true);
    expect(normalized.followUpAnswers).toEqual({ 'venue-clarity': 'At the bluff overlooking the ocean.' });
    expect(normalized.initialSetupFollowUps.venueClarification).toBe('Ocean bluff ceremony');
    expect(normalized.initialSetupFollowUps.eventLocations).toEqual({ friday: 'Pool terrace' });
    expect(normalized.initialSetupFollowUps.eventTimes).toEqual({ friday: '6:00 PM' });
  });

  it('trims and filters carried initial setup answers before restoring handoff state', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      initialSetupAnswers: {
        names: ' Alex & Jordan ',
        whenWhere: ' June 12, 2027 — San Diego ',
        venueNameOrTbd: '   ',
        guestFeel: 7,
      },
    });

    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.initialSetupAnswers.whenWhere).toBe('June 12, 2027 — San Diego');
    expect(normalized.initialSetupAnswers.venueNameOrTbd).toBe('');
    expect(normalized.initialSetupAnswers.guestFeel).toBe('');
  });

  it('rejects invalid carried initial setup enum answers during handoff restore', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      initialSetupAnswers: {
        labelPreference: 'wizard-mode',
        guestCountBand: 'tons',
        plusOnePolicy: 'vip-only',
        childrenAllowed: 'maybe',
        mealChoice: 'sometimes',
        registryIntent: 'later',
      },
    });

    expect(normalized.initialSetupAnswers.labelPreference).toBe('names-only');
    expect(normalized.initialSetupAnswers.guestCountBand).toBe('');
    expect(normalized.initialSetupAnswers.plusOnePolicy).toBe('');
    expect(normalized.initialSetupAnswers.childrenAllowed).toBe('');
    expect(normalized.initialSetupAnswers.mealChoice).toBe('');
    expect(normalized.initialSetupAnswers.registryIntent).toBe('');
  });

  it('clears follow-up review mode when restored handoff has no surviving follow-up data', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      step: 'quick-3',
      showFollowUpReview: true,
      followUpAnswers: {
        lodging: '   ',
      },
      initialSetupFollowUps: {
        venueClarification: '   ',
        eventLocations: {
          friday: '   ',
        },
        eventTimes: {
          friday: '   ',
        },
      },
    });

    expect(normalized.showFollowUpReview).toBe(false);
    expect(normalized.followUpAnswers).toEqual({});
    expect(normalized.initialSetupFollowUps.venueClarification).toBe('');
    expect(normalized.initialSetupFollowUps.eventLocations).toEqual({});
    expect(normalized.initialSetupFollowUps.eventTimes).toEqual({});
  });
});
