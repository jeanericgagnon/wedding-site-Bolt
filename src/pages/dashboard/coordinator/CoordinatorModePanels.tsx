import React from 'react';
import { Link } from 'react-router-dom';
import { Input, Textarea } from '../../../components/ui';
import type { CoordinatorAlertBoard } from '../../../lib/coordinatorAlertBoard';
import {
  getCoordinatorDoorExceptionStateLabel,
  getCoordinatorDoorExceptionStates,
  getCoordinatorDoorStatus,
  getCoordinatorDoorStatusLabel,
  getCoordinatorEventCheckInAt,
  getCoordinatorEventTableName,
  isCoordinatorGuestInvitedToCurrentEvent,
  type CoordinatorDoorStatusContext,
} from '../../../lib/coordinatorCheckInStatus';
import { getCoordinatorTimelineCorrectionAction } from '../../../lib/coordinatorCorrectionActions';
import { PLANNER_ROLE_OPTIONS, type PlannerAccessRole } from '../../../lib/plannerAccess';
import { getCoordinatorActionHint } from '../../../lib/coordinatorActionCopy';
import type { CoordinatorCommandBoard } from '../../../lib/coordinatorCommandBoard';
import type { CoordinatorCommandDeckItem } from '../../../lib/coordinatorCommandDeck';
import type { CoordinatorCommandSummaryItem } from '../../../lib/coordinatorCommandSummary';
import type { CoordinatorCommandSummaryLabel } from '../../../lib/coordinatorCommandSummaryTarget';
import type { CoordinatorCorrectionCue } from '../../../lib/coordinatorCorrectionsSummary';
import type { CoordinatorEscalation } from '../../../lib/coordinatorEscalations';
import type { CoordinatorExecutionBoard } from '../../../lib/coordinatorExecutionBoard';
import type { CoordinatorNavigationBoard } from '../../../lib/coordinatorNavigationBoard';
import type { CoordinatorOpsSnapshotItem, CoordinatorOpsSnapshotKey } from '../../../lib/coordinatorOpsSnapshot';
import type { CoordinatorPrimaryAction } from '../../../lib/coordinatorPrimaryAction';
import type { CoordinatorPrimaryActionBoard } from '../../../lib/coordinatorPrimaryActionBoard';
import type { CoordinatorQnaBoard } from '../../../lib/coordinatorQnaBoard';
import type { CoordinatorRoleBoard } from '../../../lib/coordinatorRoleBoard';
import type { CoordinatorRoleCapability } from '../../../lib/coordinatorRoleCapabilities';
import type { CoordinatorStablePrompt } from '../../../lib/coordinatorStablePrompt';
import type { CoordinatorSummaryDisplayCue } from '../../../lib/coordinatorSummaryDisplayCue';
import type { CoordinatorTimelineBoard } from '../../../lib/coordinatorTimelineBoard';
import type { CoordinatorGuestDoorRoute, GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import { getCoordinatorActiveTargetLabel } from '../../../lib/coordinatorActiveTargetLabel';
import { formatCoordinatorEventDateTime } from '../coordinatorEventTime';
import {
  CoordinatorCheckInQueuePanel,
  CoordinatorCommandDeckPanel,
  CoordinatorDayOfMessagePanel,
  CoordinatorTimelinePanel,
} from './CoordinatorCheckInPanels';
import type {
  CoordinatorEventHandoff,
  CoordinatorIssueLog,
  CoordinatorIssueStatus,
  CoordinatorIssueType,
  CoordinatorRunnerTaskMode,
  CoordinatorRunnerTaskStatus,
  CoordinatorTableLite,
  EventLite,
} from './coordinatorDashboardTypes';
import {
  buildCoordinatorGuestContinuityView,
  getCoordinatorRunnerTaskLabel,
  readCoordinatorIssueOperationalMetadata,
} from './coordinatorFullSuiteUtils';
import { getCoordinatorQnaDraftStateLabel, type CoordinatorQnaFilter } from '../../../lib/coordinatorQnaTriage';

type CoordinatorCheckInTargetState = {
  activeGuestId: string | null;
  boardTargetId: string | null;
  isBoardTargetActive: boolean;
  label: string | null;
};

type CoordinatorTimelineTargetState = {
  activeTimelineEventId: string | null;
  boardTargetId: string | null;
  isBoardTargetActive: boolean;
  label: string | null;
};

type CoordinatorQnaTargetState = {
  activeQnaId: string | null;
  boardTargetId: string | null;
  isBoardTargetActive: boolean;
  label: string | null;
};

const issueStatusClassName = (status: CoordinatorIssueStatus) => {
  switch (status) {
    case 'resolved':
      return 'border-primary/20 bg-primary/5 text-primary';
    case 'working':
      return 'border-primary/20 bg-accent-light text-primary';
    default:
      return 'border-border bg-white text-text-tertiary';
  }
};

const issueTypeLabel = (issueType: CoordinatorIssueType) => {
  switch (issueType) {
    case 'help-desk':
      return 'Help desk';
    case 'manager-decision':
      return 'Manager decision';
    case 'plus-one-swap':
      return 'Plus-one swap';
    case 'seat-change':
      return 'Seat change';
    case 'substitute-attendee':
      return 'Substitute attendee';
    case 'walk-in':
      return 'Walk-in';
    default:
      return issueType;
  }
};

const runnerTaskStatusLabel = (status: CoordinatorRunnerTaskStatus) => {
  switch (status) {
    case 'assigned':
      return 'Assigned';
    case 'done':
      return 'Done';
    case 'en-route':
      return 'En route';
    default:
      return 'Queued';
  }
};

const runnerTaskModeLabel = (mode: CoordinatorRunnerTaskMode) => (
  mode === 'escort' ? 'Escort' : 'Runner'
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

const formatIssueStatus = (status: CoordinatorIssueStatus) => {
  switch (status) {
    case 'resolved':
      return 'Resolved';
    case 'working':
      return 'Working';
    default:
      return 'Open';
  }
};

export interface CoordinatorRoleSelectorProps {
  activeSiteRole: PlannerAccessRole;
  coordinatorRole: PlannerAccessRole;
  onRoleChange: (role: PlannerAccessRole) => void;
}

export function CoordinatorRoleSelector({
  activeSiteRole,
  coordinatorRole,
  onRoleChange,
}: CoordinatorRoleSelectorProps) {
  return (
    <div>
      <label className="block text-xs text-text-tertiary mb-1">Planner access view</label>
      <select
        value={coordinatorRole}
        onChange={(event) => onRoleChange(event.target.value as PlannerAccessRole)}
        disabled={activeSiteRole !== 'owner'}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary"
      >
        {PLANNER_ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {activeSiteRole !== 'owner' && (
        <p className="mt-1 text-[11px] text-text-tertiary">Access view follows your actual collaborator role on this site.</p>
      )}
    </div>
  );
}

export interface CoordinatorStatCardsProps {
  loading: boolean;
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    checkedIn: number;
  };
}

export function CoordinatorStatCards({ loading, stats }: CoordinatorStatCardsProps) {
  const cards = [
    ['Guests', stats.total],
    ['Confirmed', stats.confirmed],
    ['Pending', stats.pending],
    ['Checked In', stats.checkedIn],
  ] as const;

  return (
    <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{loading ? '—' : value}</p>
        </div>
      ))}
    </div>
  );
}

