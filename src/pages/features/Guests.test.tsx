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

import { GuestsFeature } from './Guests';

describe('Guests feature page truth', () => {
  it('keeps guest import marketing on guided mapping instead of promising any spreadsheet format', () => {
    render(
      <MemoryRouter>
        <GuestsFeature />
      </MemoryRouter>,
    );

    expect(screen.getByText('Import your guest list from Excel or Google Sheets. Guided column mapping helps with common guest-list formats without pretending every spreadsheet lands perfectly on the first try.')).toBeInTheDocument();
    expect(screen.getByText(/Suggested mapping for common guest fields/)).toBeInTheDocument();
    expect(screen.getByText('CSV import + guided mapping')).toBeInTheDocument();
    expect(screen.queryByText('Intelligent column mapping handles any format.')).not.toBeInTheDocument();
    expect(screen.queryByText('Auto-detect column mappings')).not.toBeInTheDocument();
    expect(screen.queryByText('CSV import + export')).not.toBeInTheDocument();
  });

  it('routes signed-out feature-page CTAs to real next steps', () => {
    render(
      <MemoryRouter>
        <GuestsFeature />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Start your website' })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'See how Dayof works' })).toHaveAttribute('href', '/product');
    expect(screen.getByRole('link', { name: 'Explore more features' })).toHaveAttribute('href', '/product');
  });
});
