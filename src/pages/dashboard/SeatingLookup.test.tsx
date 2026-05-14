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
const loadDemoSeatingLookupRows = vi.fn();
const loadSeatingLookupRowsForUser = vi.fn();
const loadDemoItineraryEventsFromStorage = vi.fn();

vi.mock('./seating/seatingService', () => ({
  getWeddingSiteId: () => getWeddingSiteId(),
  loadDemoSeatingLookupRows: (...args: unknown[]) => loadDemoSeatingLookupRows(...args),
  loadItineraryEvents: (...args: unknown[]) => loadItineraryEvents(...args),
  loadSeatingLookupRowsForUser: (...args: unknown[]) => loadSeatingLookupRowsForUser(...args),
}));

vi.mock('./seating/seatingDemoStorage', () => ({
  loadDemoItineraryEventsFromStorage: () => loadDemoItineraryEventsFromStorage(),
}));

describe('DashboardSeatingLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isDemoMode = false;
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

  it('opens a guest-view preview from the lookup table when a private RSVP link exists', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    getWeddingSiteId.mockResolvedValue('site-1');
    loadItineraryEvents.mockResolvedValue([
      { id: 'event-1', event_name: 'Ceremony', event_date: '2026-05-13', start_time: '16:00:00', location_name: 'Garden' },
    ]);
    loadSeatingLookupRowsForUser.mockResolvedValue([
      {
        itinerary_event_id: 'event-1',
        event_name: 'Ceremony',
        guest_id: 'guest-1',
        full_name: 'Maya Patel',
        email: 'maya@example.com',
        invite_token: 'private-token',
        preferred_language: 'es-MX',
        table_name: 'Table 1',
        seat_index: 2,
        checked_in_at: null,
      },
    ]);

    render(
      <MemoryRouter>
        <DashboardSeatingLookup />
      </MemoryRouter>,
    );

    await screen.findByText('Maya Patel');
    fireEvent.click(screen.getByRole('button', { name: 'Guest view' }));

    expect(openSpy).toHaveBeenCalledWith(
      '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp&guestLang=es',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('reloads rows when the selected event changes', async () => {
    getWeddingSiteId.mockResolvedValue('site-1');
    loadItineraryEvents.mockResolvedValue([
      { id: 'event-1', event_name: 'Ceremony', event_date: '2026-05-20', start_time: '16:00:00', location_name: 'Garden' },
      { id: 'event-2', event_name: 'Reception', event_date: '2026-05-20', start_time: '19:00:00', location_name: 'Hall' },
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

  it('reads demo lookup rows from the shared seating demo state instead of hardcoded placeholders', async () => {
    authState.isDemoMode = true;
    loadDemoItineraryEventsFromStorage.mockReturnValue([
      { id: 'welcome-dinner-id', event_name: 'Welcome Dinner', event_date: '2026-06-14', start_time: '18:00:00', location_name: 'The Vineyard Restaurant' },
    ]);
    loadDemoSeatingLookupRows.mockReturnValue([
      {
        itinerary_event_id: 'welcome-dinner-id',
        event_name: 'Welcome Dinner',
        guest_id: 'confirmed-guest-3',
        full_name: 'Liam Nguyen',
        email: 'liam.nguyen+3@dayof.demo',
        table_name: 'Head Table',
        seat_index: 3,
        checked_in_at: null,
      },
    ]);

    render(
      <MemoryRouter>
        <DashboardSeatingLookup />
      </MemoryRouter>,
    );

    await screen.findByText('Liam Nguyen');
    expect(loadDemoSeatingLookupRows).toHaveBeenCalledWith('welcome-dinner-id');
    expect(loadSeatingLookupRowsForUser).not.toHaveBeenCalled();
    expect(screen.getByText(/Data is for/i)).toHaveTextContent('Welcome Dinner');
  });
});
