import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../config/env', () => ({ DEMO_MODE: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../components/ui/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div>LanguageSwitcher</div> }));

import RSVP from './RSVP';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('RSVP invite token canonicalization', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        guest: null,
        existingRsvp: null,
        guests: null,
        rsvpDeadline: null,
        rsvpQuestions: [],
        rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
        musicPlaylistUrl: null,
        householdGuests: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rewrites legacy token links to invite_token while preserving other guest context', async () => {
    render(
      <MemoryRouter initialEntries={['/rsvp?token=legacy-456&site=maya-leo&previewGuest=guest-42']}>
        <Routes>
          <Route
            path="/rsvp"
            element={
              <>
                <RSVP />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/rsvp?site=maya-leo&previewGuest=guest-42&invite_token=legacy-456',
      );
    });
  });
});
