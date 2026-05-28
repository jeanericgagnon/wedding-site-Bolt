import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  defaultRsvpMultiEventData,
  rsvpMultiEventDefinition,
} from './multiEvent';

const { fromMock, maybeSingleMock, insertMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('RsvpMultiEvent', () => {
  beforeEach(() => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'wedding_sites') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        };
      }
      if (table === 'site_rsvps') {
        return {
          insert: insertMock,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    maybeSingleMock.mockReset();
    insertMock.mockReset();
  });

  it('shows guest-safe submit copy when embedded event RSVP save fails', async () => {
    maybeSingleMock.mockResolvedValue({ data: { id: 'site-1' } });
    insertMock.mockResolvedValue({ error: { message: 'provider timeout token=abc' } });

    render(
      <rsvpMultiEventDefinition.Component
        data={defaultRsvpMultiEventData}
        siteSlug="alex-jordan"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Your full name'), { target: { value: 'Taylor Guest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Joyfully accepts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    expect(await screen.findByText('Could not save your event RSVP right now. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong. Please try again or contact us directly.')).not.toBeInTheDocument();
  });
});
