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

  it('shows invitation-not-recognized truth when search lookup returns no payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
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

  it('shows invitation-not-recognized truth when token lookup returns no payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    window.history.pushState({}, '', '/rsvp?token=token-1');

    render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(await screen.findByText('Invitation not recognized. Please search by name below.')).toBeInTheDocument();
    expect(screen.queryByText('Invalid invitation link. Please search by name below.')).not.toBeInTheDocument();
  });

  it('accepts a single fallback guest result after picking from ambiguous matches', async () => {
    fetchMock
      .mockResolvedValueOnce({
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
            {
              id: 'guest-2',
              first_name: 'Taylor',
              last_name: 'Stone',
              name: 'Taylor Stone',
              email: 'stone@example.com',
              phone: null,
              group_name: null,
              wedding_site_id: 'site-1',
              plus_one_allowed: false,
              invited_to_ceremony: true,
              invited_to_reception: false,
              invite_token: 'token-2',
            },
          ],
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest: null,
          existingRsvp: null,
          guests: [
            {
              id: 'guest-2',
              first_name: 'Taylor',
              last_name: 'Stone',
              name: 'Taylor Stone',
              email: 'stone@example.com',
              phone: null,
              group_name: null,
              wedding_site_id: 'site-1',
              plus_one_allowed: false,
              invited_to_ceremony: true,
              invited_to_reception: false,
              invite_token: 'token-2',
            },
          ],
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

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Taylor' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    expect(await screen.findByText('Multiple matches found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Taylor Stone/i }));

    expect(await screen.findByText('Welcome, Taylor Stone!')).toBeInTheDocument();
    expect(screen.queryByText('Multiple matches found')).not.toBeInTheDocument();
  });

  it('keeps the picked guest when a follow-up lookup still returns multiple matches', async () => {
    fetchMock
      .mockResolvedValueOnce({
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
            {
              id: 'guest-2',
              first_name: 'Taylor',
              last_name: 'Stone',
              name: 'Taylor Stone',
              email: 'stone@example.com',
              phone: null,
              group_name: null,
              wedding_site_id: 'site-1',
              plus_one_allowed: false,
              invited_to_ceremony: true,
              invited_to_reception: false,
              invite_token: 'token-2',
            },
          ],
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [],
        }),
      })
      .mockResolvedValueOnce({
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
            {
              id: 'guest-2',
              first_name: 'Taylor',
              last_name: 'Stone',
              name: 'Taylor Stone',
              email: 'stone@example.com',
              phone: null,
              group_name: null,
              wedding_site_id: 'site-1',
              plus_one_allowed: false,
              invited_to_ceremony: true,
              invited_to_reception: false,
              invite_token: 'token-2',
            },
          ],
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

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Taylor' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    expect(await screen.findByText('Multiple matches found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Taylor Stone/i }));

    expect(await screen.findByText('Welcome, Taylor Stone!')).toBeInTheDocument();
    expect(screen.queryByText('Welcome, Taylor Rivera!')).not.toBeInTheDocument();
  });

  it('does not leak stale household inheritance when picked-guest lookup falls back', async () => {
    fetchMock
      .mockResolvedValueOnce({
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
            {
              id: 'guest-2',
              first_name: 'Taylor',
              last_name: 'Stone',
              name: 'Taylor Stone',
              email: 'stone@example.com',
              phone: null,
              group_name: null,
              wedding_site_id: 'site-1',
              plus_one_allowed: false,
              invited_to_ceremony: true,
              invited_to_reception: false,
              invite_token: 'token-2',
            },
          ],
          rsvpDeadline: null,
          rsvpQuestions: [],
          rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef'] },
          musicPlaylistUrl: null,
          householdGuests: [
            {
              id: 'household-1',
              first_name: 'Jamie',
              last_name: 'Rivera',
              name: 'Jamie Rivera',
              invite_token: 'household-token',
              invited_to_ceremony: true,
              invited_to_reception: true,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Lookup failed' }),
      });

    render(
      <MemoryRouter initialEntries={['/rsvp']}>
        <RSVP />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Taylor' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    expect(await screen.findByText('Multiple matches found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Taylor Stone/i }));

    expect(await screen.findByText('Welcome, Taylor Stone!')).toBeInTheDocument();
    expect(screen.queryByText(/Jamie Rivera/)).not.toBeInTheDocument();
    expect(screen.queryByText(/This RSVP will also apply to:/)).not.toBeInTheDocument();
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

  it('clears stale error truth before resolving a replacement token lookup', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invitation not recognized. Please search by name below.' }),
      })
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
      });

    window.history.pushState({}, '', '/rsvp');

    const view = render(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'nobody' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    expect(await screen.findByText('Invitation not recognized. Please search by name below.')).toBeInTheDocument();

    await act(async () => {
      window.history.pushState({}, '', '/rsvp?token=token-1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    view.rerender(
      <BrowserRouter>
        <RSVP />
      </BrowserRouter>
    );

    expect(screen.queryByText('Invitation not recognized. Please search by name below.')).not.toBeInTheDocument();
    expect(await screen.findByText('Welcome, Taylor Rivera!')).toBeInTheDocument();
  });

  it('ignores a second submit click while the first RSVP submit is still in flight', async () => {
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
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));

    const submitButton = await screen.findByText('Submit RSVP');
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Submitting...')).toBeDisabled();

    submitRequest.resolve({
      ok: true,
      json: async () => ({ success: true, guestName: 'Taylor Rivera', attending: true }),
    } as Response);

    expect(await screen.findByText("You're confirmed!")).toBeInTheDocument();
  });

  it('clears stale submit errors when the guest edits their RSVP before retrying', async () => {
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
        ok: false,
        json: async () => ({ error: 'Failed to submit RSVP. Please try again.' }),
      });

    render(
      <MemoryRouter initialEntries={['/rsvp']}>
        <RSVP />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('rsvp.search_placeholder'), { target: { value: 'Taylor Rivera' } });
    fireEvent.click(screen.getByText('Find My Invitation'));

    await screen.findByText('Welcome, Taylor Rivera!');
    fireEvent.click(screen.getByText('Continue to details'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Chicken' } });
    fireEvent.click(screen.getByText('Continue to review'));
    fireEvent.click(screen.getByText('Submit RSVP'));

    expect(await screen.findByText('Failed to submit RSVP. Please try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back'));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Beef' },
    });

    expect(screen.queryByText('Failed to submit RSVP. Please try again.')).not.toBeInTheDocument();
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
