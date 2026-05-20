import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listBuilderRevisionsMock,
  loadNameChangeWorkspaceMock,
  loadOverviewDashboardSnapshotMock,
  loadOverviewInteractiveDataMock,
} = vi.hoisted(() => ({
  listBuilderRevisionsMock: vi.fn(async () => []),
  loadNameChangeWorkspaceMock: vi.fn(async () => null),
  loadOverviewDashboardSnapshotMock: vi.fn(),
  loadOverviewInteractiveDataMock: vi.fn(async () => ({ suggestions: [], voteSummaries: [] })),
}));

vi.mock('../../builder/services/versionHistory', () => ({
  listBuilderRevisions: listBuilderRevisionsMock,
}));

vi.mock('./planning/nameChangeService', () => ({
  loadNameChangeWorkspace: loadNameChangeWorkspaceMock,
}));

vi.mock('./overviewService', () => ({
  loadOverviewDashboardSnapshot: loadOverviewDashboardSnapshotMock,
  loadOverviewInteractiveData: loadOverviewInteractiveDataMock,
}));

import { useOverviewDashboardData } from './useOverviewDashboardData';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/dashboard/overview']}>{children}</MemoryRouter>
);

function createSnapshot(siteId: string) {
  return {
    activePhotoAlbumCount: 0,
    activeSite: { id: siteId, permissions: null, role: 'owner', siteId },
    analyticsEventSummary: {
      totalEvents: 0,
      topEvents: [],
      topTargets: [],
      latestEventAt: null,
    },
    confirmedGuests: 0,
    contactableGuestCount: 0,
    declinedGuests: 0,
    enabledVaultCount: 0,
    messageReviewCount: 0,
    newPhotoUploadCount: 0,
    pendingGuests: 0,
    photoAlbumCount: 0,
    recentRsvps: [],
    registryItemCount: 0,
    seatingGapCount: 0,
    site: {
      id: siteId,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      is_published: true,
      notification_prefs: null,
      onboarding_answers: null,
      privacy_mode: 'public',
      published_json: null,
      site_json: {},
      site_slug: siteId,
      site_url: null,
      template_id: null,
      updated_at: '2026-05-19T00:00:00.000Z',
      venue_date: null,
      venue_name: null,
      wedding_data: null,
      wedding_date: '2026-06-20',
      wedding_location: null,
    },
    totalGuests: 0,
    upcomingPaymentCount: 0,
    upcomingTaskCount: 0,
    vaultCount: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('useOverviewDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ignores stale overview snapshot responses after the user changes', async () => {
    const firstLoad = deferred<ReturnType<typeof createSnapshot>>();
    loadOverviewDashboardSnapshotMock
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(createSnapshot('site-2'));

    const dismissedIds = vi.fn();
    const { result, rerender } = renderHook(
      ({ userId }) =>
        useOverviewDashboardData({
          dismissedIntelligenceIds: [],
          isDemoMode: false,
          setDismissedIntelligenceIds: dismissedIds,
          storageKey: 'overview-dismissed',
          userId,
        }),
      {
        initialProps: { userId: 'user-1' },
        wrapper,
      },
    );

    rerender({ userId: 'user-2' });

    await waitFor(() => expect(result.current.stats?.siteId).toBe('site-2'));

    await act(async () => {
      firstLoad.resolve(createSnapshot('site-1'));
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats?.siteId).toBe('site-2');
    expect(loadOverviewDashboardSnapshotMock).toHaveBeenCalledWith('user-1');
    expect(loadOverviewDashboardSnapshotMock).toHaveBeenCalledWith('user-2');
  });
});
