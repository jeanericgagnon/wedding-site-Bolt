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

import { RegistryFeature } from './Registry';

describe('Registry feature page truth', () => {
  it('keeps registry import marketing on cooperative metadata instead of promising preview-rich fetches by default', () => {
    render(
      <MemoryRouter>
        <RegistryFeature />
      </MemoryRouter>,
    );

    expect(screen.getByText('Paste a registry URL and DayOf can often pull in the core item details to speed up setup. Merchant images and richer metadata work best when the source cooperates, with manual cleanup when it does not.')).toBeInTheDocument();
    expect(screen.getByText(/Core item details when available/)).toBeInTheDocument();
    expect(screen.getByText(/Merchant images when available/)).toBeInTheDocument();
    expect(screen.queryByText('Paste a registry URL and DayOf can often pull in the title, description, and preview image to speed up setup, with manual cleanup when merchants are messy.')).not.toBeInTheDocument();
    expect(screen.queryByText('Metadata fetch when available')).not.toBeInTheDocument();
    expect(screen.queryByText('Preview images when available')).not.toBeInTheDocument();
  });

  it('routes signed-out feature-page CTAs to real next steps', () => {
    render(
      <MemoryRouter>
        <RegistryFeature />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Start your website' })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'See how Dayof works' })).toHaveAttribute('href', '/product');
    expect(screen.getByRole('link', { name: 'Explore more features' })).toHaveAttribute('href', '/product');
  });
});
