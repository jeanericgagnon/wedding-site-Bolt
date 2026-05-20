import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGuestbookAccessPayload, buildGuestbookIdentityPayload, friendlyGuestbookError, GuestbookSubmit, safeGuestbookFunctionError } from './GuestbookSubmit';

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('friendlyGuestbookError', () => {
  it('hides internal guestbook submit failures from guests', () => {
    expect(friendlyGuestbookError(new Error('Supabase storage bucket policy denied token'))).toBe(
      'Couldn’t send your note right now. Please try again in a moment.',
    );
    expect(friendlyGuestbookError(new Error('request failed at functions/v1/guestbook-submit'))).toBe(
      'Couldn’t send your note right now. Please try again in a moment.',
    );
    expect(safeGuestbookFunctionError('Supabase storage bucket policy denied token')).toBe(
      'Couldn’t send your note right now. Please try again in a moment.',
    );
  });

  it('keeps plain validation copy when it is already guest safe', () => {
    expect(friendlyGuestbookError(new Error('Write a note before sending.'))).toBe('Write a note before sending.');
    expect(safeGuestbookFunctionError('Write a note before sending.')).toBe('Write a note before sending.');
  });

  it('labels optional guest fields and connects the note to its character count', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/guestbook/ericandkaras'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/guestbook/:siteRef',
            element: React.createElement(GuestbookSubmit),
          }),
        ),
      ),
    );

    expect(screen.getByLabelText('Your name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toBeInTheDocument();

    const note = screen.getByLabelText('Note');
    expect(note).toHaveAttribute('aria-describedby', 'guestbook-message-count');
    expect(screen.getByText('0/2000 characters')).toHaveAttribute('id', 'guestbook-message-count');

    fireEvent.change(note, { target: { value: 'Loved the ceremony.' } });

    expect(screen.getByText('19/2000 characters')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to wedding hub' })).toHaveAttribute('href', '/event/ericandkaras');
  });

  it('shows a visible validation alert when guests try to send an empty note', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/guestbook/ericandkaras'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/guestbook/:siteRef',
            element: React.createElement(GuestbookSubmit),
          }),
        ),
      ),
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Send note' }).closest('form')!);

    expect(screen.getByRole('alert')).toHaveTextContent('Write a note before sending.');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-describedby', 'guestbook-message-error guestbook-message-count');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears stale guestbook errors once the guest starts editing again', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/guestbook/ericandkaras'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/guestbook/:siteRef',
            element: React.createElement(GuestbookSubmit),
          }),
        ),
      ),
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Send note' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Write a note before sending.');

    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Loved being there.' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('routes the guestbook form shell through the shared form panel', () => {
    const pageSource = readFileSync('src/pages/GuestbookSubmit.tsx', 'utf8');
    const panelSource = readFileSync('src/pages/GuestbookSubmitFormPanel.tsx', 'utf8');

    expect(pageSource).toContain("from './GuestbookSubmitFormPanel'");
    expect(pageSource).toContain('<GuestbookSubmitFormPanel');
    expect(pageSource).toContain('captureGuestInviteTokenFromSearch(siteSlug, searchParams);');
    expect(panelSource).toContain('id="guestbook-message"');
    expect(panelSource).not.toContain('required');
    expect(panelSource).toContain("guestbook-message-error guestbook-message-count");
    expect(panelSource).toContain('aria-invalid={error ? \'true\' : undefined}');
    expect(panelSource).toContain('Back to wedding hub');
  });
});

describe('buildGuestbookAccessPayload', () => {
  it('packages invite and password access for gated guestbook submission', () => {
    window.history.replaceState({}, '', '/guestbook/ericandkaras?token=current-invite');
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');

    expect(buildGuestbookAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('falls back to stored invite access for guestbook links opened from a gated hub', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');

    expect(buildGuestbookAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'stored-invite',
      passwordSession: null,
    });
  });

  it('captures guest invite identity for guestbook links', () => {
    window.history.replaceState({}, '', '/guestbook/ericandkaras?invite_token=current-guest-invite');
    sessionStorage.setItem('dayof_guest_invite_token_ericandkaras', 'stored-guest-invite');

    expect(buildGuestbookIdentityPayload('ericandkaras')).toEqual({
      guestInviteToken: 'current-guest-invite',
    });
  });

  it('tracks direct guestbook invite views through aggregate guest analytics', () => {
    const pageSource = readFileSync('src/pages/GuestbookSubmit.tsx', 'utf8');

    expect(pageSource).toContain("from './guestHubPublicService'");
    expect(pageSource).toContain("trackGuestHubEvent(siteSlug, 'view', '/guestbook/invite'");
    expect(pageSource).toContain('...buildGuestbookAccessPayload(siteSlug)');
    expect(pageSource).toContain('...buildGuestbookIdentityPayload(siteSlug)');
  });
});
