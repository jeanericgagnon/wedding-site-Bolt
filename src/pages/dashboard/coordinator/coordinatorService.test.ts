import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCoordinatorEventGuestMap,
  MAX_COORDINATOR_EVENT_INVITATIONS,
  MAX_COORDINATOR_EVENTS,
  MAX_COORDINATOR_GUESTS,
} from './coordinatorService';
import type { EventLite } from './coordinatorDashboardTypes';

describe('buildCoordinatorEventGuestMap', () => {
  it('creates empty event buckets and maps invited guests by event', () => {
    const events: EventLite[] = [
      { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-05-05T16:00:00Z' },
      { id: 'brunch', event_name: 'Brunch', start_time: null },
    ];

    const map = buildCoordinatorEventGuestMap(events, [
      { event_id: 'ceremony', guest_id: 'guest-1' },
      { event_id: 'ceremony', guest_id: 'guest-2' },
      { event_id: 'after-party', guest_id: 'guest-3' },
    ]);

    expect([...map.ceremony]).toEqual(['guest-1', 'guest-2']);
    expect([...map.brunch]).toEqual([]);
    expect([...map['after-party']]).toEqual(['guest-3']);
  });

  it('exports stable coordinator bootstrap query caps', () => {
    expect(MAX_COORDINATOR_GUESTS).toBe(2000);
    expect(MAX_COORDINATOR_EVENTS).toBe(200);
    expect(MAX_COORDINATOR_EVENT_INVITATIONS).toBe(10000);
  });

  it('keeps coordinator bootstrap reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/coordinatorService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_COORDINATOR_GUESTS),');
    expect(source).toContain('.limit(MAX_COORDINATOR_EVENTS),');
    expect(source).toContain('.limit(MAX_COORDINATOR_EVENT_INVITATIONS);');
  });
});
