import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('itinerary query bounds', () => {
  it('caps itinerary event list and guest-picker reads', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/useItineraryDashboardData.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'), 'utf8');
    const serviceSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/itineraryService.ts'), 'utf8');

    expect(source).toContain('const snapshot = await loadItineraryDashboardEvents(hasEventRsvpsTable);');
    expect(page).toContain('useItineraryDashboardData({ isDemoMode, toast })');
    expect(serviceSource).toContain('export const MAX_ITINERARY_EVENTS = 200;');
    expect(serviceSource).toContain(".order('start_time', { ascending: true })\n    .limit(MAX_ITINERARY_EVENTS);");
    expect(serviceSource).toContain(".eq('event_id', event.id)\n        .limit(MAX_ITINERARY_EVENT_INVITATIONS);");
    expect(serviceSource).toContain('export const MAX_ITINERARY_EVENT_INVITATIONS = 10000;');
    expect(serviceSource).toContain('export const MAX_ITINERARY_EVENT_GUESTS = 5000;');
    expect(serviceSource).toContain(".order('name')\n    .limit(MAX_ITINERARY_EVENT_GUESTS);");
    expect(serviceSource).toContain(".eq('event_id', eventId)\n    .limit(MAX_ITINERARY_EVENT_INVITATIONS);");
  });
});
