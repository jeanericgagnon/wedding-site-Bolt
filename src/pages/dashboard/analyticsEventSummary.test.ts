import { describe, expect, it } from 'vitest';
import { buildAnalyticsEventSummary } from './analyticsEventSummary';

describe('analyticsEventSummary', () => {
  it('aggregates privacy-safe website, invite, qr, and click counts', () => {
    const summary = buildAnalyticsEventSummary([
      { event_type: 'view', target: '/event', created_at: '2026-05-14T10:00:00.000Z' },
      { event_type: 'view', target: '/event/invite', created_at: '2026-05-14T10:05:00.000Z' },
      { event_type: 'view', target: '/rsvp/invite', created_at: '2026-05-14T10:06:00.000Z' },
      { event_type: 'view', target: '/rsvp-event/invite', created_at: '2026-05-14T10:07:00.000Z' },
      { event_type: 'view', target: '/event/qr', created_at: '2026-05-14T10:10:00.000Z' },
      { event_type: 'view', target: '/event/recap', created_at: '2026-05-14T10:12:00.000Z' },
      { event_type: 'click', target: '/site/maya-and-leo#rsvp', created_at: '2026-05-14T10:15:00.000Z' },
      { event_type: 'click', target: '/site/maya-and-leo#registry', created_at: '2026-05-14T10:16:00.000Z' },
      { event_type: 'click', target: '/site/maya-and-leo#travel', created_at: '2026-05-14T10:17:00.000Z' },
      { event_type: 'click', target: '/photos/upload?site=maya-and-leo&hub=1', created_at: '2026-05-14T10:18:00.000Z' },
    ], {
      now: new Date('2026-05-14T12:00:00.000Z').getTime(),
    });

    expect(summary).toMatchObject({
      totalTrackedEvents: 10,
      pageViews: 5,
      siteVisits: 1,
      inviteOpens: 3,
      qrScans: 1,
      recapViews: 1,
      totalClicks: 4,
      rsvpClicks: 1,
      registryClicks: 1,
      travelClicks: 1,
      photoClicks: 1,
      lastTrackedAt: '2026-05-14T10:18:00.000Z',
    });
  });

  it('drops stale and malformed rows outside the lookback window', () => {
    const summary = buildAnalyticsEventSummary([
      { event_type: 'view', target: '/event', created_at: '2026-04-01T00:00:00.000Z' },
      { event_type: 'view', target: '/event/qr', created_at: null },
      { event_type: 'click', target: '/site/maya-and-leo#rsvp', created_at: 'not-a-date' },
    ], {
      now: new Date('2026-05-14T12:00:00.000Z').getTime(),
    });

    expect(summary.totalTrackedEvents).toBe(0);
    expect(summary.lastTrackedAt).toBeNull();
  });
});
