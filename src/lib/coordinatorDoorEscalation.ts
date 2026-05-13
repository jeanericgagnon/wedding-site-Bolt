import {
  getCoordinatorDoorExceptionStateLabel,
  getCoordinatorDoorExceptionStates,
  type CoordinatorDoorStatusContext,
} from './coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export const buildCoordinatorDoorEscalationPrompt = (
  guest: GuestLiteForCoordinator,
  context?: CoordinatorDoorStatusContext,
) => {
  const guestName = guest.name || [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'This guest';
  const exceptionLabels = getCoordinatorDoorExceptionStates(guest, context)
    .filter((state) => state !== 'already-checked-in')
    .map(getCoordinatorDoorExceptionStateLabel);
  const issueLabel = exceptionLabels.length > 0 ? exceptionLabels.join(', ') : `RSVP is currently ${guest.rsvp_status}`;
  return `${guestName} needs a door decision — ${issueLabel}. Confirm whether to allow check-in, reroute, or update their status.`;
};
