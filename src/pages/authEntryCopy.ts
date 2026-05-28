import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const AUTH_SIGNIN_RETRY_ERROR =
  'Couldn’t sign you in right now. Please try again.';

export const AUTH_DEMO_RETRY_ERROR =
  'Couldn’t open demo mode right now. Please try again.';

export const AUTH_GOOGLE_RETRY_ERROR =
  'Couldn’t start Google sign-in right now. Please try again.';

export const AUTH_RESET_RETRY_ERROR =
  'Couldn’t send reset email right now. Please try again.';

export const AUTH_SIGNUP_RETRY_ERROR =
  'Couldn’t create your account right now. Please try again.';

export function mapAuthEntryError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';

  if (
    /invalid login credentials/i.test(raw)
    || /email not confirmed/i.test(raw)
    || /passwords do not match/i.test(raw)
    || /at least 8 characters/i.test(raw)
    || /account created/i.test(raw)
    || /did not complete cleanly/i.test(raw)
    || /email rate limit exceeded/i.test(raw)
    || /for security purposes, you can only request this after/i.test(raw)
  ) {
    return raw;
  }

  return customerSafeErrorMessage(error, fallback);
}
