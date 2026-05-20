import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQuickStartDraftStorageKey, clearQuickStartDraftSnapshot, migrateQuickStartDraftSnapshotScope, persistQuickStartDraftSnapshot, QUICK_START_DRAFT_RETENTION_MS, QUICK_START_STORAGE_KEY, readQuickStartDraftSnapshot } from './quickStartStateTransfer';

describe('quickStartStateTransfer', () => {
  beforeEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('persists a navigation-state quick start draft into local storage using normalized shape', () => {
    const persisted = persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: true,
      viewState: 'followups',
    });

    expect(persisted?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(false);
    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({});
  });

  it('timestamps meaningful quick start drafts for bounded local storage retention', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00.000Z'));

    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
    });

    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-02-14T12:00:00.000Z');
  });

  it('clears expired quick start drafts on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      savedAtISO: new Date(Date.now() - QUICK_START_DRAFT_RETENTION_MS - 1).toISOString(),
    }));

    expect(readQuickStartDraftSnapshot()).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('migrates legacy quick start drafts without a timestamp on restore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T15:30:00.000Z'));
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      initialSetupAnswers: { names: 'Alex & Jordan' },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').savedAtISO).toBe('2026-03-01T15:30:00.000Z');
  });

  it('migrates scoped quick start drafts between auth scopes without dropping progress', () => {
    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
    }, 'alex@example.com');

    const migrated = migrateQuickStartDraftSnapshotScope('alex@example.com', 'user-1');

    expect(migrated?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(window.localStorage.getItem(buildQuickStartDraftStorageKey('alex@example.com'))).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(buildQuickStartDraftStorageKey('user-1')) || '{}').initialSetupAnswers.names).toBe('Alex & Jordan');
  });

  it('survives malformed existing storage by normalizing on read', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({ followUpAnswers: ['bad'] }));
    expect(readQuickStartDraftSnapshot()).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('clears empty quick start snapshots when read normalization strips them to inert state', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: Number.MAX_SAFE_INTEGER + 1,
      followUpAnswers: ['bad'],
      showFollowUps: 'true',
      clarifyingState: { clarifying: [] },
      viewState: 'bogus',
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('clears empty quick start snapshots instead of persisting inert storage', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, 'stale');

    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });

    expect(persisted).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('treats index-only quick start snapshots as inert when no answers survived', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 7,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });

    expect(persisted).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('treats follow-up-view-only quick start snapshots as inert when no follow-up work survived', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'followups',
    });

    expect(persisted).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('keeps follow-up-view quick start snapshots when clarifying work survived', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: true,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
      viewState: 'followups',
    });

    expect(persisted?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });


  it('treats skipped-only clarifying snapshots as inert when no review data survived', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }],
        },
        draftOutputs: {},
      },
      viewState: 'question',
    });

    expect(persisted).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('keeps skipped clarifying snapshots when draft outputs still survive review restore', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }],
        },
        draftOutputs: {
          hero: {
            headline: 'Welcome to our wedding',
          },
        },
      },
      viewState: 'question',
    });

    expect(persisted?.clarifyingState?.draftOutputs).toEqual({
      hero: { headline: 'Welcome to our wedding' },
    });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').clarifyingState.draftOutputs).toEqual({
      hero: { headline: 'Welcome to our wedding' },
    });
  });

  it('rewrites completed onboarding step progress back to zero when setup answers do not survive restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 5,
      initialSetupAnswers: {
        names: '   ',
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('rewrites completed onboarding step progress back to the first missing required setup answer', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 8,
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        style: 'Tropical, relaxed',
      },
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.currentIndex).toBe(5);
    expect(stored.currentIndex).toBe(5);
  });

  it('rewrites invalid closed restore indexes back to the surviving setup boundary', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 2.5,
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        style: 'Tropical, relaxed',
      },
      showFollowUps: false,
      viewState: 'question',
      clarifyingState: null,
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.currentIndex).toBe(5);
    expect(stored.currentIndex).toBe(5);
  });

  it('rewrites legacy string closed restore indexes back to the surviving setup boundary', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: '5',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        style: 'Tropical, relaxed',
      },
      showFollowUps: false,
      viewState: 'question',
      clarifyingState: null,
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.currentIndex).toBe(5);
    expect(stored.currentIndex).toBe(5);
  });

  it('rewrites legacy zero closed restore indexes without inventing extra setup progress', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: '0',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        style: 'Tropical, relaxed',
      },
      showFollowUps: false,
      viewState: 'question',
      clarifyingState: null,
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.currentIndex).toBe(0);
    expect(stored.currentIndex).toBe(0);
  });

  it('clamps progressed quick start snapshots to the surviving completed setup steps', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 7,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });

    expect(persisted?.currentIndex).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(2);
  });

  it('keeps completed onboarding step progress when follow-up restore state survives sparse setup answers', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 13,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: {},
      showFollowUps: true,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
      viewState: 'followups',
    });

    expect(persisted?.currentIndex).toBe(14);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(14);
  });
  it('rewrites follow-up restore progress back to the setup question count when stale indexes overshoot', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 99,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: {},
      showFollowUps: true,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
      viewState: 'followups',
    });

    expect(persisted?.currentIndex).toBe(14);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(14);
  });
  it('rewrites pending thinking restores to the completed setup boundary', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: {},
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
      viewState: 'thinking',
    });

    expect(persisted?.currentIndex).toBe(14);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(14);
  });

  it('rewrites invalid active restore indexes to the completed setup boundary', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 2.5,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: {},
      showFollowUps: true,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
      viewState: 'followups',
    });

    expect(persisted?.currentIndex).toBe(14);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(14);
  });


  it('rewrites unsafe quick start step indexes back to zero on read', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: Number.MAX_SAFE_INTEGER + 1,
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('drops follow-up answers when a malformed clarifying envelope survives storage restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: { clarifying: [] },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('rehydrates older clarifying snapshots that were missing draft outputs', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'event-1-time',
            category: 'event_structure',
            question: 'When is dinner?',
            expectedAnswerType: 'short_text',
            targetFields: ['events.0.time'],
            affectedSections: ['schedule'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
      },
    }));

    expect(readQuickStartDraftSnapshot()?.clarifyingState?.draftOutputs).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').clarifyingState?.draftOutputs).toEqual({});
  });

  it('rehydrates older clarifying snapshots that were missing history', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'event-1-time',
            category: 'event_structure',
            question: 'When is dinner?',
            expectedAnswerType: 'short_text',
            targetFields: ['events.0.time'],
            affectedSections: ['schedule'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.clarifyingState?.clarifying.history).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').clarifyingState?.clarifying.history).toEqual([]);
  });


  it('rehydrates draft-only clarifying snapshots when older payloads omitted the clarifying envelope entirely', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      clarifyingState: {
        draftOutputs: {
          hero: {
            headline: 'Welcome to our wedding',
          },
        },
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.clarifyingState?.clarifying.mode).toBe('draft');
    expect(restored?.clarifyingState?.clarifying.questions).toEqual([]);
    expect(restored?.clarifyingState?.clarifying.history).toEqual([]);
    expect(restored?.clarifyingState?.draftOutputs).toEqual({
      hero: { headline: 'Welcome to our wedding' },
    });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').clarifyingState?.clarifying?.questions).toEqual([]);
  });

  it('drops malformed existing storage completely when the payload is invalid json', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '{bad json');

    expect(readQuickStartDraftSnapshot()).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('returns normalized draft even when local storage writes fail', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(persistQuickStartDraftSnapshot({ initialSetupAnswers: { names: 'Alex & Jordan' } })?.initialSetupAnswers.names).toBe('Alex & Jordan');

    setItemSpy.mockRestore();
  });


  it('skips storage writes when persisting a quick start snapshot that is already normalized', () => {
    const normalizedRaw = JSON.stringify({
      initialSetupAnswers: {
        names: 'Alex & Jordan',
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
        childrenAllowed: '',
        rsvpDeadline: '',
        mealChoice: '',
        registryIntent: '',
        optionalStory: '',
      },
      currentIndex: 0,
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const persisted = persistQuickStartDraftSnapshot({ initialSetupAnswers: { names: 'Alex & Jordan' } });

    expect(persisted?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('skips storage deletes when persisting an empty quick start snapshot and storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    });

    expect(persisted).toBeNull();
    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });


  it('skips redundant quick start draft cleanup deletes when storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    clearQuickStartDraftSnapshot();

    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });

  it('tolerates quick start draft cleanup failures', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, 'stale');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearQuickStartDraftSnapshot()).not.toThrow();
    removeItemSpy.mockRestore();
  });

  it('returns normalized restored draft when rewrite-on-read storage updates fail', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({ initialSetupAnswers: { names: ' Alex & Jordan ' } }));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toContain(' Alex & Jordan ');

    setItemSpy.mockRestore();
  });


  it('skips rewrite-on-read storage updates when the snapshot is already normalized', () => {
    const normalizedRaw = JSON.stringify({
      initialSetupAnswers: {
        names: 'Alex & Jordan',
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
        childrenAllowed: '',
        rsvpDeadline: '',
        mealChoice: '',
        registryIntent: '',
        optionalStory: '',
      },
      currentIndex: 0,
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    });
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(setItemSpy).not.toHaveBeenCalledWith(QUICK_START_STORAGE_KEY, normalizedRaw);

    setItemSpy.mockRestore();
  });

  it('still clears broken storage when invalid json cleanup cannot remove the payload', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '{bad json');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage locked');
    });

    expect(readQuickStartDraftSnapshot()).toBeNull();

    removeItemSpy.mockRestore();
  });

  it('treats storage read failures as unavailable restore state', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage locked');
    });

    expect(readQuickStartDraftSnapshot()).toBeNull();

    getItemSpy.mockRestore();
  });

  it('preserves normalized restored draft when rewrite-on-read fails after stale follow-ups are removed', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        lodging: 'Stay at the resort',
        transport: 'Shuttle leaves at 4 PM',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toContain('transport');

    setItemSpy.mockRestore();
  });

  it('drops skipped-history follow-up answers during restore rewrites', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        transport: 'Shuttle leaves at 4 PM',
        lodging: 'Stay at the resort',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }, {
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({
      lodging: 'Stay at the resort',
    });
  });

  it('drops skipped-question follow-up answers during restore rewrites', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      followUpAnswers: {
        transport: 'Shuttle leaves at 4 PM',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('keeps answered follow-up answers when older restore payloads only stored answered questions', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        lodging: 'Stay at the resort',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({
      lodging: 'Stay at the resort',
    });
  });

  it('does not rewrite historyless answered restores back into follow-up mode', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Stay at the resort',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(false);
  });

  it('rewrites stale answered follow-up values to the restored clarifying truth', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        lodging: 'Old hotel block',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({
      lodging: 'Stay at the resort',
    });
  });

  it('keeps current follow-up text when a clarifying question was reopened after an older answer', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      followUpAnswers: {
        lodging: 'Old hotel block',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Old hotel block' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({
      lodging: 'Old hotel block',
    });
  });

  it('rehydrates typed text from reopened clarifying questions when follow-up answers are missing', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'unresolved',
            answer: 'Need to confirm hotel block',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({
      lodging: 'Need to confirm hotel block',
    });
  });

  it('rewrites stale follow-up view state back to question when the follow-up flag is off', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.clarifyingState?.clarifying.mode).toBe('draft');
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
    expect(stored.viewState).toBe('question');
    expect(stored.clarifyingState?.clarifying?.mode).toBe('draft');
  });

  it('keeps explicit follow-up opt-out closed even when typed draft answers survive restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'followups',
      followUpAnswers: {
        transport: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'unresolved',
            answer: 'Need shuttle details',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(false);
  });

  it('keeps explicit follow-up opt-out closed even when stale thinking view survives restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });

  it('keeps explicit follow-up opt-out closed when malformed view state survives typed clarifying drafts', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 42,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'unresolved',
            answer: 'Need shuttle details',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });

  it('rewrites stale question-view restores back into follow-up mode when work remains', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });

  it('rewrites follow-up restores back on when older snapshots lost the follow-up flag', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites malformed follow-up flags back on when follow-up work still survives', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: 'true',
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites malformed follow-up flags back on when typed clarifying drafts still survive', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: 'true',
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'unresolved',
            answer: 'Need shuttle details',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites malformed follow-up flags back on when active draft answers survive older answered history', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: 'true',
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('ignores malformed follow-up opt-out flags when typed clarifying drafts still need resume', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: 'false',
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'unresolved',
            answer: 'Need shuttle details',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('ignores malformed follow-up opt-out flags when active draft answers survive older answered history', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: 'false',
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites in-progress follow-up restores back on when the flag is missing', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      followUpAnswers: {
        transport: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites pending clarifying restores back on when the flag is missing but no drafts survived', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites explicit question restores back into follow-up mode when pending clarifying mode normalizes back to ask', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.clarifyingState?.clarifying.mode).toBe('ask');
    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(stored.clarifyingState?.clarifying?.mode).toBe('ask');
    expect(stored.showFollowUps).toBe(true);
    expect(stored.viewState).toBe('followups');
  });

  it('rewrites invalid-view restores back to question when clarifying mode is already draft', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 42,
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });

  it('rewrites pending clarifying restores back on when the flag is missing and the view state was invalid', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 42,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites active draft answers back on even when older answered history also survives', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites stale thinking restores back into follow-up mode once questions already exist', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });

  it('rewrites stale thinking restores back into follow-up mode when active draft answers survived', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });

  it('preserves thinking while restore generation has not produced questions yet', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('thinking');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('thinking');
  });


  it('rewrites missing follow-up flags back to thinking while clarifying generation is still pending', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();
    const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('thinking');
    expect(stored.showFollowUps).toBe(true);
    expect(stored.viewState).toBe('thinking');
  });

  it('keeps thinking restores meaningful after normalization rewrites empty clarifying shells to draft mode', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const firstRestore = readQuickStartDraftSnapshot();
    const rewritten = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
    const secondRestore = readQuickStartDraftSnapshot();

    expect(firstRestore?.showFollowUps).toBe(true);
    expect(firstRestore?.viewState).toBe('thinking');
    expect(rewritten.showFollowUps).toBe(true);
    expect(rewritten.viewState).toBe('thinking');
    expect(rewritten.clarifyingState?.clarifying?.mode).toBe('draft');
    expect(secondRestore?.showFollowUps).toBe(true);
    expect(secondRestore?.viewState).toBe('thinking');
  });



  it('treats question-view ask-mode shells as inert when generation never started', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('treats stale thinking restores with only skipped clarifying history as inert', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('rewrites thinking restores back to question when draft outputs already survived restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {
          hero: {
            headline: 'Welcome to our wedding',
          },
        },
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.clarifyingState?.draftOutputs).toEqual({
      hero: { headline: 'Welcome to our wedding' },
    });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });


  it('drops stale follow-up answers on read when draft outputs survived a stale follow-up restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {
          hero: {
            headline: 'Welcome to our wedding',
          },
        },
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(restored?.clarifyingState?.draftOutputs).toEqual({
      hero: { headline: 'Welcome to our wedding' },
    });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
  });

  it('drops orphaned follow-up answers when no clarifying records survive', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('drops orphaned follow-up answers when stale follow-up view survives without clarifying records', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'followups',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('drops orphaned follow-up answers when follow-up resume is explicitly off without clarifying records', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('drops orphaned follow-up answers in question view when empty clarifying records survive', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('rewrites stale thinking restores back to question when the clarifying state is missing entirely', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: true,
      viewState: 'thinking',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: null,
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });


  it('drops stale follow-up answers when clarifying state is missing but follow-up view survives', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'followups',
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: null,
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('rewrites stale thinking restores back to question when no open clarifying work remains', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });

  it('rewrites stale thinking restores back to question when follow-up resume is off', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      showFollowUps: false,
      viewState: 'thinking',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
  });

  it('rewrites typed clarifying question drafts back into follow-up mode when the flag is missing', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'unresolved',
            answer: 'Need to confirm hotel block',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites reopened typed clarifying drafts back into follow-up mode even with older answered history', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 'question',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'unresolved',
            answer: 'Need to confirm hotel block',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(true);
  });

  it('rewrites malformed view-state restores back into follow-up mode when typed clarifying drafts survive', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 42,
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'unresolved',
            answer: 'Need shuttle details',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });

  it('rewrites malformed view-state restores back into follow-up mode when active draft answers survive older answered history', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      viewState: 42,
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 2,
            status: 'pending',
            answer: '',
          }],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'answered',
            answer: 'Stay at the resort',
          }],
        },
        draftOutputs: {},
      },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.showFollowUps).toBe(true);
    expect(restored?.viewState).toBe('followups');
    expect(restored?.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('followups');
  });
});
