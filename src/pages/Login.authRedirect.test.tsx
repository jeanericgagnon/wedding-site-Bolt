import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const useLocationMock = vi.fn(() => ({ state: null }));
const signInMock = vi.fn();
const loginWithPasswordMock = vi.fn();
const getLoginSessionMock = vi.fn(() => Promise.resolve(null));
const startLoginWithGoogleMock = vi.fn();
const sendLoginPasswordResetMock = vi.fn();
const subscribeLoginAuthStateMock = vi.fn();
let searchParams = new URLSearchParams();
let authStateCallback: ((event: string, session: { user?: { email?: string | null } } | null) => void) | null = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}`} {...props}>{children}</a>,
    useLocation: () => useLocationMock(),
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParams],
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: signInMock }),
}));

vi.mock('./loginService', () => ({
  getLoginSession: () => getLoginSessionMock(),
  loginWithPassword: (...args: unknown[]) => loginWithPasswordMock(...args),
  sendLoginPasswordReset: (...args: unknown[]) => sendLoginPasswordResetMock(...args),
  startLoginWithGoogle: (...args: unknown[]) => startLoginWithGoogleMock(...args),
  subscribeLoginAuthState: (callback: (event: string, session: { user?: { email?: string | null } } | null) => void) => {
    authStateCallback = callback;
    return subscribeLoginAuthStateMock(callback);
  },
}));

import { Login } from './Login';

describe('Login post-auth redirects', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
    loginWithPasswordMock.mockReset();
    getLoginSessionMock.mockReset();
    getLoginSessionMock.mockResolvedValue(null);
    startLoginWithGoogleMock.mockReset();
    sendLoginPasswordResetMock.mockReset();
    subscribeLoginAuthStateMock.mockReset();
    subscribeLoginAuthStateMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    useLocationMock.mockReturnValue({ state: null });
    searchParams = new URLSearchParams();
    authStateCallback = null;
  });

  it('does not let a late SIGNED_IN callback override password-login navigation', async () => {
    loginWithPasswordMock.mockResolvedValue({
      user: { email: 'test@gmail.com' },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@gmail.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
    expect(navigateMock.mock.calls[0]?.[0]).toBe('/dashboard/overview');

    await act(async () => {
      authStateCallback?.('SIGNED_IN', { user: { email: 'test@gmail.com' } });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledTimes(1);
    });
  });

  it('still lets oauth session callbacks perform the redirect when no earlier redirect ran', async () => {
    searchParams = new URLSearchParams('oauth=google');

    render(<Login />);

    await act(async () => {
      authStateCallback?.('SIGNED_IN', { user: { email: 'test@gmail.com' } });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview', { replace: true });
    });
  });
});
