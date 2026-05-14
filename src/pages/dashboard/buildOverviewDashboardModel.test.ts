import { describe, expect, it } from 'vitest';
import { buildOverviewDashboardModel } from './buildOverviewDashboardModel';

const baseStats = {
  activePhotoAlbumCount: 0,
  activeSitePermissions: null,
  activeSiteRole: 'owner' as const,
  confirmedGuests: 12,
  contactableGuestCount: 18,
  coupleName1: 'Avery',
  coupleName2: 'Jordan',
  declinedGuests: 1,
  hideFromSearch: false,
  isPublished: true,
  lastPublishedAt: '2026-05-12T08:00:00.000Z',
  messageReviewCount: 2,
  newPhotoUploadCount: 3,
  notificationPrefs: {
    digest: true,
    digestCadence: 'daily' as const,
    digestIncludePlanner: true,
    digestQuietUntilLabel: 'after brunch',
    photos: true,
    rsvp: true,
    updates: false,
  },
  pendingGuests: 6,
  photoAlbumCount: 0,
  recentRsvps: [],
  registryItemCount: 4,
  seatingGapCount: 1,
  siteSlug: 'avery-and-jordan',
  siteUpdatedAt: '2026-05-13T08:00:00.000Z',
  templateName: 'classic',
  totalGuests: 20,
  upcomingPaymentCount: 5,
  upcomingTaskCount: 4,
  venueLocation: 'San Francisco',
  venueName: 'City Hall',
  weddingDate: '2026-09-14',
};

describe('buildOverviewDashboardModel', () => {
  it('uses saved digest preferences in the overview preview', () => {
    const model = buildOverviewDashboardModel({
      dismissedIntelligenceIds: [],
      interactiveSuggestions: [],
      interactiveVoteSummaries: [],
      stats: baseStats,
    });

    expect(model.calmDigestPreview).toMatchObject({
      cadenceLabel: 'Daily digest',
      audienceLabel: 'Owners and planners',
      statusLabel: 'Quiet until after brunch',
      reviewHref: '/dashboard/settings?tab=notifications#digest',
    });
  });

  it('shows paused preview state when digest email is turned off', () => {
    const model = buildOverviewDashboardModel({
      dismissedIntelligenceIds: [],
      interactiveSuggestions: [],
      interactiveVoteSummaries: [],
      stats: {
        ...baseStats,
        notificationPrefs: {
          ...baseStats.notificationPrefs,
          digest: false,
          digestCadence: 'paused',
          digestIncludePlanner: false,
          digestQuietUntilLabel: null,
        },
      },
    });

    expect(model.calmDigestPreview).toMatchObject({
      cadenceLabel: 'Paused',
      audienceLabel: 'Owners only',
      statusLabel: 'Paused by preference',
    });
  });

  it('feeds real digest counts into the overview digest instead of zero placeholders', () => {
    const model = buildOverviewDashboardModel({
      dismissedIntelligenceIds: [],
      interactiveSuggestions: [],
      interactiveVoteSummaries: [],
      stats: baseStats,
    });

    expect(model.calmDigest?.items.find((item) => item.id === 'message-review')?.count).toBe(2);
    expect(model.calmDigest?.items.find((item) => item.id === 'tasks')?.count).toBe(4);
    expect(model.calmDigest?.items.find((item) => item.id === 'payments')?.count).toBe(5);
    expect(model.calmDigest?.items.find((item) => item.id === 'photo-memory')?.count).toBe(3);
    expect(model.calmDigest?.items.find((item) => item.id === 'seating')?.count).toBe(1);
  });
});
