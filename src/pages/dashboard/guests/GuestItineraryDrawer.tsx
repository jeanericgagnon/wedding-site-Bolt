import React from 'react';
import { CalendarDays, CheckCircle2, Copy, ExternalLink, Eye, Loader2, X } from 'lucide-react';
import { copyTextOrDownload } from '../../../lib/copyText';
import { extractDietaryNote } from '../../../lib/dietaryNotes';
import { buildGuestVisibilityPreview } from '../../../lib/guestVisibilityPreview';
import { getPerEventRsvpState } from '../../../lib/perEventRsvpState';
import { getPlusOneState } from '../../../lib/plusOneState';
import { resolvePublicSiteSlugFromRow } from '../../../lib/publicSiteSlug';
import { getRsvpExceptionStates } from '../../../lib/rsvpExceptionState';
import { formatGuestEventDate } from '../guestEventDate';
import { formatGuestOpsDateTime, formatGuestOpsRelativeTime } from '../guestOpsTime';
import type { GuestAuditEntry, GuestWithRSVP, ItineraryEvent, WeddingSiteInfo } from './guestDashboardTypes';
import {
  getAuditActionIcon,
  getAuditActionTone,
  getCustomAnswerEntries,
  summarizeAuditEntry,
} from './guestDisplayUtils';

