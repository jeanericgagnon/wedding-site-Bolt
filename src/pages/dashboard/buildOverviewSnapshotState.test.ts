import { describe, expect, it } from 'vitest';
import { buildOverviewStatsFromSnapshot } from './buildOverviewSnapshotState';

describe('buildOverviewSnapshotState', () => {
  it('preserves digest source-of-truth counts and notification prefs from the overview snapshot', () => {
    const stats = buildOverviewStatsFromSnapshot({
      activeSitePermissions: null,
      activeSiteRole: 'owner',
      activePhotoAlbumCount: 2,
      contactableGuestCount: 18,
      confirmedGuests: 12,
      declinedGuests: 1,
      enabledVaultCount: 1,
      hideFromSearch: false,
      isPublished: true,
      lastPublishedAt: '2026-05-12T08:00:00.000Z',
      messageReviewCount: 3,
      notificationPrefs: {
        digest: true,
        digestCadence: 'weekly',
        digestIncludePlanner: true,
        digestQuietUntilLabel: null,
        digestNextDeliveryAt: '2026-05-20T16:00:00.000Z',
        digestLastReviewedAt: '2026-05-14T17:15:00.000Z',
        digestLastDeliveredAt: null,
        photos: true,
        rsvp: true,
        updates: false,
      },
      newPhotoUploadCount: 4,
      pendingGuests: 6,
      photoAlbumCount: 3,
      publishedVersion: 7,
      recentRsvps: [],
      analyticsEventSummary: {
        lookbackDays: 90,
        totalTrackedEvents: 18,
        pageViews: 8,
        siteVisits: 4,
        inviteOpens: 3,
        qrScans: 1,
        recapViews: 1,
        totalClicks: 6,
        rsvpClicks: 2,
        registryClicks: 1,
        photoClicks: 1,
        travelClicks: 1,
        scheduleClicks: 1,
        guestbookClicks: 0,
        vaultClicks: 0,
        contactClicks: 0,
        lastTrackedAt: '2026-05-14T09:00:00.000Z',
      },
      registryItemCount: 5,
      seatingGapCount: 2,
      site: {
        couple_name_1: 'Avery',
        couple_name_2: 'Jordan',
        venue_name: 'City Hall',
        wedding_location: 'San Francisco',
        wedding_data: {
          analytics_settings: {
            enabled: true,
            retention_days: 90,
            guest_notice: 'Aggregate visit, invite, and QR counts help us see what guest resources are being used.',
          },
        },
      },
      siteId: 'site-1',
      siteSlug: 'avery-and-jordan',
      siteUpdatedAt: '2026-05-13T08:00:00.000Z',
      templateName: 'classic',
      totalGuests: 20,
      upcomingPaymentCount: 5,
      upcomingTaskCount: 4,
      vaultCount: 1,
      weddingDate: '2026-09-14',
    });

    expect(stats.messageReviewCount).toBe(3);
    expect(stats.upcomingTaskCount).toBe(4);
    expect(stats.upcomingPaymentCount).toBe(5);
    expect(stats.newPhotoUploadCount).toBe(4);
    expect(stats.seatingGapCount).toBe(2);
    expect(stats.notificationPrefs).toMatchObject({
      digest: true,
      digestCadence: 'weekly',
      digestIncludePlanner: true,
      digestNextDeliveryAt: '2026-05-20T16:00:00.000Z',
      digestLastReviewedAt: '2026-05-14T17:15:00.000Z',
    });
    expect(stats.analyticsRetentionDays).toBe(90);
  });
});
