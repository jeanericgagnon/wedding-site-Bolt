import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
const useLocationMock = vi.fn();
const useSearchParamsMock = vi.fn(() => [new URLSearchParams()]);

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
      signInWithOAuth: vi.fn(),
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


  it('omits empty onboarding drafts when switching from signup to login', async () => {
    useLocationMock.mockReturnValue({ state: { returnTo: '/onboarding' } });

    render(<Signup />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        returnTo: '/onboarding',
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
});
