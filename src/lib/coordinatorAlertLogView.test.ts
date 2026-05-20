import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertLogView } from './coordinatorAlertLogView';

describe('coordinatorAlertLogView', () => {
  it('formats live and scheduled alert rows for day-of ops reading', () => {
    const scheduledSendTime = new Date('2026-04-22T16:00:00.000Z').toLocaleString();

    expect(buildCoordinatorAlertLogView([
      {
        id: 'a1',
        subject: 'Ceremony is starting',
        audience: 'all',
        channel: 'sms',
        queuedAt: '2026-04-22T14:00:00.000Z',
        sendAt: null,
      },
      {
        id: 'a2',
        subject: 'Reception reminder',
        audience: 'checked-in',
        channel: 'email',
        queuedAt: '2026-04-22T14:05:00.000Z',
        sendAt: '2026-04-22T16:00:00.000Z',
      },
    ])).toEqual([
      {
        id: 'a1',
        tone: 'ready',
        title: 'Live send',
        meta: 'SMS · sent live',
        detail: 'Ceremony is starting · all',
      },
      {
        id: 'a2',
        tone: 'warning',
        title: 'Scheduled send',
        meta: `${scheduledSendTime} · EMAIL`,
        detail: 'Reception reminder · checked-in',
      },
    ]);
  });

  it('guards invalid persisted scheduled send timestamps in owner-facing log rows', () => {
    expect(buildCoordinatorAlertLogView([
      {
        id: 'a2',
        subject: 'Reception reminder',
        audience: 'checked-in',
        channel: 'email',
        queuedAt: '2026-04-22T14:05:00.000Z',
        sendAt: 'not-a-date',
      },
    ])).toEqual([
      {
        id: 'a2',
        tone: 'warning',
        title: 'Scheduled send',
        meta: 'Unknown time · EMAIL',
        detail: 'Reception reminder · checked-in',
      },
    ]);
  });
});
