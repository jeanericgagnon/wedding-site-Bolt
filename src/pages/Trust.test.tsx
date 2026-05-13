import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  user: null as null | { id: string },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { Trust } from './Trust';

describe('Trust page draft-first CTA', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
  });

  it('sends anonymous visitors to signup from the trust CTA', () => {
    render(<Trust />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Start your draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/signup');
    expect(screen.getByRole('link', { name: 'See product tour' })).toHaveAttribute('href', '/product');
    fireEvent.click(screen.getAllByRole('button', { name: 'Start your draft' })[1]);
    expect(navigateMock).toHaveBeenCalledWith('/signup');
  });

  it('sends signed-in visitors to live trust workspaces from the trust CTA', () => {
    authState.user = { id: 'user-1' };
    render(<Trust />);

    fireEvent.click(screen.getByRole('button', { name: 'Review your draft' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getByRole('link', { name: 'Open planner space' })).toHaveAttribute('href', '/dashboard/planning');
    fireEvent.click(screen.getByRole('button', { name: 'Open site editor' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    fireEvent.click(screen.getByRole('button', { name: 'Open planner space' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/planning');
    fireEvent.click(screen.getByRole('button', { name: 'Open account settings' }));
    expect(navigateMock).toHaveBeenCalledWith('/settings');
    fireEvent.click(screen.getByRole('button', { name: 'Open coordinator view' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/coordinator');
    fireEvent.click(screen.getByRole('button', { name: 'Open guest list' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests');
    fireEvent.click(screen.getByRole('button', { name: 'Open message drafts' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/messages');
    fireEvent.click(screen.getByRole('button', { name: 'Open RSVP board' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/rsvp-board');
    fireEvent.click(screen.getByRole('button', { name: 'Open wedding home' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
  });
});
