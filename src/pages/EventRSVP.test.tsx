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

const maybeSingleQueue: Array<{ data: any; error: any } | Promise<{ data: any; error: any }>> = [];
const selectQueue: Array<{ data: any; error: any }> = [];
const insertQueue: Array<{ error: any } | Promise<{ error: any }>> = [];
const updateQueue: Array<{ error: any } | Promise<{ error: any }>> = [];

function createDeferredMaybeSingle() {
  let resolve!: (value: { data: any; error: any }) => void;
  const promise = new Promise<{ data: any; error: any }>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

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

  it('keeps the no-token error truth if an older token load resolves late', async () => {
    const deferredGuestLookup = createDeferredMaybeSingle();
    maybeSingleQueue.push(deferredGuestLookup.promise);

    const view = render(<EventRSVP />);

    currentToken = '';
    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();
    expect(screen.getByText('No invitation link found. Please use the link from your invitation email.')).toBeInTheDocument();

    deferredGuestLookup.resolve({
      data: { id: 'guest-1', name: 'Late Guest', email: 'late@example.com' },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByText('No invitation link found. Please use the link from your invitation email.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Hello, Late Guest!')).not.toBeInTheDocument();
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

  it('marks event RSVP support as available after a successful submit', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
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

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Event-specific RSVP is temporarily unavailable for this site.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    }, { timeout: 4000 });
  }, 10000);

  it('shows a load error instead of fake blank RSVP truth on unexpected event RSVP read failures', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: { message: 'permission denied while reading RSVP rows' } },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    render(<EventRSVP />);

    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();
    expect(screen.getByText('Failed to load your event invitations. Please try again or contact the couple.')).toBeInTheDocument();
    expect(screen.queryByText('Hello, Jordan!')).not.toBeInTheDocument();
  });

  it('does not downgrade event RSVP support on unexpected event RSVP read errors that mention the table name', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: { message: 'permission denied for table event_rsvps' } },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    render(<EventRSVP />);

    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();
    expect(screen.getByText('Failed to load your event invitations. Please try again or contact the couple.')).toBeInTheDocument();
    expect(screen.queryByText('Event-specific RSVP is temporarily unavailable for this site.')).not.toBeInTheDocument();
  });

  it('does not let a stale prior submit disable event RSVP support for a new token', async () => {
    currentToken = 'old-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Old Guest', email: 'old@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-2', name: 'New Guest', email: 'new@example.com' }, error: null },
      { data: null, error: null },
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

    let resolveOldInsert!: (value: { error: any }) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveOldInsert = resolve;
    }) as unknown as { error: any });
    insertQueue.push({ error: null });

    const view = render(<EventRSVP />);

    expect(await screen.findByText('Hello, Old Guest!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    currentToken = 'new-token';
    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Hello, New Guest!')).toBeInTheDocument();

    resolveOldInsert({ error: { message: 'relation "event_rsvps" does not exist' } });

    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });
    expect(screen.queryByText('Event-specific RSVP is temporarily unavailable for this site.')).not.toBeInTheDocument();
  }, 10000);

  it('does not downgrade event RSVP support after an unexpected submit write error', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    insertQueue.push({ error: { message: 'permission denied for table event_rsvps' } });
    insertQueue.push({ error: null });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to save your RSVP. Please try again.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });
    expect(screen.queryByText('Event-specific RSVP is temporarily unavailable for this site.')).not.toBeInTheDocument();
  });

  it('shows event RSVP unavailable truth immediately on missing support submit errors', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    insertQueue.push({ error: { message: 'relation "event_rsvps" does not exist' } });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Event-specific RSVP is temporarily unavailable for this site.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Failed to save your RSVP. Please try again.')).not.toBeInTheDocument();
  });

  it('does not leak a prior support error after reopening a different event', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
        {
          id: 'inv-2',
          event_id: 'event-2',
          itinerary_events: {
            id: 'event-2',
            event_name: 'Reception',
            description: '',
            event_date: '2026-05-02',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Hall',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    insertQueue.push({ error: { message: 'relation "event_rsvps" does not exist' } });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Event-specific RSVP is temporarily unavailable for this site.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[1]);

    expect(screen.queryByText('Event-specific RSVP is temporarily unavailable for this site.')).not.toBeInTheDocument();
  });

  it('does not let a prior success timeout close a newly opened event form', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
        {
          id: 'inv-2',
          event_id: 'event-2',
          itinerary_events: {
            id: 'event-2',
            event_name: 'Reception',
            description: '',
            event_date: '2026-05-02',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Hall',
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

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /RSVP for this event|Update my RSVP/ })[1]);
    expect(screen.getByRole('heading', { name: 'Reception', level: 3 })).toBeInTheDocument();

    await new Promise((resolve) => window.setTimeout(resolve, 2100));

    expect(screen.getByRole('heading', { name: 'Reception', level: 3 })).toBeInTheDocument();
  }, 10000);

  it('does not keep a stale submitting state when reopening a different event', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [
        {
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Ceremony',
            description: '',
            event_date: '2026-05-02',
            start_time: '16:00:00',
            end_time: null,
            location_name: 'Garden',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
        {
          id: 'inv-2',
          event_id: 'event-2',
          itinerary_events: {
            id: 'event-2',
            event_name: 'Reception',
            description: '',
            event_date: '2026-05-02',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Hall',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    let resolveFirstInsert!: (value: { error: any }) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveFirstInsert = resolve;
    }) as unknown as { error: any });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /RSVP for this event|Update my RSVP/ })[1]);

    expect(screen.getByRole('button', { name: 'Submit RSVP' })).not.toBeDisabled();

    resolveFirstInsert({ error: null });
  });

  it('keeps the no-token reset truth if an event RSVP submit resolves after the token is removed', async () => {
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

    let resolveInsert!: (value: { error: any }) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveInsert = resolve;
    }) as unknown as { error: any });

    const view = render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await screen.findByRole('button', { name: 'Saving…' });

    currentToken = '';
    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();

    resolveInsert({ error: null });

    await waitFor(() => {
      expect(screen.getByText('No invitation link found. Please use the link from your invitation email.')).toBeInTheDocument();
    });
    expect(screen.queryByText("You're in!")).not.toBeInTheDocument();
    expect(screen.queryByText('Hello, Taylor!')).not.toBeInTheDocument();
  });

  it('drops stale async completions after the page unmounts', async () => {
    currentToken = 'guest-token';

    const deferredGuestLookup = createDeferredMaybeSingle();
    maybeSingleQueue.push(deferredGuestLookup.promise);

    const view = render(<EventRSVP />);
    view.unmount();

    deferredGuestLookup.resolve({
      data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' },
      error: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('Hello, Taylor!')).not.toBeInTheDocument();
    });
  });
});
