import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertActivityBoard } from './coordinatorAlertActivityBoard';

describe('coordinatorAlertActivityBoard', () => {
  it('shows latest live send and next scheduled follow-up', () => {
    const scheduledSendTime = new Date('2026-04-22T16:00:00.000Z').toLocaleString();

    expect(buildCoordinatorAlertActivityBoard([
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
    ])).toEqual({
      statusLabel: 'Scheduled follow-up is armed',
      tone: 'warning',
      latestLiveLabel: 'Ceremony is starting · SMS',
      nextScheduledLabel: `Reception reminder · ${scheduledSendTime}`,
      channelLabel: '1 SMS · 1 email',
      pacingLabel: 'Live send pace is leading',
    });
  });

  it('shows neutral state before any alert activity exists', () => {
    expect(buildCoordinatorAlertActivityBoard([])).toEqual({
      statusLabel: 'No alert activity yet',
      tone: 'neutral',
      latestLiveLabel: 'No live send yet',
      nextScheduledLabel: 'No scheduled send queued',
      channelLabel: '0 SMS · 0 email',
      pacingLabel: 'No pacing signal yet',
    });
  });

  it('keeps invalid persisted scheduled send times from outranking real follow-ups', () => {
    const scheduledSendTime = new Date('2026-04-22T16:00:00.000Z').toLocaleString();

    expect(buildCoordinatorAlertActivityBoard([
      {
        id: 'bad',
        subject: 'Broken schedule',
        audience: 'all',
        channel: 'sms',
        queuedAt: '2026-04-22T14:00:00.000Z',
        sendAt: 'not-a-date',
      },
      {
        id: 'good',
        subject: 'Reception reminder',
        audience: 'checked-in',
        channel: 'email',
        queuedAt: '2026-04-22T14:05:00.000Z',
        sendAt: '2026-04-22T16:00:00.000Z',
      },
    ]).nextScheduledLabel).toBe(`Reception reminder · ${scheduledSendTime}`);
  });
});
