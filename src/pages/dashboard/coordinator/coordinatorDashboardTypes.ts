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
