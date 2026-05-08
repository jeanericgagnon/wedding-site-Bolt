import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COORDINATOR_STORAGE_RETENTION_MS,
  getCoordinatorStorageKey,
  readStoredCoordinatorActiveWorkState,
  readStoredCoordinatorAlertIntentState,
  readStoredCoordinatorCommandState,
  readStoredCoordinatorDraftState,
  readStoredCoordinatorQnaItems,
  readStoredCoordinatorSessionState,
  readStoredCoordinatorTimelineState,
  writeStoredCoordinatorActiveWorkState,
  writeStoredCoordinatorAlertIntentState,
  writeStoredCoordinatorCommandState,
  writeStoredCoordinatorDraftState,
  writeStoredCoordinatorQnaItems,
  writeStoredCoordinatorSessionState,
  writeStoredCoordinatorTimelineState,
} from './coordinatorStorage';

describe('coordinator storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps legacy coordinator storage keys stable', () => {
    expect(getCoordinatorStorageKey('site-1', 'timeline')).toBe('dayof.timeline.site-1');
    expect(getCoordinatorStorageKey('site-1', 'qna')).toBe('dayof.qna.site-1');
    expect(getCoordinatorStorageKey('site-1', 'session')).toBe('dayof.coordinator.session.site-1');
  });

  it('normalizes timeline and qna storage with invalid fallback', () => {
    localStorage.setItem(getCoordinatorStorageKey('site-1', 'timeline'), JSON.stringify({ e1: 'live', e2: 'bad' }));
    localStorage.setItem(getCoordinatorStorageKey('site-1', 'qna'), JSON.stringify([
      { id: 'q1', question: 'Parking?', status: 'answered', answer: 'Yes' },
      { id: '', question: 'Bad', status: 'new' },
    ]));

    expect(readStoredCoordinatorTimelineState('site-1')).toEqual({ e1: 'live' });
    expect(readStoredCoordinatorQnaItems('site-1')).toEqual([
      { id: 'q1', question: 'Parking?', status: 'answered', answer: 'Yes' },
    ]);

    localStorage.setItem(getCoordinatorStorageKey('site-1', 'timeline'), '{broken');
    expect(readStoredCoordinatorTimelineState('site-1')).toEqual({});
  });

  it('round-trips normalized session, draft, command, and intent state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    writeStoredCoordinatorSessionState('site-1', {
      checkInFilter: 'all',
      checkInQuery: 'alex',
      checkInReviewOnly: true,
      panelFocus: 'check-in',
      alertChannelFilter: 'sms',
      alertTimingFilter: 'scheduled',
    });
    writeStoredCoordinatorDraftState('site-1', {
      alertForm: {
        subject: 'Update',
        body: 'Body',
        audience: 'all',
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: '2026-05-05',
        scheduleTime: '14:00',
      },
      qnaDraftAnswers: { q1: 'Answer' },
      qnaInput: 'Question',
    });
    writeStoredCoordinatorCommandState('site-1', {
      source: 'primary-action',
      panelFocus: 'timeline',
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
    });
    writeStoredCoordinatorAlertIntentState('site-1', { lastSuggestionKey: 'suggestion-1' });

    expect(readStoredCoordinatorSessionState('site-1').checkInQuery).toBe('alex');
    expect(readStoredCoordinatorDraftState('site-1').alertForm.channel).toBe('email');
    expect(readStoredCoordinatorCommandState('site-1').source).toBe('primary-action');
    expect(readStoredCoordinatorAlertIntentState('site-1').lastSuggestionKey).toBe('suggestion-1');
    expect(JSON.parse(localStorage.getItem(getCoordinatorStorageKey('site-1', 'draft')) || '{}').savedAtISO).toBe('2026-05-06T12:00:00.000Z');
  });

  it('migrates legacy coordinator storage values into timestamped envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:30:00.000Z'));
    localStorage.setItem(getCoordinatorStorageKey('site-1', 'qna'), JSON.stringify([
      { id: 'q1', question: 'Parking?', status: 'answered', answer: 'Yes' },
    ]));

    expect(readStoredCoordinatorQnaItems('site-1')).toEqual([
      { id: 'q1', question: 'Parking?', status: 'answered', answer: 'Yes' },
    ]);
    const stored = JSON.parse(localStorage.getItem(getCoordinatorStorageKey('site-1', 'qna')) || '{}');
    expect(stored.savedAtISO).toBe('2026-05-06T12:30:00.000Z');
    expect(stored.value).toEqual([
      { id: 'q1', question: 'Parking?', status: 'answered', answer: 'Yes' },
    ]);
  });

  it('clears expired coordinator storage envelopes on read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(getCoordinatorStorageKey('site-1', 'draft'), JSON.stringify({
      savedAtISO: new Date(Date.now() - COORDINATOR_STORAGE_RETENTION_MS - 1).toISOString(),
      value: {
        alertForm: {
          subject: 'Old update',
          body: 'Old body',
          audience: 'all',
          channel: 'email',
        },
      },
    }));

    expect(readStoredCoordinatorDraftState('site-1').alertForm.subject).toBe('');
    expect(localStorage.getItem(getCoordinatorStorageKey('site-1', 'draft'))).toBeNull();
  });

  it('round-trips active work ids defensively', () => {
    writeStoredCoordinatorActiveWorkState('site-1', { activeQnaId: 'q1' });
    expect(readStoredCoordinatorActiveWorkState('site-1')).toEqual({ activeQnaId: 'q1' });

    localStorage.setItem(getCoordinatorStorageKey('site-1', 'active'), JSON.stringify({ activeQnaId: '   ' }));
    expect(readStoredCoordinatorActiveWorkState('site-1')).toEqual({ activeQnaId: null });
  });
});
