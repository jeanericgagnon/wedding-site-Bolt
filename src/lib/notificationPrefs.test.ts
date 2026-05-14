import { describe, expect, it } from 'vitest';
import { buildNotificationPrefsPatch, computeNextDigestDeliveryAt, normalizeNotificationPrefs } from './notificationPrefs';

describe('notificationPrefs', () => {
  it('keeps legacy digest booleans compatible while defaulting cadence safely', () => {
    expect(normalizeNotificationPrefs({ digest: true, photos: false })).toMatchObject({
      digest: true,
      digestCadence: 'weekly',
      photos: false,
      rsvp: true,
      updates: false,
    });

    expect(normalizeNotificationPrefs({ digest: false })).toMatchObject({
      digest: false,
      digestCadence: 'paused',
    });
  });

  it('preserves richer digest cadence, planner audience, and quiet labels', () => {
    expect(normalizeNotificationPrefs({
      digest: true,
      digest_cadence: 'daily',
      digest_include_planner: true,
      digest_quiet_until_label: 'after the rehearsal dinner',
      digest_next_delivery_at: '2026-05-15T16:00:00.000Z',
      digest_last_reviewed_at: '2026-05-14T17:15:00.000Z',
      digest_last_delivered_at: '2026-05-13T16:00:00.000Z',
    })).toMatchObject({
      digest: true,
      digestCadence: 'daily',
      digestIncludePlanner: true,
      digestQuietUntilLabel: 'after the rehearsal dinner',
      digestNextDeliveryAt: '2026-05-15T16:00:00.000Z',
      digestLastReviewedAt: '2026-05-14T17:15:00.000Z',
      digestLastDeliveredAt: '2026-05-13T16:00:00.000Z',
    });
  });

  it('builds a stable settings patch shape for persistence', () => {
    expect(buildNotificationPrefsPatch({
      digest: true,
      digestCadence: 'weekly',
      digestIncludePlanner: true,
      digestQuietUntilLabel: 'Sunday morning',
      digestNextDeliveryAt: '2026-05-18T16:00:00.000Z',
      digestLastReviewedAt: '2026-05-14T17:15:00.000Z',
      digestLastDeliveredAt: null,
      photos: true,
      rsvp: false,
      updates: true,
    })).toEqual({
      digest: true,
      digest_cadence: 'weekly',
      digest_include_planner: true,
      digest_quiet_until_label: 'Sunday morning',
      digest_next_delivery_at: '2026-05-18T16:00:00.000Z',
      digest_last_reviewed_at: '2026-05-14T17:15:00.000Z',
      digest_last_delivered_at: null,
      photos: true,
      rsvp: false,
      updates: true,
    });
  });

  it('computes the next scheduled digest window from the saved cadence', () => {
    expect(computeNextDigestDeliveryAt('paused', new Date('2026-05-14T17:15:00.000Z'))).toBeNull();
    expect(computeNextDigestDeliveryAt('daily', new Date('2026-05-14T17:15:00.000Z'))).toBe('2026-05-15T16:00:00.000Z');
    expect(computeNextDigestDeliveryAt('weekly', new Date('2026-05-14T17:15:00.000Z'))).toBe('2026-05-21T16:00:00.000Z');
  });
});