export interface GuestItineraryDrawerProps {
  guest: GuestWithRSVP;
  guestAuditEntries: GuestAuditEntry[];
  guestEventIds: Set<string>;
  guests: GuestWithRSVP[];
  itineraryEvents: ItineraryEvent[];
  loadingDrawer: boolean;
  togglingEventId: string | null;
  weddingSiteInfo: WeddingSiteInfo | null;
  onAddFollowUpTask: (task: string) => void;
  onClose: () => void;
  onCopyContactRequestLink: () => void;
  onFocusGuestSearch: (query: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onToggleEventInvite: (eventId: string, currentlyInvited: boolean) => void;
}

export function GuestItineraryDrawer({
  guest,
  guestAuditEntries,
  guestEventIds,
  guests,
  itineraryEvents,
  loadingDrawer,
  togglingEventId,
  weddingSiteInfo,
  onAddFollowUpTask,
  onClose,
  onCopyContactRequestLink,
  onFocusGuestSearch,
  onToast,
  onToggleEventInvite,
}: GuestItineraryDrawerProps) {
  const guestName = getGuestName(guest);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface z-50 flex flex-col border-l border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{guestName}</h2>
            <p className="text-xs text-text-secondary mt-0.5">Guest updates and itinerary invitations</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={onCopyContactRequestLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy guest update link
              </button>
              {guest.invite_token && (
                <button
                  onClick={async () => {
                    const inviteToken = guest.invite_token ?? '';
                    const inviteLink = `${window.location.origin}/rsvp?token=${encodeURIComponent(inviteToken)}`;
                    const result = await copyTextOrDownload(inviteLink, 'dayof-rsvp-link.txt');
                    onToast(result === 'copied' ? 'Copied RSVP link' : 'Clipboard was blocked, so the RSVP link downloaded.', 'success');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy RSVP link
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <GuestDrawerDetails
            guest={guest}
            guestEventIds={guestEventIds}
            guests={guests}
            itineraryEvents={itineraryEvents}
            weddingSiteInfo={weddingSiteInfo}
            onAddFollowUpTask={onAddFollowUpTask}
            onFocusGuestSearch={onFocusGuestSearch}
            onToast={onToast}
          />

          <GuestAuditPanel entries={guestAuditEntries} />

          {loadingDrawer ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : itineraryEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary mb-1">No events on the itinerary</p>
              <p className="text-xs text-text-tertiary break-words">Add events on the Itinerary page first.</p>
            </div>
          ) : (
            <GuestEventInviteList
              guestEventIds={guestEventIds}
              itineraryEvents={itineraryEvents}
              togglingEventId={togglingEventId}
              onToggleEventInvite={onToggleEventInvite}
            />
          )}
        </div>

        {!loadingDrawer && itineraryEvents.length > 0 && (
          <div className="px-5 py-4 border-t border-border bg-surface-subtle">
            <p className="text-xs text-text-tertiary text-center">
              {guestEventIds.size} of {itineraryEvents.length} events · Changes save instantly
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function GuestDrawerDetails({
  guest,
  guestEventIds,
  guests,
  itineraryEvents,
  weddingSiteInfo,
  onAddFollowUpTask,
  onFocusGuestSearch,
  onToast,
}: {
  guest: GuestWithRSVP;
  guestEventIds: Set<string>;
  guests: GuestWithRSVP[];
  itineraryEvents: ItineraryEvent[];
  weddingSiteInfo: WeddingSiteInfo | null;
  onAddFollowUpTask: (task: string) => void;
  onFocusGuestSearch: (query: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const entries = getCustomAnswerEntries(guest.rsvp?.custom_answers || null);
  const status = guest.rsvp_status;
  const meal = guest.rsvp?.meal_choice;
  const plusOne = guest.rsvp?.plus_one_name;
  const dietaryNote = extractDietaryNote(guest.rsvp?.custom_answers as Record<string, unknown> | null | undefined, guest.notes);
  const householdMembers = guest.household_id
    ? guests.filter((member) => member.household_id === guest.household_id)
    : [];
  const guestName = getGuestName(guest);
  const visibilityPreview = buildGuestVisibilityPreview({
    guest: {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      name: guest.name,
      inviteToken: guest.invite_token,
      invitedToCeremony: guest.invited_to_ceremony,
      invitedToReception: guest.invited_to_reception,
      plusOneAllowed: guest.plus_one_allowed,
      householdId: guest.household_id,
    },
    events: itineraryEvents.map((event) => ({
      id: event.id,
      eventName: event.event_name,
      eventDate: event.event_date,
      startTime: event.start_time,
      locationName: event.location_name,
    })),
    invitedEventIds: guestEventIds,
    householdMembers: householdMembers.map((member) => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      name: member.name,
      rsvpStatus: member.rsvp_status,
    })),
    publicSiteSlug: resolvePublicSiteSlugFromRow({
      site_slug: weddingSiteInfo?.site_slug ?? null,
      site_url: weddingSiteInfo?.site_url ?? null,
    }),
  });

  return (
    <>
      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">Visibility preview</p>
            <p className="text-sm font-medium text-text-primary">{visibilityPreview.bannerLabel}</p>
            <p className="text-sm text-text-secondary">{visibilityPreview.accessSummary}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
            <Eye className="w-3 h-3" />
            Guest view
          </span>
        </div>
        <p className="text-sm text-text-secondary">{visibilityPreview.accessDetail}</p>
        <p className="text-xs text-text-tertiary">{visibilityPreview.householdSummary}</p>
        {visibilityPreview.visibleEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibilityPreview.visibleEvents.slice(0, 4).map((event) => (
              <span key={event.id} className="rounded-lg border border-primary/20 bg-white px-2 py-1 text-[11px] text-primary">
                {event.eventName}
              </span>
            ))}
            {visibilityPreview.visibleEvents.length > 4 && (
              <span className="rounded-lg border border-border bg-white px-2 py-1 text-[11px] text-text-tertiary">
                +{visibilityPreview.visibleEvents.length - 4} more
              </span>
            )}
          </div>
        )}
        {visibilityPreview.hiddenEvents.length > 0 && (
          <p className="text-xs text-text-tertiary">
            Hidden from this guest: {visibilityPreview.hiddenEvents.slice(0, 3).map((event) => event.eventName).join(', ')}
            {visibilityPreview.hiddenEvents.length > 3 ? `, and ${visibilityPreview.hiddenEvents.length - 3} more` : ''}
          </p>
        )}
        {visibilityPreview.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {visibilityPreview.links.map((link) => (
              <button
                key={`${link.kind}-${link.href}`}
                onClick={() => window.open(link.href, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white hover:border-primary hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {link.label}
              </button>
            ))}
            {visibilityPreview.links.find((link) => link.kind === 'rsvp') && (
              <button
                onClick={async () => {
                  const rsvpLink = visibilityPreview.links.find((link) => link.kind === 'rsvp');
                  if (!rsvpLink) return;
                  const result = await copyTextOrDownload(`${window.location.origin}${rsvpLink.href}`, 'dayof-guest-preview-link.txt');
                  onToast(result === 'copied' ? 'Copied guest preview link' : 'Clipboard was blocked, so the preview link downloaded.', 'success');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white hover:border-primary hover:text-primary transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy preview link
              </button>
            )}
          </div>
        )}
        {visibilityPreview.warnings.length > 0 && (
          <div className="space-y-1">
            {visibilityPreview.warnings.map((warning) => (
              <p key={warning} className="text-xs text-text-tertiary">• {warning}</p>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
        <p className="text-xs text-text-tertiary">RSVP details</p>
        <div className="text-sm text-text-primary">
          <span className="font-medium">Status:</span>{' '}
          <span className="capitalize">{status}</span>
        </div>
        {meal && (
          <div className="text-sm text-text-primary">
            <span className="font-medium">Meal:</span> <span className="capitalize">{meal}</span>
          </div>
        )}
        {plusOne && (
          <div className="text-sm text-text-primary">
            <span className="font-medium">Plus-one guest:</span> {plusOne}
          </div>
        )}
        {Number(guest.rsvp?.children_count ?? 0) > 0 && (
          <div className="text-sm text-text-primary">
            <span className="font-medium">Children:</span> {Number(guest.rsvp?.children_count ?? 0)}
          </div>
        )}
        {guest.rsvp?.notes && (
          <div className="text-sm text-text-primary">
            <span className="font-medium">RSVP notes:</span> {guest.rsvp.notes}
          </div>
        )}
        {dietaryNote && (
          <div className="text-sm text-text-primary">
            <span className="font-medium">Dietary note:</span> {dietaryNote}
          </div>
        )}
        {entries.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <p className="text-xs text-text-tertiary">Custom answers</p>
            {entries.map((entry) => (
              <div key={entry.key} className="text-sm text-text-primary flex items-start justify-between gap-3">
                <span className="text-text-secondary truncate">{entry.key}</span>
                <span className="text-right">{entry.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
        <p className="text-xs text-text-tertiary">Per-event RSVP structure</p>
        {(() => {
          const eventState = getPerEventRsvpState({ invitedToCeremony: guest.invited_to_ceremony, invitedToReception: guest.invited_to_reception, invitedEventIds: guest.invited_event_ids as string[] | null | undefined });
          return (
            <>
              <p className="text-sm text-text-primary">{eventState.summary}</p>
              <p className="text-sm text-text-secondary">{eventState.detail}</p>
            </>
          );
        })()}
      </div>

      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
        <p className="text-xs text-text-tertiary">Plus-one truth</p>
        {(() => {
          const plusOneState = getPlusOneState({ plusOneAllowed: guest.plus_one_allowed, plusOneName: guest.rsvp?.plus_one_name, attending: guest.rsvp?.attending });
          return (
            <>
              <p className="text-sm text-text-primary">{plusOneState.label}</p>
              <p className="text-sm text-text-secondary">{plusOneState.detail}</p>
            </>
          );
        })()}
      </div>

      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
        <p className="text-xs text-text-tertiary">RSVP exceptions</p>
        {(() => {
          const states = getRsvpExceptionStates({
            householdStatuses: householdMembers.map((member) => member.rsvp_status),
            plusOneAllowed: guest.plus_one_allowed,
            plusOneName: guest.rsvp?.plus_one_name,
            attending: guest.rsvp?.attending,
            mealChoice: guest.rsvp?.meal_choice,
            manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
          });
          return states.length > 0
            ? <div className="space-y-2">
                {states.map((state) => <p key={state} className="text-sm text-text-primary">• {state}</p>)}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => onAddFollowUpTask(`Resolve RSVP exception for ${guestName}`)} className="px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Save follow-up task</button>
                  <button onClick={() => onFocusGuestSearch(guestName)} className="px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Focus this guest</button>
                </div>
              </div>
            : <p className="text-sm text-text-secondary">No active exception states for this guest.</p>;
        })()}
      </div>

      <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg space-y-2">
        <p className="text-xs text-text-tertiary">Household context</p>
        {householdMembers.length > 1 ? (
          <>
            <p className="text-sm text-text-secondary">This guest is grouped with {householdMembers.length - 1} other household member{householdMembers.length === 2 ? '' : 's'}.</p>
            <p className={`text-xs ${new Set(householdMembers.map((member) => member.rsvp_status)).size > 1 ? 'text-primary' : 'text-text-tertiary'}`}>{new Set(householdMembers.map((member) => member.rsvp_status)).size > 1 ? 'Household responses are mixed right now.' : 'Household responses are aligned right now.'}</p>
            <div className="space-y-1">
              {householdMembers.map((member) => (
                <p key={member.id} className="text-sm text-text-primary">• {getGuestName(member)}</p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-secondary">This guest is not currently grouped into a larger household.</p>
        )}
      </div>
    </>
  );
}

function GuestAuditPanel({ entries }: { entries: GuestAuditEntry[] }) {
  return (
    <div className="mb-4 p-4 bg-surface-subtle border border-border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-tertiary">Recent guest updates</p>
        <span className="text-[11px] text-text-tertiary">Last {entries.length} updates</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-text-tertiary">No recent changes yet. Updates to this guest will appear here automatically.</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const absolute = formatGuestOpsDateTime(entry.changed_at);
            const relative = formatGuestOpsRelativeTime(entry.changed_at);
            const Icon = getAuditActionIcon(entry.action);
            return (
              <div key={entry.id} className="text-xs text-text-primary border border-border-subtle rounded-lg p-2.5 bg-surface">
                <div className="flex items-start justify-between gap-3">
                  <span className={`capitalize px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${getAuditActionTone(entry.action)}`}>
                    <Icon className="w-3 h-3" />
                    {entry.action}
                  </span>
                  <div className="text-right leading-tight">
                    <span className="text-text-secondary whitespace-nowrap">{relative}</span>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{absolute}</p>
                  </div>
                </div>
                <p className="mt-1.5 text-text-secondary leading-relaxed">{summarizeAuditEntry(entry)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GuestEventInviteList({
  guestEventIds,
  itineraryEvents,
  togglingEventId,
  onToggleEventInvite,
}: {
  guestEventIds: Set<string>;
  itineraryEvents: ItineraryEvent[];
  togglingEventId: string | null;
  onToggleEventInvite: (eventId: string, currentlyInvited: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-text-tertiary mb-3">
        Toggle each event to invite or uninvite this guest.
      </p>
      {itineraryEvents.map((event) => {
        const invited = guestEventIds.has(event.id);
        const isToggling = togglingEventId === event.id;
        return (
          <button
            key={event.id}
            onClick={() => onToggleEventInvite(event.id, invited)}
            disabled={isToggling}
            className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
              invited
                ? 'border-primary/30 bg-primary/5'
                : 'border-border hover:border-border hover:bg-surface-subtle'
            } ${isToggling ? 'opacity-50' : ''}`}
          >
            <div className={`w-5 h-5 rounded-sm border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              invited ? 'border-primary bg-primary' : 'border-border'
            }`}>
              {isToggling
                ? <Loader2 className="w-3 h-3 animate-spin text-white" />
                : invited
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  : null
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${invited ? 'text-primary' : 'text-text-primary'}`}>
                {event.event_name}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {event.event_date
                  ? formatGuestEventDate(event.event_date)
                  : 'No date set'}
                {event.start_time && ` · ${event.start_time}`}
                {event.location_name && ` · ${event.location_name}`}
              </p>
            </div>
            <span className={`text-xs font-medium flex-shrink-0 ${invited ? 'text-primary' : 'text-text-tertiary'}`}>
              {invited ? 'Invited' : 'Not invited'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function getGuestName(guest: GuestWithRSVP) {
  return guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
}
