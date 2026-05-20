import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQuickStartDraftStorageKey, QUICK_START_STORAGE_KEY } from '../lib/quickStartStateTransfer';

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
      expect(stored.currentIndex).toBe(0);
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
      expect(stored.currentIndex).toBe(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      state: {
        quickStartDraft: expect.objectContaining({
          currentIndex: 0,
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

  it('stores carried onboarding drafts in an invite-email scoped key when signup context provides an email', async () => {
    useSearchParamsMock.mockReturnValue([new URLSearchParams('inviteEmail=alex@example.com&inviteToken=abc')]);

    render(<Signup />);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(buildQuickStartDraftStorageKey('alex@example.com')) || '{}');
      expect(stored.currentIndex).toBe(0);
      expect(stored.viewState).toBe('question');
    });
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });
});
