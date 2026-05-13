import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type {
  CoordinatorEventHandoff,
  CoordinatorIssueLog,
  CoordinatorIssueOperationalMetadata,
  CoordinatorRunnerTaskCompletionLogItem,
  CoordinatorRunnerTaskMode,
  CoordinatorRunnerTaskRecord,
  CoordinatorRunnerTaskStatus,
  EventLite,
} from './coordinatorDashboardTypes';

type CoordinatorIssueMetadataBuildArgs = {
  activeGuestName: string;
  existingMetadata: Record<string, unknown> | null | undefined;
  householdMembers: Array<{ id: string; name: string }>;
  incidentOwner: string;
  nextAction: string;
  resolvedOutcome: string;
  runnerTask: {
    mode: 'none' | CoordinatorRunnerTaskMode;
    assignee: string;
    status: CoordinatorRunnerTaskStatus;
    detail: string;
    completionNote: string;
  };
  now: string;
};

export type CoordinatorGuestContinuityMoment = {
  eventId: string;
  eventName: string;
  startTime: string | null;
  checkedInAt: string | null;
  tableName: string | null;
  handoffStatus: CoordinatorEventHandoff['handoff_status'] | null;
  handoffNote: string | null;
  issueCount: number;
};

export type CoordinatorGuestContinuityView = {
  touchedEventIds: string[];
  moments: CoordinatorGuestContinuityMoment[];
  relatedIssues: CoordinatorIssueLog[];
  relatedHandoffs: CoordinatorEventHandoff[];
};

type CoordinatorShiftSnapshotArgs = {
  events: EventLite[];
  eventHandoffs: CoordinatorEventHandoff[];
  generatedAtLabel: string;
  issueLogs: CoordinatorIssueLog[];
  stats: {
    checkedIn: number;
    confirmed: number;
    pending: number;
    total: number;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRunnerTaskMode = (value: unknown): CoordinatorRunnerTaskMode | null => {
  if (value === 'runner' || value === 'escort') return value;
  return null;
};

const normalizeRunnerTaskStatus = (value: unknown): CoordinatorRunnerTaskStatus => {
  if (value === 'assigned' || value === 'en-route' || value === 'done') return value;
  return 'queued';
};

const normalizeCompletionLog = (value: unknown): CoordinatorRunnerTaskCompletionLogItem[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const completedAt = normalizeString(entry.completed_at);
    const mode = normalizeRunnerTaskMode(entry.mode);
    if (!completedAt || !mode) return [];
    return [{
      completed_at: completedAt,
      assignee: normalizeString(entry.assignee),
      note: normalizeString(entry.note),
      mode,
    }];
  });
};

export const readCoordinatorIssueOperationalMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): CoordinatorIssueOperationalMetadata => {
  const record = isRecord(metadata) ? metadata : {};
  const runnerTaskRecord = isRecord(record.runner_task) ? record.runner_task : null;
  const runnerTaskMode = runnerTaskRecord ? normalizeRunnerTaskMode(runnerTaskRecord.mode) : null;

  const runnerTask: CoordinatorRunnerTaskRecord | null = runnerTaskRecord && runnerTaskMode
    ? {
      mode: runnerTaskMode,
      assignee: normalizeString(runnerTaskRecord.assignee),
      status: normalizeRunnerTaskStatus(runnerTaskRecord.status),
      detail: normalizeString(runnerTaskRecord.detail),
      completion_note: normalizeString(runnerTaskRecord.completion_note),
      completed_at: normalizeString(runnerTaskRecord.completed_at),
      completion_log: normalizeCompletionLog(runnerTaskRecord.completion_log),
    }
    : null;

  const householdMembers = Array.isArray(record.household_members)
    ? record.household_members.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const id = normalizeString(entry.id);
      const name = normalizeString(entry.name);
      if (!id || !name) return [];
      return [{ id, name }];
    })
    : [];

  return {
    source: normalizeString(record.source),
    active_guest_name: normalizeString(record.active_guest_name),
    household_members: householdMembers,
    incident_owner: normalizeString(record.incident_owner),
    next_action: normalizeString(record.next_action),
    resolved_outcome: normalizeString(record.resolved_outcome),
    runner_task: runnerTask,
  };
};

