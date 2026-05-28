import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'guests') {
          return {
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }

        if (table === 'event_invitations') {
          return {
            eq: () => Promise.resolve({ data: [], error: null }),
          };
        }

        if (table === 'event_rsvps') {
          return {
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    }),
  },
}));

import EventRSVP from './EventRSVP';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('EventRSVP invite token canonicalization', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rewrites legacy token links to invite_token while preserving other params', async () => {
    render(
      <MemoryRouter initialEntries={['/events?token=legacy-456&site=maya-leo']}>
        <Routes>
          <Route
            path="/events"
            element={
              <>
                <EventRSVP />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/events?site=maya-leo&invite_token=legacy-456',
      );
    });
  });
});
