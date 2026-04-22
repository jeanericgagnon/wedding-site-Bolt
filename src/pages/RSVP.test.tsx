import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

vi.mock('../config/env', () => ({ DEMO_MODE: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../components/ui/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div>LanguageSwitcher</div> }));

import RSVP from './RSVP';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('RSVP stale submit protection', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not switch into success after the guest backs out of an in-flight submit', async () => {
    const submitRequest = deferred<Response>();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: null,
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockImplementationOnce(() => submitRequest.promise);

    render(
      <MemoryRouter initialEntries={['/rsvp']}>
        <RSVP />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Taylor Rivera' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    await screen.findByText('Welcome, Taylor Rivera!');

    fireEvent.click(screen.getByText('Continue to details'));

    const mealSelect = screen.getByRole('combobox');
    fireEvent.change(mealSelect, { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));

    await screen.findByText(/Final review & submit/);
    fireEvent.click(screen.getByText('Submit RSVP'));

    await screen.findByText('Submitting...');
    expect(screen.getByText('Back')).toBeDisabled();

    submitRequest.resolve({
      ok: true,
      json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText("You're confirmed!")).not.toBeInTheDocument();
    });
  });

  it('shows invitation-not-recognized truth instead of crashing on empty lookup results', async () => {
    fetchMock.mockResolvedValueOnce({
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

    render(
      <MemoryRouter initialEntries={['/rsvp']}>
        <RSVP />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Nobody' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    expect(await screen.findByText('Invitation not recognized. Please search by name below.')).toBeInTheDocument();
    expect(screen.queryByText('An error occurred. Please try again.')).not.toBeInTheDocument();
  });

  it('accepts a single fallback guest result from token lookup', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        guest: null,
        existingRsvp: null,
        guests: [
          {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
        ],
        rsvpDeadline: null,
        rsvpQuestions: [],
        rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
        musicPlaylistUrl: null,
        householdGuests: [],
      }),
    });

    window.history.pushState({}, '', '/rsvp?token=token-1');

    render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(await screen.findByText('Welcome, Taylor Rivera!')).toBeInTheDocument();
    expect(screen.queryByText('Invitation not recognized. Please search by name below.')).not.toBeInTheDocument();
  });

  it('returns token-linked guests to their loaded RSVP instead of dumping them to generic search after success', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: null,
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
      });

    window.history.pushState({}, '', '/rsvp?token=token-1');

    render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));
    fireEvent.click(screen.getByText('Submit RSVP'));

    await screen.findByText("You're confirmed!");
    fireEvent.click(screen.getByText('Done'));

    await screen.findByText('Welcome, Taylor Rivera!');
    expect(screen.queryByText('Find My Invitation')).not.toBeInTheDocument();
    expect(screen.getByText("You've already responded. You can update your response below.")).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue to details'));
    expect(screen.getByDisplayValue('Chicken')).toBeInTheDocument();
  });

  it('returns token-linked guests to their just-submitted RSVP truth after updating an existing response', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: {
            id: 'rsvp-1',
            attending: true,
            attending_ceremony: true,
            attending_reception: true,
            meal_choice: 'Chicken',
            plus_one_name: null,
            notes: null,
            custom_answers: {},
          },
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
      });

    window.history.pushState({}, '', '/rsvp?token=token-1');

    render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Beef' } });
    fireEvent.click(screen.getByText('Continue to review'));
    fireEvent.click(screen.getByText('Update RSVP'));

    await screen.findByText("You're confirmed!");
    fireEvent.click(screen.getByText('Done'));

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    expect(screen.getByDisplayValue('Beef')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Chicken')).not.toBeInTheDocument();
  });

  it('clears stale token-loaded form truth before resolving a replacement token lookup', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: {
            id: 'rsvp-1',
            attending: true,
            attending_ceremony: true,
            attending_reception: true,
            meal_choice: 'Chicken',
            plus_one_name: null,
            notes: null,
            custom_answers: { song: 'Dancing Queen' },
          },
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [
            { id: 'song', label: 'Favorite song', type: 'short_text', required: true },
          ],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      });

    const secondLookup = deferred<Response>();
    fetchMock.mockImplementationOnce(() => secondLookup.promise);

    window.history.pushState({}, '', '/rsvp?token=token-1');

    const view = render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    await screen.findByDisplayValue('Chicken');
    expect(screen.getByDisplayValue('Dancing Queen')).toBeInTheDocument();

    await act(async () => {
      window.history.pushState({}, '', '/rsvp?token=token-2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    view.rerender(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(await screen.findByText(/Loading your invitation/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Dancing Queen')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Chicken')).not.toBeInTheDocument();
  });

  it('keeps reset search truth if a token-linked submit resolves after the token is removed', async () => {
    const submitRequest = deferred<Response>();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: null,
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockImplementationOnce(() => submitRequest.promise);

    window.history.pushState({}, '', '/rsvp?token=token-1');

    const view = render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));
    fireEvent.click(screen.getByText('Submit RSVP'));

    await screen.findByText('Submitting...');

    await act(async () => {
      window.history.pushState({}, '', '/rsvp');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    view.rerender(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(await screen.findByText('Find My Invitation')).toBeInTheDocument();

    submitRequest.resolve({
      ok: true,
      json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByText('Find My Invitation')).toBeInTheDocument();
    });
    expect(screen.queryByText("You're confirmed!")).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome, Taylor Rivera!')).not.toBeInTheDocument();
  });

  it('drops stale token lookup completions after the page unmounts', async () => {
    const tokenLookup = deferred<Response>();

    fetchMock.mockImplementationOnce(() => tokenLookup.promise);
    window.history.pushState({}, '', '/rsvp?token=token-1');

    const view = render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(await screen.findByText(/Loading your invitation/)).toBeInTheDocument();
    view.unmount();

    tokenLookup.resolve({
      ok: true,
      json: async () => ({
        guest: {
          id: 'guest-1',
          first_name: 'Taylor',
          last_name: 'Rivera',
          name: 'Taylor Rivera',
          email: 'taylor@example.com',
          phone: null,
          group_name: null,
          wedding_site_id: 'site-1',
          plus_one_allowed: false,
          invited_to_ceremony: true,
          invited_to_reception: true,
          invite_token: 'token-1',
        },
        existingRsvp: null,
        guests: null,
        rsvpDeadline: null,
        rsvpQuestions: [],
        rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
        musicPlaylistUrl: null,
        householdGuests: [],
      }),
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText('Welcome, Taylor Rivera!')).not.toBeInTheDocument();
    });
  });

  it('drops stale token submit completions after the page unmounts', async () => {
    const submitRequest = deferred<Response>();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: {
            id: 'guest-1',
            first_name: 'Taylor',
            last_name: 'Rivera',
            name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: null,
            group_name: null,
            wedding_site_id: 'site-1',
            plus_one_allowed: false,
            invited_to_ceremony: true,
            invited_to_reception: true,
            invite_token: 'token-1',
          },
          existingRsvp: null,
          guests: null,
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockImplementationOnce(() => submitRequest.promise);

    window.history.pushState({}, '', '/rsvp?token=token-1');

    const view = render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));
    fireEvent.click(screen.getByText('Submit RSVP'));

    await screen.findByText('Submitting...');
    view.unmount();

    submitRequest.resolve({
      ok: true,
      json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText("You're confirmed!")).not.toBeInTheDocument();
    });
  });
});
