import React from 'react';
import { Input, Textarea } from '../../../components/ui';
import { applyCoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestionApply';
import { getCoordinatorAlertSuggestionState } from '../../../lib/coordinatorAlertSuggestionState';
import type { CoordinatorAlertActivityBoard } from '../../../lib/coordinatorAlertActivityBoard';
import type { CoordinatorAlertBoard } from '../../../lib/coordinatorAlertBoard';
import type { CoordinatorAlertForm } from '../../../lib/coordinatorAlertFlow';
import type { CoordinatorAlertLogViewItem } from '../../../lib/coordinatorAlertLogView';
import type { CoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestions';
import type { CoordinatorAlertTargetCue } from '../../../lib/coordinatorAlertTargetCue';
import type { CoordinatorCheckInBoard } from '../../../lib/coordinatorCheckInBoard';
import type { CoordinatorCheckInFilter } from '../../../lib/coordinatorCheckInQueue';
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
import { getCoordinatorPrimaryTimelineAction } from '../../../lib/coordinatorTimelineActions';
import type { CoordinatorGuestDoorRoute, GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import { getCoordinatorActiveTargetLabel } from '../../../lib/coordinatorActiveTargetLabel';
import { formatCoordinatorEventDateTime } from '../coordinatorEventTime';
import type {
  AlertLog,
  AudienceOption,
  CoordinatorEventHandoff,
  CoordinatorIssueLog,
  CoordinatorIssueStatus,
  CoordinatorIssueType,
  CoordinatorRunnerTaskMode,
  CoordinatorRunnerTaskStatus,
  CoordinatorTableLite,
  EventLite,
  TimelineState,
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
        className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
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
        <div key={label} className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
          <p className="text-xs text-text-tertiary">{label}</p>
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
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-text-primary mb-2">Attention now</p>
      <p className="text-[11px] text-text-tertiary mb-2">This pulls together the live exceptions the coordinator should resolve first.</p>
      <div className="space-y-2">
        {liveIssues.length === 0 && correctionCues.length === 0 && (
          <div className="rounded-lg border border-border-subtle bg-accent-light px-3 py-2">
            <p className="text-sm font-medium text-primary">Board is clear right now</p>
            <p className="mt-1 text-xs text-text-secondary">No active escalations or recovery cues are waiting. Use the next helpful action when you want a fast cue.</p>
          </div>
        )}
        {liveIssues.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onEscalationClick(item)}
            className={`w-full rounded-lg border px-3 py-2 text-left ${item.tone === 'warning' ? 'border-primary/20 bg-accent-light' : item.tone === 'success' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/40'}`}
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
            className="w-full rounded-lg border border-primary/20 bg-accent-light px-3 py-2 text-left"
          >
            <p className="text-sm font-medium text-text-primary">{cue.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{cue.detail}</p>
            <p className="mt-1 text-[10px] text-text-tertiary/80">{getCoordinatorActionHint('correction')}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
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
        <a href="/dashboard/rsvp-board" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open RSVP board</a>
        <a href="/dashboard/seating-lookup" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open seating lookup</a>
        <a href="/dashboard/planning" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open planning</a>
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
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Staffing handoff</p>
          <p className="mt-1 text-[11px] text-text-secondary">{handoffCopy.detail}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">Final couple decisions stay with the couple when something needs approval.</p>
        </div>
        <span className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
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
            <div key={event.id} className="rounded-lg border border-border/60 bg-surface-subtle/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{event.event_name}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">{formatCoordinatorEventDateTime(event.start_time)}</p>
                </div>
                <select
                  value={handoff.handoff_status}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { handoff_status: eventTarget.target.value as CoordinatorEventHandoff['handoff_status'] })}
                  className="rounded-md border border-border bg-white px-2 py-1.5 text-[11px] text-text-secondary disabled:opacity-60"
                >
                  <option value="ready">Ready</option>
                  <option value="staffed">Staffed</option>
                  <option value="needs-decision">Needs decision</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  value={handoff.lead_name ?? ''}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { lead_name: eventTarget.target.value })}
                  placeholder="Lead"
                />
                <Input
                  value={handoff.support_name ?? ''}
                  disabled={!canEditHandoffs}
                  onChange={(eventTarget) => onChangeHandoff(event.id, { support_name: eventTarget.target.value })}
                  placeholder="Support"
                />
              </div>
              <Textarea
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
                    onClick={() => onSaveHandoff(event.id)}
                    disabled={handoffBusyEventId === event.id}
                    className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary disabled:opacity-40"
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
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Issue desk</p>
          <p className="mt-1 text-[11px] text-text-secondary">Keep seat changes, substitute guests, and manager calls in one persistent day-of thread.</p>
        </div>
        <span className="rounded-lg border border-border bg-white px-2 py-1 text-[10px] font-medium text-text-tertiary">
          {issueLogs.filter((item) => item.status !== 'resolved').length} open
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-lg border border-border/60 bg-surface-subtle/20 p-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onPrefillIssueType('seat-change')} disabled={!canEditIssues || !activeGuest} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Seat change</button>
            <button type="button" onClick={() => onPrefillIssueType('substitute-attendee')} disabled={!canEditIssues || !activeGuest} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Substitute</button>
            <button type="button" onClick={() => onPrefillIssueType('plus-one-swap')} disabled={!canEditIssues || !activeGuest} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Plus-one swap</button>
            <button type="button" onClick={() => onPrefillIssueType('manager-decision')} disabled={!canEditIssues || !activeGuest} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40">Manager note</button>
          </div>

          <div className="mt-3 rounded-md border border-border/50 bg-white px-3 py-2">
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
                value={issueDraft.issueType}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ issueType: eventTarget.target.value as CoordinatorIssueType })}
                className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
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
                value={issueDraft.status}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ status: eventTarget.target.value as CoordinatorIssueStatus })}
                className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
              >
                <option value="open">Open</option>
                <option value="working">Working</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-text-tertiary">Title</label>
              <Input
                value={issueDraft.title}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ title: eventTarget.target.value })}
                placeholder="What needs to happen next?"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Event</label>
              <select
                value={issueDraft.itineraryEventId ?? ''}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ itineraryEventId: eventTarget.target.value || null, tableId: null })}
                className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
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
                value={issueDraft.assignedTo}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ assignedTo: eventTarget.target.value })}
                placeholder="Lead or desk owner"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-tertiary">Owner</label>
              <Input
                value={issueDraft.incidentOwner}
                disabled={!canEditIssues}
                onChange={(eventTarget) => onDraftChange({ incidentOwner: eventTarget.target.value })}
                placeholder="Who is accountable for the final outcome?"
              />
            </div>
            <div className="md:col-span-2 rounded-md border border-border/50 bg-surface-subtle/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-primary">Incident ownership</p>
                  <p className="mt-1 text-[11px] text-text-secondary">Keep every issue anchored to a clear next move and a closeout note.</p>
                </div>
                <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issueDraft.status)}`}>
                  {issueDraft.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Next action</label>
                  <Input
                    value={issueDraft.nextAction}
                    disabled={!canEditIssues}
                    onChange={(eventTarget) => onDraftChange({ nextAction: eventTarget.target.value })}
                    placeholder="What should happen before this can move forward?"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Resolved outcome</label>
                  <Textarea
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
                        value={issueDraft.replacementName}
                        disabled={!canEditIssues}
                        onChange={(eventTarget) => onDraftChange({ replacementName: eventTarget.target.value })}
                        placeholder="Who is arriving in their place?"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-text-tertiary">Party size</label>
                      <Input
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
                    value={issueDraft.tableId ?? ''}
                    disabled={!canEditIssues || seatingTables.length === 0}
                    onChange={(eventTarget) => onDraftChange({ tableId: eventTarget.target.value || null })}
                    className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
                  >
                    <option value="">{seatingTables.length ? 'Keep current table' : 'No tables available for this event yet'}</option>
                    {seatingTables.map((table) => (
                      <option key={table.id} value={table.id}>{table.table_name ?? 'Unassigned'}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="md:col-span-2 rounded-md border border-border/50 bg-surface-subtle/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-primary">Runner and escort task</p>
                  <p className="mt-1 text-[11px] text-text-secondary">Use this when a guest movement needs someone to physically carry it through.</p>
                </div>
                {issueDraft.runnerTaskMode !== 'none' && (
                  <span className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
                    {runnerTaskModeLabel(issueDraft.runnerTaskMode)} · {runnerTaskStatusLabel(issueDraft.runnerTaskStatus)}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task type</label>
                  <select
                    value={issueDraft.runnerTaskMode}
                    disabled={!canEditIssues}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskMode: eventTarget.target.value as CoordinatorIssueDraftView['runnerTaskMode'] })}
                    className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
                  >
                    <option value="none">No movement task</option>
                    <option value="runner">Runner task</option>
                    <option value="escort">Escort task</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task status</label>
                  <select
                    value={issueDraft.runnerTaskStatus}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskStatus: eventTarget.target.value as CoordinatorRunnerTaskStatus })}
                    className="w-full rounded-md border border-border bg-white px-2 py-2 text-[11px] text-text-secondary disabled:opacity-60"
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
                    value={issueDraft.runnerTaskAssignee}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskAssignee: eventTarget.target.value })}
                    placeholder="Who is moving this guest?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-tertiary">Completion note</label>
                  <Input
                    value={issueDraft.runnerTaskCompletionNote}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskCompletionNote: eventTarget.target.value })}
                    placeholder="What should the team record once it lands?"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] text-text-tertiary">Task detail</label>
                  <Textarea
                    rows={2}
                    value={issueDraft.runnerTaskDetail}
                    disabled={!canEditIssues || issueDraft.runnerTaskMode === 'none'}
                    onChange={(eventTarget) => onDraftChange({ runnerTaskDetail: eventTarget.target.value })}
                    placeholder="Example: Escort the household from cocktails to Table 8 and confirm the chair swap."
                  />
                </div>
                {selectedIssueMetadata?.runner_task?.completion_log.length ? (
                  <div className="md:col-span-2 rounded-md border border-border/50 bg-white px-3 py-2">
                    <p className="text-[10px] font-medium text-text-tertiary">Completion log</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedIssueMetadata.runner_task.completion_log.slice().reverse().map((entry) => (
                        <div key={`${entry.completed_at}-${entry.assignee ?? 'open'}`} className="rounded-md border border-border/50 bg-surface-subtle/20 px-2.5 py-2 text-[11px] text-text-secondary">
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
                onClick={onSaveIssue}
                disabled={issueBusy || !activeGuest}
                className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary disabled:opacity-40"
              >
                {issueBusy ? 'Saving…' : selectedIssueId ? 'Update issue' : 'Save issue'}
              </button>
            )}
            <button
              type="button"
              onClick={onClearIssueDraft}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary"
            >
              Clear
            </button>
            <a href="/dashboard/seating-lookup" className="rounded-md border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary">Open seating lookup</a>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-surface-subtle/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-text-primary">Recent issue history</p>
            <p className="text-[11px] text-text-tertiary">{issueLogs.length} logged</p>
          </div>
          <div className="mt-3 space-y-2">
            {issueLogs.length === 0 && (
              <p className="rounded-md border border-border/50 bg-white px-3 py-2 text-[11px] text-text-tertiary">No saved day-of issue history yet.</p>
            )}
            {issueLogs.slice(0, 8).map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => onSelectIssue(issue.id)}
                className={`w-full rounded-md border px-3 py-2 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
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
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issue.status)}`}>
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
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Runner board</p>
          <p className="mt-1 text-[11px] text-text-secondary">Keep guest movement tasks visible from assignment through completion.</p>
        </div>
        <span className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
          {openTasks.length} active
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[11px] font-medium text-text-primary">Active tasks</p>
          <div className="mt-2 space-y-2">
            {openTasks.length === 0 ? (
              <p className="rounded-md border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No runner or escort tasks are active right now.</p>
            ) : openTasks.map((issue) => {
              const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
              const runnerTask = metadata.runner_task;
              if (!runnerTask) return null;
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onSelectIssue(issue.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
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
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${issueStatusClassName(issue.status)}`}>
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
              <p className="rounded-md border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No completed movement tasks logged yet.</p>
            ) : completedTasks.slice(0, 4).map((issue) => {
              const runnerTask = readCoordinatorIssueOperationalMetadata(issue.metadata).runner_task;
              if (!runnerTask) return null;
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onSelectIssue(issue.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${selectedIssueId === issue.id ? 'border-primary/25 bg-primary/5' : 'border-border/50 bg-white'}`}
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
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Guest continuity</p>
          <p className="mt-1 text-[11px] text-text-secondary">Follow one guest across event arrivals, issue decisions, and staffing handoffs.</p>
        </div>
        {activeGuest && (
          <span className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
            {continuity?.touchedEventIds.length ?? 0} touched moments
          </span>
        )}
      </div>
      {!activeGuest || !continuity ? (
        <p className="mt-4 rounded-md border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">Choose a guest in the check-in queue or issue desk to follow their continuity trail.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-border/50 bg-surface-subtle/20 px-3 py-2">
            <p className="text-[11px] font-medium text-text-primary">{activeGuest.name}</p>
            <p className="mt-1 text-[11px] text-text-secondary">{activeGuest.rsvp_status} · {continuity.relatedIssues.length} related issues</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-primary">Event movement</p>
            <div className="mt-2 space-y-2">
              {continuity.moments.length === 0 ? (
                <p className="rounded-md border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No event-moment history is linked to this guest yet.</p>
              ) : continuity.moments.map((moment) => (
                <div key={moment.eventId} className="rounded-md border border-border/50 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-text-primary">{moment.eventName}</p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {moment.checkedInAt ? `Checked in ${new Date(moment.checkedInAt).toLocaleString()}` : 'Not checked in yet'}
                        {moment.tableName ? ` · ${moment.tableName}` : ''}
                      </p>
                    </div>
                    {moment.handoffStatus && (
                      <span className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
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
                <p className="rounded-md border border-border/50 bg-surface-subtle/25 px-3 py-2 text-[11px] text-text-tertiary">No issue trail is linked to this guest yet.</p>
              ) : continuity.relatedIssues.slice(0, 5).map((issue) => {
                const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
                return (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => onSelectIssue(issue.id)}
                    className="w-full rounded-md border border-border/50 bg-white px-3 py-2 text-left"
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
}

export function CoordinatorShiftSnapshotPanel({
  onCopySnapshot,
  onPrintSnapshot,
  snapshotDetail,
}: CoordinatorShiftSnapshotPanelProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Shift snapshot</p>
          <p className="mt-1 text-[11px] text-text-secondary">Hand the next coordinator a clean unresolved-work packet without rebuilding the story by hand.</p>
          <p className="mt-1 text-[11px] text-text-tertiary">{snapshotDetail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopySnapshot}
            className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary"
          >
            Copy snapshot
          </button>
          <button
            type="button"
            onClick={onPrintSnapshot}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-[11px] text-text-secondary"
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
        <p className="text-sm font-medium text-text-primary">Guest questions{panelFocus === 'qna' ? ' · focus' : ''}{activeQnaId ? ` · ${getCoordinatorActiveTargetLabel('qna')}` : ''}{qnaTargetState.label ? ` · ${qnaTargetState.label}` : ''}</p>
        <p className="text-[11px] text-text-tertiary">{qnaCounts.open} open · {qnaCounts.answered} answered</p>
      </div>
      <fieldset disabled={!canEditQna}>
        <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-primary">Q&A board</p>
              <p className="mt-1 text-[11px] text-text-secondary">Focused · {qnaBoard.activeLabel}</p>
              <p className="text-[11px] text-text-secondary">Next up · {qnaBoard.nextLabel}</p>
            </div>
            <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${qnaBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : qnaBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
              {qnaBoard.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Backlog</p>
              <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.backlogLabel}</p>
            </div>
            <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Focused draft</p>
              <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.draftLabel}</p>
            </div>
          </div>
        </div>
        {activeQnaItem && (
          <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
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
                    className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
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
                  className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
                >
                  {(qnaDraftAnswers[activeQnaItem.id] ?? activeQnaItem.answer ?? '').trim() ? 'Save focused reply' : 'Reopen focused question'}
                </button>
                {qnaCounts.open > 0 && (
                  <button
                    type="button"
                    onClick={focusNextCoordinatorQna}
                    className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
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
          <button onClick={onAddQnaItem} className="px-3 py-2 text-xs rounded-md border border-border bg-white text-text-secondary disabled:opacity-40">Add question</button>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              focusCoordinatorQnaLane();
              onSetQnaFilter('open');
              if (!activeQnaId && qnaBoardTargetId) onSelectQna(qnaBoardTargetId);
            }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'open' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Open only · {qnaCounts.open}
          </button>
          <button
            type="button"
            onClick={() => { focusCoordinatorQnaLane(); onSetQnaFilter('answered'); }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Answered · {qnaCounts.answered}
          </button>
          <button
            type="button"
            onClick={() => { focusCoordinatorQnaLane(); onSetQnaFilter('all'); }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'all' ? 'border-border/70 bg-surface-subtle/40 text-text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
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
                className={`text-xs border rounded-md px-2.5 py-2 space-y-2 cursor-pointer ${activeQnaId === item.id ? 'border-primary/40 ring-2 ring-primary/10 bg-primary/5' : 'border-border/50'}`}
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
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${qnaTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                          {qnaTargetState.isBoardTargetActive ? 'Suggested question in progress' : 'Suggested question'}
                        </span>
                      )}
                      {activeQnaId === item.id && qnaBoardTargetId !== item.id && (
                        <span className="px-2 py-0.5 rounded border whitespace-nowrap border-primary/20 bg-primary/5 text-primary">
                          Selected question
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${item.status === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border-subtle bg-surface-subtle text-text-secondary'}`}>
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
                    className="px-2.5 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-40"
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
    <div className="rounded-xl border border-border-subtle bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-text-primary">Day-of helper access</p>
          <p className="mt-1 text-[11px] text-text-tertiary">{roleDescription}</p>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${roleBadgeClassName}`}>
          {roleBadge}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Helper role</p>
            <p className="mt-1 text-[11px] text-text-secondary">Mode · {roleBoard.modeLabel}</p>
            <p className="text-[11px] text-text-secondary">Enabled · {roleBoard.enabledLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${roleBoardToneClassName}`}>
            {roleBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Blocked here</p>
            <p className="mt-1 text-[11px] text-text-primary">{roleBoard.blockedLabel}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
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
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${item.enabled ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
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
    ? 'py-1.5 shadow-sm'
    : summaryFeedbackLayout === 'standard'
      ? 'py-1'
      : 'py-0.5 opacity-90';

  return (
    <div className="rounded-xl border border-border-subtle bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-medium text-text-primary">Day-of summary</p>
        <p className="text-[11px] text-text-tertiary">What needs attention right now</p>
      </div>

      {summaryDisplayCue ? (
        <div className="mb-3 space-y-2">
          <div>
            <p className="text-[10px] font-medium text-text-tertiary">Current signal</p>
            {summaryDisplayCue.kind === 'feedback' && summaryFeedbackTone && (
              <div className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-lg border px-2.5 text-[11px] ${summaryFeedbackTone.containerClassName} ${summaryFeedbackPaddingClassName}`}>
                <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${summaryFeedbackBadgeToneClassName}`}>{summaryFeedbackBadge ?? summaryFeedbackTone.badge}</span>
                <span>{summaryFeedbackCopy ?? summaryDisplayCue.feedback.label}</span>
              </div>
            )}
            {summaryDisplayCue.kind === 'alert-override' && (
              <div className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary">
                <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{alertOverrideBadge}</span>
                <span>{summaryDisplayCue.label}</span>
                {alertOverrideTargetLabel && <span className="text-primary/80">{alertOverrideTargetLabel}</span>}
                {alertOverrideCurrentLabel && <span className="text-text-secondary">{alertOverrideCurrentLabel}</span>}
              </div>
            )}
            {summaryDisplayCue.kind === 'manual-override' && (
              <div className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary">
                <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{manualOverrideBadge}</span>
                <span>{summaryDisplayCue.label}</span>
                {manualOverrideTargetLabel && <span className="text-primary/80">{manualOverrideTargetLabel}</span>}
                {manualOverrideCurrentTargetLabel && <span className="text-text-secondary">{manualOverrideCurrentTargetLabel}</span>}
                {manualOverrideActionLabel && (
                  <button
                    type="button"
                    onClick={onReturnToBoardTarget}
                    className="rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-primary"
                  >
                    {manualOverrideActionLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-medium text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
            <button
              type="button"
              onClick={onStablePromptClick}
              className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
            >
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
              <span>{standingPromptMode === 'secondary' ? stablePrompt.badge : stablePrompt.label}</span>
              {standingPromptMode === 'full' && stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
          <button
            type="button"
            onClick={onStablePromptClick}
            className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
          >
            <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
            <span>{standingPromptCopy}</span>
            {stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
            <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
          </button>
        </div>
      )}

      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium text-text-primary">{commandModeLabel}</p>
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
              className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              {primaryAction.key === 'all-clear' ? 'Review next best action' : 'Open suggested action'}
            </button>
            {commandSource && (
              <button
                type="button"
                onClick={onReturnToBoard}
                className="rounded-lg border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
              >
                Return to summary
              </button>
            )}
            {!commandSource && hasPanelFocus && (
              <button
                type="button"
                onClick={onRevisitNeutralFocus}
                className="rounded-lg border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
              >
                Revisit focus
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Suggested action</p>
            <p className="mt-1 text-[11px] text-text-secondary">Destination · {primaryActionBoard.destinationLabel}</p>
            <p className="text-[11px] text-text-secondary">Follow-through · {primaryActionBoard.followThroughLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${boardToneClassName(primaryActionBoard.tone)}`}>
            {primaryActionBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">Action detail</p>
          <p className="mt-1 text-[11px] text-text-primary">{primaryActionBoard.detailLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Progress status</p>
            <p className="mt-1 text-[11px] text-text-secondary">Focus · {executionBoard.laneLabel}</p>
            <p className="text-[11px] text-text-secondary">Latest update · {executionBoard.lastMoveLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${boardToneClassName(executionBoard.tone)}`}>
            {executionBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">What it changes</p>
          <p className="mt-1 text-[11px] text-text-primary">{executionBoard.effectLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Navigation path</p>
            <p className="mt-1 text-[11px] text-text-secondary">Destination · {navigationBoard.destinationLabel}</p>
            <p className="text-[11px] text-text-secondary">Next stop · {navigationBoard.boardTargetLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${boardToneClassName(navigationBoard.tone)}`}>
            {navigationBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
          <p className="text-[10px] text-text-tertiary">Route mode</p>
          <p className="mt-1 text-[11px] text-text-primary">{navigationBoard.modeLabel}</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Next steps</p>
            <p className="mt-1 text-[11px] text-text-secondary">First · {commandBoard.firstActionLabel}</p>
            <p className="text-[11px] text-text-secondary">Then · {commandBoard.secondActionLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${boardToneClassName(commandBoard.tone)}`}>
            {commandBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Primary target</p>
            <p className="mt-1 text-[11px] text-text-primary">{commandBoard.firstTargetLabel}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
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

export interface CoordinatorCheckInQueuePanelProps {
  activeGuestId: string | null;
  canCheckIn: boolean;
  canEditQna: boolean;
  checkInBoard: CoordinatorCheckInBoard;
  checkInEventName: string | null;
  checkInBoardTargetId: string | null;
  checkInBusyGuestId: string | null;
  checkInFilter: CoordinatorCheckInFilter;
  checkInQuery: string;
  checkInQueue: GuestLiteForCoordinator[];
  checkInReviewOnly: boolean;
  checkInStatusContext: CoordinatorDoorStatusContext;
  checkInTargetState: CoordinatorCheckInTargetState;
  checkInWatchCount: number;
  isFocused: boolean;
  nextArrivals: GuestLiteForCoordinator[];
  onActiveGuestCheckIn: () => void;
  onCheckInGuest: (guest: GuestLiteForCoordinator) => void;
  onEscalateDoorReview: (guest: GuestLiteForCoordinator) => void;
  onFocusFirstQueueGuest: () => void;
  onFocusLane: () => void;
  onReadyNowClick: () => void;
  onReviewOnlyClick: () => void;
  onRouteGuest: (guestId: string, route: CoordinatorGuestDoorRoute | null) => void;
  onRouteNoMatch: (route: CoordinatorGuestDoorRoute) => void;
  onSelectGuest: (guestId: string) => void;
  onSetFilter: (filter: CoordinatorCheckInFilter) => void;
  onSetQuery: (query: string) => void;
}

export function CoordinatorCheckInQueuePanel({
  activeGuestId,
  canCheckIn,
  canEditQna,
  checkInBoard,
  checkInEventName,
  checkInBoardTargetId,
  checkInBusyGuestId,
  checkInFilter,
  checkInQuery,
  checkInQueue,
  checkInReviewOnly,
  checkInStatusContext,
  checkInTargetState,
  checkInWatchCount,
  isFocused,
  nextArrivals,
  onActiveGuestCheckIn,
  onCheckInGuest,
  onEscalateDoorReview,
  onFocusFirstQueueGuest,
  onFocusLane,
  onReadyNowClick,
  onReviewOnlyClick,
  onRouteGuest,
  onRouteNoMatch,
  onSelectGuest,
  onSetFilter,
  onSetQuery,
}: CoordinatorCheckInQueuePanelProps) {
  return (
    <div className={`lg:col-span-2 overflow-hidden rounded-xl border bg-white shadow-sm ${isFocused ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border-subtle'}`}>
      <div className="px-4 py-3 border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Check-in queue</p>
            <p className="text-[11px] text-text-tertiary">Search arrivals fast and keep the live line moving.</p>
          </div>
          <p className="text-[11px] text-text-tertiary">{checkInQueue.length} shown · {checkInWatchCount} need review{checkInReviewOnly ? ' · review mode' : ''}{activeGuestId ? ' · Active guest' : ''}{checkInTargetState.label ? ` · ${checkInTargetState.label}` : ''}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-primary">{checkInBoard.eventLabel}</p>
              <p className="mt-1 text-[11px] text-text-secondary">{checkInBoard.eventProgressLabel}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Active · {checkInBoard.activeLabel}</p>
              <p className="text-[11px] text-text-secondary">Next ready · {checkInBoard.nextReadyLabel}</p>
            </div>
            <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${boardToneClassName(checkInBoard.tone)}`}>
              {checkInBoard.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Queue mix</p>
              <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.queueLabel}</p>
            </div>
            <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Review pressure</p>
              <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.reviewLabel}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={checkInQuery}
            onChange={(event) => {
              onFocusLane();
              onSetQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const activeGuest = checkInQueue.find((guest) => guest.id === activeGuestId) ?? checkInQueue[0];
              if (
                activeGuest
                && canCheckIn
                && !getCoordinatorEventCheckInAt(activeGuest, checkInStatusContext.currentEventId)
                && getCoordinatorDoorStatus(activeGuest, checkInStatusContext) !== 'watch'
              ) {
                onFocusLane();
                onSelectGuest(activeGuest.id);
                onCheckInGuest(activeGuest);
                return;
              }
              onFocusFirstQueueGuest();
            }}
            placeholder="Search guest name or RSVP status · Enter checks in the active ready guest"
          />
          <select
            value={checkInFilter}
            onChange={(event) => {
              onFocusLane();
              onSetFilter(event.target.value as CoordinatorCheckInFilter);
            }}
            className="sm:w-40 text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
          >
            <option value="arrivals">Arrivals</option>
            <option value="checked-in">Checked in</option>
            <option value="all">All guests</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReadyNowClick}
            className={`rounded-lg border px-2.5 py-1 text-[11px] ${!checkInReviewOnly && checkInFilter === 'arrivals' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Ready now{nextArrivals.length ? ` · ${nextArrivals.length}` : ''}
          </button>
          <button
            type="button"
            onClick={onReviewOnlyClick}
            className={`rounded-lg border px-2.5 py-1 text-[11px] ${checkInReviewOnly ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Review only{checkInWatchCount ? ` · ${checkInWatchCount}` : ''}
          </button>
          {activeGuestId && (
            <button
              type="button"
              onClick={onActiveGuestCheckIn}
              disabled={!canCheckIn || checkInBusyGuestId === activeGuestId || !(checkInQueue.find((guest) => guest.id === activeGuestId))}
              className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary disabled:opacity-40"
            >
              {checkInBusyGuestId === activeGuestId ? 'Updating…' : 'Check in active guest'}
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[60vh] overflow-auto divide-y divide-border-subtle/70">
        {checkInQueue.length === 0 && (
          <div className="px-4 py-4 space-y-3 text-xs text-text-tertiary">
            <p>No guests match this queue right now. Try a different filter or search to keep the door moving.</p>
            {checkInQuery.trim() && canEditQna && (
              <div className="rounded-lg border border-primary/20 bg-accent-light px-3 py-3">
                <p className="text-xs font-medium text-primary">No match for “{checkInQuery.trim()}”</p>
                <p className="mt-1 text-[11px] text-primary/80">Route the door issue without leaving coordinator mode.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onRouteNoMatch('walk-in')}
                    className="rounded-md border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary"
                  >
                    Route walk-in
                  </button>
                  <button
                    type="button"
                    onClick={() => onRouteNoMatch('help-desk')}
                    className="rounded-md border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary"
                  >
                    Send to help desk
                  </button>
                  <button
                    type="button"
                    onClick={() => onRouteNoMatch('manager-decision')}
                    className="rounded-md border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary"
                  >
                    Ask manager
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {checkInQueue.map((guest) => {
          const doorStatus = getCoordinatorDoorStatus(guest, checkInStatusContext);
          const eventCheckedInAt = getCoordinatorEventCheckInAt(guest, checkInStatusContext.currentEventId);
          const eventTableName = getCoordinatorEventTableName(guest, checkInStatusContext.currentEventId);
          const invitedToCurrentEvent = isCoordinatorGuestInvitedToCurrentEvent(guest, checkInStatusContext);
          const visibleExceptionStates = getCoordinatorDoorExceptionStates(guest, checkInStatusContext)
            .filter((state) => state !== 'already-checked-in')
            .slice(0, 3);
          return (
            <div
              key={guest.id}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer ${activeGuestId === guest.id ? 'bg-primary/5' : ''}`}
              onClick={() => {
                onFocusLane();
                onSelectGuest(guest.id);
              }}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-text-primary">{guest.name}</p>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${doorStatus === 'ready' ? 'border-border-subtle bg-accent-light text-primary' : doorStatus === 'watch' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-surface-subtle text-text-tertiary'}`}>
                    {getCoordinatorDoorStatusLabel(doorStatus)}
                  </span>
                  {checkInBoardTargetId === guest.id && (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${checkInTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                      {checkInTargetState.isBoardTargetActive ? 'Suggested guest in progress' : 'Suggested guest'}
                    </span>
                  )}
                  {activeGuestId === guest.id && checkInBoardTargetId !== guest.id && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] border border-primary/20 bg-primary/5 text-primary">
                      Selected guest
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">
                  RSVP {guest.rsvp_status}
                  {checkInEventName
                    ? eventCheckedInAt
                      ? ` · Arrived for ${checkInEventName}`
                      : invitedToCurrentEvent
                        ? ` · ${checkInEventName}${eventTableName ? ` · ${eventTableName}` : ''}`
                        : ` · ${checkInEventName} not invited`
                    : ''}
                  {doorStatus === 'watch' ? ' · Flag before check-in' : ''}
                </p>
                {visibleExceptionStates.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {visibleExceptionStates.map((state) => (
                      <span
                        key={`${guest.id}-${state}`}
                        className="rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] text-primary"
                      >
                        {getCoordinatorDoorExceptionStateLabel(state)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!eventCheckedInAt && canEditQna && (doorStatus === 'watch' || Boolean(guest.door_route)) && (
                  <select
                    value={guest.door_route ?? ''}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      onRouteGuest(guest.id, (event.target.value || null) as CoordinatorGuestDoorRoute | null);
                    }}
                    className="rounded-md border border-border bg-white px-2 py-1.5 text-[11px] text-text-secondary"
                  >
                    <option value="">No route</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="help-desk">Help desk</option>
                    <option value="manager-decision">Manager decision</option>
                  </select>
                )}
                {doorStatus === 'watch' && canEditQna && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEscalateDoorReview(guest);
                    }}
                    className="rounded-md border border-primary/20 bg-accent-light px-3 py-1.5 text-xs text-primary"
                  >
                    Escalate
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFocusLane();
                    onSelectGuest(guest.id);
                    if (canCheckIn) {
                      onCheckInGuest(guest);
                    }
                  }}
                  disabled={!canCheckIn || doorStatus === 'watch' || checkInBusyGuestId === guest.id}
                  className={`rounded-md border px-3 py-1.5 text-xs disabled:opacity-40 ${eventCheckedInAt ? 'border-primary/20 bg-accent-light text-primary' : doorStatus === 'watch' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary'}`}
                >
                  {checkInBusyGuestId === guest.id ? 'Updating…' : eventCheckedInAt ? 'Undo check-in' : doorStatus === 'watch' ? 'Review first' : 'Check in'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface CoordinatorTimelinePanelProps {
  activeTimelineEventId: string | null;
  canEditTimeline: boolean;
  events: EventLite[];
  liveEventId: string | null;
  panelFocus: string | null;
  timelineBoard: CoordinatorTimelineBoard;
  timelineBoardTargetId: string | null;
  timelineState: Record<string, TimelineState>;
  timelineTargetState: CoordinatorTimelineTargetState;
  upNextEventId: string | null;
  onFocusLane: () => void;
  onJumpToEvent: (eventId: string | null | undefined) => void;
  onRunAction: (eventId: string, nextState: TimelineState | null) => void;
  onSelectEvent: (eventId: string) => void;
  onSelectState: (eventId: string, nextState: TimelineState) => void;
}

export function CoordinatorTimelinePanel({
  activeTimelineEventId,
  canEditTimeline,
  events,
  liveEventId,
  panelFocus,
  timelineBoard,
  timelineBoardTargetId,
  timelineState,
  timelineTargetState,
  upNextEventId,
  onFocusLane,
  onJumpToEvent,
  onRunAction,
  onSelectEvent,
  onSelectState,
}: CoordinatorTimelinePanelProps) {
  const activeTimelineEvent = events.find((event) => event.id === activeTimelineEventId) ?? null;
  const activeTimelineEventState = activeTimelineEvent ? (timelineState[activeTimelineEvent.id] || 'up-next') : null;
  const activeTimelinePrimaryAction = activeTimelineEvent
    ? getCoordinatorPrimaryTimelineAction({
        event: activeTimelineEvent,
        liveEventId,
        upNextEventId,
        timelineState,
      })
    : null;
  const activeTimelineCorrectionAction = activeTimelineEventState
    ? getCoordinatorTimelineCorrectionAction(activeTimelineEventState)
    : null;

  return (
    <div>
      <p className="text-sm font-medium text-text-primary mb-2">Run-of-show timeline{panelFocus === 'timeline' ? ' · focus' : ''}{activeTimelineEventId ? ` · ${getCoordinatorActiveTargetLabel('timeline')}` : ''}{timelineTargetState.label ? ` · ${timelineTargetState.label}` : ''}</p>
      <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Timeline board</p>
            <p className="mt-1 text-[11px] text-text-secondary">Live · {timelineBoard.liveLabel}</p>
            <p className="text-[11px] text-text-secondary">Up next · {timelineBoard.upNextLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${timelineBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : timelineBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
            {timelineBoard.stateLabel}
          </span>
        </div>
        <p className="mt-3 text-[11px] text-text-tertiary">Progress · {timelineBoard.progressLabel}</p>
      </div>

      {activeTimelineEvent && (
        <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-text-primary">Focused event</p>
              <p className="text-sm text-text-primary">{activeTimelineEvent.event_name}</p>
              <p className="text-[11px] text-text-tertiary">
                {formatCoordinatorEventDateTime(activeTimelineEvent.start_time)}
                {activeTimelineEventState ? ` · ${activeTimelineEventState === 'live' ? 'Live now' : activeTimelineEventState === 'done' ? 'Completed' : 'Up next'}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTimelineCorrectionAction && (
                <button
                  type="button"
                  disabled={!canEditTimeline}
                  onClick={() => onRunAction(activeTimelineEvent.id, activeTimelineCorrectionAction.nextState)}
                  className="rounded border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary disabled:opacity-40"
                >
                  {activeTimelineCorrectionAction.label}
                </button>
              )}
              {activeTimelinePrimaryAction?.nextState && (
                <button
                  type="button"
                  disabled={!canEditTimeline}
                  onClick={() => onRunAction(activeTimelineEvent.id, activeTimelinePrimaryAction.nextState)}
                  className="text-[11px] px-2.5 py-1 rounded border border-primary/25 bg-primary/5 text-primary disabled:opacity-40"
                >
                  {activeTimelinePrimaryAction.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(liveEventId || upNextEventId || timelineBoardTargetId) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {liveEventId && (
            <button
              type="button"
              onClick={() => onJumpToEvent(liveEventId)}
              className={`text-[11px] px-2 py-1 rounded-lg border ${activeTimelineEventId === liveEventId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'}`}
            >
              Jump to live event
            </button>
          )}
          {upNextEventId && (
            <button
              type="button"
              onClick={() => onJumpToEvent(upNextEventId)}
              className={`rounded-lg border px-2 py-1 text-[11px] ${activeTimelineEventId === upNextEventId ? 'border-primary/20 bg-accent-light text-primary' : 'border-border-subtle bg-surface-subtle text-text-secondary hover:border-primary/35 hover:text-primary'}`}
            >
              Jump to up next
            </button>
          )}
          {timelineBoardTargetId && timelineBoardTargetId !== liveEventId && timelineBoardTargetId !== upNextEventId && (
            <button
              type="button"
              onClick={() => onJumpToEvent(timelineBoardTargetId)}
              className={`text-[11px] px-2 py-1 rounded-lg border ${activeTimelineEventId === timelineBoardTargetId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
            >
              Jump to suggested event
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-xs text-text-tertiary">No itinerary events yet.</p>
        ) : (
          events.map((event) => {
            const state = timelineState[event.id] || 'up-next';
            const isLive = event.id === liveEventId;
            const isUpNext = event.id === upNextEventId;
            const primaryAction = getCoordinatorPrimaryTimelineAction({
              event,
              liveEventId,
              upNextEventId,
              timelineState,
            });
            const correctionAction = getCoordinatorTimelineCorrectionAction(state);

            return (
              <div
                key={event.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 ${activeTimelineEventId === event.id ? 'ring-2 ring-primary/10 ' : ''}${isLive ? 'border-primary/35 bg-primary/5' : isUpNext ? 'border-primary/20 bg-accent-light' : 'border-border/50 bg-surface-subtle/40'}`}
                onClick={() => {
                  onFocusLane();
                  onSelectEvent(event.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-text-primary">{event.event_name}</p>
                      {timelineBoardTargetId === event.id && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${timelineTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                          {timelineTargetState.isBoardTargetActive ? 'Suggested event in progress' : isLive ? 'Suggested live event' : 'Suggested up-next event'}
                        </span>
                      )}
                      {activeTimelineEventId === event.id && timelineBoardTargetId !== event.id && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] border border-primary/20 bg-primary/5 text-primary">
                          Selected event
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-tertiary">{isLive ? 'Live now' : isUpNext ? 'Up next' : state === 'done' ? 'Completed' : 'Queued'}</p>
                  </div>
                  <select
                    value={state}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(selectEvent) => { if (canEditTimeline) onSelectState(event.id, selectEvent.target.value as TimelineState); }}
                    disabled={!canEditTimeline}
                    className="text-[11px] rounded-md border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                  >
                    <option value="up-next">Up next</option>
                    <option value="live">Live</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-tertiary">{formatCoordinatorEventDateTime(event.start_time)}</p>
                  <div className="flex items-center gap-2">
                    {correctionAction && (
                      <button
                        type="button"
                        disabled={!canEditTimeline}
                        onClick={(clickEvent) => { clickEvent.stopPropagation(); onRunAction(event.id, correctionAction.nextState); }}
                        className="rounded border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary disabled:opacity-40"
                      >
                        {correctionAction.label}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canEditTimeline || !primaryAction.nextState}
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); onRunAction(event.id, primaryAction.nextState); }}
                      className="text-[11px] px-2.5 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-40"
                    >
                      {primaryAction.label}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type CoordinatorAlertStats = {
  total: number;
  scheduled: number;
  immediate: number;
  sms: number;
  email: number;
  byAudience: [string, number][];
};

type CoordinatorAlertSummary = {
  intentLabel: string;
  audienceLabel: string;
  recipientLabel: string;
  deliveryLabel: string;
};

export interface CoordinatorDayOfMessagePanelProps {
  alertActivityBoard: CoordinatorAlertActivityBoard;
  alertBoard: CoordinatorAlertBoard;
  alertBusy: boolean;
  alertChannelFilter: 'all' | 'email' | 'sms';
  alertForm: CoordinatorAlertForm;
  alertLaneLabel: string;
  alertLog: AlertLog[];
  alertOverrideCurrentLabel: string | null;
  alertOverrideLabel: string | null;
  alertOverrideTargetLabel: string | null;
  alertStats: CoordinatorAlertStats;
  alertSuggestions: CoordinatorAlertSuggestion[];
  alertSummary: CoordinatorAlertSummary;
  alertTargetCue: CoordinatorAlertTargetCue;
  alertTimingFilter: 'all' | 'now' | 'scheduled';
  alertValidationError: string | null;
  canScheduleAlerts: boolean;
  canSendAlerts: boolean;
  eventAudienceOptions: AudienceOption[];
  filteredAlertLogCount: number;
  filteredAlertLogView: CoordinatorAlertLogViewItem[];
  preferredAlertSuggestion: CoordinatorAlertSuggestion | null;
  onFocusLane: () => void;
  onSendAlert: () => void;
  onSetAlertChannelFilter: (filter: 'all' | 'email' | 'sms') => void;
  onSetAlertForm: React.Dispatch<React.SetStateAction<CoordinatorAlertForm>>;
  onSetAlertTimingFilter: (filter: 'all' | 'now' | 'scheduled') => void;
  onSetLastAlertSuggestionKey: (key: string | null) => void;
}

export function CoordinatorDayOfMessagePanel({
  alertActivityBoard,
  alertBoard,
  alertBusy,
  alertChannelFilter,
  alertForm,
  alertLaneLabel,
  alertLog,
  alertOverrideCurrentLabel,
  alertOverrideLabel,
  alertOverrideTargetLabel,
  alertStats,
  alertSuggestions,
  alertSummary,
  alertTargetCue,
  alertTimingFilter,
  alertValidationError,
  canScheduleAlerts,
  canSendAlerts,
  eventAudienceOptions,
  filteredAlertLogCount,
  filteredAlertLogView,
  preferredAlertSuggestion,
  onFocusLane,
  onSendAlert,
  onSetAlertChannelFilter,
  onSetAlertForm,
  onSetAlertTimingFilter,
  onSetLastAlertSuggestionKey,
}: CoordinatorDayOfMessagePanelProps) {
  return (
    <div className="border-t border-border/60 pt-3">
      <p className="text-sm font-medium text-text-primary mb-1">Day-of message</p>
      <p className="text-[11px] text-text-tertiary mb-2">Use quick actions and filters to send updates to the right guests fast.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        {[
          ['Queued', alertStats.total],
          ['Send now', alertStats.immediate],
          ['Scheduled', alertStats.scheduled],
          ['Text', alertStats.sms],
          ['Email', alertStats.email],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border-subtle bg-white px-2.5 py-2 shadow-sm">
            <p className="text-[10px] text-text-tertiary">{label}</p>
            <p className="text-xs font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Alert board</p>
            <p className="mt-1 text-[11px] text-text-secondary">{alertBoard.targetLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${alertBoard.statusTone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertBoard.statusTone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
            {alertBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Delivery</p>
            <p className="mt-1 text-[11px] text-text-primary">{alertBoard.deliveryLabel}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Latest activity</p>
            <p className="mt-1 text-[11px] text-text-primary">{alertBoard.latestActivityLabel}</p>
          </div>
        </div>
      </div>
      <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Alert activity</p>
            <p className="mt-1 text-[11px] text-text-secondary">Latest live · {alertActivityBoard.latestLiveLabel}</p>
            <p className="text-[11px] text-text-secondary">Next scheduled · {alertActivityBoard.nextScheduledLabel}</p>
          </div>
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${alertActivityBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertActivityBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
            {alertActivityBoard.statusLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Channel mix</p>
            <p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.channelLabel}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
            <p className="text-[10px] text-text-tertiary">Pacing</p>
            <p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.pacingLabel}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {alertSuggestions.map((suggestion) => {
          const suggestionState = getCoordinatorAlertSuggestionState({
            suggestion,
            preferredSuggestion: preferredAlertSuggestion,
            subject: alertForm.subject,
            body: alertForm.body,
            audience: alertForm.audience,
          });

          return (
            <button
              key={suggestion.key}
              type="button"
              disabled={!canSendAlerts}
              onClick={() => {
                onFocusLane();
                onSetAlertForm((prev) => ({
                  ...prev,
                  subject: suggestion.subject,
                  body: suggestion.body,
                  audience: suggestion.audience,
                }));
                onSetLastAlertSuggestionKey(suggestion.key);
              }}
              className={`text-[11px] px-2 py-1 rounded-lg border inline-flex items-center gap-1.5 disabled:opacity-40 ${suggestionState.isDraftMatch ? 'border-primary/35 bg-primary/10 text-primary' : suggestionState.isBoardTarget ? 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10' : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary'}`}
            >
              <span>{suggestion.label}</span>
              {suggestionState.badge && (
                <span className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-medium ${suggestionState.isDraftMatch ? 'border-primary/25 bg-white/80 text-primary' : 'border-primary/15 bg-primary/[0.04] text-primary/80'}`}>
                  {suggestionState.badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!canSendAlerts}
          onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: 'sms', scheduleType: 'now' })); }}
          className="text-[11px] px-2 py-1 rounded-lg border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          Text now
        </button>
        <button
          type="button"
          disabled={!canSendAlerts || !canScheduleAlerts}
          onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: 'email', scheduleType: 'later' })); }}
          className="text-[11px] px-2 py-1 rounded-lg border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          Schedule email
        </button>
        {alertStats.byAudience.map(([audience, count]) => (
          <button
            key={audience}
            type="button"
            disabled={!canSendAlerts}
            onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, audience })); }}
            className="text-[11px] px-2 py-1 rounded-lg border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            {audience} ({count})
          </button>
        ))}
      </div>

      <fieldset disabled={!canSendAlerts} className="space-y-2.5">
        <Input
          value={alertForm.subject}
          onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, subject: event.target.value })); }}
          placeholder="Message subject"
        />
        <Textarea
          value={alertForm.body}
          onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, body: event.target.value })); }}
          rows={3}
          placeholder="Write the update you want guests to receive"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={alertForm.audience}
            onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, audience: event.target.value })); }}
            className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
          >
            <option value="all">All guests</option>
            <option value="checked-in">Checked-in guests</option>
            <option value="pending">Pending RSVP</option>
            {eventAudienceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label} ({option.count})</option>
            ))}
          </select>
          <select
            value={alertForm.channel}
            onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: event.target.value as 'email' | 'sms' })); }}
            className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
          >
            <option value="email">Email</option>
            <option value="sms">Text</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={alertForm.scheduleType}
            onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleType: (canScheduleAlerts ? event.target.value : 'now') as 'now' | 'later' })); }}
            className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
          >
            <option value="now">Send now</option>
            <option value="later" disabled={!canScheduleAlerts}>Schedule</option>
          </select>
          {alertForm.scheduleType === 'later' && canScheduleAlerts ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={alertForm.scheduleDate}
                onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleDate: event.target.value })); }}
                className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
              />
              <input
                type="time"
                value={alertForm.scheduleTime}
                onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleTime: event.target.value })); }}
                className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
              />
            </div>
          ) : <div />}
        </div>
        <div className={`space-y-2 rounded-md border px-3 py-2 ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/[0.03]' : 'border-primary/20 bg-accent-light'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-text-primary">Ready to send</p>
              <p className="text-[10px] text-text-tertiary/80">{getCoordinatorActiveTargetLabel('alert')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-medium ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border-subtle bg-white text-primary'}`}>{alertTargetCue.aligned ? 'Board-aligned' : 'Customized'}</span>
              <span className="px-2 py-0.5 rounded-lg border border-primary/20 bg-primary/5 text-[10px] font-medium text-primary">{alertLaneLabel}</span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-text-primary">{alertTargetCue.title}</p>
          <p className="text-[11px] text-text-secondary">{alertTargetCue.detail}</p>
          {!alertTargetCue.aligned && (
            <div className="space-y-2">
              {alertOverrideLabel && <p className="text-[11px] text-primary">{alertOverrideLabel}</p>}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {alertOverrideTargetLabel && <p className="text-primary/80">{alertOverrideTargetLabel}</p>}
                {alertOverrideCurrentLabel && <p className="text-text-secondary">{alertOverrideCurrentLabel}</p>}
                {preferredAlertSuggestion && (
                  <button
                    type="button"
                    onClick={() => { onFocusLane(); onSetAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: preferredAlertSuggestion })); }}
                    className="inline-flex w-fit rounded-md border border-border-subtle bg-white px-2.5 py-1 text-[11px] font-medium text-primary"
                  >
                    Re-align to {preferredAlertSuggestion.label.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-secondary">{alertSummary.intentLabel} · {alertSummary.audienceLabel} · {alertSummary.recipientLabel}</p>
          <p className="text-[11px] text-text-tertiary">{alertSummary.deliveryLabel}</p>
        </div>
        {!canScheduleAlerts && canSendAlerts && <p className="text-[11px] text-text-tertiary">Coordinators can send updates now; scheduled sends stay with planners and the couple.</p>}
        {alertValidationError && <p className="text-[11px] text-error">{alertValidationError}</p>}
        <button
          type="button"
          onClick={onSendAlert}
          disabled={alertBusy || !!alertValidationError || !canSendAlerts}
          className="w-full px-3 py-2 text-sm rounded-md border border-primary/30 bg-primary/10 text-primary disabled:opacity-50"
        >
          {alertBusy ? 'Saving...' : alertForm.scheduleType === 'later' ? 'Schedule message' : 'Send message'}
        </button>
        {alertLog.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertChannelFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>All</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('email'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertChannelFilter === 'email' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Email</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('sms'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertChannelFilter === 'sms' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Text</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertTimingFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Any time</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('now'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertTimingFilter === 'now' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Send now</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('scheduled'); }} className={`text-[11px] px-2 py-0.5 rounded-lg border ${alertTimingFilter === 'scheduled' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Scheduled</button>
            </div>
            {filteredAlertLogView.slice(0, 4).map((item) => (
              <div key={item.id} className={`rounded-md border px-2.5 py-2 ${item.tone === 'ready' ? 'border-primary/20 bg-primary/[0.03]' : 'border-primary/20 bg-accent-light'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-text-primary">{item.title}</p>
                  <p className="text-[10px] text-text-tertiary">{item.meta}</p>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p>
              </div>
            ))}
            {filteredAlertLogCount === 0 && (
              <p className="text-[11px] text-text-tertiary">No messages match the current alert filters.</p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

export interface CoordinatorCommandDeckPanelProps {
  commandDeckItems: CoordinatorCommandDeckItem[];
  commandSummaryItems: CoordinatorCommandSummaryItem[];
  opsSnapshotItems: CoordinatorOpsSnapshotItem[];
  priorityCommandCta: string;
  priorityCommandLabel: CoordinatorCommandSummaryLabel;
  priorityCommandReason: string;
  priorityCommandTargetReason: string | null;
  onCommandClick: (label: CoordinatorCommandSummaryLabel) => void;
  onOpsSnapshotClick: (key: CoordinatorOpsSnapshotKey) => void;
}

export function CoordinatorCommandDeckPanel({
  commandDeckItems,
  commandSummaryItems,
  opsSnapshotItems,
  priorityCommandCta,
  priorityCommandLabel,
  priorityCommandReason,
  priorityCommandTargetReason,
  onCommandClick,
  onOpsSnapshotClick,
}: CoordinatorCommandDeckPanelProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {commandSummaryItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onCommandClick(item.label)}
            className={`rounded-xl border px-3 py-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'priority' ? 'border-primary/30 bg-primary/[0.06]' : item.tone === 'ready' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/35'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${item.tone === 'priority' ? 'border-primary/20 bg-white text-primary' : item.tone === 'ready' ? 'border-border-subtle bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                {item.statusLabel}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-text-tertiary">Target</p>
            <p className="mt-1 text-[11px] text-text-primary">{item.targetLabel}</p>
            <p className="mt-2 text-[10px] text-text-secondary">{item.detail}</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-white/80 px-2 py-1 text-[9px] font-medium text-text-secondary">
              <span className="text-text-tertiary">Next</span>
              <span>{item.actionLabel}</span>
            </div>
            {priorityCommandLabel === item.label && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-lg border border-primary/20 bg-white/80 px-2 py-1 text-[9px] font-medium text-primary">
                <span>Now — {priorityCommandReason}{priorityCommandTargetReason ? ` ${priorityCommandTargetReason}` : ''}</span>
                <span className="rounded-lg border border-primary/15 bg-primary/[0.05] px-1.5 py-0.5">{priorityCommandCta}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {commandDeckItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onCommandClick(item.label)}
            className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.priority ? 'border-primary/30 bg-primary/[0.06]' : 'border-border/50 bg-surface-subtle/25'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${item.priority ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-text-secondary">{item.detail}</p>
            {item.target && <p className="mt-2 text-[10px] text-text-tertiary">Target · {item.target}</p>}
            <p className="mt-3 text-[10px] font-medium text-text-tertiary">{item.cta}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {opsSnapshotItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onOpsSnapshotClick(item.key)}
            className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'warning' ? 'border-primary/20 bg-accent-light' : item.tone === 'success' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/30'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-text-primary">{item.title}</p>
                <p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p>
              </div>
              <span className={`rounded-lg border px-1.5 py-0.5 text-[9px] font-medium ${item.locked ? 'border-border bg-white text-text-tertiary' : item.tone === 'warning' ? 'border-border-subtle bg-white text-primary' : item.tone === 'success' ? 'border-border-subtle bg-white text-primary' : 'border-primary/20 bg-white text-primary'}`}>
                {item.locked ? 'Read only' : item.tone === 'warning' ? 'Needs action' : item.tone === 'success' ? 'On track' : 'Ready'}
              </span>
            </div>
            <p className="mt-3 text-[10px] font-medium text-text-tertiary">{item.cta}</p>
          </button>
        ))}
      </div>
    </>
  );
}
