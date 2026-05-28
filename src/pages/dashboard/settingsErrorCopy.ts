import { customerSafeErrorMessage } from '../../lib/customerSafeError';

const SETTINGS_ALLOW_LIST = [
  /current password is incorrect/i,
  /this invite link is not ready yet/i,
  /could not reserve a website url right now/i,
];

export const SETTINGS_BILLING_RETRY_ERROR = 'Could not load billing details right now.';
export const SETTINGS_ACCOUNT_LOAD_RETRY_ERROR = 'Could not load settings right now.';
export const SETTINGS_ACCOUNT_SAVE_RETRY_ERROR = 'Failed to save changes.';
export const SETTINGS_PASSWORD_SAVE_RETRY_ERROR = 'Failed to update password.';
export const SETTINGS_PLANNER_SAVE_RETRY_ERROR = 'Failed to save planner invite.';
export const SETTINGS_COLLAB_CREATE_RETRY_ERROR = 'Failed to create collaborator invite.';
export const SETTINGS_COLLAB_REVOKE_RETRY_ERROR = 'Failed to revoke collaborator invite.';
export const SETTINGS_COLLAB_COPY_RETRY_ERROR = 'Failed to copy collaborator invite.';
export const SETTINGS_COLLAB_REVEAL_RETRY_ERROR = 'Failed to reveal collaborator invite.';
export const SETTINGS_COLLAB_CLEAR_RETRY_ERROR = 'Failed to clear test invites.';
export const SETTINGS_COLLAB_REMOVE_RETRY_ERROR = 'Failed to remove planner invite.';
export const SETTINGS_SLUG_SAVE_RETRY_ERROR = 'Failed to update URL.';
export const SETTINGS_PRIVACY_SAVE_RETRY_ERROR = 'Failed to save privacy settings.';
export const SETTINGS_TOKEN_RETRY_ERROR = 'Could not regenerate guest access token.';
export const SETTINGS_PRINT_PACK_RETRY_ERROR = "Couldn't save the identity print pack.";
export const SETTINGS_STORY_GRAPHIC_RETRY_ERROR = "Couldn't save the story graphic.";
export const SETTINGS_LANGUAGE_SAVE_RETRY_ERROR = 'Failed to save default language.';
export const SETTINGS_PLAYLIST_SAVE_RETRY_ERROR = 'Failed to save playlist link.';
export const SETTINGS_RSVP_SAVE_RETRY_ERROR = 'Failed to save RSVP custom questions.';
export const SETTINGS_NOTIF_SAVE_RETRY_ERROR = 'Failed to save preferences.';
export const SETTINGS_SUBSCRIBE_RETRY_ERROR = 'Could not start checkout right now.';
export const SETTINGS_TEMPLATE_RETRY_ERROR = 'Failed to change template';

export function mapSettingsError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: SETTINGS_ALLOW_LIST });
}
