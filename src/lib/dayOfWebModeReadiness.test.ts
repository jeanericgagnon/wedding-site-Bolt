import { describe, expect, it } from 'vitest';
import { buildDayOfHubStatusBoard, buildDayOfWebModeReadiness } from './dayOfWebModeReadiness';

describe('day-of web mode readiness', () => {
  it('marks the no-app guest hub ready when core wedding-day actions are enabled', () => {
    const model = buildDayOfWebModeReadiness({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['rsvp', 'schedule', 'travel', 'photos', 'guestbook', 'recap'],
      hasCustomMessage: true,
      hasWeddingDate: true,
      hasGuestLanguagePreference: true,
      hasPoorNetworkFallback: true,
      hasOfflineSnapshot: true,
      hasServiceWorkerShell: true,
    });

    expect(model.status).toBe('ready');
    expect(model.summary).toBe('Ready as a no-app guest hub for the wedding day with 6 guest actions live, including RSVP, Schedule, Directions and travel, and more.');
    expect(model.readyCount).toBe(7);
    expect(model.plannedCount).toBe(1);
    expect(model.signals.find((signal) => signal.id === 'guest-actions')?.detail).toContain('RSVP, Schedule, Directions and travel');
    expect(model.signals.find((signal) => signal.id === 'poor-network')?.detail).toContain('last saved update');
    expect(model.signals.find((signal) => signal.id === 'offline-shell')?.state).toBe('ready');
  });

  it('flags missing action coverage without claiming announcements or offline mode exist', () => {
    const model = buildDayOfWebModeReadiness({
      siteSlug: 'wedding',
      enabledActionIds: ['rsvp'],
      hasCustomMessage: false,
      hasWeddingDate: false,
      hasGuestLanguagePreference: false,
    });

    expect(model.status).toBe('needs-content');
    expect(model.needsContentCount).toBe(2);
    expect(model.summary).toBe('2 items need content before this feels day-of ready. Still missing from day-of coverage: Schedule, Directions and travel, Photo upload.');
    expect(model.signals.find((signal) => signal.id === 'announcements')?.state).toBe('planned');
    expect(model.signals.find((signal) => signal.id === 'poor-network')?.detail).toContain('not built');
    expect(model.signals.find((signal) => signal.id === 'offline-shell')?.detail).toContain('cached app shell');
  });

  it('stays empty when there is no site link or enabled guest action', () => {
    const model = buildDayOfWebModeReadiness({
      siteSlug: '',
      enabledActionIds: [],
      hasCustomMessage: false,
      hasWeddingDate: false,
      hasGuestLanguagePreference: false,
    });

    expect(model.status).toBe('empty');
    expect(model.summary).toBe('Add a site link and guest actions before sharing this as day-of mode.');
  });

  it('builds a guest-safe status board without claiming live announcements or guest state', () => {
    const board = buildDayOfHubStatusBoard({
      enabledActionIds: ['rsvp', 'schedule', 'travel', 'photos'],
      hasPoorNetworkFallback: true,
    });

    expect(board.status).toBe('planned');
    expect(board.readyCount).toBe(2);
    expect(board.plannedCount).toBe(4);
    expect(board.summary).toBe('2 day-of status items are usable now; 4 stay planned or need setup.');
    expect(board.items.find((item) => item.id === 'announcements')).toMatchObject({
      state: 'planned',
      detail: 'Live updates still belong in owner messaging until announcement readback is connected.',
    });
    expect(board.items.find((item) => item.id === 'guest-state')?.detail).toContain('dedicated flows');
    expect(board.items.find((item) => item.id === 'link-access')?.detail).toContain('infer whether this hub link is public or private');
  });

  it('marks status board ready only when live handoff pieces are connected', () => {
    const board = buildDayOfHubStatusBoard({
      enabledActionIds: ['rsvp', 'schedule', 'travel', 'photos'],
      hasPoorNetworkFallback: true,
      announcementsConnected: true,
      guestSpecificStateConnected: true,
      coordinatorHandoffConnected: true,
      privateEventVisibilityConnected: true,
    });

    expect(board.status).toBe('ready');
    expect(board.readyCount).toBe(6);
    expect(board.plannedCount).toBe(0);
    expect(board.items.find((item) => item.id === 'link-access')?.detail).toBe(
      'Guests can tell whether this hub link is public, invite-only, or guest-specific, plus which actions are unlocked from it: RSVP, Schedule, Directions and travel, and Photo upload. Core day-of coverage from this link is ready: RSVP, Schedule, Directions and travel, and Photo upload.'
    );
  });
});
