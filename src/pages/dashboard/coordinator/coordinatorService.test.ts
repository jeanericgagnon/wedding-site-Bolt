import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCoordinatorEventGuestMap,
  MAX_COORDINATOR_EVENT_INVITATIONS,
  MAX_COORDINATOR_EVENTS,
  MAX_COORDINATOR_GUESTS,
  MAX_COORDINATOR_HANDOFF_ROWS,
  MAX_COORDINATOR_ISSUE_ROWS,
  MAX_COORDINATOR_QNA_ROWS,
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
    expect(MAX_COORDINATOR_QNA_ROWS).toBe(30);
    expect(MAX_COORDINATOR_HANDOFF_ROWS).toBe(200);
    expect(MAX_COORDINATOR_ISSUE_ROWS).toBe(200);
  });

  it('keeps coordinator bootstrap reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/coordinatorService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_COORDINATOR_GUESTS),');
    expect(source).toContain('.limit(MAX_COORDINATOR_EVENTS),');
    expect(source).toContain('.limit(MAX_COORDINATOR_EVENT_INVITATIONS)');
    expect(source).toContain('.limit(MAX_COORDINATOR_QNA_ROWS)');
    expect(source).toContain(".limit(MAX_COORDINATOR_HANDOFF_ROWS)");
    expect(source).toContain(".limit(MAX_COORDINATOR_ISSUE_ROWS)");
  });

  it('routes coordinator writes through RPCs', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/coordinatorService.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('coordinator_alert_message_write'");
    expect(source).toContain("supabase.rpc('coordinator_guest_event_checkin_write'");
    expect(source).toContain("supabase.rpc('coordinator_event_handoff_write'");
    expect(source).toContain("supabase.rpc('coordinator_issue_log_write'");
    expect(source).toContain("supabase.rpc('seating_assignment_write'");
    expect(source).toContain("supabase.rpc('coordinator_qna_write'");
    expect(source).not.toContain("supabase.from('messages').insert({");
    expect(source).not.toContain("supabase\n    .from('guests')\n    .update({ checked_in_at: args.checkedInAt })");
    expect(source).not.toContain(".from('guest_qna_items')\n    .insert(");
    expect(source).not.toContain(".from('guest_qna_items').update({");
  });
});
