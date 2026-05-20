import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeatingEvent } from './seatingService';

const {
  getEligibleGuestsMock,
  getEventCountersMock,
  getOrCreateSeatingEventMock,
  getWeddingSiteIdMock,
  loadAssignmentsMock,
  loadItineraryEventsMock,
  loadSeatingVersionsMock,
  loadTablesMock,
} = vi.hoisted(() => ({
  getEligibleGuestsMock: vi.fn(async () => []),
  getEventCountersMock: vi.fn(async () => ({ invited: 0, attending: 0, declined: 0, pending: 0, seated: 0, unassigned: 0 })),
  getOrCreateSeatingEventMock: vi.fn(),
  getWeddingSiteIdMock: vi.fn(async () => 'site-1'),
  loadAssignmentsMock: vi.fn(async () => []),
  loadItineraryEventsMock: vi.fn(async () => [
    { id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '17:00', location_name: 'Garden' },
    { id: 'event-2', event_name: 'Reception', event_date: '2026-06-20', start_time: '19:00', location_name: 'Ballroom' },
  ]),
  loadSeatingVersionsMock: vi.fn(async () => []),
  loadTablesMock: vi.fn(async () => []),
}));

vi.mock('./seatingService', () => ({
  deriveEventCountersFromGuests: vi.fn(() => ({ invited: 0, attending: 0, declined: 0, pending: 0, seated: 0, unassigned: 0 })),
  getEligibleGuests: getEligibleGuestsMock,
  getEventCounters: getEventCountersMock,
  getOrCreateSeatingEvent: getOrCreateSeatingEventMock,
  getWeddingSiteId: getWeddingSiteIdMock,
  loadAssignments: loadAssignmentsMock,
  loadItineraryEvents: loadItineraryEventsMock,
  loadSeatingVersions: loadSeatingVersionsMock,
  loadTables: loadTablesMock,
}));

import { useSeatingDashboardData } from './useSeatingDashboardData';

function createSeatingEvent(id: string, itineraryEventId: string): SeatingEvent {
  return {
    id,
    wedding_site_id: 'site-1',
    itinerary_event_id: itineraryEventId,
    default_table_capacity: 8,
    notes: '',
    created_at: '2026-05-19T00:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('useSeatingDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ignores stale seating event responses after the selected event changes', async () => {
    const firstLoad = deferred<SeatingEvent>();
    const toast = vi.fn();
    getOrCreateSeatingEventMock
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(createSeatingEvent('seating-current', 'event-2'));

    const { result } = renderHook(() =>
      useSeatingDashboardData({
        isDemoMode: false,
        toast,
      }),
    );

    await waitFor(() => expect(result.current.selectedEventId).toBe('event-1'));

    act(() => {
      result.current.setSelectedEventId('event-2');
    });

    await waitFor(() => expect(result.current.seatingEvent?.id).toBe('seating-current'));

    await act(async () => {
      firstLoad.resolve(createSeatingEvent('seating-stale', 'event-1'));
    });

    await waitFor(() => expect(result.current.loadingSeating).toBe(false));
    expect(result.current.seatingEvent?.id).toBe('seating-current');
    expect(result.current.selectedEventId).toBe('event-2');
  });
});
