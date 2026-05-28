import { describe, expect, it } from 'vitest';

import { buildCollaboratorInviteAuthSearch, readCollaboratorInviteAuthParams } from './collaboratorInviteAuthParams';

describe('collaborator invite auth params', () => {
  it('reads the new snake_case collaborator invite auth params', () => {
    const params = new URLSearchParams({
      invite_token: 'invite-123',
      invite_email: 'planner@example.com',
      invite_role: 'planner',
      invite_site: 'Alex & Sam',
    });

    expect(readCollaboratorInviteAuthParams(params)).toEqual({
      inviteToken: 'invite-123',
      inviteEmail: 'planner@example.com',
      inviteRole: 'planner',
      inviteSite: 'Alex & Sam',
    });
  });

  it('keeps backward compatibility with the older camelCase auth params', () => {
    const params = new URLSearchParams({
      inviteToken: 'invite-123',
      inviteEmail: 'planner@example.com',
      inviteRole: 'planner',
      inviteSite: 'Alex & Sam',
    });

    expect(readCollaboratorInviteAuthParams(params)).toEqual({
      inviteToken: 'invite-123',
      inviteEmail: 'planner@example.com',
      inviteRole: 'planner',
      inviteSite: 'Alex & Sam',
    });
  });

  it('writes the cleaner snake_case auth search string', () => {
    expect(
      buildCollaboratorInviteAuthSearch({
        inviteToken: 'invite-123',
        inviteEmail: 'planner@example.com',
        inviteRole: 'planner',
        inviteSite: 'Alex & Sam',
      }),
    ).toBe('?invite_token=invite-123&invite_email=planner%40example.com&invite_role=planner&invite_site=Alex+%26+Sam');
  });
});
