import { describe, expect, it } from 'vitest';

import { buildCanonicalInviteTokenSearch, readInviteTokenFromParams } from './inviteTokenParams';

describe('inviteTokenParams', () => {
  it('prefers invite_token over legacy variants', () => {
    const params = new URLSearchParams('invite_token=invite-123&token=legacy-456&t=upload-789');

    expect(readInviteTokenFromParams(params)).toBe('invite-123');
  });

  it('builds canonical invite_token search strings from legacy token params', () => {
    const params = new URLSearchParams('token=legacy-456&site=maya-leo&previewGuest=guest-42');

    expect(buildCanonicalInviteTokenSearch(params)).toBe(
      '?site=maya-leo&previewGuest=guest-42&invite_token=legacy-456',
    );
  });

  it('drops legacy token aliases after canonicalizing upload links', () => {
    const params = new URLSearchParams('t=upload-789');

    expect(buildCanonicalInviteTokenSearch(params)).toBe('?invite_token=upload-789');
  });
});
