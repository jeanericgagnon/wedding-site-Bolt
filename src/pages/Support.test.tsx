import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { Support } from './Support';

describe('Support page truth', () => {
  it('keeps support routes easy to reach without implying live chat or hidden policy paths', () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );

    expect(screen.getByText('Help for accounts, billing, guest details, RSVPs, photos, and wedding websites.')).toBeInTheDocument();
    expect(screen.getByText('If guests are blocked right before an event, include "time sensitive" in the subject and the page URL where the issue happened.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Refund policy' })).toHaveAttribute('href', '/refund');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
    expect(screen.queryByText(/live chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phone support/i)).not.toBeInTheDocument();
  });
});

