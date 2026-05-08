import { isRsvpDeadlinePassed } from './rsvpDeadline';
import type { ExistingRSVP, Guest, RSVPMealConfig } from './rsvpTypes';

export interface RsvpPageViewModel {
  availableMealValues: Set<string>;
  canSubmit: boolean;
  deadlinePassed: boolean;
  guestDisplayName: string;
  predictionListId: string;
  searchHintId: string;
  searchInputId: string;
}

interface BuildRsvpPageViewModelOptions {
  existingRsvp: ExistingRSVP | null;
  guest: Guest | null;
  mealConfig: RSVPMealConfig;
  rsvpDeadline: string | null;
  rsvpSessionToken: string | null;
}

export function buildRsvpPageViewModel({
  existingRsvp,
  guest,
  mealConfig,
  rsvpDeadline,
  rsvpSessionToken,
}: BuildRsvpPageViewModelOptions): RsvpPageViewModel {
  const guestDisplayName = guest
    ? guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name
    : '';

  const deadlinePassed = isRsvpDeadlinePassed(rsvpDeadline);

  return {
    availableMealValues: new Set(mealConfig.options.map((option) => option.toLowerCase())),
    canSubmit: !!rsvpSessionToken && !(deadlinePassed && !existingRsvp),
    deadlinePassed,
    guestDisplayName,
    predictionListId: 'rsvp-guest-predictions',
    searchHintId: 'rsvp-search-hint',
    searchInputId: 'rsvp-guest-search',
  };
}
