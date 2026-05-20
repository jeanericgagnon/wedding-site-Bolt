import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadItineraryDashboardEventsMock } = vi.hoisted(() => ({
  loadItineraryDashboardEventsMock: vi.fn(),
}));

vi.mock('./itineraryService', () => ({
  loadItineraryDashboardEvents: loadItineraryDashboardEventsMock,
}));

import { useItineraryDashboardData } from './useItineraryDashboardData';
import type { ItineraryDashboardEvent } from './itineraryService';

function createEvent(id: string): ItineraryDashboardEvent {
  return {
    id,
    attending_count: 0,
    declined_count: 0,
    description: '',
    display_order: 0,
    dress_code: null,
    end_time: null,
    event_date: '2026-06-20',
    event_name: id,
    invitation_count: 0,
    is_visible: true,
    location_address: '',
    location_name: '',
    notes: null,
    pending_count: 0,
    rsvp_count: 0,
    start_time: '17:00',
  };
}

function createSnapshot(eventId: string) {
  return {
    events: [createEvent(eventId)],
    hasActiveSite: true,
    hasEventRsvpsTable: true,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('useItineraryDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ignores stale itinerary event responses after a newer load starts', async () => {
    const firstLoad = deferred<ReturnType<typeof createSnapshot>>();
    const toast = vi.fn();
    loadItineraryDashboardEventsMock
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(createSnapshot('event-current'));

    const { result } = renderHook(() =>
      useItineraryDashboardData({
        isDemoMode: false,
        toast,
      }),
    );

    await act(async () => {
      await result.current.loadEvents();
    });

    await waitFor(() => expect(result.current.events[0]?.id).toBe('event-current'));

    await act(async () => {
      firstLoad.resolve(createSnapshot('event-stale'));
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events.map((event) => event.id)).toEqual(['event-current']);
    expect(result.current.hasActiveSite).toBe(true);
  });
});
