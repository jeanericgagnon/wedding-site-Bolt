import { describe, expect, it } from 'vitest';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from './calmOwnerDigest';
import { renderCalmDigestEmail } from './calmDigestEmail';

describe('calmDigestEmail', () => {
  it('renders token-safe html and text previews for owner and planner digest emails', () => {
    const preview = buildCalmDigestDeliveryPreview({
      digest: buildCalmOwnerDigest({
        role: 'owner',
        newRsvpCount: 3,
        missingContactCount: 2,
        upcomingTaskCount: 1,
        isPublished: true,
      }),
      cadence: 'weekly',
      includePlanner: true,
      nextDeliveryAt: '2026-05-20T16:00:00.000Z',
      lastReviewedAt: '2026-05-14T17:15:00.000Z',
      emailDeliveryEnabled: false,
    });

    const rendered = renderCalmDigestEmail(preview);

    expect(rendered.subject).toContain('areas to review');
    expect(rendered.text).toContain('Owners and planners');
    expect(rendered.text).toContain('after delivery is connected');
    expect(rendered.html).toContain('<!doctype html>');
    expect(rendered.html).toContain('RSVPs');
    expect(`${rendered.text} ${rendered.html}`).not.toMatch(/token|secret|passcode|bearer|invite_token/i);
  });
});
