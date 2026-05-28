import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const RSVP_MISSING_INVITATION_DETAIL_ERROR =
  'Your invitation link is missing a detail. Please use the RSVP link from your invitation email.';

export const RSVP_LINK_NOT_RECOGNIZED_ERROR =
  "This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.";

export const RSVP_LINK_REQUIRED_ERROR =
  'No invitation link found. Please use the link from your invitation email.';

export function mapRsvpLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Couldn’t complete that invitation search. Please try again.', {
    allow: [/^Invitation not recognized\. Please search by name below\.$/i],
  });
}

export function mapRsvpSubmitError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not save your RSVP right now. Please try again.', {
    allow: [/^The RSVP deadline has passed\./i],
  });
}

export function mapEventRsvpLoadError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Couldn’t load your event invitations right now. Please try again.');
}

export function mapEventRsvpSubmitError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not save your event RSVP right now. Please try again.');
}
