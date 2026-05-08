import { describe, expect, it } from 'vitest';

import { customerSafeErrorMessage, isInternalCustomerErrorMessage } from './customerSafeError';

describe('customerSafeErrorMessage', () => {
  it('hides database/provider details even when they do not name Supabase directly', () => {
    expect(customerSafeErrorMessage(new Error('duplicate key value violates unique constraint "guests_email_key"'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('PostgREST error: column invite_token does not exist'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('OpenAI provider token budget failed'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('Google OAuth refresh failed for service_role drive token'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('Auth session cookie failed for passcode refresh'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('Session token refresh failed for wedding site'), 'Please try again.')).toBe('Please try again.');
    expect(customerSafeErrorMessage(new Error('Provider credentials are not configured'), 'Please try again.')).toBe('Please try again.');
  });

  it('keeps only explicitly allowed validation copy', () => {
    expect(customerSafeErrorMessage(new Error('Please export your spreadsheet as CSV before importing.'), 'Please try again.', {
      allow: [/^Please export your spreadsheet as CSV before importing\.$/i],
    })).toBe('Please export your spreadsheet as CSV before importing.');
    expect(customerSafeErrorMessage(new Error('Something weird happened'), 'Please try again.')).toBe('Please try again.');
  });

  it('classifies internal error vocabulary for source-level guards', () => {
    expect(isInternalCustomerErrorMessage('row level security denied insert into table')).toBe(true);
    expect(isInternalCustomerErrorMessage('service-role API-key refresh failed')).toBe(true);
    expect(isInternalCustomerErrorMessage('auth cookie passcode refresh failed')).toBe(true);
    expect(isInternalCustomerErrorMessage('provider credentials failed')).toBe(true);
    expect(isInternalCustomerErrorMessage('Use a password with at least 8 characters.')).toBe(false);
    expect(isInternalCustomerErrorMessage('Your session expired. Please sign in again.')).toBe(false);
  });
});
