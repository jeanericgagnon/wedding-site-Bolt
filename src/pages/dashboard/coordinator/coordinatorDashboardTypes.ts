export type AudienceOption = { value: string; label: string; count: number };

export type EventLite = {
  id: string;
  event_name: string;
  start_time: string | null;
};

export type TimelineState = 'up-next' | 'live' | 'done';

export type CoordinatorHandoffStatus = 'ready' | 'staffed' | 'needs-decision' | 'complete';

export type CoordinatorEventHandoff = {
  id: string;
  itinerary_event_id: string;
  handoff_status: CoordinatorHandoffStatus;
  lead_name: string | null;
  support_name: string | null;
  note: string | null;
  updated_at: string | null;
};

export type CoordinatorIssueType =
  | 'walk-in'
  | 'help-desk'
  | 'manager-decision'
  | 'seat-change'
  | 'substitute-attendee'
  | 'plus-one-swap';

export type CoordinatorIssueStatus = 'open' | 'working' | 'resolved';

export type CoordinatorRunnerTaskMode = 'runner' | 'escort';

export type CoordinatorRunnerTaskStatus = 'queued' | 'assigned' | 'en-route' | 'done';

export type CoordinatorRunnerTaskCompletionLogItem = {
  completed_at: string;
  assignee: string | null;
  note: string | null;
  mode: CoordinatorRunnerTaskMode;
};

export type CoordinatorRunnerTaskRecord = {
  mode: CoordinatorRunnerTaskMode;
  assignee: string | null;
  status: CoordinatorRunnerTaskStatus;
  detail: string | null;
  completion_note: string | null;
  completed_at: string | null;
  completion_log: CoordinatorRunnerTaskCompletionLogItem[];
};

export type CoordinatorIssueOperationalMetadata = {
  source: string | null;
  active_guest_name: string | null;
  household_members: Array<{ id: string; name: string }>;
  incident_owner: string | null;
  next_action: string | null;
  resolved_outcome: string | null;
  runner_task: CoordinatorRunnerTaskRecord | null;
};

export type CoordinatorIssueLog = {
  id: string;
  guest_id: string | null;
  itinerary_event_id: string | null;
  issue_type: CoordinatorIssueType;
  status: CoordinatorIssueStatus;
  title: string;
  note: string | null;
  assigned_to: string | null;
  replacement_name: string | null;
  replacement_party_size: number | null;
  table_id: string | null;
  table_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CoordinatorTableLite = {
  id: string;
  seating_event_id: string;
  table_name: string | null;
  sort_order: number | null;
};

export type AlertLog = {
  id: string;
  subject: string;
  audience: string;
  channel: 'email' | 'sms';
  queuedAt: string;
  sendAt?: string | null;
};

export type QnaItem = {
  id: string;
  question: string;
  status: 'new' | 'answered';
  answer?: string | null;
};
