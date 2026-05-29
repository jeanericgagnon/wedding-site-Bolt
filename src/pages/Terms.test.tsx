import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Terms } from './Terms';

describe('Terms page truth', () => {
  it('keeps terms language on reviewable drafts, conditional billing, and no uptime guarantees', () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Day of Love may generate draft copy, structure, or setup suggestions\./)).toBeInTheDocument();
    expect(screen.getByText(/You are responsible for reviewing, editing, and approving any content before publishing it or sharing it with guests\./)).toBeInTheDocument();
    expect(screen.getByText(/Some lanes may use server-side model-backed tools when configured, while others remain deterministic helpers\./)).toBeInTheDocument();
    expect(screen.getByText(/Paid features may require an active subscription or completed purchase\./)).toBeInTheDocument();
    expect(screen.getByText(/We do not guarantee uninterrupted availability/)).toBeInTheDocument();
    expect(screen.queryByText(/guaranteed uninterrupted availability/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully automated publishing/i)).not.toBeInTheDocument();
  });
});
