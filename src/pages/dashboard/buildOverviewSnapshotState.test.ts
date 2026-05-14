import { beforeEach, describe, expect, it } from 'vitest';
import { buildDemoOverviewSnapshotState, buildOverviewStatsFromSnapshot } from './buildOverviewSnapshotState';
import { writeDemoGuestPhotoState } from './guestPhotos/guestPhotoDemoState';
import { writeDemoMessages } from './messages/messageDemoStorage';
import { writeDemoPlanningState } from './planning/planningDemoState';
import { writeDemoSeatingState } from './seating/seatingDemoStorage';

describe('buildOverviewSnapshotState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it('derives digest counts from persisted demo message, planning, photo, and seating writes', () => {
    writeDemoMessages([
      {
        id: 'demo-msg-proof-partial',
        subject: 'Needs follow-up',
        body: 'Partial delivery needs review.',
        sent_at: '2026-05-14T09:00:00.000Z',
        scheduled_for: null,
        status: 'partial',
        channel: 'email',
        recipient_filter: { audience: 'all', recipient_count: 8 },
        audience_filter: 'all',
        recipient_count: 8,
        delivered_count: 6,
        failed_count: 2,
      },
      {
        id: 'demo-msg-proof-failed',
        subject: 'Failed send',
        body: 'This one failed cleanly.',
        sent_at: '2026-05-14T09:10:00.000Z',
        scheduled_for: null,
        status: 'failed',
        channel: 'email',
        recipient_filter: { audience: 'all', recipient_count: 4 },
        audience_filter: 'all',
        recipient_count: 4,
        delivered_count: 0,
        failed_count: 4,
      },
      {
        id: 'demo-msg-proof-sent',
        subject: 'Delivered',
        body: 'This one should not count toward review.',
        sent_at: '2026-05-14T09:20:00.000Z',
        scheduled_for: null,
        status: 'sent',
        channel: 'email',
        recipient_filter: { audience: 'all', recipient_count: 12 },
        audience_filter: 'all',
        recipient_count: 12,
        delivered_count: 12,
        failed_count: 0,
      },
    ]);

    writeDemoPlanningState({
      totalBudget: 30000,
      tasks: [
        {
          id: 'demo-task-open',
          wedding_site_id: 'demo-site-id',
          title: 'Open task',
          description: '',
          category: null,
          due_date: '2026-05-20',
          status: 'todo',
          priority: 'high',
          owner_name: 'Alex',
          linked_event_id: null,
          linked_vendor_id: null,
          sort_order: 1,
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
        {
          id: 'demo-task-done',
          wedding_site_id: 'demo-site-id',
          title: 'Done task',
          description: '',
          category: null,
          due_date: '2026-05-18',
          status: 'done',
          priority: 'medium',
          owner_name: 'Jordan',
          linked_event_id: null,
          linked_vendor_id: null,
          sort_order: 2,
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      budgetItems: [
        {
          id: 'demo-budget-overdue',
          wedding_site_id: 'demo-site-id',
          category: 'Venue',
          item_name: 'Final venue payment',
          estimated_amount: 1200,
          actual_amount: 1200,
          paid_amount: 0,
          due_date: '2026-05-01',
          vendor_id: 'demo-vendor-overdue',
          notes: '',
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      vendors: [
        {
          id: 'demo-vendor-overdue',
          wedding_site_id: 'demo-site-id',
          vendor_type: 'Venue',
          name: 'Venue Co',
          contact_name: 'Maya',
          email: 'maya@venue.demo',
          phone: '(555) 111-2222',
          website: '',
          contract_total: 1200,
          amount_paid: 0,
          balance_due: 1200,
          next_payment_due: '2026-05-01',
          document_url: 'https://dayof.demo/contract.pdf',
          document_label: 'Contract',
          notes: '',
          internal_rating: null,
          rating_status: null,
          rating_notes: null,
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      vendorMeta: {},
    });

    const photoState = writeDemoGuestPhotoState({
      siteId: 'demo-site-id',
      siteSlug: 'alex-jordan-demo',
      events: [],
      buckets: [],
      uploads: [
        {
          id: 'photo-visible-1',
          photo_album_id: 'album-1',
          original_filename: 'visible-1.jpg',
          guest_name: 'Guest One',
          guest_email: 'guest1@dayof.demo',
          note: null,
          mime_type: 'image/jpeg',
          size_bytes: 1000,
          drive_web_view_link: 'https://drive.google.com/file/d/visible-1/view',
          is_hidden: false,
          is_flagged: false,
          recap_hidden: false,
          recap_featured: false,
          recap_story: false,
          uploaded_at: '2026-05-14T10:00:00.000Z',
        },
        {
          id: 'photo-visible-2',
          photo_album_id: 'album-1',
          original_filename: 'visible-2.jpg',
          guest_name: 'Guest Two',
          guest_email: 'guest2@dayof.demo',
          note: null,
          mime_type: 'image/jpeg',
          size_bytes: 1000,
          drive_web_view_link: 'https://drive.google.com/file/d/visible-2/view',
          is_hidden: false,
          is_flagged: false,
          recap_hidden: false,
          recap_featured: false,
          recap_story: false,
          uploaded_at: '2026-05-14T10:05:00.000Z',
        },
        {
          id: 'photo-hidden',
          photo_album_id: 'album-1',
          original_filename: 'hidden.jpg',
          guest_name: 'Guest Hidden',
          guest_email: 'guest3@dayof.demo',
          note: null,
          mime_type: 'image/jpeg',
          size_bytes: 1000,
          drive_web_view_link: 'https://drive.google.com/file/d/hidden/view',
          is_hidden: true,
          is_flagged: false,
          recap_hidden: true,
          recap_featured: false,
          recap_story: false,
          uploaded_at: '2026-05-14T10:10:00.000Z',
        },
      ],
      uploadAnalyses: [],
      uploadMetadata: [],
      aiBucketCorrections: [],
      guestbookEntries: [],
      guestProspects: [],
      hubSettings: {
        ...photoStateFallbackHubSettings(),
      },
      bucketUploadLinks: {},
    });

    expect(photoState.uploads).toHaveLength(3);

    writeDemoSeatingState('ceremony-id', [], [
      {
        id: 'assign-1',
        seating_event_id: 'ceremony-id',
        table_id: 'table-1',
        guest_id: 'confirmed-guest-0',
        seat_index: 0,
        is_valid: true,
      },
      {
        id: 'assign-2',
        seating_event_id: 'ceremony-id',
        table_id: 'table-1',
        guest_id: 'confirmed-guest-1',
        seat_index: 1,
        is_valid: true,
      },
    ]);

    const snapshot = buildDemoOverviewSnapshotState();

    expect(snapshot.stats.messageReviewCount).toBe(2);
    expect(snapshot.stats.upcomingTaskCount).toBe(1);
    expect(snapshot.stats.upcomingPaymentCount).toBe(2);
    expect(snapshot.stats.newPhotoUploadCount).toBe(2);
    expect(snapshot.stats.seatingGapCount).toBe(66);
  });
});

function photoStateFallbackHubSettings() {
  return {
    rsvp_enabled: true,
    photos_enabled: true,
    guestbook_enabled: true,
    registry_enabled: true,
    schedule_enabled: true,
    travel_enabled: true,
    recap_status: 'private_link' as const,
    recap_published_at: null,
    recap_closed_at: null,
    custom_message: '',
    language_default: 'en',
  };
}
