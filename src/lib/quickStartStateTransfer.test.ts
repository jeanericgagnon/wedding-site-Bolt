import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistQuickStartDraftSnapshot, QUICK_START_STORAGE_KEY, readQuickStartDraftSnapshot } from './quickStartStateTransfer';

describe('quickStartStateTransfer', () => {
  beforeEach(() => {
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
    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({ 'event-1-time': '6:00 PM' });
  });

  it('survives malformed existing storage by normalizing on read', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({ followUpAnswers: ['bad'] }));
    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({});
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBe(JSON.stringify({
      initialSetupAnswers: {
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
    }));
  });


  it('drops follow-up answers when a malformed clarifying envelope survives storage restore', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      followUpAnswers: {
        lodging: 'Need shuttle details',
      },
      clarifyingState: { clarifying: [] },
    }));

    const restored = readQuickStartDraftSnapshot();

    expect(restored?.clarifyingState).toBeNull();
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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

  it('returns normalized restored draft when rewrite-on-read storage updates fail', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({ initialSetupAnswers: { names: ' Alex & Jordan ' } }));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toContain(' Alex & Jordan ');

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

    expect(restored?.followUpAnswers).toEqual({});
    expect(restored?.showFollowUps).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').viewState).toBe('question');
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

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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

    expect(restored?.showFollowUps).toBe(false);
    expect(restored?.viewState).toBe('question');
    expect(restored?.followUpAnswers).toEqual({});
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').followUpAnswers).toEqual({});
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
