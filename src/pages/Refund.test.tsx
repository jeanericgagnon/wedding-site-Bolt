import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { Refund } from './Refund';

describe('Refund page truth', () => {
  it('keeps refund expectations on reviewable policy language instead of instant guarantees', () => {
    render(
      <MemoryRouter>
        <Refund />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Refund requests are reviewed against the policy below\./)).toBeInTheDocument();
    expect(screen.getByText('One-time purchases are eligible for a full refund within 30 days of purchase.')).toBeInTheDocument();
    expect(screen.getByText(/After 30 days, refund eligibility may be prorated/)).toBeInTheDocument();
    expect(screen.queryByText(/instant refund/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed refund/i)).not.toBeInTheDocument();
  });
});
