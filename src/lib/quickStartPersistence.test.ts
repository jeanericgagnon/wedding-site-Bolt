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
});
