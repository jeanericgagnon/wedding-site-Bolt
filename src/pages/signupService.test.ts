import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signInWithOAuthMock,
  signUpMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
    },
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
  },
}));

import { createSignupAccount, startSignupWithGoogle } from './signupService';

describe('signupService', () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    signUpMock.mockReset();
    signInWithPasswordMock.mockReset();
  });

  it('starts Google sign-up with the provided redirect', async () => {
    signInWithOAuthMock.mockResolvedValue({ error: null });

    await startSignupWithGoogle('https://dayof.love/onboarding?oauth=google');

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://dayof.love/onboarding?oauth=google',
      },
    });
  });

  it('returns the direct signed-up user id when available', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await expect(createSignupAccount('test@example.com', 'password-123')).resolves.toBe('user-1');
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('falls back to password sign-in when sign-up returns no user', async () => {
    signUpMock.mockResolvedValue({ data: { user: null }, error: null });
    signInWithPasswordMock.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null });

    await expect(createSignupAccount('test@example.com', 'password-123')).resolves.toBe('user-2');
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password-123',
    });
  });

  it('maps email confirmation fallback into the expected friendly message', async () => {
    signUpMock.mockResolvedValue({ data: { user: null }, error: null });
    signInWithPasswordMock.mockResolvedValue({ data: { user: null }, error: { message: 'email_not_confirmed' } });

    await expect(createSignupAccount('test@example.com', 'password-123')).rejects.toThrow(
      'Account created! Check your email to confirm your address, then sign in.',
    );
  });
});
