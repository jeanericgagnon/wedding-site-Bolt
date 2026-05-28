import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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
});
