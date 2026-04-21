import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorDraftState } from './coordinatorDraftState';

describe('coordinatorDraftState', () => {
  it('restores valid operator draft state', () => {
    expect(normalizeCoordinatorDraftState({
      alertForm: {
        subject: 'Weather update',
        body: 'Ceremony is moving inside.',
        audience: 'all',
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: '2026-04-19',
        scheduleTime: '15:30',
      },
      qnaDraftAnswers: {
        q1: 'Use the hotel valet lot.',
      },
      qnaInput: 'Can we move grandma closer to the aisle?',
    })).toEqual({
      alertForm: {
        subject: 'Weather update',
        body: 'Ceremony is moving inside.',
        audience: 'all',
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: '2026-04-19',
        scheduleTime: '15:30',
      },
      qnaDraftAnswers: {
        q1: 'Use the hotel valet lot.',
      },
      qnaInput: 'Can we move grandma closer to the aisle?',
    });
  });

  it('drops malformed operator draft state safely', () => {
    expect(normalizeCoordinatorDraftState({
      alertForm: {
        channel: 'push',
        scheduleType: 'sometime',
      },
      qnaDraftAnswers: ['bad'],
      qnaInput: 42,
    })).toEqual({
      alertForm: {
        subject: '',
        body: '',
        audience: 'all',
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      },
      qnaDraftAnswers: {},
      qnaInput: '',
    });
  });
});
