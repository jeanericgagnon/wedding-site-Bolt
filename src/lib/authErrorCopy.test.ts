import { describe, expect, it } from 'vitest';

import { safeAuthError, safeCollaboratorInviteError } from './authErrorCopy';

describe('authErrorCopy', () => {
  it('maps common auth failures to customer-safe copy', () => {
    expect(safeAuthError(new Error('Invalid login credentials'), 'fallback')).toBe('Email or password did not match. Please check both and try again.');
    expect(safeAuthError(new Error('Email not confirmed'), 'fallback')).toBe('Check your email to confirm your address, then come back and sign in.');
    expect(safeAuthError(new Error('User already registered'), 'fallback')).toBe('An account already exists for this email. Sign in instead, or reset your password.');
    expect(safeAuthError(new Error('rate limit exceeded'), 'fallback')).toBe('Too many attempts. Please wait a moment, then try again.');
  });

  it('hides provider and backend details from auth surfaces', () => {
    expect(safeAuthError(new Error('Supabase provider returned JWT database policy failure with token abc'), 'Couldn’t sign you in right now.')).toBe('Couldn’t sign you in right now.');
    expect(safeAuthError(new Error('fetch failed: network provider oauth unavailable'), 'Couldn’t start Google sign-in right now.')).toBe('Couldn’t start Google sign-in right now.');
    expect(safeAuthError(new Error('Google OAuth service_role api-key refresh failed'), 'Couldn’t start Google sign-in right now.')).toBe('Couldn’t start Google sign-in right now.');
    expect(safeAuthError(new Error('Invalid provider credentials'), 'Couldn’t sign you in right now.')).toBe('Couldn’t sign you in right now.');
  });

  it('preserves collaborator invite email mismatch guidance but hides internals', () => {
    const mismatch = 'This invite was sent to planner@example.com. Sign in with that email to claim access.';
    expect(safeCollaboratorInviteError(new Error(mismatch))).toBe(mismatch);
    expect(safeCollaboratorInviteError(new Error('permission denied for claim_collaborator_invite sql function'))).toBe('Couldn’t accept this invite right now. Please try again.');
  });
});
