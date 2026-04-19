import type { GuestLiteForCoordinator } from './coordinatorTypes';

export const buildCoordinatorDoorEscalationPrompt = (guest: GuestLiteForCoordinator) => {
  const guestName = guest.name || [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'This guest';
  return `${guestName} needs a door decision — RSVP is currently ${guest.rsvp_status}. Confirm whether to allow check-in or update their status.`;
};
