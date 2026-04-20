import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertSummary } from './coordinatorAlertSummary';

describe('coordinatorAlertSummary', () => {
  it('builds a clear operator summary for immediate sends', () => {
    expect(buildCoordinatorAlertSummary({
      form: {
        subject: 'Ceremony is live',
        body: 'Please head over now.',
        audience: 'event:ceremony',
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      },
      audienceOptions: [
        { value: 'event:ceremony', label: 'Ceremony guests' },
      ],
      preferredSuggestion: {
        key: 'live:ceremony',
        label: 'Update live event',
        subject: 'Ceremony is live',
        body: 'Please head over now.',
        audience: 'event:ceremony',
      },
      recipientCount: 42,
    })).toEqual({
      intentLabel: 'Update live event',
      audienceLabel: 'Ceremony guests',
      recipientLabel: '42 recipients',
      deliveryLabel: 'SMS now',
    });
  });

  it('describes scheduled sends with date and time', () => {
    expect(buildCoordinatorAlertSummary({
      form: {
        subject: 'Cocktails coming up',
        body: 'Be ready to head over soon.',
        audience: 'all',
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: '2026-04-19',
        scheduleTime: '18:15',
      },
      audienceOptions: [{ value: 'all', label: 'All guests' }],
      preferredSuggestion: null,
      recipientCount: 8,
    }).deliveryLabel).toBe('EMAIL later on 2026-04-19 at 18:15');
  });
});
