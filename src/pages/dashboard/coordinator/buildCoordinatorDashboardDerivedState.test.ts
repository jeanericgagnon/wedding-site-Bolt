import { describe, expect, it } from 'vitest';
import { buildCoordinatorDashboardDerivedState } from './buildCoordinatorDashboardDerivedState';

function makeArgs(overrides: Record<string, unknown> = {}) {
  return {
    activeGuestId: null,
    activeQnaId: null,
    activeTimelineEventId: null,
    alertChannelFilter: 'all',
    alertForm: {
      audience: 'all',
      channel: 'sms',
      sendAt: '',
      subject: '',
      body: '',
    },
    alertLog: [],
    alertOverrideLabelState: null,
    alertOverrideUpdatedAt: null,
    alertTimingFilter: 'all',
    checkInFilter: 'all',
    checkInQuery: '',
    checkInReviewOnly: false,
    commandSource: null,
    coordinatorPermissions: [],
    coordinatorRole: 'owner',
    eventGuestIds: {
      live: new Set(['guest-live']),
      next: new Set(['guest-next']),
    },
    eventSeatingConfiguredIds: new Set(['live', 'next']),
    events: [
      { id: 'live', event_name: 'Ceremony', start_time: '2026-05-13T16:00:00Z' },
      { id: 'next', event_name: 'Reception', start_time: '2026-05-13T19:00:00Z' },
    ],
    guests: [
      {
        id: 'guest-live',
        first_name: 'Alex',
        last_name: 'Rivera',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        invite_token: 'guest-token-live',
        rsvp_status: 'confirmed',
        checked_in_at: null,
        event_arrivals: {
          live: {
            seating_event_id: 'seat-live',
            table_id: 'table-1',
            table_name: 'Table 1',
            checked_in_at: null,
            is_seated: true,
          },
        },
      },
      {
        id: 'guest-next',
        first_name: 'Sam',
        last_name: 'Lee',
        name: 'Sam Lee',
        email: 'sam@example.com',
        invite_token: 'guest-token-next',
        rsvp_status: 'confirmed',
        checked_in_at: null,
        event_arrivals: {
          next: {
            seating_event_id: 'seat-next',
            table_id: 'table-2',
            table_name: 'Table 2',
            checked_in_at: null,
            is_seated: true,
          },
        },
      },
    ],
    lastAlertSuggestionKey: null,
    manualOverrideLabel: null,
    manualOverrideUpdatedAt: null,
    panelFocus: null,
    previousAlertAligned: null,
    qnaDraftAnswers: {},
    qnaFilter: 'open',
    qnaItems: [],
    summaryFeedback: null,
    timelineState: {
      live: 'live',
      next: 'up-next',
    },
    canEditTimeline: true,
    canScheduleAlerts: true,
    ...overrides,
  } as never;
}

describe('buildCoordinatorDashboardDerivedState', () => {
  it('scopes the active door queue to the live event when one exists', () => {
    const state = buildCoordinatorDashboardDerivedState(makeArgs());

    expect(state.liveEventId).toBe('live');
    expect(state.upNextEventId).toBe('next');
    expect(state.checkInEventId).toBe('live');
    expect(state.checkInEventName).toBe('Ceremony');
    expect(state.checkInQueue.map((guest) => guest.id)).toEqual(['guest-live']);
    expect(state.checkInBoard.eventLabel).toBe('Ceremony door');
  });

  it('falls back to the up-next event when nothing is currently live', () => {
    const state = buildCoordinatorDashboardDerivedState(makeArgs({
      timelineState: {
        live: 'done',
        next: 'up-next',
      },
    }));

    expect(state.liveEventId).toBeNull();
    expect(state.upNextEventId).toBe('next');
    expect(state.checkInEventId).toBe('next');
    expect(state.checkInEventName).toBe('Reception');
    expect(state.checkInQueue.map((guest) => guest.id)).toEqual(['guest-next']);
    expect(state.checkInBoard.eventLabel).toBe('Reception door');
  });

  it('keeps the visible role capability board aligned to explicit collaborator permissions', () => {
    const state = buildCoordinatorDashboardDerivedState(makeArgs({
      canEditTimeline: false,
      canScheduleAlerts: false,
      coordinatorPermissions: ['guests'],
      coordinatorRole: 'coordinator',
    }));

    expect(state.roleCapabilities.map((item) => [item.key, item.enabled])).toEqual([
      ['check-in', true],
      ['timeline', false],
      ['qna', false],
      ['alerts-now', false],
      ['alerts-later', false],
    ]);
    expect(state.roleBoard.enabledLabel).toBe('Check-in');
    expect(state.roleBoard.blockedLabel).toBe('Timeline · Guest Q&A · Send now · Schedule');
  });
});