export const buildCoordinatorIssueOperationalMetadata = ({
  activeGuestName,
  existingMetadata,
  householdMembers,
  incidentOwner,
  nextAction,
  resolvedOutcome,
  runnerTask,
  now,
}: CoordinatorIssueMetadataBuildArgs): Record<string, unknown> => {
  const base = isRecord(existingMetadata) ? { ...existingMetadata } : {};
  const existing = readCoordinatorIssueOperationalMetadata(existingMetadata);

  let nextRunnerTask: CoordinatorRunnerTaskRecord | null = null;
  if (runnerTask.mode !== 'none') {
    const previousTask = existing.runner_task;
    const previousLog = previousTask?.completion_log ?? [];
    const transitionedToDone = runnerTask.status === 'done' && previousTask?.status !== 'done';
    const completionLog = transitionedToDone
      ? [
        ...previousLog,
        {
          completed_at: now,
          assignee: normalizeString(runnerTask.assignee),
          note: normalizeString(runnerTask.completionNote),
          mode: runnerTask.mode,
        },
      ]
      : previousLog;

    nextRunnerTask = {
      mode: runnerTask.mode,
      assignee: normalizeString(runnerTask.assignee),
      status: runnerTask.status,
      detail: normalizeString(runnerTask.detail),
      completion_note: normalizeString(runnerTask.completionNote),
      completed_at: runnerTask.status === 'done'
        ? previousTask?.completed_at ?? now
        : null,
      completion_log: completionLog,
    };
  }

  return {
    ...base,
    source: 'coordinator-issue-desk',
    active_guest_name: activeGuestName,
    household_members: householdMembers,
    incident_owner: normalizeString(incidentOwner),
    next_action: normalizeString(nextAction),
    resolved_outcome: normalizeString(resolvedOutcome),
    runner_task: nextRunnerTask,
  };
};

export const getCoordinatorRunnerTaskLabel = (runnerTask: CoordinatorRunnerTaskRecord | null) => {
  if (!runnerTask) return null;
  return `${runnerTask.mode === 'escort' ? 'Escort' : 'Runner'} · ${runnerTask.status}`;
};

export const buildCoordinatorGuestContinuityView = (args: {
  eventHandoffs: CoordinatorEventHandoff[];
  events: EventLite[];
  guest: GuestLiteForCoordinator;
  issueLogs: CoordinatorIssueLog[];
}): CoordinatorGuestContinuityView => {
  const relatedIssues = args.issueLogs
    .filter((issue) => issue.guest_id === args.guest.id)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const touchedEventIds = new Set<string>([
    ...Object.keys(args.guest.event_arrivals ?? {}),
    ...relatedIssues.flatMap((issue) => issue.itinerary_event_id ? [issue.itinerary_event_id] : []),
  ]);
  const relatedHandoffs = args.eventHandoffs
    .filter((handoff) => touchedEventIds.has(handoff.itinerary_event_id))
    .sort((a, b) => {
      const leftIndex = args.events.findIndex((event) => event.id === a.itinerary_event_id);
      const rightIndex = args.events.findIndex((event) => event.id === b.itinerary_event_id);
      return leftIndex - rightIndex;
    });

  const moments = args.events.map((event) => {
    const arrival = args.guest.event_arrivals?.[event.id];
    const handoff = args.eventHandoffs.find((entry) => entry.itinerary_event_id === event.id) ?? null;
    const issueCount = relatedIssues.filter((issue) => issue.itinerary_event_id === event.id).length;
    return {
      eventId: event.id,
      eventName: event.event_name,
      startTime: event.start_time,
      checkedInAt: arrival?.checked_in_at ?? null,
      tableName: arrival?.table_name ?? null,
      handoffStatus: handoff?.handoff_status ?? null,
      handoffNote: handoff?.note ?? null,
      issueCount,
    };
  }).filter((moment) => (
    moment.checkedInAt
    || moment.tableName
    || moment.handoffStatus
    || moment.issueCount > 0
  ));

  return {
    touchedEventIds: Array.from(touchedEventIds),
    moments,
    relatedIssues,
    relatedHandoffs,
  };
};

export const escapeCoordinatorSnapshotHtml = (value: string) => (
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
);

const safeSnapshotSlug = (value: string) => (
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'snapshot'
);

const formatHandoffStatus = (status: CoordinatorEventHandoff['handoff_status']) => {
  switch (status) {
    case 'needs-decision':
      return 'Needs decision';
    case 'staffed':
      return 'Staffed';
    case 'complete':
      return 'Complete';
    default:
      return 'Ready';
  }
};

