import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { buildGuestContactAccessPayload, buildGuestContactIdentityPayload, friendlyGuestContactError, GuestContactUpdate, safeGuestContactFunctionError } from './GuestContactUpdate';

describe('friendlyGuestContactError', () => {
  it('packages invite and password artifacts for gated guest-contact lookup', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.setItem('dayof_guest_invite_token_ericandkaras', 'guest-invite-123');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');
    window.history.replaceState({}, '', '/guest-contact/ericandkaras?token=current-invite&invite_token=current-guest-invite');

    expect(buildGuestContactAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
    expect(buildGuestContactIdentityPayload('ericandkaras')).toEqual({
      guestInviteToken: 'current-guest-invite',
    });
  });

  it('hides internal guest contact lookup and submit failures from guests', () => {
    expect(friendlyGuestContactError(new Error('database policy denied token'), 'Please try again.')).toBe('Please try again.');
    expect(friendlyGuestContactError(new Error('request failed at functions/v1/guest-contact-submit'), 'Please try again.')).toBe('Please try again.');
    expect(safeGuestContactFunctionError('Supabase policy denied token abc123', 'Please try again.')).toBe('Please try again.');
    expect(safeGuestContactFunctionError({ error: 'database relation guests missing' }, 'Please try again.')).toBe('Please try again.');
  });

  it('keeps plain validation copy when it is already guest safe', () => {
    expect(friendlyGuestContactError(new Error('Add an email or phone first.'), 'Please try again.')).toBe('Add an email or phone first.');
    expect(friendlyGuestContactError(new Error('Add the last 4 digits of the phone number on file before updating your whole party.'), 'Please try again.')).toBe('Add the last 4 digits of the phone number on file before updating your whole party.');
    expect(safeGuestContactFunctionError('Add an email or phone first.', 'Please try again.')).toBe('Add an email or phone first.');
    expect(safeGuestContactFunctionError('Add the last 4 digits of the phone number on file before updating your whole party.', 'Please try again.')).toBe('Add the last 4 digits of the phone number on file before updating your whole party.');
  });

  it('labels the guest lookup and contact update fields clearly', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/guest-contact/ericandkaras'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/guest-contact/:token',
            element: React.createElement(GuestContactUpdate),
          }),
        ),
      ),
    );

    const search = screen.getByLabelText('Find your guest record');
    expect(search).toHaveAttribute('id', 'guest-contact-search');
    expect(search).toHaveAttribute('aria-describedby', 'guest-contact-search-helper');
    expect(screen.getByPlaceholderText('Search your full name')).toHaveAttribute('id', 'guest-contact-search');
    expect(screen.getByText('Use your full name exactly as it appears on the invitation.')).toHaveAttribute('id', 'guest-contact-search-helper');
    expect(screen.getByPlaceholderText('First few letters of your email')).toHaveAttribute('id', 'guest-contact-verifier');
    expect(screen.getByText('Add the first few characters of the email address on your invitation. If you opened this from your RSVP link, we can use that secure token too.')).toHaveAttribute('id', 'guest-contact-verifier-helper');
    expect(screen.getByPlaceholderText('Last 4 digits of your phone (for whole-party updates)')).toHaveAttribute('id', 'guest-contact-household-verifier');
    expect(screen.getByText('Add the last 4 digits of the phone number on file if you want to update your whole party.')).toHaveAttribute('id', 'guest-contact-household-verifier-helper');

    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute('id', 'guest-contact-email');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('id', 'guest-contact-phone');
    expect(screen.getByRole('group', { name: 'Mailing address (optional)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Address line 1')).toHaveAttribute('id', 'guest-contact-address-line-1');
    expect(screen.getByLabelText('ZIP / Postal code')).toHaveAttribute('id', 'guest-contact-postal-code');
    expect(screen.getByLabelText('RSVP (optional)')).toHaveAttribute('id', 'guest-contact-rsvp');
  });

  it('routes guest lookup and match selection through the shared lookup panel', () => {
    const pageSource = readFileSync('src/pages/GuestContactUpdate.tsx', 'utf8');
    const panelSource = readFileSync('src/pages/GuestContactLookupPanel.tsx', 'utf8');

    expect(pageSource).toContain("from './GuestContactLookupPanel'");
    expect(pageSource).toContain('<GuestContactLookupPanel');
    expect(panelSource).toContain('id="guest-contact-search"');
    expect(panelSource).toContain('id="guest-contact-verifier"');
    expect(panelSource).toContain('id="guest-contact-household-verifier"');
    expect(panelSource).toContain('id="guest-contact-match"');
    expect(pageSource).toContain('buildGuestContactIdentityPayload');
  });

  it('tracks direct guest-contact invite views through aggregate guest analytics', () => {
    const pageSource = readFileSync('src/pages/GuestContactUpdate.tsx', 'utf8');

    expect(pageSource).toContain("from './guestHubPublicService'");
    expect(pageSource).toContain("trackGuestHubEvent(siteRef, 'view', '/guest-contact/invite'");
    expect(pageSource).toContain('...buildGuestContactAccessPayload(siteRef)');
    expect(pageSource).toContain('...buildGuestContactIdentityPayload(siteRef)');
  });
});
