import type { CoordinatorGuestDoorRoute } from './coordinatorTypes';

export type CoordinatorGuestWorkState = {
  activeGuestId: string | null;
  doorRoutesByGuestId: Record<string, CoordinatorGuestDoorRoute>;
};

export const normalizeCoordinatorGuestWorkState = (value: unknown): CoordinatorGuestWorkState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { activeGuestId: null, doorRoutesByGuestId: {} };
  }
  const parsed = value as Partial<CoordinatorGuestWorkState>;
  const doorRoutesByGuestId = Object.fromEntries(
    Object.entries(parsed.doorRoutesByGuestId ?? {}).filter((entry): entry is [string, CoordinatorGuestDoorRoute] => (
      entry[0].trim().length > 0
      && (entry[1] === 'walk-in' || entry[1] === 'help-desk' || entry[1] === 'manager-decision')
    )),
  );
  return {
    activeGuestId: typeof parsed.activeGuestId === 'string' && parsed.activeGuestId.trim().length > 0
      ? parsed.activeGuestId
      : null,
    doorRoutesByGuestId,
  };
};
