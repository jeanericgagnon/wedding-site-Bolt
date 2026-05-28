import { describe, expect, it } from 'vitest';

import {
  mapEventRsvpLoadError,
  mapEventRsvpSubmitError,
  mapRsvpLookupError,
  mapRsvpSubmitError,
  RSVP_LINK_NOT_RECOGNIZED_ERROR,
  RSVP_LINK_REQUIRED_ERROR,
  RSVP_MISSING_INVITATION_DETAIL_ERROR,
} from './guestRsvpCopy';

describe('guest RSVP copy', () => {
  it('keeps invitation-link copy guest-safe instead of token language', () => {
    expect(RSVP_MISSING_INVITATION_DETAIL_ERROR).not.toMatch(/token/i);
    expect(RSVP_LINK_NOT_RECOGNIZED_ERROR).not.toMatch(/token/i);
    expect(RSVP_LINK_REQUIRED_ERROR).not.toMatch(/token/i);
  });

  it('keeps RSVP lookup and submit failures guest-safe', () => {
    expect(mapRsvpLookupError(new Error('Missing Supabase URL'))).toBe(
      'Couldn’t complete that invitation search. Please try again.',
    );
    expect(mapRsvpLookupError(new Error('An error occurred. Please try again.'))).toBe(
      'Couldn’t complete that invitation search. Please try again.',
    );
    expect(mapRsvpSubmitError(new Error('duplicate key value violates row-level security policy'))).toBe(
      'Could not save your RSVP right now. Please try again.',
    );
    expect(mapRsvpSubmitError(new Error('Failed to submit RSVP. Please try again.'))).toBe(
      'Could not save your RSVP right now. Please try again.',
    );
  });

  it('keeps event RSVP load and submit failures guest-safe', () => {
    expect(mapEventRsvpLoadError(new Error('Error 500'))).toBe(
      'Couldn’t load your event invitations right now. Please try again.',
    );
    expect(mapEventRsvpSubmitError(new Error('functions/v1/validate-rsvp-token returned provider timeout'))).toBe(
      'Could not save your event RSVP right now. Please try again.',
    );
  });
});
