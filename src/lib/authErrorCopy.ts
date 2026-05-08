import { isInternalCustomerErrorMessage } from './customerSafeError';

export function safeAuthError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const message = raw.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email or password did not match. Please check both and try again.';
  }
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Check your email to confirm your address, then come back and sign in.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account already exists for this email. Sign in instead, or reset your password.';
  }
  if (lower.includes('password should be') || lower.includes('weak password')) {
    return 'Use a stronger password and try again.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment, then try again.';
  }
  if (isInternalCustomerErrorMessage(message)) {
    return fallback;
  }
  return fallback;
}

export function safeCollaboratorInviteError(err: unknown, fallback = 'Couldn’t accept this invite right now. Please try again.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const message = raw.trim();
  if (!message) return fallback;
  if (/^This invite was sent to .+\. Sign in with that email to claim access\.$/i.test(message)) {
    return message;
  }
  if (/check your email to confirm your address/i.test(message)) {
    return message;
  }
  return safeAuthError(err, fallback);
}
