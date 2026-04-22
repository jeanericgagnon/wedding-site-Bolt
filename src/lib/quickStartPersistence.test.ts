import { describe, expect, it } from 'vitest';
import { normalizeQuickStartDraftSnapshot } from './quickStartPersistence';

describe('quickStartPersistence', () => {
  it('restores quick start follow-up mode and typed clarifying answers', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      currentIndex: 13,
      showFollowUps: true,
      viewState: 'followups',
      initialSetupAnswers: {
        names: ' Alex & Jordan ',
      },
      followUpAnswers: {
        'event-1-time': '6:00 PM',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.currentIndex).toBe(13);
    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
    expect(normalized.followUpAnswers['event-1-time']).toBe('6:00 PM');
    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.clarifyingState?.clarifying.mode).toBe('draft');
  });

  it('drops malformed quick start records safely', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      currentIndex: 2.5,
      followUpAnswers: ['bad'],
      viewState: 'bogus',
      clarifyingState: { clarifying: [] },
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'wizard-mode',
        guestCountBand: 'tons',
        plusOnePolicy: 'vip-only',
      },
    });

    expect(normalized.currentIndex).toBe(0);
    expect(normalized.followUpAnswers).toEqual({});
    expect(normalized.viewState).toBe('question');
    expect(normalized.clarifyingState).toBeNull();
    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.initialSetupAnswers.labelPreference).toBe('names-only');
    expect(normalized.initialSetupAnswers.guestCountBand).toBe('');
    expect(normalized.initialSetupAnswers.plusOnePolicy).toBe('');
  });

  it('drops malformed follow-up answers with blank keys', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      followUpAnswers: {
        '': 'should disappear',
        ' event-1-time ': ' 6:00 PM ',
        'lodging': '   ',
      },
    });

    expect(normalized.followUpAnswers).toEqual({ 'event-1-time': '6:00 PM' });
  });

  it('dedupes trimmed follow-up keys so the latest answer wins', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      followUpAnswers: {
        'event-1-time': '5:00 PM',
        ' event-1-time ': '6:00 PM',
      },
    });

    expect(normalized.followUpAnswers).toEqual({ 'event-1-time': '6:00 PM' });
  });

  it('clears follow-up mode when no clarifying state survived restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: { clarifying: [] },
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('drops malformed clarifying question entries during restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{ id: 42 }, {
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
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toHaveLength(1);
    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('restores clarifying state even when older snapshots omitted draft outputs', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.clarifyingState?.clarifying.questions).toHaveLength(1);
    expect(normalized.clarifyingState?.draftOutputs).toEqual({});
    expect(normalized.showFollowUps).toBe(true);
  });

  it('restores clarifying state even when older snapshots omitted history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.clarifyingState?.clarifying.questions).toHaveLength(1);
    expect(normalized.clarifyingState?.clarifying.history).toEqual([]);
    expect(normalized.showFollowUps).toBe(true);
  });

  it('drops clarifying questions with non-string target fields during restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
            targetFields: ['events.0.time', 7],
            affectedSections: ['schedule'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toEqual([]);
    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('drops clarifying questions with fractional rounds during restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
            round: 1.5,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toEqual([]);
    expect(normalized.showFollowUps).toBe(false);
  });

  it('drops clarifying questions with blank ids after trimming during restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: '   ',
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
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toEqual([]);
    expect(normalized.showFollowUps).toBe(false);
  });

  it('drops duplicate clarifying questions after trimming ids during restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
          }, {
            id: ' event-1-time ',
            category: 'event_structure',
            question: 'When is dinner exactly?',
            expectedAnswerType: 'short_text',
            targetFields: ['events.0.time'],
            affectedSections: ['schedule'],
            skippable: true,
            round: 2,
            status: 'answered',
            answer: '6:00 PM',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toHaveLength(1);
    expect(normalized.clarifyingState?.clarifying.questions[0]?.id).toBe('event-1-time');
    expect(normalized.clarifyingState?.clarifying.questions[0]?.answer).toBe('6:00 PM');
  });

  it('trims restored clarifying question text fields', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: ' event-1-time ',
            category: ' event_structure ',
            question: ' When is dinner? ',
            expectedAnswerType: ' short_text ',
            targetFields: [' events.0.time '],
            affectedSections: [' schedule '],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: ' 6:00 PM ',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions[0]).toMatchObject({
      id: 'event-1-time',
      category: 'event_structure',
      question: 'When is dinner?',
      expectedAnswerType: 'short_text',
      targetFields: ['events.0.time'],
      affectedSections: ['schedule'],
      answer: '6:00 PM',
    });
  });

  it('drops clarifying questions whose field paths become blank after trimming', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
            targetFields: ['   '],
            affectedSections: ['schedule'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toEqual([]);
    expect(normalized.showFollowUps).toBe(false);
  });

  it('dedupes trimmed clarifying history ids so the latest answer wins', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [],
          history: [{
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
          }, {
            id: ' event-1-time ',
            category: 'event_structure',
            question: 'When is dinner exactly?',
            expectedAnswerType: 'short_text',
            targetFields: ['events.0.time'],
            affectedSections: ['schedule'],
            skippable: true,
            round: 2,
            status: 'answered',
            answer: '6:00 PM',
          }],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.history).toHaveLength(1);
    expect(normalized.clarifyingState?.clarifying.history[0]?.id).toBe('event-1-time');
    expect(normalized.clarifyingState?.clarifying.history[0]?.answer).toBe('6:00 PM');
  });

  it('drops answered clarifying entries whose answers become blank after trimming', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
            status: 'answered',
            answer: '   ',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.clarifyingState?.clarifying.questions).toEqual([]);
    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('sanitizes restored clarifying draft outputs to trimmed strings', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [],
        },
        draftOutputs: {
          hero: {
            headline: ' Welcome to our wedding ',
            subheadline: 7,
          },
          faq: {
            guidance: [' Bring layers ', 4, ' ', ' RSVP early '],
          },
          guestGuidance: {
            lodging: ' Stay nearby ',
            children: null,
          },
        },
      },
    });

    expect(normalized.clarifyingState?.draftOutputs).toEqual({
      hero: {
        headline: 'Welcome to our wedding',
      },
      faq: {
        guidance: ['Bring layers', 'RSVP early'],
      },
      guestGuidance: {
        lodging: 'Stay nearby',
      },
    });
  });

  it('drops empty clarifying draft output sections after sanitizing', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [],
        },
        draftOutputs: {
          hero: {
            headline: '   ',
          },
          faq: {
            guidance: ['   ', 4],
          },
          guestGuidance: {
            children: null,
          },
          siteTone: {
            summary: '  airy and warm  ',
          },
        },
      },
    });

    expect(normalized.clarifyingState?.draftOutputs).toEqual({
      siteTone: {
        summary: 'airy and warm',
      },
    });
  });

  it('drops stale follow-up answers that no longer match restored clarifying state', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
  });

  it('drops follow-up answers tied only to skipped clarifying history entries', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
  });

  it('drops skipped-question follow-up answers and reopens the question view', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
    expect(normalized.clarifyingState?.clarifying.mode).toBe('draft');
    expect(normalized.followUpAnswers).toEqual({});
  });

  it('keeps follow-up mode open for unresolved restored clarifying questions', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
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
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('reopens follow-up view when resumable clarifying work survives a stale question view restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: true,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('restores follow-up mode when older snapshots lost the follow-up flag but kept the follow-up view', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('reopens question view when follow-up flag is off even if stale follow-up view was persisted', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('keeps answered follow-up answers when older restores still store them on questions without history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
  });

  it('does not reopen follow-up mode when older historyless restores only kept answered questions', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
  });

  it('prefers restored answered clarifying values over stale follow-up answers', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Stay at the resort' });
  });

  it('prefers active draft answers over stale answered history when the question was reopened', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Old hotel block' });
    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('restores typed text from reopened clarifying questions when follow-up answers are missing', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('keeps question view closed when older restores explicitly turned follow-ups off', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: false,
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('keeps explicit follow-up opt-out closed even when typed draft answers survive restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('keeps explicit follow-up opt-out closed when malformed view state survives typed clarifying drafts', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: false,
      viewState: 42 as never,
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('falls back to follow-up mode when malformed showFollowUps flags survive older restores', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: 'true' as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('falls back to follow-up mode when malformed showFollowUps flags survive with typed clarifying drafts', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: 'true' as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('falls back to follow-up mode when malformed showFollowUps flags survive alongside active draft answers and older history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: 'true' as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
  });

  it('ignores malformed follow-up opt-out flags when typed clarifying drafts still need resume', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: 'false' as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('ignores malformed follow-up opt-out flags when active draft answers survive older answered history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      showFollowUps: 'false' as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
  });

  it('reopens follow-up mode when older snapshots lost the flag but kept in-progress answers', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('reopens follow-up mode when active draft answers survive alongside older answered history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
  });

  it('reopens follow-up view when stale thinking restores already have pending clarifying questions', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('reopens follow-up view instead of stale thinking when active draft answers survived restore', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
  });

  it('reopens follow-up view when older restores lost the follow-up flag after questions were generated', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
  });

  it('closes stale thinking view when follow-up resume is no longer active', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('preserves thinking view only while clarifying generation has not produced questions yet', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(false);
    expect(normalized.viewState).toBe('question');
  });

  it('reopens follow-up mode when older snapshots only kept typed clarifying question answers', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
  });

  it('reopens follow-up mode for typed reopened clarifying drafts even when older answered history exists', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need to confirm hotel block' });
  });

  it('reopens follow-up mode when malformed view state survives alongside typed clarifying drafts', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      viewState: 42 as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ transport: 'Need shuttle details' });
  });

  it('reopens follow-up mode when malformed view state survives alongside active draft answers and older answered history', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      viewState: 42 as never,
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
    });

    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers).toEqual({ lodging: 'Need shuttle details' });
  });
});
