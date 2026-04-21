import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let currentToken = 'old-token';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(currentToken ? `token=${currentToken}` : '')],
  };
});

const maybeSingleQueue: Array<{ data: any; error: any }> = [];
const selectQueue: Array<{ data: any; error: any }> = [];
const insertQueue: Array<{ error: any }> = [];
const updateQueue: Array<{ error: any }> = [];

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'guests') {
          return {
            eq: () => ({
              maybeSingle: () => Promise.resolve(maybeSingleQueue.shift() ?? { data: null, error: null }),
            }),
          };
        }

        if (table === 'event_invitations') {
          return {
            eq: () => Promise.resolve(selectQueue.shift() ?? { data: [], error: null }),
          };
        }

        if (table === 'event_rsvps') {
          return {
            eq: () => ({
              maybeSingle: () => Promise.resolve(maybeSingleQueue.shift() ?? { data: null, error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
      insert: () => {
        if (table === 'event_rsvps') {
          return Promise.resolve(insertQueue.shift() ?? { error: null });
        }

        throw new Error(`Unexpected insert table ${table}`);
      },
      update: () => ({
        eq: () => {
          if (table === 'event_rsvps') {
            return Promise.resolve(updateQueue.shift() ?? { error: null });
          }

          throw new Error(`Unexpected update table ${table}`);
        },
      }),
    }),
  },
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import EventRSVP from './EventRSVP';

describe('EventRSVP token trust continuity', () => {
  beforeEach(() => {
    currentToken = 'old-token';
    maybeSingleQueue.length = 0;
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('re-reads event RSVP truth after switching from an unsupported token to a supported one', async () => {
    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Old Guest', email: 'old@example.com' }, error: null },
      { data: null, error: { message: 'relation "event_rsvps" does not exist' } },
      { data: { id: 'guest-2', name: 'New Guest', email: 'new@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegetarian', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [
          {
            id: 'inv-1',
            event_id: 'event-1',
            itinerary_events: {
              id: 'event-1',
              event_name: 'Welcome Dinner',
              description: '',
              event_date: '2026-05-01',
              start_time: '18:00:00',
              end_time: null,
              location_name: 'Old Place',
              location_address: '',
              dress_code: null,
              notes: null,
            },
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: 'inv-2',
            event_id: 'event-2',
            itinerary_events: {
              id: 'event-2',
              event_name: 'Ceremony',
              description: '',
              event_date: '2026-05-02',
              start_time: '16:00:00',
              end_time: null,
              location_name: 'New Place',
              location_address: '',
              dress_code: null,
              notes: null,
            },
          },
        ],
        error: null,
      },
    );

    const view = render(<EventRSVP />);

    await screen.findByText('Hello, Old Guest!');
    expect(screen.queryByText('Attending')).not.toBeInTheDocument();

    currentToken = 'new-token';
    view.rerender(<EventRSVP />);

    await screen.findByText('Hello, New Guest!');
    await waitFor(() => {
      expect(screen.getByText('Attending')).toBeInTheDocument();
    });
    expect(screen.getByText('Ceremony')).toBeInTheDocument();
  });

  it('keeps the saved event RSVP visible locally after submit without depending on a refetch', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Dinner',
            description: '',
            event_date: '2026-05-01',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'The Loft',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    insertQueue.push({ error: null });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Attending')).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    expect(selectQueue).toHaveLength(0);
  }, 10000);
});
