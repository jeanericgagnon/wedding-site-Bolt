import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  signIn: vi.fn(),
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

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock('../components/marketing/Reveal', () => ({
  Reveal: ({ children }: any) => <>{children}</>,
  HeroReveal: ({ children }: any) => <>{children}</>,
  SlideReveal: ({ children }: any) => <>{children}</>,
}));

import { Home } from './Home';

describe('Home draft-first CTAs', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
  });

  it('sends anonymous visitors to signup when they start their draft', () => {
    render(<Home />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Start your wedding site draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/signup');
    expect(screen.getAllByRole('button', { name: 'Start your wedding site draft' }).length).toBeGreaterThan(0);
  });

  it('sends signed-in users straight to the builder when they start their draft', () => {
    authState.user = { id: 'user-1' };
    render(<Home />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Review your wedding site draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getAllByRole('button', { name: 'Review your wedding site draft' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open your builder' })).toHaveAttribute('href', '/dashboard/builder');
    expect(screen.getAllByRole('link', { name: 'Open your dashboard' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Open your dashboard' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
  });
});
