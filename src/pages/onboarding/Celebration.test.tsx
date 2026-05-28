import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
let locationState: unknown = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: locationState }),
  };
});

vi.mock('../../components/ui', () => ({
  Button: ({
    children,
    fullWidth,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }>) => (
    <button data-full-width={fullWidth ? 'true' : undefined} {...props}>{children}</button>
  ),
  Card: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={() => {}} {...props}>{children}</div>
  ),
}));

import { Celebration } from './Celebration';

describe('Celebration', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    locationState = {};
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('falls back to generic completion copy when the wedding date is invalid', () => {
    locationState = { weddingDate: 'not-a-real-date' };

    render(<Celebration />);

    expect(screen.getByText('Your account is ready. Choose the fastest way to get your wedding website where you want it.')).toBeInTheDocument();
    expect(screen.queryByText(/days until the big day!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your big day is here!/i)).not.toBeInTheDocument();
  });

  it('falls back to generic completion copy when the wedding date is impossible', () => {
    locationState = { weddingDate: '2027-02-30' };

    render(<Celebration />);

    expect(screen.getByText('Your account is ready. Choose the fastest way to get your wedding website where you want it.')).toBeInTheDocument();
    expect(screen.queryByText(/days until the big day!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your big day is here!/i)).not.toBeInTheDocument();
  });

  it('shows the countdown badge when the wedding date is valid and in the future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    locationState = { weddingDate: future.toISOString() };

    render(<Celebration />);

    expect(screen.getByText(/days until the big day!/i)).toBeInTheDocument();
  });

  it('keeps AI setup copy framed as assisted draft help instead of AI-led automation', () => {
    render(<Celebration />);

    expect(screen.getByText('AI-assisted setup')).toBeInTheDocument();
    expect(screen.getByText('Fastest path to a draft with AI help')).toBeInTheDocument();
    expect(screen.getByText('AI-assisted first draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start AI-assisted setup' })).toBeInTheDocument();
    expect(screen.queryByText('AI setup')).not.toBeInTheDocument();
    expect(screen.queryByText('AI-led fastest path')).not.toBeInTheDocument();
  });

  it('routes each celebration path to the concrete next step it promises', () => {
    render(<Celebration />);

    fireEvent.click(screen.getByRole('button', { name: 'Start AI-assisted setup' }));
    expect(navigateMock).toHaveBeenCalledWith('/onboarding/quick-start?bypassPayment=1');

    fireEvent.click(screen.getByRole('button', { name: 'Start guided setup' }));
    expect(navigateMock).toHaveBeenCalledWith('/onboarding?bypassPayment=1');

    fireEvent.click(screen.getByRole('button', { name: 'Open builder' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder?bypassPayment=1');
  });

  it('keeps the manual celebration path framed around the builder instead of a generic dashboard', () => {
    render(<Celebration />);

    expect(screen.getByText('Jump straight into the builder and handle every detail yourself.')).toBeInTheDocument();
    expect(screen.getByText('Go straight to the builder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open builder' })).toBeInTheDocument();
    expect(screen.queryByText('Open dashboard')).not.toBeInTheDocument();
  });
});
