import { createSearchParams } from 'react-router-dom';

export type CollaboratorInviteAuthContext = {
  inviteToken: string;
  inviteEmail: string;
  inviteRole: string;
  inviteSite: string;
};

function readTrimmed(params: URLSearchParams, primaryKey: string, legacyKey: string): string {
  return params.get(primaryKey)?.trim() || params.get(legacyKey)?.trim() || '';
}

export function readCollaboratorInviteAuthParams(params: URLSearchParams): CollaboratorInviteAuthContext {
  return {
    inviteToken: readTrimmed(params, 'invite_token', 'inviteToken'),
    inviteEmail: readTrimmed(params, 'invite_email', 'inviteEmail'),
    inviteRole: readTrimmed(params, 'invite_role', 'inviteRole'),
    inviteSite: readTrimmed(params, 'invite_site', 'inviteSite'),
  };
}

export function buildCollaboratorInviteAuthSearch(context: Partial<CollaboratorInviteAuthContext>): string {
  const params = createSearchParams();
  if (context.inviteToken) params.set('invite_token', context.inviteToken);
  if (context.inviteEmail) params.set('invite_email', context.inviteEmail);
  if (context.inviteRole) params.set('invite_role', context.inviteRole);
  if (context.inviteSite) params.set('invite_site', context.inviteSite);
  const query = params.toString();
  return query ? `?${query}` : '';
}
