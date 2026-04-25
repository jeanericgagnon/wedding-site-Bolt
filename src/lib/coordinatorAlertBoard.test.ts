import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertBoard } from './coordinatorAlertBoard';

describe('coordinatorAlertBoard', () => {
  it('summarizes a board-ready live draft with recent live send context', () => {
    expect(buildCoordinatorAlertBoard({
      aligned: true,
      laneLabel: 'Live event update',
      audienceLabel: 'Ceremony guests',
      recipientLabel: '42 recipients',
      deliveryLabel: 'SMS now',
      hasDraftContent: true,
      latestAlert: {
        id: '1',
        subject: 'Ceremony is live',
        audience: 'event:event-1',
        channel: 'sms',
        queuedAt: '2026-04-21T20:00:00.000Z',
        sendAt: null,
      },
    })).toEqual({
      statusLabel: 'Board-ready',
      statusTone: 'ready',
      targetLabel: 'Live event update · Ceremony guests · 42 recipients',
      deliveryLabel: 'SMS now',
      latestActivityLabel: 'Latest live send: Ceremony is live via SMS',
    });
  });

  it('surfaces an idle draft state before any sends exist', () => {
    expect(buildCoordinatorAlertBoard({
      aligned: false,
      laneLabel: 'Custom update',
      audienceLabel: 'All guests',
      recipientLabel: '0 recipients',
      deliveryLabel: 'Email now',
      hasDraftContent: false,
      latestAlert: null,
    })).toEqual({
      statusLabel: 'Draft needed',
      statusTone: 'idle',
      targetLabel: 'Custom update · All guests · 0 recipients',
      deliveryLabel: 'Email now',
      latestActivityLabel: 'No recent day-of sends yet.',
    });
  });

  it('guards invalid persisted scheduled send labels', () => {
    expect(buildCoordinatorAlertBoard({
      aligned: true,
      laneLabel: 'Live event update',
      audienceLabel: 'Ceremony guests',
      recipientLabel: '42 recipients',
      deliveryLabel: 'SMS now',
      hasDraftContent: true,
      latestAlert: {
        id: '1',
        subject: 'Ceremony is live',
        audience: 'event:event-1',
        channel: 'sms',
        queuedAt: '2026-04-21T20:00:00.000Z',
        sendAt: 'not-a-date',
      },
    }).latestActivityLabel).toBe('Latest scheduled send: Ceremony is live at Unknown time');
  });
});
