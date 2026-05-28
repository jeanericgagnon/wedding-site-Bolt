import { describe, expect, it } from 'vitest';
import { GUEST_CONTACT_INVITE_REQUIRED_ERROR, mapGuestContactLookupError, mapGuestContactSubmitError } from './guestContactUpdateCopy';

describe('guestContactUpdateCopy', () => {
  it('keeps missing-invitation guidance plain and guest-safe', () => {
    expect(GUEST_CONTACT_INVITE_REQUIRED_ERROR).toBe(
      'Please use the contact update link from your invitation email.',
    );
  });

  it('keeps lookup failures guest-safe instead of leaking config or request details', () => {
    expect(mapGuestContactLookupError(new Error('Missing Supabase URL'))).toBe(
      'Couldn’t complete that search. Please try again.',
    );
    expect(mapGuestContactLookupError(new Error('Request failed (500)'))).toBe(
      'Couldn’t complete that search. Please try again.',
    );
  });

  it('keeps submit failures guest-safe instead of leaking internal detail', () => {
    expect(mapGuestContactSubmitError(new Error('duplicate key value violates row-level security policy'))).toBe(
      'Could not send your update right now.',
    );
  });
});
