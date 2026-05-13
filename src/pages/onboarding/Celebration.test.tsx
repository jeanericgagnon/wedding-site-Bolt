import { render, screen } from '@testing-library/react';
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
  Button: ({ children, fullWidth, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, onClick, ...props }: any) => <div role="button" tabIndex={0} onClick={onClick} onKeyDown={() => {}} {...props}>{children}</div>,
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

    expect(screen.getByText('Your account is ready. Choose the path that feels easiest right now.')).toBeInTheDocument();
    expect(screen.queryByText(/days until the big day!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your big day is here!/i)).not.toBeInTheDocument();
  });

  it('falls back to generic completion copy when the wedding date is impossible', () => {
    locationState = { weddingDate: '2027-02-30' };

    render(<Celebration />);

    expect(screen.getByText('Your account is ready. Choose the path that feels easiest right now.')).toBeInTheDocument();
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
});
