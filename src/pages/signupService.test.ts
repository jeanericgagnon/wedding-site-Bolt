import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signInWithOAuthMock,
  signUpMock,
  signInWithPasswordMock,
  rpcMock,
} = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
    },
    rpc: rpcMock,
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
    }),
  },
}));

import { createSignupAccount, ensureMinimalWeddingSite, startSignupWithGoogle } from './signupService';

describe('signupService', () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    signUpMock.mockReset();
    signInWithPasswordMock.mockReset();
    rpcMock.mockReset();
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
      'Account created. Check your email to confirm your address, then sign in.',
    );
  });

  it('creates the minimal wedding site through the bootstrap RPC', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await expect(ensureMinimalWeddingSite('user-1', 'test@example.com')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('wedding_site_bootstrap_write', {
      p_user_id: 'user-1',
      p_payload: expect.objectContaining({
        couple_name_1: 'You',
        couple_name_2: 'Partner',
        site_url: expect.stringMatching(/\.dayof\.love$/),
      }),
    });
  });
});
