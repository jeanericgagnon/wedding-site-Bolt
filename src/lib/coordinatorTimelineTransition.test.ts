import { describe, expect, it } from 'vitest';
import { getCoordinatorTimelineTransitionLabel, syncCoordinatorAlertDraftForTimelineTransition } from './coordinatorTimelineTransition';

describe('coordinatorTimelineTransition', () => {
  it('describes live transitions with synced alert follow-through', () => {
    expect(getCoordinatorTimelineTransitionLabel({
      eventName: 'Ceremony',
      nextState: 'live',
      syncedAlert: true,
    })).toBe('Ceremony moved live — alert draft stayed in sync');
  });

  it('leaves custom drafts alone when the alert lane should not sync', () => {
    expect(syncCoordinatorAlertDraftForTimelineTransition({
      form: {
        subject: 'Custom VIP note',
        body: 'Hold the front row for family first.',
        audience: 'all',
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      },
      nextSuggestion: {
        key: 'live:event-1',
        label: 'Update live event',
        subject: 'Ceremony is live',
        body: 'Ceremony is happening now. Please make your way over if you\'re joining us.',
        audience: 'event:event-1',
      },
      shouldSync: false,
    })).toEqual({
      subject: 'Custom VIP note',
      body: 'Hold the front row for family first.',
      audience: 'all',
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
    });
  });

  it('re-aligns the alert draft when the board-owned lane transitions', () => {
    expect(syncCoordinatorAlertDraftForTimelineTransition({
      form: {
        subject: 'Cocktail Hour is coming up',
        body: 'Cocktail Hour is coming up shortly. Please be ready to head over soon.',
        audience: 'event:event-2',
        channel: 'email',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      },
      nextSuggestion: {
        key: 'live:event-1',
        label: 'Update live event',
        subject: 'Ceremony is live',
        body: 'Ceremony is happening now. Please make your way over if you\'re joining us.',
        audience: 'event:event-1',
      },
      shouldSync: true,
    })).toEqual({
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now. Please make your way over if you\'re joining us.',
      audience: 'event:event-1',
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
    });
  });
});
