import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { friendlyGuestContactError, GuestContactUpdate } from './GuestContactUpdate';

describe('friendlyGuestContactError', () => {
  it('hides internal guest contact lookup and submit failures from guests', () => {
    expect(friendlyGuestContactError(new Error('database policy denied token'), 'Please try again.')).toBe('Please try again.');
    expect(friendlyGuestContactError(new Error('request failed at functions/v1/guest-contact-submit'), 'Please try again.')).toBe('Please try again.');
  });

  it('keeps plain validation copy when it is already guest safe', () => {
    expect(friendlyGuestContactError(new Error('Add an email or phone first.'), 'Please try again.')).toBe('Add an email or phone first.');
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
    expect(screen.getByText('Use the name from your invitation.')).toHaveAttribute('id', 'guest-contact-search-helper');

    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute('id', 'guest-contact-email');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('id', 'guest-contact-phone');
    expect(screen.getByRole('group', { name: 'Mailing address (optional)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Address line 1')).toHaveAttribute('id', 'guest-contact-address-line-1');
    expect(screen.getByLabelText('ZIP / Postal code')).toHaveAttribute('id', 'guest-contact-postal-code');
    expect(screen.getByLabelText('RSVP (optional)')).toHaveAttribute('id', 'guest-contact-rsvp');
  });
});
