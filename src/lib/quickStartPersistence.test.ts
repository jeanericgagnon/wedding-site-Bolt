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
    expect(normalized.showFollowUps).toBe(true);
    expect(normalized.viewState).toBe('followups');
    expect(normalized.followUpAnswers['event-1-time']).toBe('6:00 PM');
    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.clarifyingState?.clarifying.mode).toBe('ask');
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
});
