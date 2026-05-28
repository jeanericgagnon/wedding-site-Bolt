import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
const useLocationMock = vi.fn();
const useSearchParamsMock = vi.fn(() => [new URLSearchParams()]);
const signInWithOAuthMock = vi.fn(() => Promise.resolve({ error: null }));
const signUpMock = vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null }));
const signInWithPasswordMock = vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
    useSearchParams: () => useSearchParamsMock(),
  };
});

vi.mock('../lib/signupContinuation', async () => {
  const actual = await vi.importActual<typeof import('../lib/signupContinuation')>('../lib/signupContinuation');
  return {
    ...actual,
    clearSignupReturnPath: vi.fn(actual.clearSignupReturnPath),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
    auth: {
      signInWithOAuth: (...args: Parameters<typeof signInWithOAuthMock>) => signInWithOAuthMock(...args),
      signUp: (...args: Parameters<typeof signUpMock>) => signUpMock(...args),
      signInWithPassword: (...args: Parameters<typeof signInWithPasswordMock>) => signInWithPasswordMock(...args),
    },
  },
}));

vi.mock('../lib/paymentGate', () => ({
  isPaymentGateEnabled: () => false,
}));

import { Signup } from './Signup';

describe('Signup quick start handoff', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInWithOAuthMock.mockClear();
    signUpMock.mockClear();
    signInWithPasswordMock.mockClear();
    window.localStorage.clear();
    useSearchParamsMock.mockReturnValue([new URLSearchParams()]);
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

  it('normalizes carried onboarding drafts before persisting signup restore state', async () => {
    render(<Signup />);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
      expect(stored.currentIndex).toBe(2);
      expect(stored.followUpAnswers).toEqual({});
      expect(stored.showFollowUps).toBe(false);
      expect(stored.viewState).toBe('question');
    });
  });


  it('ignores empty carried onboarding drafts during signup handoff', async () => {
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

    render(<Signup />);

    await waitFor(() => {
      expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    });
  });


  it('passes normalized onboarding drafts when switching from signup to login', async () => {
    render(<Signup />);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}');
      expect(stored.currentIndex).toBe(2);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        quickStartDraft: expect.objectContaining({
          currentIndex: 2,
          followUpAnswers: {},
          showFollowUps: false,
          viewState: 'question',
        }),
      },
    });
  });

  it('keeps start-draft signup copy aligned with the builder handoff path', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Signup />);

    expect(await screen.findByText('Create your account, then review your starter draft right away. You can keep refining setup details from there.')).toBeInTheDocument();
    expect(screen.queryByText('Create your account, then go straight into setup.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        returnTo: '/dashboard/builder-guide',
      },
    });
  });

  it('returns account creation to the builder when signup started from start draft', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Signup />);

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.change(screen.getByLabelText(/^confirm password$/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'StrongPassword123!',
      });
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');
    });
  });

  it('uses the builder callback path for Google signup when signup started from start draft', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/dashboard/builder-guide' } });

    render(<Signup />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3000/dashboard/builder-guide',
        }),
      }));
    });
  });


  it('omits empty onboarding drafts when switching from signup to login', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });

    render(<Signup />);

    expect(await screen.findByText('Create your account, then keep going with setup.')).toBeInTheDocument();
    expect(screen.queryByText('Create your account, then go straight into setup.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        returnTo: '/onboarding',
      },
    });
  });

  it('keeps quick-start resume signup copy aligned with the carried setup draft', async () => {
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

    render(<Signup />);

    expect(await screen.findByText('Create your account, then jump right back into your setup draft and keep going.')).toBeInTheDocument();
    expect(screen.queryByText('Create your account, then go straight into setup.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        returnTo: '/onboarding/quick-start?bypassPayment=1',
        quickStartDraft: expect.objectContaining({
          currentIndex: 2,
          showFollowUps: false,
          viewState: 'question',
        }),
      },
    });
  });

  it('shows collaborator role guidance when signup is entered from an invite', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        inviteToken: 'invite-123',
        inviteEmail: 'planner@example.com',
        inviteRole: 'planner',
        inviteSite: 'Alex & Sam',
      }),
    ]);

    render(<Signup />);

    expect(await screen.findByText('Clear planning pressure without reopening owner-only polish')).toBeInTheDocument();
    expect(screen.getByText(/Start in Overview, then move into Guests, Planning, or Messages/i)).toBeInTheDocument();
    expect(screen.getByText(/brand, billing, or final ownership calls/i)).toBeInTheDocument();
    expect(screen.getByText(/owner-call carry|final wedding truth/i)).toBeInTheDocument();
    expect(screen.getByText(/Find the operational pressure first/i)).toBeInTheDocument();
  });

  it('keeps collaborator invite auth context when switching back to login with snake_case params', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Signup />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login?invite_token=invite-123&invite_email=planner%40example.com&invite_role=planner&invite_site=Alex+%26+Sam', {
      state: {
        returnTo: '/onboarding',
      },
    });
  });

  it('returns collaborator signup directly to the invite accept route with invite_token params', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Signup />);

    expect(screen.getByLabelText(/^email/i)).toHaveValue('planner@example.com');
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.change(screen.getByLabelText(/^confirm password$/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/accept-collaborator-invite?invite_token=invite-123', { replace: true });
    });
  });

  it('uses invite_token collaborator redirects for Google signup handoff', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });
    useSearchParamsMock.mockReturnValue([
      new URLSearchParams({
        invite_token: 'invite-123',
        invite_email: 'planner@example.com',
        invite_role: 'planner',
        invite_site: 'Alex & Sam',
      }),
    ]);

    render(<Signup />);

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
