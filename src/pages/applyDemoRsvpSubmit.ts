import { readDemoStoredResponses, writeDemoStoredResponses } from './rsvpDemoStorage';
import type { ExistingRSVP } from './rsvpTypes';

type ApplyDemoRsvpSubmitArgs = {
  payload: ExistingRSVP;
  targetGuestIds: string[];
};

export function applyDemoRsvpSubmit({ payload, targetGuestIds }: ApplyDemoRsvpSubmitArgs) {
  const stored = readDemoStoredResponses();
  targetGuestIds.forEach((id) => {
    stored[id] = { ...payload, id: `demo-rsvp-${id}` };
  });
  writeDemoStoredResponses(stored);
}
