import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { TravelFeature } from './Travel';

describe('Travel feature page truth', () => {
  it('keeps travel marketing on grounded map, calendar, and timezone promises', () => {
    render(
      <MemoryRouter>
        <TravelFeature />
      </MemoryRouter>,
    );

    expect(screen.getByText('Offer calendar downloads for key events with the time, address, and notes guests need. Compatibility can vary by device and calendar app, so we keep the promise on the file itself.')).toBeInTheDocument();
    expect(screen.getByText('Show clear timezone labels so destination and cross-country guests can double-check timing without guesswork. We do not pretend every guest view auto-converts itself perfectly.')).toBeInTheDocument();
    expect(screen.getByText('Map handoff links')).toBeInTheDocument();
    expect(screen.getByText('Calendar downloads')).toBeInTheDocument();
    expect(screen.getByText('Clear timezone labels')).toBeInTheDocument();
    expect(screen.queryByText('Create calendar invites for each event. Works with Apple Calendar, Google Calendar, and Outlook.')).not.toBeInTheDocument();
    expect(screen.queryByText('Times displayed correctly for every guest based on their location. DST-safe handling prevents confusion.')).not.toBeInTheDocument();
    expect(screen.queryByText('Embedded maps')).not.toBeInTheDocument();
    expect(screen.queryByText('One-tap navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('DST-safe times')).not.toBeInTheDocument();
  });

  it('routes signed-out feature-page CTAs to real next steps', () => {
    render(
      <MemoryRouter>
        <TravelFeature />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Start your website' })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'See how Dayof works' })).toHaveAttribute('href', '/product');
    expect(screen.getByRole('link', { name: 'Explore more features' })).toHaveAttribute('href', '/product');
  });
});
