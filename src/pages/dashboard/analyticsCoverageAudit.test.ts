import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AGGREGATE_INVITE_OPEN_VIEW_TARGETS, AGGREGATE_QR_VIEW_TARGETS, buildAnalyticsEventSummary } from './analyticsEventSummary';

describe('website invite analytics coverage audit', () => {
  it('keeps the audited invite-open targets aligned with the current direct guest-entry routes', () => {
    expect(AGGREGATE_INVITE_OPEN_VIEW_TARGETS).toEqual([
      '/event/invite',
      '/site/invite',
      '/event/recap/invite',
      '/rsvp/invite',
      '/rsvp-event/invite',
      '/guest-contact/invite',
      '/guestbook/invite',
      '/photos/upload/invite',
      '/vault/invite',
      '/vault/invite/year',
    ]);

    const auditedRouteSources = [
      ['src/pages/EventHub.tsx', "/event/invite"],
      ['src/pages/SiteView.tsx', "/site/invite"],
      ['src/pages/EventRecap.tsx', "/event/recap/invite"],
      ['src/pages/RSVP.tsx', "/rsvp/invite"],
      ['src/pages/EventRSVP.tsx', "/rsvp-event/invite"],
      ['src/pages/GuestContactUpdate.tsx', "/guest-contact/invite"],
      ['src/pages/GuestbookSubmit.tsx', "/guestbook/invite"],
      ['src/pages/PhotoUpload.tsx', "/photos/upload/invite"],
      ['src/pages/VaultContribute.tsx', "/vault/invite"],
      ['src/pages/VaultContribute.tsx', "/vault/invite/year"],
    ] as const;

    for (const [relativePath, trackedTarget] of auditedRouteSources) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source, `${relativePath} should still track ${trackedTarget}`).toContain(trackedTarget);
    }
  });

  it('keeps QR entry targets aligned with the public guest-entry routes', () => {
    expect(AGGREGATE_QR_VIEW_TARGETS).toEqual([
      '/event/qr',
      '/site/qr',
    ]);

    const eventHubSource = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');
    const siteViewSource = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');

    expect(eventHubSource).toContain("/event/qr");
    expect(siteViewSource).toContain("/site/qr");
  });

  it('counts every audited invite-open and QR target in the owner aggregate summary', () => {
    const createdAt = '2026-05-14T10:00:00.000Z';
    const summary = buildAnalyticsEventSummary([
      ...AGGREGATE_INVITE_OPEN_VIEW_TARGETS.map((target) => ({ event_type: 'view', target, created_at: createdAt })),
      ...AGGREGATE_QR_VIEW_TARGETS.map((target) => ({ event_type: 'view', target, created_at: createdAt })),
    ], {
      now: new Date('2026-05-14T12:00:00.000Z').getTime(),
    });

    expect(summary.inviteOpens).toBe(AGGREGATE_INVITE_OPEN_VIEW_TARGETS.length);
    expect(summary.qrScans).toBe(AGGREGATE_QR_VIEW_TARGETS.length);
    expect(summary.pageViews).toBe(AGGREGATE_INVITE_OPEN_VIEW_TARGETS.length + AGGREGATE_QR_VIEW_TARGETS.length);
  });
});
