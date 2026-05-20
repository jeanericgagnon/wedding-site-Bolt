import React from 'react';
import { QrScanner } from '../../../components/qr/QrScanner';
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
import { buildGuestPreviewRoutes } from '../../../lib/guestPreviewRoutes';
import type { CoordinatorCommandDeckItem } from '../../../lib/coordinatorCommandDeck';
import type { CoordinatorCommandSummaryItem } from '../../../lib/coordinatorCommandSummary';
import type { CoordinatorCommandSummaryLabel } from '../../../lib/coordinatorCommandSummaryTarget';
import type { CoordinatorOpsSnapshotItem, CoordinatorOpsSnapshotKey } from '../../../lib/coordinatorOpsSnapshot';
import { getCoordinatorPrimaryTimelineAction } from '../../../lib/coordinatorTimelineActions';
import type { CoordinatorTimelineBoard } from '../../../lib/coordinatorTimelineBoard';
import type { CoordinatorGuestDoorRoute, GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import { getCoordinatorActiveTargetLabel } from '../../../lib/coordinatorActiveTargetLabel';
import { resolveCoordinatorQrPayload, type CoordinatorQrResolution } from '../../../lib/qr/qrPayload';
import { formatCoordinatorEventDateTime } from '../coordinatorEventTime';
import { getCoordinatorTimelineCorrectionAction } from '../../../lib/coordinatorCorrectionActions';
import type {
  AlertLog,
  AudienceOption,
  EventLite,
  TimelineState,
} from './coordinatorDashboardTypes';

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

const boardToneClassName = (tone: 'ready' | 'warning' | 'neutral') => (
  tone === 'ready'
    ? 'border-primary/20 bg-primary/5 text-primary'
    : tone === 'warning'
      ? 'border-primary/20 bg-accent-light text-primary'
      : 'border-border bg-white text-text-tertiary'
);

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
  siteSlug: string | null;
  onActiveGuestCheckIn: () => void;
  onCheckInGuest: (guest: GuestLiteForCoordinator) => Promise<void> | void;
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
  siteSlug,
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
  const [qrResolution, setQrResolution] = React.useState<CoordinatorQrResolution | null>(null);
  const [qrBusy, setQrBusy] = React.useState(false);

  const handleQrPayload = async (value: string) => {
    setQrBusy(true);
    try {
      const resolution = resolveCoordinatorQrPayload(value, {
        siteSlug,
        currentEventName: checkInEventName,
        checkInStatusContext,
      });
      setQrResolution(resolution);
      if ('guest' in resolution) {
        onFocusLane();
        onSelectGuest(resolution.guest.id);
      }
    } finally {
      setQrBusy(false);
    }
  };

  const confirmQrCheckIn = async () => {
    if (!qrResolution || !('guest' in qrResolution) || qrResolution.status !== 'success') return;
    setQrBusy(true);
    try {
      onFocusLane();
      onSelectGuest(qrResolution.guest.id);
      await onCheckInGuest(qrResolution.guest);
    } finally {
      setQrBusy(false);
    }
  };

  const escalateQrIssue = () => {
    if (!qrResolution || !('guest' in qrResolution)) return;
    onFocusLane();
    onSelectGuest(qrResolution.guest.id);
    onEscalateDoorReview(qrResolution.guest);
  };

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
        <div className="rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-primary">{checkInBoard.eventLabel}</p>
              <p className="mt-1 text-[11px] text-text-secondary">{checkInBoard.eventProgressLabel}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Active · {checkInBoard.activeLabel}</p>
              <p className="text-[11px] text-text-secondary">Next ready · {checkInBoard.nextReadyLabel}</p>
            </div>
            <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(checkInBoard.tone)}`}>
              {checkInBoard.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Queue mix</p>
              <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.queueLabel}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] text-text-tertiary">Review pressure</p>
              <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.reviewLabel}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-white px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-primary">Scan guest QR</p>
              <p className="mt-1 text-[11px] text-text-secondary">Scans validate against this event before check-in.</p>
            </div>
            <span className="rounded-xl border border-border bg-surface-subtle px-2 py-1 text-[10px] font-medium text-text-tertiary">
              {checkInEventName ? `Event · ${checkInEventName}` : 'Event-aware'}
            </span>
          </div>
          <div className="mt-3">
            <QrScanner
              busy={qrBusy}
              manualPlaceholder="Paste a guest RSVP/check-in URL or invite token"
              onPayload={handleQrPayload}
            />
          </div>
          {qrResolution && (
            <div className={`mt-3 rounded-xl border px-3 py-3 ${
              qrResolution.status === 'success'
                ? 'border-primary/20 bg-primary/5'
                : qrResolution.status === 'already-checked-in'
                  ? 'border-border/50 bg-surface-subtle/40'
                  : 'border-primary/20 bg-accent-light'
            }`}>
              <p className="text-sm font-medium text-text-primary">{qrResolution.title}</p>
              <p className="mt-1 text-[11px] text-text-secondary">{qrResolution.detail}</p>
              {'checkedInAt' in qrResolution && (
                <p className="mt-1 text-[11px] text-text-tertiary">Checked in at {new Date(qrResolution.checkedInAt).toLocaleString()}</p>
              )}
              {qrResolution.warnings.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {qrResolution.warnings.map((warning) => (
                    <span key={`${qrResolution.source}-${warning}`} className="rounded-xl border border-primary/15 bg-white px-2 py-0.5 text-[10px] text-primary">
                      {warning}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {qrResolution.status === 'success' && (
                  <button
                    type="button"
                    onClick={confirmQrCheckIn}
                    disabled={!canCheckIn || qrBusy}
                    className="rounded-xl border border-primary/20 bg-white px-3 py-1.5 text-[11px] text-primary disabled:opacity-40"
                  >
                    {qrBusy ? 'Checking in…' : 'Confirm check-in'}
                  </button>
                )}
                {(qrResolution.status === 'wrong-event' || qrResolution.status === 'already-checked-in' || qrResolution.status === 'needs-review') && 'guest' in qrResolution && canEditQna && (
                  <button
                    type="button"
                    onClick={escalateQrIssue}
                    className="rounded-xl border border-primary/20 bg-white px-3 py-1.5 text-[11px] text-primary"
                  >
                    Route to issue desk
                  </button>
                )}
              </div>
            </div>
          )}
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
            className="sm:w-40 rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary"
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
            className={`rounded-xl border px-2.5 py-1 text-[11px] ${!checkInReviewOnly && checkInFilter === 'arrivals' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Ready now{nextArrivals.length ? ` · ${nextArrivals.length}` : ''}
          </button>
          <button
            type="button"
            onClick={onReviewOnlyClick}
            className={`rounded-xl border px-2.5 py-1 text-[11px] ${checkInReviewOnly ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
          >
            Review only{checkInWatchCount ? ` · ${checkInWatchCount}` : ''}
          </button>
          {activeGuestId && (
            <button
              type="button"
              onClick={onActiveGuestCheckIn}
              disabled={!canCheckIn || checkInBusyGuestId === activeGuestId || !(checkInQueue.find((guest) => guest.id === activeGuestId))}
              className="rounded-xl border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary disabled:opacity-40"
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
              <div className="rounded-xl border border-primary/20 bg-accent-light px-3 py-3">
                <p className="text-xs font-medium text-primary">No match for “{checkInQuery.trim()}”</p>
                <p className="mt-1 text-[11px] text-primary/80">Route the door issue without leaving coordinator mode.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onRouteNoMatch('walk-in')} className="rounded-xl border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary">Route walk-in</button>
                  <button type="button" onClick={() => onRouteNoMatch('help-desk')} className="rounded-xl border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary">Send to help desk</button>
                  <button type="button" onClick={() => onRouteNoMatch('manager-decision')} className="rounded-xl border border-primary/20 bg-white px-2.5 py-1.5 text-[11px] text-primary">Ask manager</button>
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
          const guestPreviewRoutes = buildGuestPreviewRoutes({
            guestId: guest.id,
            inviteToken: guest.invite_token ?? null,
            publicSiteSlug: siteSlug,
          });
          const guestViewHref = guestPreviewRoutes.primaryHref;
          const visibleExceptionStates = getCoordinatorDoorExceptionStates(guest, checkInStatusContext)
            .filter((state) => state !== 'already-checked-in')
            .slice(0, 3);
          return (
            <div
              key={guest.id}
              data-testid={`coordinator-checkin-guest-${guest.id}`}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer ${activeGuestId === guest.id ? 'bg-primary/5' : ''}`}
              onClick={() => {
                onFocusLane();
                onSelectGuest(guest.id);
              }}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-text-primary">{guest.name}</p>
                  <span className={`rounded-xl border px-2 py-0.5 text-[10px] ${doorStatus === 'ready' ? 'border-border-subtle bg-accent-light text-primary' : doorStatus === 'watch' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-surface-subtle text-text-tertiary'}`}>
                    {getCoordinatorDoorStatusLabel(doorStatus)}
                  </span>
                  {checkInBoardTargetId === guest.id && (
                    <span className={`rounded-xl border px-2 py-0.5 text-[10px] ${checkInTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                      {checkInTargetState.isBoardTargetActive ? 'Suggested guest in progress' : 'Suggested guest'}
                    </span>
                  )}
                  {activeGuestId === guest.id && checkInBoardTargetId !== guest.id && (
                    <span className="rounded-xl border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">Selected guest</span>
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
                      <span key={`${guest.id}-${state}`} className="rounded-xl border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
                        {getCoordinatorDoorExceptionStateLabel(state)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {guestViewHref && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(guestViewHref, '_blank', 'noopener,noreferrer');
                    }}
                    className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-text-secondary"
                  >
                    Guest view
                  </button>
                )}
                {!eventCheckedInAt && canEditQna && (doorStatus === 'watch' || Boolean(guest.door_route)) && (
                  <select
                    value={guest.door_route ?? ''}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      onRouteGuest(guest.id, (event.target.value || null) as CoordinatorGuestDoorRoute | null);
                    }}
                    className="rounded-xl border border-border bg-white px-2 py-1.5 text-[11px] text-text-secondary"
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
                    className="rounded-xl border border-primary/20 bg-accent-light px-3 py-1.5 text-xs text-primary"
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
                    if (canCheckIn) onCheckInGuest(guest);
                  }}
                  disabled={!canCheckIn || doorStatus === 'watch' || checkInBusyGuestId === guest.id}
                  className={`rounded-xl border px-3 py-1.5 text-xs disabled:opacity-40 ${eventCheckedInAt ? 'border-primary/20 bg-accent-light text-primary' : doorStatus === 'watch' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary'}`}
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
    ? getCoordinatorPrimaryTimelineAction({ event: activeTimelineEvent, liveEventId, upNextEventId, timelineState })
    : null;
  const activeTimelineCorrectionAction = activeTimelineEventState
    ? getCoordinatorTimelineCorrectionAction(activeTimelineEventState)
    : null;

  return (
    <div>
      <div className="mb-2 rounded-2xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <p className="text-sm font-medium text-text-primary">Run-of-show timeline{panelFocus === 'timeline' ? ' · focus' : ''}{activeTimelineEventId ? ` · ${getCoordinatorActiveTargetLabel('timeline')}` : ''}{timelineTargetState.label ? ` · ${timelineTargetState.label}` : ''}</p>
        <p className="mt-1 text-[11px] text-text-secondary">Use this lane to keep the live event flow legible before opening a specific timeline action.</p>
      </div>
      <div className="mb-2 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Timeline board</p>
            <p className="mt-1 text-[11px] text-text-secondary">Live · {timelineBoard.liveLabel}</p>
            <p className="text-[11px] text-text-secondary">Up next · {timelineBoard.upNextLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${boardToneClassName(timelineBoard.tone)}`}>
            {timelineBoard.stateLabel}
          </span>
        </div>
        <p className="mt-3 text-[11px] text-text-tertiary">Progress · {timelineBoard.progressLabel}</p>
      </div>
      {activeTimelineEvent && (
        <div className="mb-2 rounded-xl border border-border/50 bg-surface-subtle/30 px-3 py-2">
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
                <button type="button" disabled={!canEditTimeline} onClick={() => onRunAction(activeTimelineEvent.id, activeTimelineCorrectionAction.nextState)} className="rounded-xl border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary disabled:opacity-40">
                  {activeTimelineCorrectionAction.label}
                </button>
              )}
              {activeTimelinePrimaryAction?.nextState && (
                <button type="button" disabled={!canEditTimeline} onClick={() => onRunAction(activeTimelineEvent.id, activeTimelinePrimaryAction.nextState)} className="text-[11px] px-2.5 py-1 rounded-xl border border-primary/25 bg-primary/5 text-primary disabled:opacity-40">
                  {activeTimelinePrimaryAction.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {(liveEventId || upNextEventId || timelineBoardTargetId) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {liveEventId && <button type="button" onClick={() => onJumpToEvent(liveEventId)} className={`text-[11px] px-2 py-1 rounded-xl border ${activeTimelineEventId === liveEventId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'}`}>Jump to live event</button>}
          {upNextEventId && <button type="button" onClick={() => onJumpToEvent(upNextEventId)} className={`rounded-xl border px-2 py-1 text-[11px] ${activeTimelineEventId === upNextEventId ? 'border-primary/20 bg-accent-light text-primary' : 'border-border-subtle bg-surface-subtle text-text-secondary hover:border-primary/35 hover:text-primary'}`}>Jump to up next</button>}
          {timelineBoardTargetId && timelineBoardTargetId !== liveEventId && timelineBoardTargetId !== upNextEventId && <button type="button" onClick={() => onJumpToEvent(timelineBoardTargetId)} className={`text-[11px] px-2 py-1 rounded-xl border ${activeTimelineEventId === timelineBoardTargetId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}>Jump to suggested event</button>}
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
            const primaryAction = getCoordinatorPrimaryTimelineAction({ event, liveEventId, upNextEventId, timelineState });
            const correctionAction = getCoordinatorTimelineCorrectionAction(state);
            return (
              <div key={event.id} className={`cursor-pointer rounded-xl border px-3 py-2 ${activeTimelineEventId === event.id ? 'ring-2 ring-primary/10 ' : ''}${isLive ? 'border-primary/35 bg-primary/5' : isUpNext ? 'border-primary/20 bg-accent-light' : 'border-border/50 bg-surface-subtle/40'}`} onClick={() => { onFocusLane(); onSelectEvent(event.id); }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-text-primary">{event.event_name}</p>
                      {timelineBoardTargetId === event.id && (
                        <span className={`px-2 py-0.5 rounded-xl text-[10px] border ${timelineTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                          {timelineTargetState.isBoardTargetActive ? 'Suggested event in progress' : isLive ? 'Suggested live event' : 'Suggested up-next event'}
                        </span>
                      )}
                      {activeTimelineEventId === event.id && timelineBoardTargetId !== event.id && <span className="px-2 py-0.5 rounded-xl text-[10px] border border-primary/20 bg-primary/5 text-primary">Selected event</span>}
                    </div>
                    <p className="text-[11px] text-text-tertiary">{isLive ? 'Live now' : isUpNext ? 'Up next' : state === 'done' ? 'Completed' : 'Queued'}</p>
                  </div>
                  <select value={state} onClick={(event) => event.stopPropagation()} onChange={(selectEvent) => { if (canEditTimeline) onSelectState(event.id, selectEvent.target.value as TimelineState); }} disabled={!canEditTimeline} className="text-[11px] rounded-xl border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40">
                    <option value="up-next">Up next</option>
                    <option value="live">Live</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-tertiary">{formatCoordinatorEventDateTime(event.start_time)}</p>
                  <div className="flex items-center gap-2">
                    {correctionAction && <button type="button" disabled={!canEditTimeline} onClick={(clickEvent) => { clickEvent.stopPropagation(); onRunAction(event.id, correctionAction.nextState); }} className="rounded-xl border border-primary/20 bg-accent-light px-2.5 py-1 text-[11px] text-primary disabled:opacity-40">{correctionAction.label}</button>}
                    <button type="button" disabled={!canEditTimeline || !primaryAction.nextState} onClick={(clickEvent) => { clickEvent.stopPropagation(); onRunAction(event.id, primaryAction.nextState); }} className="text-[11px] px-2.5 py-1 rounded-xl border border-border bg-white text-text-secondary disabled:opacity-40">{primaryAction.label}</button>
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

export function CoordinatorDayOfMessagePanel(props: CoordinatorDayOfMessagePanelProps) {
  const {
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
  } = props;

  return (
    <div className="border-t border-border/60 pt-3">
      <div className="mb-2 rounded-2xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <p className="text-sm font-medium text-text-primary">Day-of message</p>
        <p className="mt-1 text-[11px] text-text-secondary">Use this lane to send the right update quickly without losing the live floor context.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        {[
          ['Queued', alertStats.total],
          ['Send now', alertStats.immediate],
          ['Scheduled', alertStats.scheduled],
          ['Text', alertStats.sms],
          ['Email', alertStats.email],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border-subtle bg-white px-2.5 py-2 shadow-sm">
            <p className="text-[10px] text-text-tertiary">{label}</p>
            <p className="text-xs font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Alert board</p>
            <p className="mt-1 text-[11px] text-text-secondary">{alertBoard.targetLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${alertBoard.statusTone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertBoard.statusTone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>{alertBoard.statusLabel}</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2"><p className="text-[10px] text-text-tertiary">Delivery</p><p className="mt-1 text-[11px] text-text-primary">{alertBoard.deliveryLabel}</p></div>
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2"><p className="text-[10px] text-text-tertiary">Latest activity</p><p className="mt-1 text-[11px] text-text-primary">{alertBoard.latestActivityLabel}</p></div>
        </div>
      </div>
      <div className="mb-3 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-primary">Alert activity</p>
            <p className="mt-1 text-[11px] text-text-secondary">Latest live · {alertActivityBoard.latestLiveLabel}</p>
            <p className="text-[11px] text-text-secondary">Next scheduled · {alertActivityBoard.nextScheduledLabel}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${alertActivityBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertActivityBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>{alertActivityBoard.statusLabel}</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2"><p className="text-[10px] text-text-tertiary">Channel mix</p><p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.channelLabel}</p></div>
          <div className="rounded-xl border border-border/50 bg-white px-2.5 py-2"><p className="text-[10px] text-text-tertiary">Pacing</p><p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.pacingLabel}</p></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {alertSuggestions.map((suggestion) => {
          const suggestionState = getCoordinatorAlertSuggestionState({ suggestion, preferredSuggestion: preferredAlertSuggestion, subject: alertForm.subject, body: alertForm.body, audience: alertForm.audience });
          return (
            <button key={suggestion.key} type="button" disabled={!canSendAlerts} onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, subject: suggestion.subject, body: suggestion.body, audience: suggestion.audience })); onSetLastAlertSuggestionKey(suggestion.key); }} className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[11px] disabled:opacity-40 ${suggestionState.isDraftMatch ? 'border-primary/35 bg-primary/10 text-primary' : suggestionState.isBoardTarget ? 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10' : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary'}`}>
              <span>{suggestion.label}</span>
              {suggestionState.badge && <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${suggestionState.isDraftMatch ? 'border-primary/25 bg-white/80 text-primary' : 'border-primary/15 bg-primary/[0.04] text-primary/80'}`}>{suggestionState.badge}</span>}
            </button>
          );
        })}
        <button type="button" disabled={!canSendAlerts} onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: 'sms', scheduleType: 'now' })); }} className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40">Text now</button>
        <button type="button" disabled={!canSendAlerts || !canScheduleAlerts} onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: 'email', scheduleType: 'later' })); }} className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40">Schedule email</button>
        {alertStats.byAudience.map(([audience, count]) => (
          <button key={audience} type="button" disabled={!canSendAlerts} onClick={() => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, audience })); }} className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40">{audience} ({count})</button>
        ))}
      </div>
      <fieldset disabled={!canSendAlerts} className="space-y-2.5">
        <Input value={alertForm.subject} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, subject: event.target.value })); }} placeholder="Message subject" />
        <Textarea value={alertForm.body} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, body: event.target.value })); }} rows={3} placeholder="Write the update you want guests to receive" />
        <div className="grid grid-cols-2 gap-2">
          <select value={alertForm.audience} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, audience: event.target.value })); }} className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary">
            <option value="all">All guests</option>
            <option value="checked-in">Checked-in guests</option>
            <option value="pending">Pending RSVP</option>
            {eventAudienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
          </select>
          <select value={alertForm.channel} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, channel: event.target.value as 'email' | 'sms' })); }} className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary">
            <option value="email">Email</option>
            <option value="sms">Text</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={alertForm.scheduleType} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleType: (canScheduleAlerts ? event.target.value : 'now') as 'now' | 'later' })); }} className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary">
            <option value="now">Send now</option>
            <option value="later" disabled={!canScheduleAlerts}>Schedule</option>
          </select>
          {alertForm.scheduleType === 'later' && canScheduleAlerts ? (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={alertForm.scheduleDate} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleDate: event.target.value })); }} className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary" />
              <input type="time" value={alertForm.scheduleTime} onChange={(event) => { onFocusLane(); onSetAlertForm((prev) => ({ ...prev, scheduleTime: event.target.value })); }} className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-text-secondary" />
            </div>
          ) : <div />}
        </div>
        <div className={`space-y-2 rounded-xl border px-3 py-2 ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/[0.03]' : 'border-primary/20 bg-accent-light'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-text-primary">Ready to send</p>
              <p className="text-[10px] text-text-tertiary/80">{getCoordinatorActiveTargetLabel('alert')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-xl border text-[10px] font-medium ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border-subtle bg-white text-primary'}`}>{alertTargetCue.aligned ? 'Board-aligned' : 'Customized'}</span>
              <span className="px-2 py-0.5 rounded-xl border border-primary/20 bg-primary/5 text-[10px] font-medium text-primary">{alertLaneLabel}</span>
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
                {preferredAlertSuggestion && <button type="button" onClick={() => { onFocusLane(); onSetAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: preferredAlertSuggestion })); }} className="inline-flex w-fit rounded-xl border border-border-subtle bg-white px-2.5 py-1 text-[11px] font-medium text-primary">Re-align to {preferredAlertSuggestion.label.toLowerCase()}</button>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-secondary">{alertSummary.intentLabel} · {alertSummary.audienceLabel} · {alertSummary.recipientLabel}</p>
          <p className="text-[11px] text-text-tertiary">{alertSummary.deliveryLabel}</p>
        </div>
        {!canScheduleAlerts && canSendAlerts && <p className="text-[11px] text-text-tertiary">Coordinators can send updates now; scheduled sends stay with planners and the couple.</p>}
        {alertValidationError && <p className="text-[11px] text-error">{alertValidationError}</p>}
        <button type="button" onClick={onSendAlert} disabled={alertBusy || !!alertValidationError || !canSendAlerts} className="w-full px-3 py-2 text-sm rounded-xl border border-primary/30 bg-primary/10 text-primary disabled:opacity-50">
          {alertBusy ? 'Saving...' : alertForm.scheduleType === 'later' ? 'Schedule message' : 'Send message'}
        </button>
        {alertLog.length > 0 && (
          <div className="pt-1 space-y-2 rounded-xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Recent message history</p>
              <p className="mt-1 text-[11px] text-text-secondary">Filter the latest sends here without leaving the live messaging lane.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertChannelFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>All</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('email'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertChannelFilter === 'email' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Email</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertChannelFilter('sms'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertChannelFilter === 'sms' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Text</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertTimingFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Any time</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('now'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertTimingFilter === 'now' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Send now</button>
              <button type="button" onClick={() => { onFocusLane(); onSetAlertTimingFilter('scheduled'); }} className={`text-[11px] px-2 py-0.5 rounded-xl border ${alertTimingFilter === 'scheduled' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Scheduled</button>
            </div>
            {filteredAlertLogView.slice(0, 4).map((item) => (
              <div key={item.id} className={`rounded-xl border px-2.5 py-2 ${item.tone === 'ready' ? 'border-primary/20 bg-primary/[0.03]' : 'border-primary/20 bg-accent-light'}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-text-primary">{item.title}</p><p className="text-[10px] text-text-tertiary">{item.meta}</p></div>
                <p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p>
              </div>
            ))}
            {filteredAlertLogCount === 0 && <p className="text-[11px] text-text-tertiary">No messages match the current alert filters.</p>}
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
      <div className="rounded-2xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Command board</p>
          <p className="mt-1 text-[11px] text-text-secondary">Use this lane to confirm what is active now before switching into a deeper task surface.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {commandSummaryItems.map((item) => (
            <button key={item.label} type="button" onClick={() => onCommandClick(item.label)} className={`rounded-xl border px-3 py-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'priority' ? 'border-primary/30 bg-primary/[0.06]' : item.tone === 'ready' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/35'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${item.tone === 'priority' ? 'border-primary/20 bg-white text-primary' : item.tone === 'ready' ? 'border-border-subtle bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>{item.statusLabel}</span>
              </div>
              <p className="mt-2 text-[10px] text-text-tertiary">Target</p>
              <p className="mt-1 text-[11px] text-text-primary">{item.targetLabel}</p>
              <p className="mt-2 text-[10px] text-text-secondary">{item.detail}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-xl border border-border/60 bg-white/80 px-2 py-1 text-[9px] font-medium text-text-secondary"><span className="text-text-tertiary">Next</span><span>{item.actionLabel}</span></div>
              {priorityCommandLabel === item.label && <div className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-xl border border-primary/20 bg-white/80 px-2 py-1 text-[9px] font-medium text-primary"><span>Now — {priorityCommandReason}{priorityCommandTargetReason ? ` ${priorityCommandTargetReason}` : ''}</span><span className="rounded-xl border border-primary/15 bg-primary/[0.05] px-1.5 py-0.5">{priorityCommandCta}</span></div>}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Live task deck</p>
          <p className="mt-1 text-[11px] text-text-secondary">These are the work areas that can take over the floor once the command board has pointed to them.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {commandDeckItems.map((item) => (
            <button key={item.label} type="button" onClick={() => onCommandClick(item.label)} className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.priority ? 'border-primary/30 bg-primary/[0.06]' : 'border-border/50 bg-surface-subtle/25'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${item.priority ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>{item.status}</span>
              </div>
              <p className="mt-2 text-[11px] text-text-secondary">{item.detail}</p>
              {item.target && <p className="mt-2 text-[10px] text-text-tertiary">Target · {item.target}</p>}
              <p className="mt-3 text-[10px] font-medium text-text-tertiary">{item.cta}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-border/50 bg-surface-subtle/25 px-3 py-3">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Ops snapshots</p>
          <p className="mt-1 text-[11px] text-text-secondary">Quick readouts stay here so the floor can reorient without leaving the live route.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {opsSnapshotItems.map((item) => (
            <button key={item.key} type="button" onClick={() => onOpsSnapshotClick(item.key)} className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'warning' ? 'border-primary/20 bg-accent-light' : item.tone === 'success' ? 'border-border-subtle bg-surface-subtle' : 'border-border/50 bg-surface-subtle/30'}`}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-[11px] font-medium text-text-primary">{item.title}</p><p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p></div>
                <span className={`rounded-xl border px-1.5 py-0.5 text-[9px] font-medium ${item.locked ? 'border-border bg-white text-text-tertiary' : item.tone === 'warning' ? 'border-border-subtle bg-white text-primary' : item.tone === 'success' ? 'border-border-subtle bg-white text-primary' : 'border-primary/20 bg-white text-primary'}`}>{item.locked ? 'Read only' : item.tone === 'warning' ? 'Needs action' : item.tone === 'success' ? 'On track' : 'Ready'}</span>
              </div>
              <p className="mt-3 text-[10px] font-medium text-text-tertiary">{item.cta}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
