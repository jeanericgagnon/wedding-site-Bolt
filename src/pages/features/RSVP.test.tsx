import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { RSVPFeature } from './RSVP';

describe('RSVP feature page truth', () => {
  it('keeps reminder marketing on phased support instead of broad automation claims', () => {
    render(
      <MemoryRouter>
        <RSVPFeature />
      </MemoryRouter>,
    );

    expect(screen.getByText('Set clear RSVP deadlines with guest-facing cutoffs. Reminder support and late override controls are being tightened in phases, so the page does not pretend every admin path is fully hands-off yet.')).toBeInTheDocument();
    expect(screen.getByText('Reminder drafts and scheduling support are the current strength. More automated RSVP reminder behavior is being enabled in phases, so we do not pretend every reminder path is fully hands-off yet.')).toBeInTheDocument();
    expect(screen.getByText('Reminder support, with fuller automation phased in')).toBeInTheDocument();
    expect(screen.queryByText('Reminder and override automation are in staged rollout.')).not.toBeInTheDocument();
    expect(screen.queryByText('Automated RSVP reminder campaigns are in rollout. Core RSVP flow is live today; reminder scheduling is being enabled in phases.')).not.toBeInTheDocument();
    expect(screen.queryByText('Reminder scheduling in rollout')).not.toBeInTheDocument();
  });

  it('routes feature-page CTAs to real next steps', () => {
    render(
      <MemoryRouter>
        <RSVPFeature />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Start your website' })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'See how Dayof works' })).toHaveAttribute('href', '/product');
    expect(screen.getByRole('link', { name: 'Explore more features' })).toHaveAttribute('href', '/product');
  });
});
