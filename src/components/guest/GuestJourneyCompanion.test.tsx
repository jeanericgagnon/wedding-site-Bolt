import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

import { GuestJourneyCompanion } from './GuestJourneyCompanion';

describe('GuestJourneyCompanion', () => {
  it('renders next-step guest links without repeating the current surface', () => {
    render(
      <GuestJourneyCompanion
        currentSurface="contact"
        siteSlug="ericandkaras"
        inviteToken="invite-123"
        previewGuest="guest-42"
        isHubEntry
        completedSurfaces={['rsvp']}
      />,
    );

    expect(screen.getByRole('heading', { name: /update details without losing your place/i })).toBeInTheDocument();
    expect(screen.getByText(/update path ready/i)).toBeInTheDocument();
    expect(screen.getByText(/next useful moves/i)).toBeInTheDocument();
    expect(screen.getByText('Main focus')).toBeInTheDocument();
    expect(screen.getByText(/fix the guest record, then return them to momentum/i)).toBeInTheDocument();
    expect(screen.getByText('Best next move')).toBeInTheDocument();
    expect(screen.getByText(/save the corrected guest details/i)).toBeInTheDocument();
    expect(screen.getByText('Decision rule')).toBeInTheDocument();
    expect(screen.getByText(/Correcting details should tighten the path/i)).toBeInTheDocument();
    expect(screen.getByText('current')).toBeInTheDocument();
    expect(screen.getByText('next')).toBeInTheDocument();
    expect(screen.getByText('then')).toBeInTheDocument();
    expect(screen.getByText(/Correct the details cleanly/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to the real wedding task/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wedding hub' })).toHaveAttribute('href', '/site/ericandkaras?previewGuest=guest-42&previewSurface=public&token=invite-123');
    expect(screen.getByRole('link', { name: 'Travel details' })).toHaveAttribute('href', '/site/ericandkaras?previewGuest=guest-42&previewSurface=travel&token=invite-123#travel');
    expect(screen.getByRole('link', { name: 'RSVP' })).toHaveAttribute('href', '/rsvp?site=ericandkaras&token=invite-123');
    expect(screen.getByRole('link', { name: 'Upload photos' })).toHaveAttribute('href', '/photos/upload?site=ericandkaras&t=invite-123&hub=1&previewGuest=guest-42&previewSurface=photos');
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Here now')).toBeInTheDocument();
    expect(screen.getByText('Next up')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update details' })).not.toBeInTheDocument();
  });
});
