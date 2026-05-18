import type { WeddingDataV1 } from '../types/weddingData';
import { hasMeaningfulText } from '../lib/publicGuestSectionReadiness';

export function shouldAppendPublicRsvpSection(data: WeddingDataV1): boolean {
  if (data.rsvp.enabled !== false) return true;
  return hasMeaningfulText(data.event.rsvpCallToAction, 4);
}
