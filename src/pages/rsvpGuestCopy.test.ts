import { describe, expect, it } from 'vitest';
import { RSVP_MISSING_INVITATION_DETAIL_ERROR } from './rsvpGuestCopy';

describe('rsvpGuestCopy', () => {
  it('uses guest-safe invitation-link wording instead of token language', () => {
    expect(RSVP_MISSING_INVITATION_DETAIL_ERROR).toBe(
      'Your invitation link is missing a detail. Please use the RSVP link from your invitation email.',
    );
    expect(RSVP_MISSING_INVITATION_DETAIL_ERROR).not.toMatch(/token/i);
  });
});
