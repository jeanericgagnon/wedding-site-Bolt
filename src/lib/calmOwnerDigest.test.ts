import { describe, expect, it } from 'vitest';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from './calmOwnerDigest';

describe('calmOwnerDigest', () => {
  it('builds an owner digest with source counts and deep links', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 2,
      pendingRsvpCount: 5,
      missingContactCount: 3,
      messageFailureCount: 1,
      upcomingTaskCount: 4,
      upcomingPaymentCount: 1,
      newPhotoUploadCount: 6,
      seatingGapCount: 2,
      registryItemCount: 3,
      isPublished: false,
      publishBlockerCount: 2,
    });

    expect(digest.title).toBe('Owner digest');
    expect(digest.attentionCount).toBeGreaterThan(0);
    expect(digest.items.find((item) => item.id === 'rsvp-replies')).toMatchObject({
      count: 7,
      href: '/dashboard/rsvp-board',
      cta: 'Review RSVPs',
    });
    expect(digest.items.find((item) => item.id === 'photo-memory')).toMatchObject({
      count: 6,
      priority: 'now',
      href: '/dashboard/photos',
    });
    expect(digest.items.find((item) => item.id === 'site-publish')?.href).toBe('/dashboard/builder?publishNow=1');
  });

  it('filters private financial and settings items away from coordinator and viewer roles', () => {
    const coordinatorDigest = buildCalmOwnerDigest({
      role: 'coordinator',
      upcomingPaymentCount: 4,
      publishBlockerCount: 2,
      pendingRsvpCount: 3,
      seatingGapCount: 2,
      permissions: ['guests', 'messages', 'planning', 'seating', 'timeline', 'coordinator', 'photos'],
    });
    const viewerDigest = buildCalmOwnerDigest({
      role: 'viewer',
      upcomingPaymentCount: 4,
      publishBlockerCount: 2,
      pendingRsvpCount: 3,
      seatingGapCount: 2,
      permissions: [],
    });

    expect(coordinatorDigest.items.map((item) => item.id)).toContain('seating');
    expect(coordinatorDigest.items.map((item) => item.id)).not.toContain('payments');
    expect(coordinatorDigest.items.map((item) => item.id)).not.toContain('site-publish');
    expect(viewerDigest.items).toEqual([]);
  });

  it('uses calm customer-facing copy without provider or diagnostic wording', () => {
    const digest = buildCalmOwnerDigest({
      role: 'viewer',
      permissions: [],
      messageFailureCount: 0,
      newPhotoUploadCount: 0,
      activePhotoAlbumCount: 1,
      registryItemCount: 0,
      isPublished: true,
      publishBlockerCount: 0,
    });

    const text = [digest.title, digest.summary, ...digest.items.flatMap((item) => [item.label, item.detail, item.cta])].join(' ');
    expect(text).toContain('Everything is quiet');
    expect(text).not.toMatch(/provider|supabase|bucket|function|diagnostic|token|secret|failed/i);
    expect(text).not.toMatch(/overdue|behind|late|urgent/i);
  });

  it('builds a review-before-delivery digest preview without claiming email delivery is connected', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 3,
      missingContactCount: 2,
      newPhotoUploadCount: 1,
      isPublished: true,
    });
    const preview = buildCalmDigestDeliveryPreview({
      digest,
      cadence: 'weekly',
      includePlanner: true,
      emailDeliveryEnabled: false,
    });

    expect(preview.subject).toContain('areas to review');
    expect(preview.audienceLabel).toBe('Owners and planners');
    expect(preview.cadenceLabel).toBe('Weekly digest');
    expect(preview.statusLabel).toBe('Preview only until delivery is connected');
    expect(preview.canSendNow).toBe(false);
    expect(preview.nextDeliveryLabel).toBeNull();
    expect(preview.previewLines.join(' ')).toContain('RSVPs');
    expect(preview.reviewHref).toBe('/dashboard/settings?tab=notifications#digest');
    expect(preview.safetyNotes.join(' ')).not.toMatch(/provider|supabase|bucket|function|diagnostic|token|secret|failed/i);
  });

  it('honors quiet preferences before allowing digest delivery review', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 8,
      isPublished: true,
    });
    const preview = buildCalmDigestDeliveryPreview({
      digest,
      cadence: 'daily',
      includePlanner: false,
      quietUntilLabel: 'Monday morning',
      emailDeliveryEnabled: true,
    });

    expect(preview.statusLabel).toBe('Quiet until Monday morning');
    expect(preview.canSendNow).toBe(false);
    expect(preview.audienceLabel).toBe('Owners only');
  });

  it('shows scheduled and readback labels when digest delivery has a saved run window', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 2,
      upcomingTaskCount: 1,
      isPublished: true,
    });
    const preview = buildCalmDigestDeliveryPreview({
      digest,
      cadence: 'daily',
      includePlanner: false,
      nextDeliveryAt: '2026-05-15T16:00:00.000Z',
      lastReviewedAt: '2026-05-14T17:15:00.000Z',
      lastDeliveredAt: '2026-05-13T16:00:00.000Z',
      emailDeliveryEnabled: true,
    });

    expect(preview.statusLabel).toContain('Scheduled for');
    expect(preview.nextDeliveryLabel).toContain('Scheduled for');
    expect(preview.lastReviewedLabel).toContain('Last review saved');
    expect(preview.lastDeliveredLabel).toContain('Last delivered');
  });

  it('drops impossible saved digest delivery dates instead of rolling them forward', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 2,
      isPublished: true,
    });
    const preview = buildCalmDigestDeliveryPreview({
      digest,
      cadence: 'daily',
      includePlanner: false,
      nextDeliveryAt: '2027-02-30',
      lastReviewedAt: '2027-02-30',
      lastDeliveredAt: '2027-02-30',
      emailDeliveryEnabled: true,
    });

    expect(preview.nextDeliveryLabel).toBeNull();
    expect(preview.lastReviewedLabel).toBeNull();
    expect(preview.lastDeliveredLabel).toBeNull();
    expect(preview.statusLabel).toBe('Ready for delivery review');
  });

  it('keeps scheduled previews honest when digest delivery is not connected yet', () => {
    const digest = buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 2,
      upcomingTaskCount: 1,
      isPublished: true,
    });
    const preview = buildCalmDigestDeliveryPreview({
      digest,
      cadence: 'daily',
      includePlanner: false,
      nextDeliveryAt: '2026-05-15T16:00:00.000Z',
      lastReviewedAt: '2026-05-14T17:15:00.000Z',
      emailDeliveryEnabled: false,
    });

    expect(preview.statusLabel).toContain('after delivery is connected');
    expect(preview.nextDeliveryLabel).toContain('Scheduled for');
    expect(preview.canSendNow).toBe(false);
  });
});
