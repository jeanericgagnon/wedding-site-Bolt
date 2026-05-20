import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
const useLocationMock = vi.fn();
const useSearchParamsMock = vi.fn(() => [new URLSearchParams()]);
const signInWithOAuthMock = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, state, ...props }: any) => <a href={typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}`} data-nav-state={state ? JSON.stringify(state) : ''} {...props}>{children}</a>,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
    useSearchParams: () => useSearchParamsMock(),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: vi.fn() }),
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

    const link = screen.getByRole('link', { name: 'Get started — $49' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state.quickStartDraft).toEqual(expect.objectContaining({
      currentIndex: 2,
      followUpAnswers: {},
      showFollowUps: false,
      viewState: 'question',
    }));
  });


  it('omits empty onboarding drafts when switching from login to signup', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });

    render(<Login />);

    const link = screen.getByRole('link', { name: 'Get started — $49' });
    const state = JSON.parse(link.getAttribute('data-nav-state') || '{}');

    expect(state).toEqual({ returnTo: '/onboarding' });
  });
});
