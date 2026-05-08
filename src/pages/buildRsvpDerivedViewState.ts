import { demoGuests } from '../lib/demoData';

import type { Guest, HouseholdGuest } from './rsvpTypes';

export interface RsvpDerivedViewState {
  activePredictionId: string | undefined;
  allowedChildrenCount: number;
  childCountOptions: Array<{ label: string; value: string }>;
  guestPredictions: string[];
  inheritedHouseholdMembers: HouseholdGuest[];
  invitedEvents: string[];
}

interface BuildRsvpDerivedViewStateArgs {
  activePredictionIndex: number;
  guest: Guest | null;
  householdGuests: HouseholdGuest[];
  predictionListId: string;
  searchValue: string;
  selectedHouseholdGuestIds: string[];
  useDemoRsvp: boolean;
}

export function buildRsvpDerivedViewState({
  activePredictionIndex,
  guest,
  householdGuests,
  predictionListId,
  searchValue,
  selectedHouseholdGuestIds,
  useDemoRsvp,
}: BuildRsvpDerivedViewStateArgs): RsvpDerivedViewState {
  const guestPredictions = (() => {
    if (!useDemoRsvp) return [] as string[];
    const query = searchValue.trim().toLowerCase();
    if (query.length < 2) return [] as string[];
    return demoGuests
      .map((demoGuest) => demoGuest.name)
      .filter((name, index, allNames) => allNames.indexOf(name) === index)
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 6);
  })();

  const activePredictionId =
    activePredictionIndex >= 0 && guestPredictions[activePredictionIndex]
      ? `${predictionListId}-${activePredictionIndex}`
      : undefined;

  const invitedEvents = [
    guest?.invited_to_ceremony ? 'Ceremony' : null,
    guest?.invited_to_reception ? 'Reception' : null,
  ].filter(Boolean) as string[];

  const allowedChildrenCount = guest?.children_allowed ? Math.max(0, Number(guest.max_children ?? 0)) : 0;
  const childCountOptions = Array.from({ length: allowedChildrenCount + 1 }, (_, count) => ({
    value: String(count),
    label: count === 0 ? 'No children' : `${count} child${count === 1 ? '' : 'ren'}`,
  }));

  const inheritedHouseholdMembers = householdGuests.filter((householdGuest) =>
    selectedHouseholdGuestIds.includes(householdGuest.id),
  );

  return {
    activePredictionId,
    allowedChildrenCount,
    childCountOptions,
    guestPredictions,
    inheritedHouseholdMembers,
    invitedEvents,
  };
}