export interface CoordinatorAttentionPanelProps {
  correctionCues: CoordinatorCorrectionCue[];
  liveIssues: CoordinatorEscalation[];
  nextArrivals: GuestLiteForCoordinator[];
  hasUncheckedGuests: boolean;
  onArrivalClick: (guest: GuestLiteForCoordinator) => void;
  onCorrectionCueClick: (cue: CoordinatorCorrectionCue) => void;
  onEscalationClick: (item: CoordinatorEscalation) => void;
}

export function CoordinatorAttentionPanel({
  correctionCues,
  liveIssues,
  nextArrivals,
  hasUncheckedGuests,
  onArrivalClick,
  onCorrectionCueClick,
  onEscalationClick,
}: CoordinatorAttentionPanelProps) {
  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Attention now</p>
      <p className="mt-3 text-sm font-medium text-text-primary">Start with the exceptions that could slow down the room.</p>
      <p className="mt-2 text-[13px] leading-6 text-text-secondary">This pulls together the live escalations, correction cues, and arrivals that the coordinator should resolve first.</p>
      <div className="space-y-2">
        {liveIssues.length === 0 && correctionCues.length === 0 && (
          <div className="rounded-xl border border-border-subtle bg-accent-light px-3 py-3">
            <p className="text-sm font-medium text-primary">Board is clear right now</p>
            <p className="mt-1 text-xs text-text-secondary">No active escalations or recovery cues are waiting. Use the next helpful action when you want a fast cue.</p>
          </div>
        )}
        {liveIssues.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onEscalationClick(item)}
            className={`w-full rounded-xl border px-3 py-3 text-left ${item.tone === 'warning' ? 'border-primary/20 bg-accent-light' : item.tone === 'success' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/40'}`}
          >
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
            <p className="mt-1 text-[10px] text-text-tertiary/80">{getCoordinatorActionHint('escalation')}</p>
          </button>
        ))}
        {correctionCues.map((cue) => (
          <button
            key={cue.key}
            type="button"
            onClick={() => onCorrectionCueClick(cue)}
            className="w-full rounded-xl border border-primary/20 bg-accent-light px-3 py-3 text-left"
          >
            <p className="text-sm font-medium text-text-primary">{cue.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{cue.detail}</p>
            <p className="mt-1 text-[10px] text-text-tertiary/80">{getCoordinatorActionHint('correction')}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-2">
        <p className="text-xs font-medium text-text-primary">Next arrivals</p>
        {nextArrivals.length === 0 ? (
          <p className="mt-1 text-xs text-text-tertiary">
            {hasUncheckedGuests
              ? 'No ready arrivals right now. Review-needed guests are still waiting in the queue.'
              : 'Everyone currently in this view is already checked in.'}
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {nextArrivals.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => onArrivalClick(guest)}
                className="block w-full text-left text-xs text-text-secondary hover:text-primary"
              >
                • {guest.name} — {guest.rsvp_status}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/dashboard/rsvp-board" className="rounded-xl border border-border px-2.5 py-1 text-[11px] text-text-secondary no-underline hover:border-primary/40 hover:text-primary">Open RSVP board</Link>
        <Link to="/dashboard/seating-lookup" className="rounded-xl border border-border px-2.5 py-1 text-[11px] text-text-secondary no-underline hover:border-primary/40 hover:text-primary">Open seating lookup</Link>
        <Link to="/dashboard/planning" className="rounded-xl border border-border px-2.5 py-1 text-[11px] text-text-secondary no-underline hover:border-primary/40 hover:text-primary">Open planning</Link>
      </div>
    </div>
  );
}

export interface CoordinatorHandoffPanelProps {
  coordinatorRole: PlannerAccessRole;
  canEditHandoffs: boolean;
  events: EventLite[];
  eventHandoffs: CoordinatorEventHandoff[];
  handoffBusyEventId: string | null;
  onChangeHandoff: (eventId: string, patch: Partial<CoordinatorEventHandoff>) => void;
  onSaveHandoff: (eventId: string) => void;
}

export function CoordinatorHandoffPanel({
  coordinatorRole,
  canEditHandoffs,
  events,
  eventHandoffs,
  handoffBusyEventId,
  onChangeHandoff,
  onSaveHandoff,
}: CoordinatorHandoffPanelProps) {
  const handoffCopy = {
    title: coordinatorRole === 'viewer' ? 'Viewer handoff' : coordinatorRole === 'coordinator' ? 'Coordinator handoff' : 'Planner handoff',
    detail: coordinatorRole === 'viewer'
      ? 'Use this view for visibility only and pass changes to the couple or planner.'
      : coordinatorRole === 'coordinator'
        ? 'Keep live updates moving and flag anything sensitive back to the couple.'
        : 'Run the room, keep communications aligned, and escalate only the decisions that need the couple.',
  };
  const handoffByEventId = new Map(eventHandoffs.map((item) => [item.itinerary_event_id, item]));

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Staffing handoff</p>
          <p className="mt-3 text-sm font-medium text-text-primary">Keep each event handoff clear before someone steps into the room.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">{handoffCopy.detail}</p>
          <p className="mt-2 text-[11px] text-text-tertiary">Final couple decisions stay with the couple when something needs approval.</p>
        </div>
        <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
          {handoffCopy.title}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {events.map((event) => {
          const handoff = handoffByEventId.get(event.id) ?? {
            id: `draft-${event.id}`,
            itinerary_event_id: event.id,
            handoff_status: 'ready' as const,
            lead_name: '',
            support_name: '',
            note: '',
            updated_at: null,
          };
          return (
            <div key={event.id} data-testid={`coordinator-handoff-card-${event.id}`} className="rounded-xl border border-border/60 bg-surface-subtle/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{event.event_name}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">{formatCoordinatorEventDateTime(event.start_time)}</p>
                </div>
                <select
                  data-testid={`coordinator-handoff-status-${event.id}`}
                  value={handoff.handoff_status}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { handoff_status: eventTarget.target.value as CoordinatorEventHandoff['handoff_status'] })}
                className="rounded-xl border border-border bg-white px-2 py-1.5 text-[11px] text-text-secondary disabled:opacity-60"
                >
                  <option value="ready">Ready</option>
                  <option value="staffed">Staffed</option>
                  <option value="needs-decision">Needs decision</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  data-testid={`coordinator-handoff-lead-${event.id}`}
                  value={handoff.lead_name ?? ''}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { lead_name: eventTarget.target.value })}
                  placeholder="Lead"
                />
                <Input
                  data-testid={`coordinator-handoff-support-${event.id}`}
                  value={handoff.support_name ?? ''}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { support_name: eventTarget.target.value })}
                  placeholder="Support"
                />
              </div>
              <Textarea
                data-testid={`coordinator-handoff-note-${event.id}`}
                className="mt-2"
                rows={3}
                value={handoff.note ?? ''}
                disabled={!canEditHandoffs}
                onChange={(eventTarget) => onChangeHandoff(event.id, { note: eventTarget.target.value })}
                placeholder="What does the next helper need to know?"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px] text-text-tertiary">
                  {handoff.updated_at ? `Updated ${new Date(handoff.updated_at).toLocaleString()}` : 'No saved handoff yet'}
                </p>
                {canEditHandoffs && (
                  <button
                    type="button"
                    data-testid={`coordinator-handoff-save-${event.id}`}
                    onClick={() => onSaveHandoff(event.id)}
                    disabled={handoffBusyEventId === event.id}
                    className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary disabled:opacity-40"
                  >
                    {handoffBusyEventId === event.id ? 'Saving…' : 'Save handoff'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CoordinatorIssueDraftView = {
  issueType: CoordinatorIssueType;
  status: CoordinatorIssueStatus;
  title: string;
  note: string;
  assignedTo: string;
  incidentOwner: string;
  nextAction: string;
  resolvedOutcome: string;
  runnerTaskMode: 'none' | CoordinatorRunnerTaskMode;
  runnerTaskAssignee: string;
  runnerTaskStatus: CoordinatorRunnerTaskStatus;
  runnerTaskDetail: string;
  runnerTaskCompletionNote: string;
  replacementName: string;
  replacementPartySize: string;
  itineraryEventId: string | null;
  tableId: string | null;
};

export interface CoordinatorIssueDeskPanelProps {
  activeGuest: GuestLiteForCoordinator | null;
  canEditIssues: boolean;
  currentEventId: string | null;
  currentEventName: string | null;
  events: EventLite[];
  guests: GuestLiteForCoordinator[];
  issueBusy: boolean;
  issueDraft: CoordinatorIssueDraftView;
  issueLogs: CoordinatorIssueLog[];
  selectedIssueId: string | null;
  seatingTables: CoordinatorTableLite[];
  onClearIssueDraft: () => void;
  onDraftChange: (patch: Partial<CoordinatorIssueDraftView>) => void;
  onPrefillIssueType: (issueType: CoordinatorIssueType) => void;
  onSaveIssue: () => void;
  onSelectIssue: (issueId: string) => void;
}

export function CoordinatorIssueDeskPanel({
  activeGuest,
  canEditIssues,
  currentEventId,
  currentEventName,
  events,
  guests,
  issueBusy,
  issueDraft,
  issueLogs,
  selectedIssueId,
  seatingTables,
  onClearIssueDraft,
  onDraftChange,
  onPrefillIssueType,
  onSaveIssue,
  onSelectIssue,
}: CoordinatorIssueDeskPanelProps) {
  const eventNameById = new Map(events.map((event) => [event.id, event.event_name]));
  const guestNameById = new Map(guests.map((guest) => [guest.id, guest.name]));
  const selectedEventName = issueDraft.itineraryEventId ? (eventNameById.get(issueDraft.itineraryEventId) ?? null) : currentEventName;
  const selectedGuestHousehold = activeGuest?.household_id
    ? guests.filter((guest) => guest.household_id === activeGuest.household_id)
    : [];
  const selectedIssueMetadata = selectedIssueId
    ? readCoordinatorIssueOperationalMetadata(issueLogs.find((issue) => issue.id === selectedIssueId)?.metadata)
    : null;

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Issue desk</p>
          <p className="mt-3 text-sm font-medium text-text-primary">Keep seat changes, substitutions, and manager calls in one steady day-of thread.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">Use this to anchor the guest, the decision, the owner, and any runner follow-through in one place while the room is moving.</p>
        </div>
        <span className="rounded-xl border border-border bg-white px-2 py-1 text-[10px] font-medium text-text-tertiary">
          {issueLogs.filter((item) => item.status !== 'resolved').length} open
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-xl border border-border/60 bg-surface-subtle/20 p-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onPrefillIssueType('seat-change')} disabled={!canEditIssues || !activeGuest} className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Seat change</button>
            <button type="button" onClick={() => onPrefillIssueType('substitute-attendee')} disabled={!canEditIssues || !activeGuest} className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Substitute</button>
            <button type="button" onClick={() => onPrefillIssueType('plus-one-swap')} disabled={!canEditIssues || !activeGuest} className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Plus-one swap</button>
            <button type="button" onClick={() => onPrefillIssueType('manager-decision')} disabled={!canEditIssues || !activeGuest} className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Manager note</button>
          </div>

          <div className="mt-3 rounded-xl border border-border/50 bg-white px-3 py-2">
            <p className="text-[10px] text-text-tertiary">Focused guest</p>
            {activeGuest ? (
              <>
                <p className="mt-1 text-sm font-medium text-text-primary">{activeGuest.name}</p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {selectedEventName ? `${selectedEventName} · ` : ''}{getCoordinatorEventTableName(activeGuest, issueDraft.itineraryEventId ?? currentEventId) ?? 'Unassigned seat'}
                </p>
                {selectedGuestHousehold.length > 1 && (
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    Household: {selectedGuestHousehold.map((guest) => guest.name).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[11px] text-text-tertiary">Pick someone from the check-in queue to anchor a seat change or substitution.</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Issue type</label>
              <select
                data-testid="coordinator-issue-type"
                value={issueDraft.issueType}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ issueType: eventTarget.target.value as CoordinatorIssueType })}
                className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
              >
                <option value="seat-change">Seat change</option>
                <option value="substitute-attendee">Substitute attendee</option>
                <option value="plus-one-swap">Plus-one swap</option>
                <option value="manager-decision">Manager decision</option>
                <option value="help-desk">Help desk</option>
                <option value="walk-in">Walk-in</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Status</label>
              <select
                data-testid="coordinator-issue-status"
                value={issueDraft.status}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ status: eventTarget.target.value as CoordinatorIssueStatus })}
                className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
              >
                <option value="open">Open</option>
                <option value="working">Working</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-text-tertiary">Title</label>
              <Input
                data-testid="coordinator-issue-title"
                value={issueDraft.title}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ title: eventTarget.target.value })}
                placeholder="What needs to happen next?"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Event</label>
              <select
                data-testid="coordinator-issue-event"
                value={issueDraft.itineraryEventId ?? ''}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ itineraryEventId: eventTarget.target.value || null, tableId: null })}
                className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
              >
                <option value="">No event link</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.event_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Assignee</label>
              <Input
                data-testid="coordinator-issue-assignee"
                value={issueDraft.assignedTo}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ assignedTo: eventTarget.target.value })}
                placeholder="Lead or desk owner"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Owner</label>
              <Input
                data-testid="coordinator-issue-owner"
                value={issueDraft.incidentOwner}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ incidentOwner: eventTarget.target.value })}
                placeholder="Who is accountable for the final outcome?"
              />
            </div>
            <div className="md:col-span-2 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-primary">Incident ownership</p>
                  <p className="mt-1 text-[11px] text-text-secondary">Keep every issue anchored to a clear next move and a closeout note.</p>
                </div>
                <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issueDraft.status)}`}>
                  {issueDraft.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Next action</label>
                  <Input
                    data-testid="coordinator-issue-next-action"
                    value={issueDraft.nextAction}
                    disabled={!canEditIssues}
                    onChange={(eventTarget) => onDraftChange({ nextAction: eventTarget.target.value })}
                    placeholder="What should happen before this can move forward?"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Resolved outcome</label>
                  <Textarea
                    data-testid="coordinator-issue-resolved-outcome"
                    rows={2}
                    value={issueDraft.resolvedOutcome}
                    disabled={!canEditIssues}
                    onChange={(eventTarget) => onDraftChange({ resolvedOutcome: eventTarget.target.value })}
                    placeholder="Capture the final decision, approval, and what changed on the floor."
                  />
                </div>
              </div>
            </div>
            {(issueDraft.issueType === 'seat-change' || issueDraft.issueType === 'substitute-attendee' || issueDraft.issueType === 'plus-one-swap') && (
              <>
                {(issueDraft.issueType === 'substitute-attendee' || issueDraft.issueType === 'plus-one-swap') && (
                  <>
                    <div>
                      <label className="mb-1 block text-[11px] text-text-tertiary">Replacement name</label>
                  <Input
                        data-testid="coordinator-issue-replacement-name"
                        value={issueDraft.replacementName}
                        disabled={!canEditIssues}
                        onChange={(eventTarget) => onDraftChange({ replacementName: eventTarget.target.value })}
                        placeholder="Who is arriving in their place?"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-text-tertiary">Party size</label>
                      <Input
                        data-testid="coordinator-issue-replacement-party-size"
                        value={issueDraft.replacementPartySize}
                        disabled={!canEditIssues}
                        onChange={(eventTarget) => onDraftChange({ replacementPartySize: eventTarget.target.value })}
                        placeholder="1"
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Target table</label>
                  <select
                    data-testid="coordinator-issue-target-table"
                    value={issueDraft.tableId ?? ''}
                    disabled={!canEditIssues || seatingTables.length === 0}
                    onChange={(eventTarget) => onDraftChange({ tableId: eventTarget.target.value || null })}
                    className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
                  >
                    <option value="">{seatingTables.length ? 'Keep current table' : 'No tables available for this event yet'}</option>
                    {seatingTables.map((table) => (
                      <option key={table.id} value={table.id}>{table.table_name ?? 'Unassigned'}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="md:col-span-2 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-primary">Runner and escort task</p>
                  <p className="mt-1 text-[11px] text-text-secondary">Use this when a guest movement needs someone to physically carry it through.</p>
                </div>
                {issueDraft.runnerTaskMode !== 'none' && (
                  <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
                    {runnerTaskModeLabel(issueDraft.runnerTaskMode)} · {runnerTaskStatusLabel(issueDraft.runnerTaskStatus)}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task type</label>
                  <select
                    data-testid="coordinator-issue-runner-mode"
                    value={issueDraft.runnerTaskMode}
                    disabled={!canEditIssues}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskMode: eventTarget.target.value as CoordinatorIssueDraftView['runnerTaskMode'] })}
                    className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
                  >
                    <option value="none">No movement task</option>
                    <option value="runner">Runner task</option>
                    <option value="escort">Escort task</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task status</label>
                  <select
                    data-testid="coordinator-issue-runner-status"
                    value={issueDraft.runnerTaskStatus}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskStatus: eventTarget.target.value as CoordinatorRunnerTaskStatus })}
                    className="w-full rounded-xl border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
                  >
                    <option value="queued">Queued</option>
                    <option value="assigned">Assigned</option>
                    <option value="en-route">En route</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task assignee</label>
                  <Input
                    data-testid="coordinator-issue-runner-assignee"
                    value={issueDraft.runnerTaskAssignee}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskAssignee: eventTarget.target.value })}
                    placeholder="Who is moving this guest?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Completion note</label>
                  <Input
                    data-testid="coordinator-issue-runner-completion-note"
                    value={issueDraft.runnerTaskCompletionNote}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskCompletionNote: eventTarget.target.value })}
                    placeholder="What should the team record once it lands?"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task detail</label>
                  <Textarea
                    data-testid="coordinator-issue-runner-detail"
                    rows={2}
                    value={issueDraft.runnerTaskDetail}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskDetail: eventTarget.target.value })}
                    placeholder="Example: Escort the household from cocktails to Table 8 and confirm the chair swap."
                  />
                </div>
                {selectedIssueMetadata?.runner_task?.completion_log.length ? (
                  <div className="md:col-span-2 rounded-xl border border-border/50 bg-white px-3 py-2">
                    <p className="text-[10px] font-medium text-text-tertiary">Completion log</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedIssueMetadata.runner_task.completion_log.slice().reverse().map((entry) => (
                        <div key={`${entry.completed_at}-${entry.assignee ?? 'open'}`} className="rounded-xl border border-border/50 bg-surface-subtle/20 px-2.5 py-2 text-[11px] text-text-secondary">
                          <p className="font-medium text-text-primary">{runnerTaskModeLabel(entry.mode)} completed {new Date(entry.completed_at).toLocaleString()}</p>
                          <p className="mt-1">{entry.assignee ?? 'Unassigned'}{entry.note ? ` · ${entry.note}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-text-tertiary">Operator notes</label>
              <Textarea
                data-testid="coordinator-issue-operator-notes"
                rows={4}
                value={issueDraft.note}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ note: eventTarget.target.value })}
                placeholder="Capture the decision, who approved it, and what the next helper should honor."
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {canEditIssues && (
              <button
                type="button"
                data-testid="coordinator-issue-save"
                onClick={onSaveIssue}
                disabled={issueBusy || !activeGuest}
                className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary disabled:opacity-40"
              >
                {issueBusy ? 'Saving…' : selectedIssueId ? 'Update issue' : 'Save issue'}
              </button>
            )}
            <button
              type="button"
              onClick={onClearIssueDraft}
              className="rounded-xl border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary"
            >
              Clear
            </button>
            <Link to="/dashboard/seating-lookup" className="rounded-xl border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary no-underline">Open seating lookup</Link>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface-subtle/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-text-primary">Recent issue history</p>
            <p className="text-[11px] text-text-tertiary">{issueLogs.length} logged</p>
          </div>
          <div className="mt-3 space-y-2">
            {issueLogs.length === 0 && (
              <p className="rounded-xl border border-border/50 bg-white px-3 py-2 text-[11px] text-text-tertiary">No saved day-of issue history yet.</p>
            )}
            {issueLogs.slice(0, 8).map((issue) => (
              <button
                key={issue.id}
                type="button"
                data-testid={`coordinator-issue-history-${issue.id}`}
                onClick={() => onSelectIssue(issue.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">{issue.title}</p>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {issueTypeLabel(issue.issue_type)}
                      {issue.guest_id ? ` · ${guestNameById.get(issue.guest_id) ?? 'Guest'}` : ''}
                      {issue.itinerary_event_id ? ` · ${eventNameById.get(issue.itinerary_event_id) ?? 'Event'}` : ''}
                    </p>
                    {issue.note && (
                      <p className="mt-1 text-[11px] text-text-tertiary line-clamp-3">{issue.note}</p>
                    )}
                    {(issue.replacement_name || issue.table_name) && (
                      <p className="mt-1 text-[10px] text-text-tertiary">
                        {issue.replacement_name ? `Replacement: ${issue.replacement_name}` : ''}
                        {issue.replacement_name && issue.table_name ? ' · ' : ''}
                        {issue.table_name ? `Table: ${issue.table_name}` : ''}
                      </p>
                    )}
                    {(() => {
                      const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
                      const runnerLabel = getCoordinatorRunnerTaskLabel(metadata.runner_task);
                      if (!metadata.incident_owner && !metadata.next_action && !runnerLabel) return null;
                      return (
                        <p className="mt-1 text-[10px] text-text-tertiary">
                          {metadata.incident_owner ? `Owner: ${metadata.incident_owner}` : ''}
                          {metadata.incident_owner && metadata.next_action ? ' · ' : ''}
                          {metadata.next_action ? `Next: ${metadata.next_action}` : ''}
                          {(metadata.incident_owner || metadata.next_action) && runnerLabel ? ' · ' : ''}
                          {runnerLabel ? `Task: ${runnerLabel}` : ''}
                        </p>
                      );
                    })()}
                  </div>
                  <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issue.status)}`}>
                    {issue.status}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-text-tertiary">{new Date(issue.updated_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CoordinatorRunnerBoardPanelProps {
  issueLogs: CoordinatorIssueLog[];
  onSelectIssue: (issueId: string) => void;
  selectedIssueId: string | null;
}

export function CoordinatorRunnerBoardPanel({
  issueLogs,
  onSelectIssue,
  selectedIssueId,
}: CoordinatorRunnerBoardPanelProps) {
  const runnerIssues = issueLogs.filter((issue) => readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task);
  const openTasks = runnerIssues.filter((issue) => readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task?.status !== 'done');
  const completedTasks = runnerIssues.filter((issue) => readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task?.status === 'done');

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Runner board</p>
          <p className="mt-3 text-sm font-medium text-text-primary">Keep guest movement tasks visible from assignment through completion.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">Escort tasks, runner moves, and their completion notes stay together here so no one has to reconstruct movement from memory.</p>
        </div>
        <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
          {openTasks.length} active
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[11px] font-medium text-text-primary">Active tasks</p>
          <div className="mt-2 space-y-2">
            {openTasks.length === 0 ? (
              <p className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No runner or escort tasks are active right now.</p>
            ) : openTasks.map((issue) => {
              const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
              const runnerTask = metadata.runner_task;
              if (!runnerTask) return null;
              return (
                <button
                  key={issue.id}
                  type="button"
                  data-testid={`coordinator-runner-active-${issue.id}`}
                  onClick={() => onSelectIssue(issue.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-text-primary">{issue.title}</p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {runnerTaskModeLabel(runnerTask.mode)} · {runnerTaskStatusLabel(runnerTask.status)}
                        {runnerTask.assignee ? ` · ${runnerTask.assignee}` : ''}
                      </p>
                      {runnerTask.detail && (
                        <p className="mt-1 text-[11px] text-text-tertiary">{runnerTask.detail}</p>
                      )}
                    </div>
                    <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issue.status)}`}>
                      {runnerTaskStatusLabel(runnerTask.status)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-text-primary">Recent completions</p>
          <div className="mt-2 space-y-2">
            {completedTasks.length === 0 ? (
              <p className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No completed movement tasks logged yet.</p>
            ) : completedTasks.slice(0, 4).map((issue) => {
              const runnerTask = readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task;
              if (!runnerTask) return null;
              return (
                <button
                  key={issue.id}
                  type="button"
                  data-testid={`coordinator-runner-complete-${issue.id}`}
                  onClick={() => onSelectIssue(issue.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
                >
                  <p className="text-[11px] font-medium text-text-primary">{issue.title}</p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {runnerTaskModeLabel(runnerTask.mode)} completed
                    {runnerTask.completed_at ? ` · ${new Date(runnerTask.completed_at).toLocaleString()}` : ''}
                  </p>
                  {runnerTask.completion_note && (
                    <p className="mt-1 text-[11px] text-text-tertiary">{runnerTask.completion_note}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CoordinatorGuestContinuityPanelProps {
  activeGuest: GuestLiteForCoordinator | null;
  eventHandoffs: CoordinatorEventHandoff[];
  events: EventLite[];
  issueLogs: CoordinatorIssueLog[];
  onSelectIssue: (issueId: string) => void;
}

export function CoordinatorGuestContinuityPanel({
  activeGuest,
  eventHandoffs,
  events,
  issueLogs,
  onSelectIssue,
}: CoordinatorGuestContinuityPanelProps) {
  const continuity = activeGuest
    ? buildCoordinatorGuestContinuityView({
      eventHandoffs,
      events,
      guest: activeGuest,
      issueLogs,
    })
    : null;

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest continuity</p>
          <p className="mt-3 text-sm font-medium text-text-primary">Follow one guest across arrivals, issue decisions, and staffing handoffs.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">This is the thread that lets someone understand what happened to one guest without bouncing between the queue, the issue log, and the staffing notes.</p>
        </div>
        {activeGuest && (
          <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
            {continuity?.touchedEventIds.length ?? 0} touched moments
          </span>
        )}
      </div>
      {!activeGuest || !continuity ? (
        <p className="mt-4 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">Choose a guest in the check-in queue or issue desk to follow their continuity trail.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/50 bg-surface-subtle/20 px-3 py-2">
            <p className="text-[11px] font-medium text-text-primary">{activeGuest.name}</p>
            <p className="mt-1 text-[11px] text-text-secondary">{activeGuest.rsvp_status} · {continuity.relatedIssues.length} related issues</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-primary">Event movement</p>
            <div className="mt-2 space-y-2">
              {continuity.moments.length === 0 ? (
                <p className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No event-moment history is linked to this guest yet.</p>
              ) : continuity.moments.map((moment) => (
                <div key={moment.eventId} className="rounded-xl border border-border/50 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-text-primary">{moment.eventName}</p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {moment.checkedInAt ? `Checked in ${new Date(moment.checkedInAt).toLocaleString()}` : 'Not checked in yet'}
                        {moment.tableName ? ` · ${moment.tableName}` : ''}
                      </p>
                    </div>
                    {moment.handoffStatus && (
                      <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
                        {formatHandoffStatus(moment.handoffStatus)}
                      </span>
                    )}
                  </div>
                  {(moment.handoffNote || moment.issueCount > 0) && (
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      {moment.issueCount > 0 ? `${moment.issueCount} issue ${moment.issueCount === 1 ? 'touchpoint' : 'touchpoints'}` : ''}
                      {moment.issueCount > 0 && moment.handoffNote ? ' · ' : ''}
                      {moment.handoffNote ?? ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-primary">Issue trail</p>
            <div className="mt-2 space-y-2">
              {continuity.relatedIssues.length === 0 ? (
                <p className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No issue trail is linked to this guest yet.</p>
              ) : continuity.relatedIssues.slice(0, 5).map((issue) => {
                const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
                return (
                  <button
                  key={issue.id}
                  type="button"
                  data-testid={`coordinator-continuity-issue-${issue.id}`}
                  onClick={() => onSelectIssue(issue.id)}
                  className="w-full rounded-xl border border-border/50 bg-white px-3 py-3 text-left"
                >
                    <p className="text-[11px] font-medium text-text-primary">{issue.title}</p>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {issueTypeLabel(issue.issue_type)} · {formatIssueStatus(issue.status)}
                      {metadata.incident_owner ? ` · Owner: ${metadata.incident_owner}` : ''}
                    </p>
                    {(metadata.next_action || metadata.resolved_outcome) && (
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        {metadata.next_action ?? metadata.resolved_outcome}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CoordinatorShiftSnapshotPanelProps {
  onCopySnapshot: () => void;
  onPrintSnapshot: () => void;
  snapshotDetail: string;
  snapshotCopyNotice: 'copied' | 'downloaded' | null;
  copyingSnapshot: boolean;
}

export function CoordinatorShiftSnapshotPanel({
  onCopySnapshot,
  onPrintSnapshot,
  snapshotCopyNotice,
  copyingSnapshot,
  snapshotDetail,
}: CoordinatorShiftSnapshotPanelProps) {
  return (
    <div className="rounded-[20px] border border-border-subtle bg-white p-4 shadow-none">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Shift snapshot</p>
          <p className="mt-3 text-sm font-medium text-text-primary">Hand the next coordinator a clean unresolved-work packet.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">Use this when someone else needs to step in fast without rebuilding the story by hand.</p>
          <p className="mt-2 text-[11px] text-text-tertiary">{snapshotDetail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="coordinator-shift-snapshot-copy"
            onClick={onCopySnapshot}
            disabled={copyingSnapshot}
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary"
          >
            {copyingSnapshot
              ? 'Copying snapshot...'
              : snapshotCopyNotice === 'downloaded'
                ? 'Downloaded shift snapshot'
                : snapshotCopyNotice === 'copied'
                  ? 'Copied shift snapshot'
                  : 'Copy snapshot'}
          </button>
          <button
            type="button"
            data-testid="coordinator-shift-snapshot-print"
            onClick={onPrintSnapshot}
            className="rounded-xl border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary"
          >
            Print snapshot
          </button>
        </div>
      </div>
    </div>
  );
}

export interface CoordinatorQnaPanelProps {
  activeQnaDraftStateLabel: string;
  activeQnaId: string | null;
  activeQnaItem: {
    id: string;
    question: string;
    status: 'new' | 'answered';
    answer?: string | null;
  } | null;
  canEditQna: boolean;
  filteredQnaItems: Array<{
    id: string;
    question: string;
    status: 'new' | 'answered';
    answer?: string | null;
  }>;
  focusCoordinatorQnaLane: () => void;
  focusFirstCoordinatorOpenQna: () => void;
  focusNextCoordinatorQna: () => void;
  onAddQnaItem: () => void;
  onChangeDraftAnswer: (id: string, value: string) => void;
  onChangeQnaInput: (value: string) => void;
  onSaveQnaAnswer: (id: string) => void;
  onSelectQna: (id: string) => void;
  onSetQnaFilter: (filter: CoordinatorQnaFilter) => void;
  panelFocus: 'alerting' | 'check-in' | 'timeline' | 'qna' | null;
  qnaBoard: CoordinatorQnaBoard;
  qnaBoardTargetId: string | null;
  qnaCounts: {
    open: number;
    answered: number;
  };
  qnaDraftAnswers: Record<string, string>;
  qnaFilter: CoordinatorQnaFilter;
  qnaInput: string;
  qnaItemsCount: number;
  qnaTargetState: CoordinatorQnaTargetState;
}

export function CoordinatorQnaPanel({
  activeQnaDraftStateLabel,
  activeQnaId,
  activeQnaItem,
  canEditQna,
  filteredQnaItems,
  focusCoordinatorQnaLane,
  focusFirstCoordinatorOpenQna,
  focusNextCoordinatorQna,
  onAddQnaItem,
  onChangeDraftAnswer,
  onChangeQnaInput,
  onSaveQnaAnswer,
  onSelectQna,
  onSetQnaFilter,
  panelFocus,
  qnaBoard,
  qnaBoardTargetId,
  qnaCounts,
  qnaDraftAnswers,
  qnaFilter,
  qnaInput,
  qnaItemsCount,
  qnaTargetState,
}: CoordinatorQnaPanelProps) {
  return (
    <div className="border-t border-border/60 pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest questions</p>
          <p className="mt-2 text-sm font-medium text-text-primary">Keep live guest questions answerable without leaving the floor.{panelFocus === 'qna' ? ' · focus' : ''}{activeQnaId ? ` · ${getCoordinatorActiveTargetLabel('qna')}` : ''}{qnaTargetState.label ? ` · ${qnaTargetState.label}` : ''}</p>
        </div>
        <p className="text-[11px] text-text-tertiary">{qnaCounts.open} open · {qnaCounts.answered} answered</p>
      </div>
      <fieldset disabled={!canEditQna}>
        <div className="mb-2 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-primary">Q&A board</p>
              <p className="mt-1 text-[11px] text-text-secondary">Focused · {qnaBoard.activeLabel}</p>
              <p className="text-[11px] text-text-secondary">Next up · {qnaBoard.nextLabel}</p>
            </div>
            <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${qnaBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : qnaBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
              {qnaBoard.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Backlog</p>
              <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.backlogLabel}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Focused draft</p>
              <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.draftLabel}</p>
            </div>
          </div>
        </div>
        {activeQnaItem && (
          <div className="mb-2 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Focused question</p>
                <p className="mt-1 text-sm text-text-primary">{activeQnaItem.question}</p>
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {activeQnaItem.status === 'answered' ? 'Answered' : 'Needs answer'} · {activeQnaDraftStateLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {qnaBoardTargetId && qnaBoardTargetId !== activeQnaItem.id && (
                  <button
                    type="button"
                    onClick={() => {
                      focusCoordinatorQnaLane();
                      onSetQnaFilter('open');
                      onSelectQna(qnaBoardTargetId);
                    }}
                    className="rounded-xl border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                  >
                    Jump to suggested question
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    focusCoordinatorQnaLane();
                    onSelectQna(activeQnaItem.id);
                    onSaveQnaAnswer(activeQnaItem.id);
                  }}
                  className="rounded-xl border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
                >
                  {(qnaDraftAnswers[activeQnaItem.id] ?? activeQnaItem.answer ?? '').trim() ? 'Save focused reply' : 'Reopen focused question'}
                </button>
                {qnaCounts.open > 0 && (
                  <button
                    type="button"
                    onClick={focusNextCoordinatorQna}
                    className="rounded-xl border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                  >
                    Open next question
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mb-2 flex gap-2">
          <Input
            value={qnaInput}
            onChange={(e) => { focusCoordinatorQnaLane(); onChangeQnaInput(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return;
              e.preventDefault();
              if (qnaInput.trim()) {
                onAddQnaItem();
                return;
              }
              focusFirstCoordinatorOpenQna();
            }}
            placeholder="Add a guest question"
          />
          <button onClick={onAddQnaItem} className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-text-secondary disabled:opacity-40">Add question</button>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              focusCoordinatorQnaLane();
              onSetQnaFilter('open');
              if (!activeQnaId && qnaBoardTargetId) onSelectQna(qnaBoardTargetId);
            }}
            className={`rounded-xl border px-2.5 py-1 text-[11px] ${qnaFilter === 'open' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Open only · {qnaCounts.open}
          </button>
          <button
            type="button"
            onClick={() => { focusCoordinatorQnaLane(); onSetQnaFilter('answered'); }}
            className={`rounded-xl border px-2.5 py-1 text-[11px] ${qnaFilter === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Answered · {qnaCounts.answered}
          </button>
          <button
            type="button"
            onClick={() => { focusCoordinatorQnaLane(); onSetQnaFilter('all'); }}
            className={`rounded-xl border px-2.5 py-1 text-[11px] ${qnaFilter === 'all' ? 'border-border/70 bg-surface-subtle/40 text-text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            All · {qnaItemsCount}
          </button>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-auto">
          {filteredQnaItems.length === 0 ? (
            <p className="text-xs text-text-tertiary">No guest questions match this triage view right now.</p>
          ) : (
            filteredQnaItems.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className={`text-xs border rounded-xl px-2.5 py-3 space-y-2 cursor-pointer ${activeQnaId === item.id ? 'border-primary/40 ring-2 ring-primary/10 bg-primary/5' : 'border-border/50 bg-white'}`}
                onClick={() => {
                  focusCoordinatorQnaLane();
                  onSelectQna(item.id);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-text-secondary">{item.question}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {qnaBoardTargetId === item.id && (
                        <span className={`rounded-xl border px-2 py-0.5 whitespace-nowrap ${qnaTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                          {qnaTargetState.isBoardTargetActive ? 'Suggested question in progress' : 'Suggested question'}
                        </span>
                      )}
                      {activeQnaId === item.id && qnaBoardTargetId !== item.id && (
                        <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-0.5 whitespace-nowrap text-primary">
                          Selected question
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-xl border px-2 py-0.5 whitespace-nowrap ${item.status === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border-subtle bg-surface-subtle text-text-secondary'}`}>
                    {item.status === 'answered' ? 'Answered' : 'New'}
                  </span>
                </div>
                <Textarea
                  value={qnaDraftAnswers[item.id] ?? item.answer ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    focusCoordinatorQnaLane();
                    onChangeDraftAnswer(item.id, e.target.value);
                    onSelectQna(item.id);
                  }}
                  rows={2}
                  placeholder="Add the answer the coordinator should use"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-text-tertiary">
                    {getCoordinatorQnaDraftStateLabel({ draftAnswer: qnaDraftAnswers[item.id] ?? item.answer ?? '', savedAnswer: item.answer })}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusCoordinatorQnaLane();
                      onSelectQna(item.id);
                      onSaveQnaAnswer(item.id);
                    }}
                    className="rounded-xl border border-border bg-white px-2.5 py-1 text-text-secondary disabled:opacity-40"
                  >
                    {(qnaDraftAnswers[item.id] ?? item.answer ?? '').trim() ? 'Save answer' : 'Mark unresolved'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </fieldset>
    </div>
  );
}

export interface CoordinatorHelperAccessPanelProps {
  coordinatorRole: PlannerAccessRole;
  roleBoard: CoordinatorRoleBoard;
  roleCapabilities: CoordinatorRoleCapability[];
}

export function CoordinatorHelperAccessPanel({
  coordinatorRole,
  roleBoard,
  roleCapabilities,
}: CoordinatorHelperAccessPanelProps) {
  const roleDescription = coordinatorRole === 'viewer'
    ? 'Read-only visibility for day-of coordination.'
    : coordinatorRole === 'coordinator'
      ? 'Can help with event-day updates and guest flow.'
      : 'Broader planner access with day-of controls.';
  const roleBadge = coordinatorRole === 'viewer'
    ? 'Read only'
    : coordinatorRole === 'coordinator'
      ? 'Coordinator helper'
      : 'Planner helper';
  const roleBadgeClassName = coordinatorRole === 'viewer'
    ? 'border-border bg-surface-subtle text-text-tertiary'
    : coordinatorRole === 'coordinator'
      ? 'border-primary/20 bg-primary/5 text-primary'
      : 'border-border-subtle bg-accent-light text-primary';
  const roleBoardToneClassName = roleBoard.tone === 'ready'
    ? 'border-primary/20 bg-primary/5 text-primary'
    : roleBoard.tone === 'warning'
      ? 'border-primary/20 bg-accent-light text-primary'
      : 'border-border bg-white text-text-tertiary';

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white px-3 py-3 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Day-of helper access</p>
          <p className="mt-3 text-sm font-medium text-text-primary">See exactly what this helper can do before the day gets busy.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">{roleDescription}</p>
        </div>
        <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${roleBadgeClassName}`}>
          {roleBadge}
        </span>
      </div>
      <div className="mt-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Helper role</p>
            <p className="mt-1 text-[11px] text-text-secondary">Mode · {roleBoard.modeLabel}</p>
            <p className="text-[11px] text-text-secondary">Enabled · {roleBoard.enabledLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${roleBoardToneClassName}`}>
            {roleBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Blocked here</p>
            <p className="mt-1 text-[11px] text-text-primary">{roleBoard.blockedLabel}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Operating note</p>
            <p className="mt-1 text-[11px] text-text-primary">{roleBoard.guidanceLabel}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {roleCapabilities.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border px-3 py-3 ${item.enabled ? 'border-primary/20 bg-primary/[0.03]' : 'border-border/50 bg-surface-subtle/25'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
              <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${item.enabled ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                {item.enabled ? 'Enabled' : 'Blocked'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-text-secondary">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CoordinatorDayOfSummaryPanelProps {
  alertOverrideBadge: string;
  alertOverrideCurrentLabel: string | null;
  alertOverrideTargetLabel: string | null;
  commandBoard: CoordinatorCommandBoard;
  commandDeckItems: CoordinatorCommandDeckItem[];
  commandModeGuidance: string;
  commandModeLabel: string;
  commandSource: string | null;
  commandSummaryItems: CoordinatorCommandSummaryItem[];
  executionBoard: CoordinatorExecutionBoard;
  manualOverrideActionLabel: string | null;
  manualOverrideBadge: string;
  manualOverrideCurrentTargetLabel: string | null;
  manualOverrideTargetLabel: string | null;
  navigationBoard: CoordinatorNavigationBoard;
  neutralFocusReason: string | null;
  onCommandClick: (label: CoordinatorCommandSummaryLabel) => void;
  onOpsSnapshotClick: (key: CoordinatorOpsSnapshotKey) => void;
  onPrimaryAction: () => void;
  onReturnToBoard: () => void;
  onReturnToBoardTarget: () => void;
  onRevisitNeutralFocus: () => void;
  onStablePromptClick: () => void;
  opsSnapshotItems: CoordinatorOpsSnapshotItem[];
  overrideBadgeToneClassName: string;
  hasPanelFocus: boolean;
  primaryAction: CoordinatorPrimaryAction;
  primaryActionBoard: CoordinatorPrimaryActionBoard;
  priorityCommandCta: string;
  priorityCommandLabel: CoordinatorCommandSummaryLabel;
  priorityCommandReason: string;
  priorityCommandTargetReason: string | null;
  stablePrompt: CoordinatorStablePrompt;
  stablePromptBadgeToneClassName: string;
  stablePromptStateToneClassName: string;
  stablePromptTargetLabel: string | null;
  standingPromptBadge: string;
  standingPromptCopy: string;
  standingPromptMode: 'full' | 'secondary';
  standingPromptStateLabel: string | null;
  summaryDisplayCue: CoordinatorSummaryDisplayCue;
  summaryFeedbackBadge: string | null;
  summaryFeedbackBadgeToneClassName: string;
  summaryFeedbackCopy: string | null;
  summaryFeedbackLayout: 'compact' | 'standard' | 'prominent' | null;
  summaryFeedbackTone: { badge: string; containerClassName: string } | null;
}

const boardToneClassName = (tone: 'ready' | 'warning' | 'neutral') => (
  tone === 'ready'
    ? 'border-primary/20 bg-primary/5 text-primary'
    : tone === 'warning'
      ? 'border-primary/20 bg-accent-light text-primary'
      : 'border-border bg-white text-text-tertiary'
);

export function CoordinatorDayOfSummaryPanel({
  alertOverrideBadge,
  alertOverrideCurrentLabel,
  alertOverrideTargetLabel,
  commandBoard,
  commandDeckItems,
  commandModeGuidance,
  commandModeLabel,
  commandSource,
  commandSummaryItems,
  executionBoard,
  manualOverrideActionLabel,
  manualOverrideBadge,
  manualOverrideCurrentTargetLabel,
  manualOverrideTargetLabel,
  navigationBoard,
  neutralFocusReason,
  onCommandClick,
  onOpsSnapshotClick,
  onPrimaryAction,
  onReturnToBoard,
  onReturnToBoardTarget,
  onRevisitNeutralFocus,
  onStablePromptClick,
  opsSnapshotItems,
  overrideBadgeToneClassName,
  hasPanelFocus,
  primaryAction,
  primaryActionBoard,
  priorityCommandCta,
  priorityCommandLabel,
  priorityCommandReason,
  priorityCommandTargetReason,
  stablePrompt,
  stablePromptBadgeToneClassName,
  stablePromptStateToneClassName,
  stablePromptTargetLabel,
  standingPromptBadge,
  standingPromptCopy,
  standingPromptMode,
  standingPromptStateLabel,
  summaryDisplayCue,
  summaryFeedbackBadge,
  summaryFeedbackBadgeToneClassName,
  summaryFeedbackCopy,
  summaryFeedbackLayout,
  summaryFeedbackTone,
}: CoordinatorDayOfSummaryPanelProps) {
  const summaryFeedbackPaddingClassName = summaryFeedbackLayout === 'prominent'
    ? 'py-1.5 shadow-none'
    : summaryFeedbackLayout === 'standard'
      ? 'py-1'
      : 'py-0.5 opacity-90';

  return (
    <div className="rounded-[20px] border border-border-subtle bg-white px-3 py-3 shadow-none">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Day-of summary</p>
          <p className="mt-2 text-sm font-medium text-text-primary">Use this as the command layer for what matters right now.</p>
        </div>
        <p className="text-[11px] text-text-tertiary">What needs attention right now</p>
      </div>

      {summaryDisplayCue ? (
        <div className="mb-3 space-y-2">
          <div className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <p className="text-[10px] font-medium text-text-tertiary">Current signal</p>
            {summaryDisplayCue.kind === 'feedback' && summaryFeedbackTone && (
              <div className={`mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border px-2.5 text-[11px] ${summaryFeedbackTone.containerClassName} ${summaryFeedbackPaddingClassName}`}>
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${summaryFeedbackBadgeToneClassName}`}>{summaryFeedbackBadge ?? summaryFeedbackTone.badge}</span>
                <span>{summaryFeedbackCopy ?? summaryDisplayCue.feedback.label}</span>
              </div>
            )}
            {summaryDisplayCue.kind === 'alert-override' && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary">
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{alertOverrideBadge}</span>
                <span>{summaryDisplayCue.label}</span>
                {alertOverrideTargetLabel && <span className="text-primary/80">{alertOverrideTargetLabel}</span>}
                {alertOverrideCurrentLabel && <span className="text-text-secondary">{alertOverrideCurrentLabel}</span>}
              </div>
            )}
            {summaryDisplayCue.kind === 'manual-override' && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary">
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{manualOverrideBadge}</span>
                <span>{summaryDisplayCue.label}</span>
                {manualOverrideTargetLabel && <span className="text-primary/80">{manualOverrideTargetLabel}</span>}
                {manualOverrideCurrentTargetLabel && <span className="text-text-secondary">{manualOverrideCurrentTargetLabel}</span>}
                {manualOverrideActionLabel && (
                  <button
                    type="button"
                    onClick={onReturnToBoardTarget}
                    className="rounded-xl border border-border-subtle bg-white px-2 py-0.5 text-primary"
                  >
                    {manualOverrideActionLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <p className="text-[10px] font-medium text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
            <button
              type="button"
              onClick={onStablePromptClick}
              className={`mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
            >
              <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
              <span>{standingPromptMode === 'secondary' ? stablePrompt.badge : stablePrompt.label}</span>
              {standingPromptMode === 'full' && stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
              <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
          <p className="text-[10px] font-medium text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
          <button
            type="button"
            onClick={onStablePromptClick}
            className={`mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
          >
            <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
            <span>{standingPromptCopy}</span>
            {stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
            <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
          </button>
        </div>
      )}

      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Command mode</p>
            <p className="mt-2 text-[11px] font-medium text-text-primary">{commandModeLabel}</p>
            <p className="mt-1 text-[11px] text-text-secondary">{commandModeGuidance}</p>
            {!commandSource && neutralFocusReason && (
              <p className="mt-1 text-[10px] text-text-tertiary">{neutralFocusReason}</p>
            )}
            <p className="mt-1 text-[10px] text-text-tertiary">{primaryAction.title} — {primaryAction.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              {primaryAction.key === 'all-clear' ? 'Review next best action' : 'Open suggested action'}
            </button>
            {commandSource && (
              <button
                type="button"
                onClick={onReturnToBoard}
                className="rounded-xl border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
              >
                Return to summary
              </button>
            )}
            {!commandSource && hasPanelFocus && (
              <button
                type="button"
                onClick={onRevisitNeutralFocus}
                className="rounded-xl border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
              >
                Revisit focus
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Suggested action</p>
            <p className="mt-1 text-[11px] text-text-secondary">Destination · {primaryActionBoard.destinationLabel}</p>
            <p className="text-[11px] text-text-secondary">Follow-through · {primaryActionBoard.followThroughLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(primaryActionBoard.tone)}`}>
            {primaryActionBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">Action detail</p>
          <p className="mt-1 text-[11px] text-text-primary">{primaryActionBoard.detailLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Progress status</p>
            <p className="mt-1 text-[11px] text-text-secondary">Focus · {executionBoard.laneLabel}</p>
            <p className="text-[11px] text-text-secondary">Latest update · {executionBoard.lastMoveLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(executionBoard.tone)}`}>
            {executionBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">What it changes</p>
          <p className="mt-1 text-[11px] text-text-primary">{executionBoard.effectLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Navigation path</p>
            <p className="mt-1 text-[11px] text-text-secondary">Destination · {navigationBoard.destinationLabel}</p>
            <p className="text-[11px] text-text-secondary">Next stop · {navigationBoard.boardTargetLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(navigationBoard.tone)}`}>
            {navigationBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">Route mode</p>
          <p className="mt-1 text-[11px] text-text-primary">{navigationBoard.modeLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Next steps</p>
            <p className="mt-1 text-[11px] text-text-secondary">First · {commandBoard.firstActionLabel}</p>
            <p className="text-[11px] text-text-secondary">Then · {commandBoard.secondActionLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(commandBoard.tone)}`}>
            {commandBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Primary target</p>
            <p className="mt-1 text-[11px] text-text-primary">{commandBoard.firstTargetLabel}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Why now</p>
            <p className="mt-1 text-[11px] text-text-primary">{commandBoard.reasonLabel}</p>
          </div>
        </div>
      </div>

      <CoordinatorCommandDeckPanel
        commandDeckItems={commandDeckItems}
        commandSummaryItems={commandSummaryItems}
        opsSnapshotItems={opsSnapshotItems}
        priorityCommandCta={priorityCommandCta}
        priorityCommandLabel={priorityCommandLabel}
        priorityCommandReason={priorityCommandReason}
        priorityCommandTargetReason={priorityCommandTargetReason}
        onCommandClick={onCommandClick}
        onOpsSnapshotClick={onOpsSnapshotClick}
      />
    </div>
  );
}

export {
  CoordinatorCheckInQueuePanel,
  CoordinatorCommandDeckPanel,
  CoordinatorDayOfMessagePanel,
  CoordinatorTimelinePanel,
} from './CoordinatorCheckInPanels';
