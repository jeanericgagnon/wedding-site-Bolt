import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Privacy } from './Privacy';

describe('Privacy page truth', () => {
  it('keeps privacy language on narrow data-use and reviewable AI expectations', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByText(/This policy explains what we collect, how we use it, and how we handle wedding and guest information\./)).toBeInTheDocument();
    expect(screen.getByText(/Some Day of Love features use AI or model-backed tools to help interpret setup answers, propose content, and generate draft copy\./)).toBeInTheDocument();
    expect(screen.getByText(/You are responsible for reviewing generated outputs before publishing or sharing them with guests\./)).toBeInTheDocument();
    expect(screen.getByText(/Other helper lanes are deterministic and grounded in the project details you already entered/)).toBeInTheDocument();
    expect(screen.getByText(/We do not sell your personal information\./)).toBeInTheDocument();
    expect(screen.queryByText(/we sell your personal information/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully automated decisions/i)).not.toBeInTheDocument();
  });
});
