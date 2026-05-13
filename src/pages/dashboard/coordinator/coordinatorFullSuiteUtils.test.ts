import { describe, expect, it } from 'vitest';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { CoordinatorEventHandoff, CoordinatorIssueLog, EventLite } from './coordinatorDashboardTypes';
import {
  buildCoordinatorGuestContinuityView,
  buildCoordinatorIssueOperationalMetadata,
  buildCoordinatorShiftSnapshotHtml,
  buildCoordinatorShiftSnapshotText,
  escapeCoordinatorSnapshotHtml,
  readCoordinatorIssueOperationalMetadata,
} from './coordinatorFullSuiteUtils';

describe('coordinatorFullSuiteUtils', () => {
  const events: EventLite[] = [
    { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-05-13T22:00:00Z' },
    { id: 'reception', event_name: 'Reception', start_time: '2026-05-14T01:00:00Z' },
  ];

  const guest: GuestLiteForCoordinator = {
    id: 'guest-1',
    first_name: 'Maya',
    last_name: 'Stone',
    name: 'Maya Stone',
    rsvp_status: 'attending',
    household_id: 'household-1',
    event_arrivals: {
      ceremony: {
        seating_event_id: 'seat-1',
        table_id: 'table-1',
        table_name: 'Family',
        checked_in_at: '2026-05-13T21:55:00Z',
        is_seated: true,
      },
    },
  };

  const eventHandoffs: CoordinatorEventHandoff[] = [
    {
      id: 'handoff-1',
      itinerary_event_id: 'ceremony',
      handoff_status: 'staffed',
      lead_name: 'Jordan',
      support_name: 'Mina',
      note: 'Keep the family front row open.',
      updated_at: '2026-05-13T21:20:00Z',
    },
  ];

  const issueLogs: CoordinatorIssueLog[] = [
    {
      id: 'issue-1',
      guest_id: 'guest-1',
      itinerary_event_id: 'reception',
      issue_type: 'seat-change',
      status: 'working',
      title: 'Move Maya to reception family table',
      note: 'Chair swap approved by planner.',
      assigned_to: 'Front desk',
      replacement_name: null,
      replacement_party_size: null,
      table_id: 'table-8',
      table_name: 'Table 8',
      metadata: {
        incident_owner: 'Nina',
        next_action: 'Confirm Table 8 has two open chairs.',
        runner_task: {
          mode: 'escort',
          assignee: 'Leo',
          status: 'en-route',
          detail: 'Escort the household from cocktails to Table 8.',
          completion_note: null,
          completed_at: null,
          completion_log: [],
        },
      },
      created_at: '2026-05-13T21:25:00Z',
      updated_at: '2026-05-13T21:30:00Z',
    },
  ];

  it('reads and builds issue operational metadata with completion logging', () => {
    const metadata = buildCoordinatorIssueOperationalMetadata({
      activeGuestName: 'Maya Stone',
      existingMetadata: {
        runner_task: {
          mode: 'escort',
          assignee: 'Leo',
          status: 'en-route',
          detail: 'Escort to Table 8.',
          completion_note: null,
          completed_at: null,
          completion_log: [],
        },
      },
      householdMembers: [{ id: 'guest-1', name: 'Maya Stone' }],
      incidentOwner: 'Nina',
      nextAction: 'Confirm the two open chairs.',
      resolvedOutcome: 'Family reseated.',
      runnerTask: {
        mode: 'escort',
        assignee: 'Leo',
        status: 'done',
        detail: 'Escort to Table 8.',
        completionNote: 'Walked the family from cocktails to the new table.',
      },
      now: '2026-05-13T21:40:00Z',
    });

    const parsed = readCoordinatorIssueOperationalMetadata(metadata);
    expect(parsed.incident_owner).toBe('Nina');
    expect(parsed.next_action).toBe('Confirm the two open chairs.');
    expect(parsed.resolved_outcome).toBe('Family reseated.');
    expect(parsed.runner_task).toMatchObject({
      mode: 'escort',
      status: 'done',
      completed_at: '2026-05-13T21:40:00Z',
    });
    expect(parsed.runner_task?.completion_log).toEqual([{
      completed_at: '2026-05-13T21:40:00Z',
      assignee: 'Leo',
      note: 'Walked the family from cocktails to the new table.',
      mode: 'escort',
    }]);
  });

  it('builds continuity across issue, handoff, and event-arrival moments', () => {
    const continuity = buildCoordinatorGuestContinuityView({
      eventHandoffs,
      events,
      guest,
      issueLogs,
    });

    expect(continuity.touchedEventIds).toEqual(expect.arrayContaining(['ceremony', 'reception']));
    expect(continuity.moments).toEqual([
      expect.objectContaining({
        eventId: 'ceremony',
        tableName: 'Family',
        handoffStatus: 'staffed',
        issueCount: 0,
      }),
      expect.objectContaining({
        eventId: 'reception',
        handoffStatus: null,
        issueCount: 1,
      }),
    ]);
    expect(continuity.relatedIssues.map((issue) => issue.id)).toEqual(['issue-1']);
  });

  it('builds printable shift snapshots with unresolved incident and runner sections', () => {
    const snapshot = buildCoordinatorShiftSnapshotText({
      events,
      eventHandoffs,
      generatedAtLabel: '2026-05-13 02:10 PM PDT',
      issueLogs,
      stats: {
        checkedIn: 1,
        confirmed: 1,
        pending: 0,
        total: 1,
      },
    });

    expect(snapshot.filename).toBe('dayof-shift-snapshot-2026-05-13-02-10-pm-pdt.txt');
    expect(snapshot.text).toContain('DayOf shift snapshot');
    expect(snapshot.text).toContain('Event handoffs');
    expect(snapshot.text).toContain('Open incident queue');
    expect(snapshot.text).toContain('Runner and escort queue');
    expect(snapshot.text).toContain('Move Maya to reception family table');
    expect(snapshot.text).toContain('escort / en-route');
  });

  it('escapes printable snapshot HTML', () => {
    expect(escapeCoordinatorSnapshotHtml(`Maya & <Leo> "party" 'table'`)).toBe('Maya &amp; &lt;Leo&gt; &quot;party&quot; &#39;table&#39;');

    const html = buildCoordinatorShiftSnapshotHtml('Move <Family> & escort them');
    expect(html).toContain('Move &lt;Family&gt; &amp; escort them');
  });
});
