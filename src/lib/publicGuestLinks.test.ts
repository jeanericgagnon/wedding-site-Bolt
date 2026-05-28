import { describe, expect, it } from 'vitest';
import { buildGuestContactUpdateUrl, buildInviteOnlySiteAccessUrl, buildRsvpInviteUrl } from './publicGuestLinks';

describe('public guest link builders', () => {
  it('builds invite-only site links with guest_access_token', () => {
    expect(buildInviteOnlySiteAccessUrl('https://dayof.love/', 'maya-leo', 'guest-access-123')).toBe(
      'https://dayof.love/site/maya-leo?guest_access_token=guest-access-123',
    );
  });

  it('builds rsvp invite links with invite_token', () => {
    expect(buildRsvpInviteUrl('https://maya-leo.dayof.love/', 'invite-123')).toBe(
      'https://maya-leo.dayof.love/rsvp?invite_token=invite-123',
    );
  });

  it('builds guest contact update links with invite_token', () => {
    expect(buildGuestContactUpdateUrl('https://maya-leo.dayof.love/', 'maya-leo', 'invite-123')).toBe(
      'https://maya-leo.dayof.love/guest-contact/maya-leo?invite_token=invite-123',
    );
  });

  it('encodes token values safely', () => {
    expect(buildInviteOnlySiteAccessUrl('https://dayof.love', 'maya-leo', 'guest token/123')).toBe(
      'https://dayof.love/site/maya-leo?guest_access_token=guest%20token%2F123',
    );
    expect(buildRsvpInviteUrl('https://dayof.love', 'invite token/123')).toBe(
      'https://dayof.love/rsvp?invite_token=invite%20token%2F123',
    );
    expect(buildGuestContactUpdateUrl('https://dayof.love', 'maya-leo', 'invite token/123')).toBe(
      'https://dayof.love/guest-contact/maya-leo?invite_token=invite%20token%2F123',
    );
  });
});
