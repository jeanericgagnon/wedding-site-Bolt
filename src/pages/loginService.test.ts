import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSessionMock,
  onAuthStateChangeMock,
  signInWithPasswordMock,
  signInWithOAuthMock,
  resetPasswordForEmailMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}));

import {
  getLoginSession,
  loginWithPassword,
  sendLoginPasswordReset,
  startLoginWithGoogle,
  subscribeLoginAuthState,
} from './loginService';

describe('loginService', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    signInWithPasswordMock.mockReset();
    signInWithOAuthMock.mockReset();
    resetPasswordForEmailMock.mockReset();
  });

  it('keeps login session priming behind the login service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/Login.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/loginService.ts'), 'utf8');

    expect(page).toContain('getLoginSession()');
    expect(page).toContain('subscribeLoginAuthState(');
    expect(page).not.toContain('supabase.auth.getSession()');
    expect(page).not.toContain('supabase.auth.onAuthStateChange(');
    expect(service).toContain('export async function getLoginSession()');
    expect(service).toContain('export function subscribeLoginAuthState(');
    expect(service).toContain('supabase.auth.getSession()');
    expect(service).toContain('supabase.auth.onAuthStateChange(callback)');
  });

  it('reads the current login session through the service', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'test@example.com' } } } });

    await expect(getLoginSession()).resolves.toEqual({
      user: { id: 'user-1', email: 'test@example.com' },
    });
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

  it('subscribes to auth state changes through the service', () => {
    const unsubscribe = vi.fn();
    const callback = vi.fn();
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const result = subscribeLoginAuthState(callback);

    expect(onAuthStateChangeMock).toHaveBeenCalledWith(callback);
    expect(result).toEqual({ data: { subscription: { unsubscribe } } });
  });
});
