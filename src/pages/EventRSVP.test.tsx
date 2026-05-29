import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let currentToken = 'old-token';
const navigateMock = vi.fn();

type MaybeSingleResult = { data: unknown; error: unknown };
type SelectResult = { data: unknown; error: unknown };
type MutationResult = { error: unknown };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(currentToken ? `token=${currentToken}` : '')],
  };
});

const maybeSingleQueue: Array<MaybeSingleResult | Promise<MaybeSingleResult>> = [];
const selectQueue: SelectResult[] = [];
const insertQueue: Array<MutationResult | Promise<MutationResult>> = [];
const updateQueue: Array<MutationResult | Promise<MutationResult>> = [];
const insertedPayloads: unknown[] = [];
const updatedPayloads: unknown[] = [];

function createDeferredMaybeSingle() {
  let resolve!: (value: MaybeSingleResult) => void;
  const promise = new Promise<MaybeSingleResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createDeferredMutation() {
  let resolve!: (value: MutationResult) => void;
  const promise = new Promise<MutationResult>((res) => {
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
      insert: (payload: unknown) => {
        if (table === 'event_rsvps') {
          insertedPayloads.push(payload);
          return Promise.resolve(insertQueue.shift() ?? { error: null });
        }

        throw new Error(`Unexpected insert table ${table}`);
      },
      update: (payload: unknown) => ({
        eq: () => {
          if (table === 'event_rsvps') {
            updatedPayloads.push(payload);
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
    navigateMock.mockReset();
    maybeSingleQueue.length = 0;
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    insertedPayloads.length = 0;
    updatedPayloads.length = 0;
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

  it('does not let an invalid token keep reloading event RSVP continuity state', async () => {
    currentToken = 'bad-token';

    const deferredGuestLookup = createDeferredMaybeSingle();
    maybeSingleQueue.push(
      { data: null, error: null },
      deferredGuestLookup.promise,
    );

    render(<EventRSVP />);

    expect(await screen.findByText("This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.")).toBeInTheDocument();
    expect(maybeSingleQueue).toHaveLength(1);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
      await Promise.resolve();
    });

    expect(maybeSingleQueue).toHaveLength(1);
    expect(screen.getByText("This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.")).toBeInTheDocument();
  });

  it('keeps event RSVP load failures guest-safe instead of leaking internal details', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push({
      data: null,
      error: { message: 'Missing Supabase URL' },
    });

    render(<EventRSVP />);

    expect(await screen.findByText('Couldn’t load your event invitations right now. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/supabase/i)).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: '  Vegetarian  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: '  See you there  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Attending')).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));
    expect(screen.getByDisplayValue('Vegetarian')).toBeInTheDocument();
    expect(screen.getByDisplayValue('See you there')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('  Vegetarian  ')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('  See you there  ')).not.toBeInTheDocument();
    expect(selectQueue).toHaveLength(0);
  }, 10000);

  it('submits normalized event RSVP values to storage on a new RSVP', async () => {
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
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: '  Vegetarian  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: '  See you there  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    expect(insertedPayloads).toHaveLength(1);
    expect(insertedPayloads[0]).toEqual([
      expect.objectContaining({
        event_invitation_id: 'inv-1',
        attending: true,
        dietary_restrictions: 'Vegetarian',
        notes: 'See you there',
      }),
    ]);
  });

  it('drops stale event RSVP notes when the guest switches to not attending before submit', async () => {
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
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: 'Vegetarian' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'See you there' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Response saved')).toBeInTheDocument();
    });

    expect(insertedPayloads).toHaveLength(1);
    expect(insertedPayloads[0]).toEqual([
      expect.objectContaining({
        event_invitation_id: 'inv-1',
        attending: false,
        dietary_restrictions: null,
        notes: null,
      }),
    ]);
  });

  it('drops stale event RSVP notes when updating an existing RSVP to not attending', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegetarian', notes: 'See you there' }, error: null },
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

    updateQueue.push({ error: null });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));
    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));
    fireEvent.click(screen.getByRole('button', { name: 'Update RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Response saved')).toBeInTheDocument();
    });

    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toEqual(expect.objectContaining({
      attending: false,
      dietary_restrictions: null,
      notes: null,
    }));
  });

  it('clears hidden event RSVP note state when the guest switches back from not attending', async () => {
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: 'Vegetarian' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'See you there' },
    });

    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));
    fireEvent.click(screen.getByRole('button', { name: "Yes, I'll be there" }));

    expect(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy')).toHaveValue('');
    expect(screen.getByPlaceholderText('Any special requests or messages for the couple')).toHaveValue('');
    expect(screen.queryByDisplayValue('Vegetarian')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('See you there')).not.toBeInTheDocument();
  });

  it('clears hidden event RSVP note state immediately when an existing RSVP is toggled to not attending', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegetarian', notes: 'See you there' }, error: null },
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));

    expect(screen.getByDisplayValue('Vegetarian')).toBeInTheDocument();
    expect(screen.getByDisplayValue('See you there')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));

    expect(screen.queryByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Any special requests or messages for the couple')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Yes, I'll be there" }));

    expect(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy')).toHaveValue('');
    expect(screen.getByPlaceholderText('Any special requests or messages for the couple')).toHaveValue('');
    expect(screen.queryByDisplayValue('Vegetarian')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('See you there')).not.toBeInTheDocument();
  });

  it('normalizes loaded event RSVP truth before reopening an existing response', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: '  Vegetarian  ', notes: '  See you there  ' }, error: null },
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    expect(screen.getByText('Attending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));

    expect(screen.getByDisplayValue('Vegetarian')).toBeInTheDocument();
    expect(screen.getByDisplayValue('See you there')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('  Vegetarian  ')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('  See you there  ')).not.toBeInTheDocument();
  });

  it('reopens a blank event RSVP with the default attending form state', async () => {
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    expect(screen.getByRole('button', { name: "Yes, I'll be there" })).toHaveClass('bg-green-600');
    expect(screen.queryByRole('button', { name: "Can't make it" })).toHaveClass('bg-neutral-100');
  });

  it('reopens different blank event RSVPs with a fresh default form each time', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
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
            location_name: 'Ballroom',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: "Can't make it" }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[1]);

    expect(screen.getByRole('button', { name: "Yes, I'll be there" })).toHaveClass('bg-green-600');
    expect(screen.queryByRole('button', { name: "Can't make it" })).toHaveClass('bg-neutral-100');
    expect(screen.queryByDisplayValue('Welcome Dinner')).not.toBeInTheDocument();
  });

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
    expect(screen.getByText('Couldn’t load your event invitations right now. Please try again.')).toBeInTheDocument();
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
    expect(screen.getByText('Couldn’t load your event invitations right now. Please try again.')).toBeInTheDocument();
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

    let resolveOldInsert!: (value: MutationResult) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveOldInsert = resolve;
    }) as unknown as MutationResult);
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
      expect(screen.getByText('Could not save your event RSVP right now. Please try again.')).toBeInTheDocument();
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
    expect(screen.queryByText('Could not save your event RSVP right now. Please try again.')).not.toBeInTheDocument();
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

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 2100));
    });

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

    let resolveFirstInsert!: (value: MutationResult) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveFirstInsert = resolve;
    }) as unknown as MutationResult);

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /RSVP for this event|Update my RSVP/ })[1]);

    expect(screen.getByRole('button', { name: 'Submit RSVP' })).not.toBeDisabled();

    await act(async () => {
      resolveFirstInsert({ error: null });
      await Promise.resolve();
    });
  });

  it('keeps a reopened event form open when an older event load is invalidated on close', async () => {
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
            location_name: 'Ballroom',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });

    const firstSubmitRequest = createDeferredMutation();
    insertQueue.push(firstSubmitRequest.promise, { error: null });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await screen.findByRole('button', { name: 'Saving…' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'RSVP for this event' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await act(async () => {
      firstSubmitRequest.resolve({ error: null });
      await Promise.resolve();
    });
  });

  it('clears event RSVP errors when the guest closes the form', async () => {
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText('Could not save your event RSVP right now. Please try again.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Could not save your event RSVP right now. Please try again.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('clears stale event RSVP errors when the guest reopens the same event', async () => {
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    insertQueue.push({ error: { message: 'write failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    expect(await screen.findByText('Could not save your event RSVP right now. Please try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    expect(screen.queryByText('Could not save your event RSVP right now. Please try again.')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading your invitation')).not.toBeInTheDocument();
  });

  it('drops unsaved event RSVP edits when the guest cancels and reopens the same event', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: { attending: false, dietary_restrictions: null, notes: 'See you at brunch' }, error: null },
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

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));

    expect(screen.getByRole('button', { name: "Can't make it" })).toHaveClass('bg-neutral-700');

    fireEvent.click(screen.getByRole('button', { name: "Yes, I'll be there" }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), { target: { value: 'Vegetarian' } });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), { target: { value: 'New note' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update my RSVP' }));

    expect(screen.getByRole('button', { name: "Can't make it" })).toHaveClass('bg-neutral-700');
    expect(screen.queryByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Any special requests or messages for the couple')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Vegetarian')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('New note')).not.toBeInTheDocument();
  });

  it('drops unsaved blank event RSVP edits when the guest cancels and reopens the same event', async () => {
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

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    fireEvent.click(screen.getByRole('button', { name: "Yes, I'll be there" }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), { target: { value: 'Vegetarian' } });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), { target: { value: 'Can’t wait' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    expect(screen.getByRole('button', { name: "Yes, I'll be there" })).toHaveClass('bg-green-600');
    expect(screen.queryByDisplayValue('Vegetarian')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Can’t wait')).not.toBeInTheDocument();
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

    let resolveInsert!: (value: MutationResult) => void;
    insertQueue.push(new Promise((resolve) => {
      resolveInsert = resolve;
    }) as unknown as MutationResult);

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

  it('refreshes stale invitation RSVP truth when RSVP continuity updates arrive', async () => {
    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
    );

    render(<EventRSVP />);

    await screen.findByText('Welcome Party');
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('keeps the current event invitations visible while continuity refresh reloads in the background', async () => {
    currentToken = 'guest-token';

    const deferredRefreshGuestLookup = createDeferredMaybeSingle();

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      deferredRefreshGuestLookup.promise,
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
    );

    render(<EventRSVP />);

    await screen.findByText('Welcome Party');
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    expect(screen.getByText('Welcome Party')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();
    expect(screen.queryByText('Hello, Alex Guest!')).toBeInTheDocument();

    deferredRefreshGuestLookup.resolve({
      data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('does not replace loaded event RSVP truth with a fake invalid-link state during a background continuity refresh', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    selectQueue.push({
      data: [{
        id: 'inv-1',
        event_id: 'event-1',
        itinerary_events: {
          id: 'event-1',
          event_name: 'Welcome Party',
          description: 'Kickoff dinner',
          event_date: '2026-09-18',
          start_time: '18:00:00',
          end_time: null,
          location_name: 'Beach Club',
          location_address: '123 Shoreline Dr',
          dress_code: null,
          notes: null,
        },
      }],
      error: null,
    });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Alex Guest!')).toBeInTheDocument();
    expect(screen.getByText('Welcome Party')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    await waitFor(() => {
      expect(screen.getByText('Hello, Alex Guest!')).toBeInTheDocument();
      expect(screen.getByText('Welcome Party')).toBeInTheDocument();
    });

    expect(screen.queryByText('Link Not Recognized')).not.toBeInTheDocument();
    expect(screen.queryByText("This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.")).not.toBeInTheDocument();
  });

  it('keeps token-linked continuity retries alive after a background refresh failure', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      { data: null, error: { message: 'temporary outage' } },
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
    );

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Alex Guest!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    expect(screen.getByText('Welcome Party')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('does not drop queued event RSVP continuity refreshes while a background refresh is already in flight', async () => {
    currentToken = 'guest-token';

    const deferredRefreshGuestLookup = createDeferredMaybeSingle();

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      deferredRefreshGuestLookup.promise,
      { data: null, error: null },
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
    );

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Alex Guest!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    deferredRefreshGuestLookup.resolve({
      data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('defers continuity refresh while the RSVP form is open so active edits do not get reset', async () => {
    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-1', name: 'Alex Guest', email: 'alex@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'See you there' }, error: null },
    );

    selectQueue.push(
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
      {
        data: [{
          id: 'inv-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Party',
            description: 'Kickoff dinner',
            event_date: '2026-09-18',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'Beach Club',
            location_address: '123 Shoreline Dr',
            dress_code: null,
            notes: null,
          },
        }],
        error: null,
      },
    );

    render(<EventRSVP />);

    await screen.findByText('Welcome Party');
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    await screen.findByRole('button', { name: 'Submit RSVP' });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    expect(screen.getByRole('button', { name: 'Submit RSVP' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Submit RSVP' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('ignores its own submit continuity event so stale refetch truth does not overwrite the saved RSVP', async () => {
    currentToken = 'guest-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
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
              location_name: 'The Loft',
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
      },
    );

    insertQueue.push({ error: null });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: 'Vegetarian' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'See you there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    }, { timeout: 4000 });

    expect(screen.queryByRole('button', { name: 'RSVP for this event' })).not.toBeInTheDocument();
    expect(maybeSingleQueue).toHaveLength(2);
    expect(selectQueue).toHaveLength(1);
  }, 10000);

  it('does not let a prior token submit swallow the next token continuity refresh', async () => {
    currentToken = 'old-token';

    maybeSingleQueue.push(
      { data: { id: 'guest-1', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-2', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: null, error: null },
      { data: { id: 'guest-2', name: 'Jordan', email: 'jordan@example.com' }, error: null },
      { data: { attending: true, dietary_restrictions: 'Vegan', notes: 'Updated elsewhere' }, error: null },
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
              location_name: 'The Loft',
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
              location_name: 'Garden',
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
              location_name: 'Garden',
              location_address: '',
              dress_code: null,
              notes: null,
            },
          },
        ],
        error: null,
      },
    );

    insertQueue.push({ error: null });

    const view = render(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    currentToken = 'new-token';
    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update my RSVP' })).not.toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('dayof:rsvp-updated', { detail: { updatedAt: String(Date.now()) } }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    });
  });

  it('ignores a second event RSVP submit while the first submit is still in flight', async () => {
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

    const submitRequest = createDeferredMutation();
    insertQueue.push(submitRequest.promise);

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));

    const submitButton = screen.getByRole('button', { name: 'Submit RSVP' });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(insertQueue).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    submitRequest.resolve({ error: null });

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });
  });

  it('allows a new event RSVP submit after a prior submit is invalidated by token reset', async () => {
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

    const firstSubmitRequest = createDeferredMutation();
    insertQueue.push(firstSubmitRequest.promise);

    const view = render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await screen.findByRole('button', { name: 'Saving…' });

    currentToken = '';
    view.rerender(<EventRSVP />);
    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();

    currentToken = 'guest-token-2';
    maybeSingleQueue.push(
      { data: { id: 'guest-2', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: null, error: null },
    );
    selectQueue.push({
      data: [
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
            location_name: 'Ballroom',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });
    insertQueue.push({ error: null });

    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await act(async () => {
      firstSubmitRequest.resolve({ error: null });
      await Promise.resolve();
    });
  });

  it('allows a new event RSVP submit after a prior submit is invalidated by token change', async () => {
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

    const firstSubmitRequest = createDeferredMutation();
    insertQueue.push(firstSubmitRequest.promise);

    const view = render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await screen.findByRole('button', { name: 'Saving…' });

    currentToken = 'guest-token-2';
    maybeSingleQueue.push(
      { data: { id: 'guest-2', name: 'Taylor', email: 'taylor@example.com' }, error: null },
      { data: null, error: null },
    );
    selectQueue.push({
      data: [
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
            location_name: 'Ballroom',
            location_address: '',
            dress_code: null,
            notes: null,
          },
        },
      ],
      error: null,
    });
    insertQueue.push({ error: null });

    view.rerender(<EventRSVP />);

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await waitFor(() => {
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });

    await act(async () => {
      firstSubmitRequest.resolve({ error: null });
      await Promise.resolve();
    });
  });

  it('clears stale submit errors when the guest edits the event RSVP before retrying', async () => {
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

    insertQueue.push({ error: { message: 'write failed' } });

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    expect(await screen.findByText('Could not save your event RSVP right now. Please try again.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'See you soon' },
    });

    expect(screen.queryByText('Could not save your event RSVP right now. Please try again.')).not.toBeInTheDocument();
  });

  it('does not show stale submit success after the guest edits before an old submit resolves', async () => {
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

    const submitRequest = createDeferredMutation();
    insertQueue.push(submitRequest.promise);

    render(<EventRSVP />);

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    await screen.findByRole('button', { name: 'Saving…' });

    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'Updated note' },
    });

    submitRequest.resolve({ error: null });

    await waitFor(() => {
      expect(screen.queryByText("You're in!")).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Updated note')).toBeInTheDocument();
  });

  it('guards invalid persisted event dates in guest-facing event cards', async () => {
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
            event_date: 'not-a-date',
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

    expect(await screen.findByText('Hello, Jordan!')).toBeInTheDocument();
    expect(screen.getByText('Unknown date')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });

});
