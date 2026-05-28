import { describe, expect, it } from 'vitest';

import { buildGuestContactLinkListPayload, buildNoContactChecklistPayload } from './guestContactLinkList';

describe('guestContactLinkList', () => {
  it('builds a guest-specific contact update link list', () => {
    expect(buildGuestContactLinkListPayload('https://maya-leo.dayof.love/', 'maya-leo', [
      { name: 'Maya Hart', inviteToken: 'invite-123' },
      { name: 'Leo Park', inviteToken: 'invite-456' },
    ])).toBe([
      'Guest update links',
      '',
      'Maya Hart: https://maya-leo.dayof.love/guest-contact/maya-leo?invite_token=invite-123',
      'Leo Park: https://maya-leo.dayof.love/guest-contact/maya-leo?invite_token=invite-456',
    ].join('\n'));
  });

  it('encodes token values safely inside copied guest update links', () => {
    expect(buildGuestContactLinkListPayload('https://dayof.love', 'maya-leo', [
      { name: 'Maya Hart', inviteToken: 'invite token/123' },
    ])).toContain(
      'https://dayof.love/guest-contact/maya-leo?invite_token=invite%20token%2F123',
    );
  });

  it('builds a no-contact checklist with guest update links when invite tokens exist', () => {
    expect(buildNoContactChecklistPayload('https://maya-leo.dayof.love/', 'maya-leo', [
      { name: 'Maya Hart', inviteToken: 'invite-123' },
      { name: 'Leo Park', inviteToken: null },
    ])).toBe([
      '- Maya Hart: send guest update link https://maya-leo.dayof.love/guest-contact/maya-leo?invite_token=invite-123',
      '- Leo Park: get phone or email, then resend invite',
    ].join('\n'));
  });
});
