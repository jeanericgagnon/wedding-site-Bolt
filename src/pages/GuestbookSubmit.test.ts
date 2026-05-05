import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { friendlyGuestbookError, GuestbookSubmit } from './GuestbookSubmit';

describe('friendlyGuestbookError', () => {
  it('hides internal guestbook submit failures from guests', () => {
    expect(friendlyGuestbookError(new Error('Supabase storage bucket policy denied token'))).toBe(
      'Couldn’t send your note right now. Please try again in a moment.',
    );
    expect(friendlyGuestbookError(new Error('request failed at functions/v1/guestbook-submit'))).toBe(
      'Couldn’t send your note right now. Please try again in a moment.',
    );
  });

  it('keeps plain validation copy when it is already guest safe', () => {
    expect(friendlyGuestbookError(new Error('Write a note before sending.'))).toBe('Write a note before sending.');
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
});
