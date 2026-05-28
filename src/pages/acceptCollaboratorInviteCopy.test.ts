import { describe, expect, it } from 'vitest';

import {
  COLLAB_INVITE_INCOMPLETE_ERROR,
  COLLAB_INVITE_LOOKUP_RETRY_ERROR,
  COLLAB_SIGNIN_RETRY_ERROR,
  mapCollaboratorInviteAuthError,
  mapCollaboratorInviteClaimError,
  mapCollaboratorInviteLookupError,
} from './acceptCollaboratorInviteCopy';

describe('acceptCollaboratorInviteCopy', () => {
  it('keeps invite lookup failures guest-safe instead of leaking debug detail', () => {
    expect(mapCollaboratorInviteLookupError(new Error('No invite row matched this token. rows=0'))).toBe(
      COLLAB_INVITE_LOOKUP_RETRY_ERROR,
    );
    expect(mapCollaboratorInviteLookupError(new Error('Unknown invite lookup error'))).toBe(
      COLLAB_INVITE_LOOKUP_RETRY_ERROR,
    );
  });

  it('keeps claim failures guest-safe while preserving useful wrong-email guidance', () => {
    expect(mapCollaboratorInviteClaimError(new Error('Could not claim invite: relation "wedding_site_collaborator_invites" does not exist'))).toBe(
      'Could not join this wedding team right now. Please try again.',
    );
    expect(mapCollaboratorInviteClaimError(new Error('Invite metadata is incomplete.'))).toBe(
      COLLAB_INVITE_INCOMPLETE_ERROR,
    );
    expect(mapCollaboratorInviteClaimError(new Error('This invite was sent to planner@example.com. Sign in with that email to claim access.'))).toBe(
      'This invite was sent to planner@example.com. Sign in with that email to claim access.',
    );
  });

  it('keeps auth failures calm without hiding useful recovery guidance', () => {
    expect(mapCollaboratorInviteAuthError(new Error('Missing Supabase URL'), COLLAB_SIGNIN_RETRY_ERROR)).toBe(
      COLLAB_SIGNIN_RETRY_ERROR,
    );
    expect(mapCollaboratorInviteAuthError(new Error('Invalid login credentials'), COLLAB_SIGNIN_RETRY_ERROR)).toBe(
      'Invalid login credentials',
    );
    expect(mapCollaboratorInviteAuthError(new Error('Invite metadata is incomplete.'), COLLAB_SIGNIN_RETRY_ERROR)).toBe(
      COLLAB_INVITE_INCOMPLETE_ERROR,
    );
  });
});
