import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  navigateMock,
  signInMock,
  toastMock,
  locationRef,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  signInMock: vi.fn(),
  toastMock: vi.fn(),
  locationRef: {
    current: {
      pathname: '/',
      hash: '',
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => locationRef.current,
    Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: signInMock,
  }),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { Header } from './Header';

describe('Header demo handoff', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
    toastMock.mockReset();
    locationRef.current = { pathname: '/', hash: '' };

    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('routes successful demo sign-in to the overview workspace instead of generic dashboard', async () => {
    signInMock.mockResolvedValue(undefined);

    render(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'View demo' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    });
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('keeps demo login failures guest-safe and stays put', async () => {
    signInMock.mockRejectedValue(new Error('Provider timeout'));

    render(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'View demo' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Provider timeout', 'error');
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
