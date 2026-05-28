import { describe, expect, it } from 'vitest';

import {
  AUTH_GOOGLE_RETRY_ERROR,
  AUTH_RESET_RETRY_ERROR,
  AUTH_SIGNIN_RETRY_ERROR,
  AUTH_SIGNUP_RETRY_ERROR,
  mapAuthEntryError,
} from './authEntryCopy';

describe('mapAuthEntryError', () => {
  it('keeps known auth guidance readable for couples', () => {
    expect(mapAuthEntryError(new Error('Invalid login credentials'), AUTH_SIGNIN_RETRY_ERROR)).toBe('Invalid login credentials');
    expect(mapAuthEntryError(new Error('Account created! Check your email to confirm your address, then sign in.'), AUTH_SIGNUP_RETRY_ERROR)).toBe(
      'Account created! Check your email to confirm your address, then sign in.',
    );
    expect(mapAuthEntryError(new Error('For security purposes, you can only request this after 24 seconds.'), AUTH_RESET_RETRY_ERROR)).toBe(
      'For security purposes, you can only request this after 24 seconds.',
    );
  });

  it('masks provider and internal auth errors behind calm retry copy', () => {
    expect(mapAuthEntryError(new Error('functions/v1/login provider timeout with token=abc'), AUTH_SIGNIN_RETRY_ERROR)).toBe(
      AUTH_SIGNIN_RETRY_ERROR,
    );
    expect(mapAuthEntryError(new Error('Google oauth provider rejected redirect_uri'), AUTH_GOOGLE_RETRY_ERROR)).toBe(
      AUTH_GOOGLE_RETRY_ERROR,
    );
    expect(mapAuthEntryError(new Error('Supabase auth session refresh failed'), AUTH_SIGNUP_RETRY_ERROR)).toBe(
      AUTH_SIGNUP_RETRY_ERROR,
    );
  });
});
