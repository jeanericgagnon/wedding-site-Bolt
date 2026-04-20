import { describe, expect, it } from 'vitest';
import { applyCoordinatorAlertSuggestion } from './coordinatorAlertSuggestionApply';

describe('coordinatorAlertSuggestionApply', () => {
  it('snaps a draft back to the recommended alert suggestion without changing timing settings', () => {
    expect(applyCoordinatorAlertSuggestion({
      form: {
        audience: 'all',
        channel: 'sms',
        scheduleType: 'later',
        scheduleDate: '2026-04-20',
        scheduleTime: '15:30',
        subject: 'Custom subject',
        body: 'Custom body',
      },
      suggestion: {
        key: 'live:event-1',
        label: 'Update live event',
        audience: 'event:event-1',
        subject: 'Ceremony is live',
        body: 'Ceremony is happening now.',
      },
    })).toEqual({
      audience: 'event:event-1',
      channel: 'sms',
      scheduleType: 'later',
      scheduleDate: '2026-04-20',
      scheduleTime: '15:30',
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now.',
    });
  });
});
