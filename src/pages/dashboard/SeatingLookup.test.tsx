import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardSeatingLookup from './SeatingLookup';

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const authState = {
  user: { id: 'user-1' },
  isDemoMode: false,
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

const getWeddingSiteId = vi.fn();
const loadItineraryEvents = vi.fn();
const loadSeatingLookupRowsForUser = vi.fn();

vi.mock('./seating/seatingService', () => ({
  getWeddingSiteId: () => getWeddingSiteId(),
  loadItineraryEvents: (...args: unknown[]) => loadItineraryEvents(...args),
  loadSeatingLookupRowsForUser: (...args: unknown[]) => loadSeatingLookupRowsForUser(...args),
}));

describe('DashboardSeatingLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads rows once on mount for the default selected event', async () => {
    getWeddingSiteId.mockResolvedValue('site-1');
    loadItineraryEvents.mockResolvedValue([
      { id: 'event-1', event_name: 'Ceremony', event_date: '2026-05-13', start_time: '16:00:00', location_name: 'Garden' },
    ]);
    loadSeatingLookupRowsForUser.mockResolvedValue([
      { itinerary_event_id: 'event-1', event_name: 'Ceremony', guest_id: 'guest-1', full_name: 'Maya Patel', email: 'maya@example.com', table_name: 'Table 1', seat_index: 2, checked_in_at: null },
    ]);

    render(
      <MemoryRouter>
        <DashboardSeatingLookup />
      </MemoryRouter>,
    );

    await screen.findByText('Maya Patel');
    await waitFor(() => expect(loadSeatingLookupRowsForUser).toHaveBeenCalledTimes(1));
    expect(loadSeatingLookupRowsForUser).toHaveBeenCalledWith('user-1', 'event-1');
    expect(screen.getByText(/Data is for/i)).toHaveTextContent('Ceremony');
  });

  it('reloads rows when the selected event changes', async () => {
    getWeddingSiteId.mockResolvedValue('site-1');
    loadItineraryEvents.mockResolvedValue([
      { id: 'event-1', event_name: 'Ceremony', event_date: '2026-05-13', start_time: '16:00:00', location_name: 'Garden' },
      { id: 'event-2', event_name: 'Reception', event_date: '2026-05-13', start_time: '19:00:00', location_name: 'Hall' },
    ]);
    loadSeatingLookupRowsForUser
      .mockResolvedValueOnce([
        { itinerary_event_id: 'event-1', event_name: 'Ceremony', guest_id: 'guest-1', full_name: 'Maya Patel', email: 'maya@example.com', table_name: 'Table 1', seat_index: 2, checked_in_at: null },
      ])
      .mockResolvedValueOnce([
        { itinerary_event_id: 'event-2', event_name: 'Reception', guest_id: 'guest-2', full_name: 'Leo Patel', email: 'leo@example.com', table_name: 'Table 3', seat_index: 5, checked_in_at: null },
      ]);

    render(
      <MemoryRouter>
        <DashboardSeatingLookup />
      </MemoryRouter>,
    );

    await screen.findByText('Maya Patel');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'event-2' } });
    await screen.findByText('Leo Patel');

    expect(loadSeatingLookupRowsForUser).toHaveBeenNthCalledWith(1, 'user-1', 'event-1');
    expect(loadSeatingLookupRowsForUser).toHaveBeenNthCalledWith(2, 'user-1', 'event-2');
  });

  it('handles an empty event list without trying to load rows', async () => {
    getWeddingSiteId.mockResolvedValue('site-1');
    loadItineraryEvents.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DashboardSeatingLookup />
      </MemoryRouter>,
    );

    await screen.findByText('No guests found.');
    expect(loadSeatingLookupRowsForUser).not.toHaveBeenCalled();
  });
});
