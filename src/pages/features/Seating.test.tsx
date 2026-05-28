import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { SeatingFeature } from './Seating';

describe('Seating feature page truth', () => {
  it('keeps seating promises on editable planning instead of unproven multi-layout or one-click recovery claims', () => {
    render(
      <MemoryRouter>
        <SeatingFeature />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Keep the room plan editable as details change/)).toBeInTheDocument();
    expect(screen.getByText(/Reassign from the same seating workspace/)).toBeInTheDocument();
    expect(screen.queryByText('Save multiple layouts')).not.toBeInTheDocument();
    expect(screen.queryByText('Reassign in one click')).not.toBeInTheDocument();
  });

  it('routes feature-page CTAs to real next steps', () => {
    render(
      <MemoryRouter>
        <SeatingFeature />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Start your website' })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'See how Dayof works' })).toHaveAttribute('href', '/product');
    expect(screen.getByRole('link', { name: 'Explore more features' })).toHaveAttribute('href', '/product');
  });
});