const formatIssueStatus = (status: CoordinatorIssueLog['status']) => {
  switch (status) {
    case 'working':
      return 'Working';
    case 'resolved':
      return 'Resolved';
    default:
      return 'Open';
  }
};

export const buildCoordinatorShiftSnapshotText = ({
  events,
  eventHandoffs,
  generatedAtLabel,
  issueLogs,
  stats,
}: CoordinatorShiftSnapshotArgs) => {
  const eventNameById = new Map(events.map((event) => [event.id, event.event_name]));
  const unresolvedIssues = issueLogs.filter((issue) => issue.status !== 'resolved');
  const runnerIssues = unresolvedIssues.filter((issue) => readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task);

  const lines = [
    'DayOf shift snapshot',
    `Generated: ${generatedAtLabel}`,
    '',
    'Board counts',
    `- Guests: ${stats.total}`,
    `- Confirmed: ${stats.confirmed}`,
    `- Pending: ${stats.pending}`,
    `- Checked in: ${stats.checkedIn}`,
    '',
    'Event handoffs',
  ];

  if (eventHandoffs.length === 0) {
    lines.push('- No saved staffing handoffs yet.');
  } else {
    eventHandoffs
      .slice()
      .sort((left, right) => {
        const leftIndex = events.findIndex((event) => event.id === left.itinerary_event_id);
        const rightIndex = events.findIndex((event) => event.id === right.itinerary_event_id);
        return leftIndex - rightIndex;
      })
      .forEach((handoff) => {
        lines.push(`- ${eventNameById.get(handoff.itinerary_event_id) ?? 'Event'}: ${formatHandoffStatus(handoff.handoff_status)}`);
        lines.push(`  Lead: ${handoff.lead_name ?? 'Unassigned'}`);
        lines.push(`  Support: ${handoff.support_name ?? 'Unassigned'}`);
        if (handoff.note) lines.push(`  Note: ${handoff.note}`);
      });
  }

  lines.push('', 'Open incident queue');
  if (unresolvedIssues.length === 0) {
    lines.push('- No unresolved issues right now.');
  } else {
    unresolvedIssues.forEach((issue) => {
      const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
      lines.push(`- ${issue.title} (${formatIssueStatus(issue.status)})`);
      lines.push(`  Event: ${issue.itinerary_event_id ? (eventNameById.get(issue.itinerary_event_id) ?? 'Event') : 'No event linked'}`);
      lines.push(`  Assignee: ${issue.assigned_to ?? 'Unassigned'}`);
      lines.push(`  Owner: ${metadata.incident_owner ?? 'Unassigned'}`);
      lines.push(`  Next action: ${metadata.next_action ?? 'Not set'}`);
      if (metadata.runner_task) {
        lines.push(`  Movement task: ${metadata.runner_task.mode} / ${metadata.runner_task.status}`);
        lines.push(`  Task assignee: ${metadata.runner_task.assignee ?? 'Unassigned'}`);
        if (metadata.runner_task.detail) lines.push(`  Task detail: ${metadata.runner_task.detail}`);
      }
    });
  }

  lines.push('', 'Runner and escort queue');
  if (runnerIssues.length === 0) {
    lines.push('- No active runner or escort tasks right now.');
  } else {
    runnerIssues.forEach((issue) => {
      const runnerTask = readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task;
      if (!runnerTask) return;
      lines.push(`- ${issue.title}: ${runnerTask.mode} / ${runnerTask.status}`);
      lines.push(`  Assignee: ${runnerTask.assignee ?? 'Unassigned'}`);
      if (runnerTask.detail) lines.push(`  Detail: ${runnerTask.detail}`);
    });
  }

  return {
    filename: `dayof-shift-snapshot-${safeSnapshotSlug(generatedAtLabel)}.txt`,
    text: lines.join('\n'),
  };
};

export const buildCoordinatorShiftSnapshotHtml = (text: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>DayOf shift snapshot</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #1f2937; }
      h1 { font-size: 24px; margin: 0 0 16px; }
      pre { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; background: #f8fafc; border: 1px solid #dbe3eb; border-radius: 8px; padding: 16px; }
    </style>
  </head>
  <body>
    <h1>DayOf shift snapshot</h1>
    <pre>${escapeCoordinatorSnapshotHtml(text)}</pre>
  </body>
</html>`;
