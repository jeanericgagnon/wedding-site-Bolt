import { describe, expect, it } from 'vitest';
import { resetCoordinatorAlertFormAfterSend } from './coordinatorAlertReset';

describe('coordinatorAlertReset', () => {
  it('clears sent message content while preserving operator targeting context', () => {
    expect(resetCoordinatorAlertFormAfterSend({
      subject: 'Weather update',
      body: 'Ceremony is moving inside.',
      audience: 'event:ceremony',
      channel: 'sms',
      scheduleType: 'later',
      scheduleDate: '2026-04-19',
      scheduleTime: '15:30',
    })).toEqual({
      subject: '',
      body: '',
      audience: 'event:ceremony',
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
    });
  });
});
