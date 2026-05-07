import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signInWithPasswordMock,
  signInWithOAuthMock,
  resetPasswordForEmailMock,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}));

import { loginWithPassword, sendLoginPasswordReset, startLoginWithGoogle } from './loginService';

describe('loginService', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
    signInWithOAuthMock.mockReset();
    resetPasswordForEmailMock.mockReset();
  });

  it('logs in with password and returns auth data', async () => {
    signInWithPasswordMock.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null });

    await expect(loginWithPassword('test@example.com', 'password-123')).resolves.toEqual({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password-123',
    });
  });

  it('starts Google login with the provided redirect', async () => {
    signInWithOAuthMock.mockResolvedValue({ error: null });

    await startLoginWithGoogle('https://dayof.love/login?oauth=google');

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://dayof.love/login?oauth=google',
      },
    });
  });

  it('sends password reset email with redirect', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null });

    await sendLoginPasswordReset('test@example.com', 'https://dayof.love/login');

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'https://dayof.love/login',
    });
  });
});
