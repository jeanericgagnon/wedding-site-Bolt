import { customerSafeErrorMessage } from '../../lib/customerSafeError';

const SETTINGS_ALLOW_LIST = [
  /current password is incorrect/i,
  /this invite link is not ready yet/i,
  /could not reserve a website url right now/i,
];

export const SETTINGS_BILLING_RETRY_ERROR = 'Could not load billing details right now.';
export const SETTINGS_ACCOUNT_LOAD_RETRY_ERROR = 'Could not load settings right now.';
export const SETTINGS_ACCOUNT_SAVE_RETRY_ERROR = 'Could not save those changes right now.';
export const SETTINGS_PASSWORD_SAVE_RETRY_ERROR = 'Could not update your password right now.';
export const SETTINGS_PLANNER_SAVE_RETRY_ERROR = 'Could not save that planner invite right now.';
export const SETTINGS_COLLAB_CREATE_RETRY_ERROR = 'Could not create that collaborator invite right now.';
export const SETTINGS_COLLAB_REVOKE_RETRY_ERROR = 'Could not revoke that collaborator invite right now.';
export const SETTINGS_COLLAB_COPY_RETRY_ERROR = 'Could not copy that collaborator invite right now.';
export const SETTINGS_COLLAB_REVEAL_RETRY_ERROR = 'Could not reveal that collaborator invite right now.';
export const SETTINGS_COLLAB_CLEAR_RETRY_ERROR = 'Could not clear those test invites right now.';
export const SETTINGS_COLLAB_REMOVE_RETRY_ERROR = 'Could not remove that planner invite right now.';
export const SETTINGS_SLUG_SAVE_RETRY_ERROR = 'Could not update your website URL right now.';
export const SETTINGS_PRIVACY_SAVE_RETRY_ERROR = 'Could not save those privacy settings right now.';
export const SETTINGS_TOKEN_RETRY_ERROR = 'Could not regenerate guest access token.';
export const SETTINGS_PRINT_PACK_RETRY_ERROR = "Couldn't save the identity print pack.";
export const SETTINGS_STORY_GRAPHIC_RETRY_ERROR = "Couldn't save the story graphic.";
export const SETTINGS_LANGUAGE_SAVE_RETRY_ERROR = 'Could not save the default language right now.';
export const SETTINGS_PLAYLIST_SAVE_RETRY_ERROR = 'Could not save that playlist link right now.';
export const SETTINGS_RSVP_SAVE_RETRY_ERROR = 'Could not save RSVP custom questions right now.';
export const SETTINGS_NOTIF_SAVE_RETRY_ERROR = 'Could not save those preferences right now.';
export const SETTINGS_SUBSCRIBE_RETRY_ERROR = 'Could not start checkout right now.';
export const SETTINGS_TEMPLATE_RETRY_ERROR = 'Could not change templates right now.';

export function mapSettingsError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: SETTINGS_ALLOW_LIST });
}
