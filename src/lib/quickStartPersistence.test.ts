import { describe, expect, it } from 'vitest';
import { normalizeQuickStartDraftSnapshot } from './quickStartPersistence';

describe('quickStartPersistence', () => {
  it('restores quick start follow-up mode and typed clarifying answers', () => {
    const normalized = normalizeQuickStartDraftSnapshot({
      currentIndex: 13,
      showFollowUps: true,
      viewState: 'followups',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
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
      currentIndex: -5,
      followUpAnswers: ['bad'],
      viewState: 'bogus',
    });

    expect(normalized.currentIndex).toBe(0);
    expect(normalized.followUpAnswers).toEqual({});
    expect(normalized.viewState).toBe('question');
  });
});
