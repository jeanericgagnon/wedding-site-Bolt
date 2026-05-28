import { describe, expect, it } from 'vitest';

import { buildCollaboratorInviteUrl, buildMaskedCollaboratorInvitePath } from './collaboratorInviteLink';

describe('collaborator invite link helpers', () => {
  it('builds collaborator invite links with the guest-safe invite_token parameter', () => {
    expect(buildCollaboratorInviteUrl('https://dayof.love', 'invite-123')).toBe(
      'https://dayof.love/accept-collaborator-invite?invite_token=invite-123',
    );
  });

  it('encodes invite token values safely in reveal/copy links', () => {
    expect(buildCollaboratorInviteUrl('https://dayof.love/', 'invite token/123')).toBe(
      'https://dayof.love/accept-collaborator-invite?invite_token=invite%20token%2F123',
    );
  });

  it('keeps the masked invite path aligned with the same query shape', () => {
    expect(buildMaskedCollaboratorInvitePath()).toBe('/accept-collaborator-invite?invite_token=••••••••••');
  });
});
