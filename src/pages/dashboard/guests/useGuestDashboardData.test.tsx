import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildDemoGuestItinerarySnapshotMock,
  loadGuestDashboardItineraryFiltersMock,
  loadGuestDashboardRsvpAuditFeedMock,
  loadGuestDashboardSiteSettingsMock,
  loadGuestDashboardSnapshotMock,
  readStoredDemoRsvpConfigMock,
} = vi.hoisted(() => ({
  buildDemoGuestItinerarySnapshotMock: vi.fn(() => ({
    eventInviteGuestMap: new Map(),
    guestInvitedEventIds: new Map(),
    itineraryEvents: [],
  })),
  loadGuestDashboardItineraryFiltersMock: vi.fn(async () => ({
    eventInviteGuestMap: new Map(),
    filterEvents: [],
    itineraryEvents: [],
  })),
  loadGuestDashboardRsvpAuditFeedMock: vi.fn(async () => []),
  loadGuestDashboardSiteSettingsMock: vi.fn(),
  loadGuestDashboardSnapshotMock: vi.fn(async () => ({
    conflictHistory: [],
    conflicts: [],
    guests: [],
  })),
  readStoredDemoRsvpConfigMock: vi.fn(() => ({
    accessSelection: {
      mode: 'invite-only',
      plan: 'private',
      quickReplies: false,
      quickRepliesAfterPublish: false,
      targetGuestTagIds: [],
      targetGuestTagsVersion: 0,
    },
    mealEnabled: true,
    mealOptions: ['Chicken'],
    questions: [],
  })),
}));

vi.mock('./guestService', () => ({
  loadGuestDashboardItineraryFilters: loadGuestDashboardItineraryFiltersMock,
  loadGuestDashboardRsvpAuditFeed: loadGuestDashboardRsvpAuditFeedMock,
  loadGuestDashboardSiteSettings: loadGuestDashboardSiteSettingsMock,
  loadGuestDashboardSnapshot: loadGuestDashboardSnapshotMock,
}));

vi.mock('./guestDashboardStorage', () => ({
  readStoredDemoRsvpConfig: readStoredDemoRsvpConfigMock,
}));

vi.mock('./demoGuestItinerary', () => ({
  buildDemoGuestItinerarySnapshot: buildDemoGuestItinerarySnapshotMock,
}));

import { useGuestDashboardData } from './useGuestDashboardData';

describe('useGuestDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears loading when guest site settings resolve without an active site', async () => {
    loadGuestDashboardSiteSettingsMock.mockResolvedValue({
      activeSiteId: null,
      autoRemindersEnabled: false,
      mealEnabled: true,
      mealOptions: ['Chicken'],
      permissions: null,
      questions: [],
      reminderCadenceDays: null,
      role: 'owner',
      rsvpAccessSelection: {
        mode: 'invite-only',
        plan: 'private',
        quickReplies: false,
        quickRepliesAfterPublish: false,
        targetGuestTagIds: [],
        targetGuestTagsVersion: 0,
      },
      siteInfo: null,
    });

    const toast = vi.fn();
    const rsvpConfigLoadedRef = { current: false };
    const { result } = renderHook(() =>
      useGuestDashboardData({
        guestsTab: 'ops',
        isDemoMode: false,
        rsvpConfigLoadedRef,
        setAutoRemindersEnabled: vi.fn(),
        setReminderCadenceDays: vi.fn(),
        toast,
        userId: 'user-1',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weddingSiteId).toBeNull();
    expect(result.current.weddingSiteInfo).toBeNull();
    expect(result.current.guests).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });

  it('clears loading and shows a recoverable toast when guest site settings fail', async () => {
    loadGuestDashboardSiteSettingsMock.mockRejectedValue(new Error('boom'));

    const toast = vi.fn();
    const rsvpConfigLoadedRef = { current: false };
    const { result } = renderHook(() =>
      useGuestDashboardData({
        guestsTab: 'ops',
        isDemoMode: false,
        rsvpConfigLoadedRef,
        setAutoRemindersEnabled: vi.fn(),
        setReminderCadenceDays: vi.fn(),
        toast,
        userId: 'user-1',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weddingSiteId).toBeNull();
    expect(result.current.weddingSiteInfo).toBeNull();
    expect(result.current.guests).toEqual([]);
    expect(toast).toHaveBeenCalledWith("Couldn’t load guest site settings right now. Please try again.", 'error');
  });
});
