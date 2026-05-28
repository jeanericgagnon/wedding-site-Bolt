import { describe, expect, it } from 'vitest';
import {
  GUEST_CONTACT_INVITE_REQUIRED_ERROR,
  GUEST_CONTACT_LOOKUP_RETRY_ERROR,
  GUEST_CONTACT_SUBMIT_RETRY_ERROR,
  mapGuestContactLookupError,
  mapGuestContactSubmitError,
} from './guestContactUpdateCopy';

describe('guestContactUpdateCopy', () => {
  it('keeps missing-invitation guidance plain and guest-safe', () => {
    expect(GUEST_CONTACT_INVITE_REQUIRED_ERROR).toBe(
      'Please use the contact update link from your invitation email.',
    );
  });

  it('keeps lookup failures guest-safe instead of leaking config or request details', () => {
    expect(mapGuestContactLookupError(new Error('Missing Supabase URL'))).toBe(
      GUEST_CONTACT_LOOKUP_RETRY_ERROR,
    );
    expect(mapGuestContactLookupError(new Error('Request failed (500)'))).toBe(
      GUEST_CONTACT_LOOKUP_RETRY_ERROR,
    );
  });

  it('keeps submit failures guest-safe instead of leaking internal detail', () => {
    expect(mapGuestContactSubmitError(new Error('duplicate key value violates row-level security policy'))).toBe(
      GUEST_CONTACT_SUBMIT_RETRY_ERROR,
    );
  });
});
