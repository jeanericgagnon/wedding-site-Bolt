import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
const useLocationMock = vi.fn();
const useSearchParamsMock = vi.fn(() => [new URLSearchParams()]);
const signInWithOAuthMock = vi.fn(() => Promise.resolve({ error: null }));
const signInWithPasswordMock = vi.fn(() => Promise.resolve({ data: { user: { email: 'planner@example.com' } }, error: null }));
const signInMock = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({
      children,
      to,
      state,
      ...props
    }: {
      children: React.ReactNode;
      to: string | { pathname?: string; search?: string };
      state?: unknown;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        href={typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}`}
        data-nav-state={state ? JSON.stringify(state) : ''}
        {...props}
      >
        {children}
      </a>
    ),
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
    useSearchParams: () => useSearchParamsMock(),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: (...args: Parameters<typeof signInMock>) => signInMock(...args) }),
}));

vi.mock('../lib/signupContinuation', async () => {
  const actual = await vi.importActual<typeof import('../lib/signupContinuation')>('../lib/signupContinuation');
  return {
    ...actual,
    clearSignupReturnPath: vi.fn(actual.clearSignupReturnPath),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: Parameters<typeof signInWithPasswordMock>) => signInWithPasswordMock(...args),
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithOAuth: (...args: Parameters<typeof signInWithOAuthMock>) => signInWithOAuthMock(...args),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

import { Login } from './Login';

describe('Login quick start handoff', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInWithOAuthMock.mockClear();
    signInWithPasswordMock.mockClear();
    signInMock.mockClear();
    window.localStorage.clear();
    useLocationMock.mockReturnValue({ state: {
      quickStartDraft: {
        currentIndex: Number.MAX_SAFE_INTEGER + 1,
        initialSetupAnswers: { names: 'Alex & Jordan' },
        followUpAnswers: { '': 'bad', lodging: 'Need shuttle details' },
        showFollowUps: true,
        viewState: 'followups',
        clarifyingState: { clarifying: [] },
      },
    } });
  });

  it('normalizes carried onboarding drafts before persisting login restore state', async () => {
    render(<Login />);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
      expect(stored.currentIndex).toBe(2);
      expect(stored.followUpAnswers).toEqual({});
      expect(stored.showFollowUps).toBe(false);
      expect(stored.viewState).toBe('question');
    });
  });


  it('ignores empty carried onboarding drafts during login handoff', async () => {
    useLocationMock.mockReturnValue({ state: {
      quickStartDraft: {
        currentIndex: 0,
        initialSetupAnswers: {},
        followUpAnswers: {},
        showFollowUps: false,
        viewState: 'question',
        clarifyingState: null,
      },
    } });

    render(<Login />);

    await waitFor(() => {
      expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    });
  });


  it('normalizes carried onboarding drafts before google login handoff persistence', async () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalled();
      const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
      expect(stored.currentIndex).toBe(2);
      expect(stored.followUpAnswers).toEqual({});
      expect(stored.showFollowUps).toBe(false);
      expect(stored.viewState).toBe('question');
    });
  });


  it('passes normalized onboarding drafts when switching from login to signup', async () => {
    render(<Login />);

    const link = screen.getByRole('link', { name: 'Create account to keep going' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state.quickStartDraft).toEqual(expect.objectContaining({
      currentIndex: 2,
      followUpAnswers: {},
      showFollowUps: false,
      viewState: 'question',
    }));
  });

  it('keeps start-draft login copy aligned with the builder return path', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Login />);

    expect(await screen.findByText('Sign in to get back to your starter draft and keep shaping it.')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to manage your wedding website')).not.toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Create account to keep going' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state).toEqual({ returnTo: '/dashboard/builder-guide' });
  });

  it('returns password login to the builder when the user came from start draft', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /^sign in$/i }).closest('form')!);

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'StrongPassword123!',
      });
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');
    });
  });

  it('uses the builder callback path for Google login when the user came from start draft', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3000/dashboard/builder-guide',
        }),
      }));
    });
  });

  it('masks provider-heavy Google auth failures behind calm login copy', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({
      error: new Error('functions/v1/google-auth provider timeout with token=abc'),
    } as never);

    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t start Google sign-in right now. Please try again.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/provider|token|functions\/v1/i);
  });


  it('omits empty onboarding drafts when switching from login to signup', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });

    render(<Login />);

    expect(await screen.findByText('Sign in to keep going with setup.')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to manage your wedding website')).not.toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Create account to keep going' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state).toEqual({ returnTo: '/onboarding' });
  });

  it('keeps quick-start resume login copy and signup CTA aligned with the carried setup draft', async () => {
    useLocationMock.mockReturnValue({
      state: {
        returnTo: '/onboarding/quick-start?bypassPayment=1',
        quickStartDraft: {
          currentIndex: 2,
          initialSetupAnswers: { names: 'Alex & Jordan' },
          followUpAnswers: {},
          showFollowUps: false,
          viewState: 'question',
          clarifyingState: null,
        },
      },
    });

    render(<Login />);

    expect(await screen.findByText('Sign in to jump back into your setup draft and keep going.')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to manage your wedding website')).not.toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Create account to keep going' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state).toEqual({
      returnTo: '/onboarding/quick-start?bypassPayment=1',
      quickStartDraft: expect.objectContaining({
        currentIndex: 2,
        showFollowUps: false,
        viewState: 'question',
      }),
    });
  });

  it('passes collaborator invite auth context to signup with snake_case params', async () => {
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Login />);

    const link = screen.getByRole('link', { name: 'Create collaborator account' });
    expect(link).toHaveAttribute(
      'href',
      '/signup?invite_token=invite-123&invite_email=planner%40example.com&invite_role=planner&invite_site=Alex+%26+Sam',
    );
  });

  it('returns collaborator login directly to the invite accept route with invite_token params', async () => {
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'planner@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in and continue invite/i }).closest('form')!);

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'planner@example.com',
        password: 'StrongPassword123!',
      });
      expect(navigateMock).toHaveBeenCalledWith('/accept-collaborator-invite?invite_token=invite-123', { replace: true });
    });
  });

  it('uses invite_token collaborator redirects for Google login handoff', async () => {
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3000/accept-collaborator-invite?invite_token=invite-123&oauth=google',
        }),
      }));
    });
  });
});
