import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Copy, ExternalLink, Eye, Loader2, X } from 'lucide-react';
import { ShareQrPanel } from '../../../components/ui/ShareQrPanel';
import { copyTextOrDownload } from '../../../lib/copyText';
import { extractDietaryNote } from '../../../lib/dietaryNotes';
import { buildGuestVisibilityPreview } from '../../../lib/guestVisibilityPreview';
import { getPerEventRsvpState } from '../../../lib/perEventRsvpState';
import { getPlusOneState } from '../../../lib/plusOneState';
import { buildPublicSiteUrl, resolvePublicSiteSlugFromRow } from '../../../lib/publicSiteSlug';
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
  isGuestsReadOnly?: boolean;
  itineraryEvents: ItineraryEvent[];
  loadingDrawer: boolean;
  rotatingInviteToken: boolean;
  togglingEventId: string | null;
  weddingSiteInfo: WeddingSiteInfo | null;
  onAddFollowUpTask: (task: string) => void;
  onClose: () => void;
  onCopyContactRequestLink: () => void;
  onFocusGuestSearch: (query: string) => void;
  onRevokeGuestInviteToken: () => void;
  onRotateGuestInviteToken: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onToggleEventInvite: (eventId: string, currentlyInvited: boolean) => void;
}

export function GuestItineraryDrawer({
  guest,
  guestAuditEntries,
  guestEventIds,
  guests,
  isGuestsReadOnly = false,
  itineraryEvents,
  loadingDrawer,
  rotatingInviteToken,
  togglingEventId,
  weddingSiteInfo,
  onAddFollowUpTask,
  onClose,
  onCopyContactRequestLink,
  onFocusGuestSearch,
  onRevokeGuestInviteToken,
  onRotateGuestInviteToken,
  onToast,
  onToggleEventInvite,
}: GuestItineraryDrawerProps) {
  const guestName = getGuestName(guest);
  const [copyingKey, setCopyingKey] = useState<'rsvp' | 'preview' | null>(null);
  const [copyNotice, setCopyNotice] = useState<{ key: 'rsvp' | 'preview'; mode: 'copied' | 'downloaded' } | null>(null);
  const copyNoticeTimeoutRef = useRef<number | null>(null);
  const copyActionRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyContextKey = JSON.stringify({
    guestId: guest.id,
    inviteToken: guest.invite_token ?? null,
    siteSlug: weddingSiteInfo?.site_slug ?? null,
    siteUrl: weddingSiteInfo?.site_url ?? null,
    isPublished: weddingSiteInfo?.is_published ?? false,
    guestEventIds: Array.from(guestEventIds).sort(),
    events: itineraryEvents.map((event) => [
      event.id,
      event.event_name,
      event.event_date,
      event.start_time,
    ]),
  });
  const copyContextRef = useRef(copyContextKey);

  useEffect(() => () => {
    mountedRef.current = false;
    copyActionRequestIdRef.current += 1;
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, []);
  copyContextRef.current = copyContextKey;

  useEffect(() => {
    copyActionRequestIdRef.current += 1;
    setCopyingKey(null);
    setCopyNotice(null);
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, [copyContextKey]);

  const beginGuestCopyAction = () => {
    const requestId = ++copyActionRequestIdRef.current;
    const requestContextKey = copyContextRef.current;
    return () => (
      mountedRef.current &&
      requestId === copyActionRequestIdRef.current &&
      copyContextRef.current === requestContextKey
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface z-50 flex flex-col border-l border-border"
        role="dialog"
        aria-modal="true"
        aria-label={`${guestName} guest drawer`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{guestName}</h2>
            <p className="text-xs text-text-secondary mt-0.5">Guest updates and itinerary invitations</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={onCopyContactRequestLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy guest update link
              </button>
              {guest.invite_token && (
                <button
                  onClick={async () => {
                  if (copyingKey) return;
                  const isCurrentCopyAction = beginGuestCopyAction();
                  const inviteToken = guest.invite_token ?? '';
                  const inviteLink = `${window.location.origin}/rsvp?token=${encodeURIComponent(inviteToken)}`;
                  setCopyingKey('rsvp');
                  try {
                    const result = await copyTextOrDownload(inviteLink, 'dayof-rsvp-link.txt');
                    if (!isCurrentCopyAction()) return;
                    setCopyNotice({ key: 'rsvp', mode: result });
                    onToast(result === 'copied' ? 'Copied RSVP link' : 'Clipboard was blocked, so the RSVP link downloaded.', 'success');
                    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
                    copyNoticeTimeoutRef.current = window.setTimeout(() => setCopyNotice((current) => (current?.key === 'rsvp' ? null : current)), 1800);
                  } catch {
                    if (!isCurrentCopyAction()) return;
                    onToast('Couldn’t copy the RSVP link right now.', 'error');
                  } finally {
                    if (isCurrentCopyAction()) {
                      setCopyingKey((current) => (current === 'rsvp' ? null : current));
                    }
                  }
                }}
                  disabled={Boolean(copyingKey)}
                  aria-label={
                    copyingKey === 'rsvp'
                      ? 'Copying private RSVP access link'
                      : copyNotice?.key === 'rsvp'
                        ? copyNotice.mode === 'downloaded'
                          ? 'Downloaded private RSVP access link'
                          : 'Copied private RSVP access link'
                        : 'Copy private RSVP access link'
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copyingKey === 'rsvp'
                    ? 'Copying RSVP link...'
                    : copyNotice?.key === 'rsvp'
                      ? copyNotice.mode === 'downloaded'
                        ? 'Downloaded RSVP link'
                        : 'Copied RSVP link'
                      : 'Copy RSVP link'}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-surface-subtle"
            aria-label="Close guest drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <GuestDrawerDetails
            guest={guest}
            guestEventIds={guestEventIds}
            guests={guests}
            isGuestsReadOnly={isGuestsReadOnly}
            itineraryEvents={itineraryEvents}
            rotatingInviteToken={rotatingInviteToken}
            weddingSiteInfo={weddingSiteInfo}
            onAddFollowUpTask={onAddFollowUpTask}
            onFocusGuestSearch={onFocusGuestSearch}
            onRevokeGuestInviteToken={onRevokeGuestInviteToken}
            onRotateGuestInviteToken={onRotateGuestInviteToken}
            onToast={onToast}
            copyNotice={copyNotice}
            copyingKey={copyingKey}
            copyNoticeTimeoutRef={copyNoticeTimeoutRef}
            beginGuestCopyAction={beginGuestCopyAction}
            setCopyNotice={setCopyNotice}
            setCopyingKey={setCopyingKey}
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
              isGuestsReadOnly={isGuestsReadOnly}
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
  isGuestsReadOnly,
  itineraryEvents,
  rotatingInviteToken,
  weddingSiteInfo,
  onAddFollowUpTask,
  onFocusGuestSearch,
  onRevokeGuestInviteToken,
  onRotateGuestInviteToken,
  onToast,
  copyNotice,
  copyingKey,
  copyNoticeTimeoutRef,
  beginGuestCopyAction,
  setCopyNotice,
  setCopyingKey,
}: {
  guest: GuestWithRSVP;
  guestEventIds: Set<string>;
  guests: GuestWithRSVP[];
  isGuestsReadOnly: boolean;
  itineraryEvents: ItineraryEvent[];
  rotatingInviteToken: boolean;
  weddingSiteInfo: WeddingSiteInfo | null;
  onAddFollowUpTask: (task: string) => void;
  onFocusGuestSearch: (query: string) => void;
  onRevokeGuestInviteToken: () => void;
  onRotateGuestInviteToken: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  copyNotice: { key: 'rsvp' | 'preview'; mode: 'copied' | 'downloaded' } | null;
  copyingKey: 'rsvp' | 'preview' | null;
  copyNoticeTimeoutRef: React.MutableRefObject<number | null>;
  beginGuestCopyAction: () => () => boolean;
  setCopyNotice: React.Dispatch<React.SetStateAction<{ key: 'rsvp' | 'preview'; mode: 'copied' | 'downloaded' } | null>>;
  setCopyingKey: React.Dispatch<React.SetStateAction<'rsvp' | 'preview' | null>>;
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
  const resolvedPublicSiteSlug = resolvePublicSiteSlugFromRow({
    site_slug: weddingSiteInfo?.site_slug ?? null,
    site_url: weddingSiteInfo?.site_url ?? null,
  });
  const visibilityPreview = buildGuestVisibilityPreview({
    guest: {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      name: guest.name,
      inviteToken: guest.invite_token,
      preferredLanguage: guest.preferred_language,
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
    isPublished: weddingSiteInfo?.is_published ?? false,
    publicSiteSlug: resolvedPublicSiteSlug,
  });
  const guestRsvpUrl = guest.invite_token
    ? `${window.location.origin}/rsvp?token=${encodeURIComponent(guest.invite_token)}`
    : '';
  const guestSpecificPreviewRouteCount = visibilityPreview.links.filter((link) => (
    link.kind === 'rsvp'
    || link.kind === 'contact'
    || link.kind === 'photos'
    || link.kind === 'guestbook'
    || link.kind === 'vault'
    || link.kind === 'recap'
  )).length;
  const publicPreviewRouteCount = visibilityPreview.links.filter((link) => (
    link.kind === 'travel'
    || link.kind === 'registry'
    || link.kind === 'site'
  )).length;
  const guestSpecificCoverageRate = visibilityPreview.links.length > 0
    ? Math.round((guestSpecificPreviewRouteCount / visibilityPreview.links.length) * 100)
    : null;
  const publicShellCoverageRate = visibilityPreview.links.length > 0
    ? Math.round((publicPreviewRouteCount / visibilityPreview.links.length) * 100)
    : null;
  const visibleEventCount = visibilityPreview.visibleEvents.length;
  const hiddenEventCount = visibilityPreview.hiddenEvents.length;
  const totalEventVisibilityCount = visibleEventCount + hiddenEventCount;
  const visibleEventCoverageRate = totalEventVisibilityCount > 0
    ? Math.round((visibleEventCount / totalEventVisibilityCount) * 100)
    : null;
  const hiddenEventCoverageRate = totalEventVisibilityCount > 0
    ? Math.round((hiddenEventCount / totalEventVisibilityCount) * 100)
    : null;
  const guestContactUrl = visibilityPreview.links.find((link) => link.kind === 'contact')
    ? `${window.location.origin}${visibilityPreview.links.find((link) => link.kind === 'contact')?.href ?? ''}`
    : '';
  const guestPublicSiteUrl = visibilityPreview.links.find((link) => link.kind === 'site')
    ? `${buildPublicSiteUrl(resolvedPublicSiteSlug)}?previewGuest=${encodeURIComponent(guest.id)}&previewSurface=public`
    : '';
  const totalPotentialPreviewRouteCount = (
    (guest.invite_token ? 1 : 0)
    + (guest.invite_token && resolvedPublicSiteSlug ? 5 : 0)
    + (resolvedPublicSiteSlug ? 3 : 0)
  );
  const missingPreviewRouteCount = Math.max(totalPotentialPreviewRouteCount - visibilityPreview.links.length, 0);
  const previewRouteCoverageRate = totalPotentialPreviewRouteCount > 0
    ? Math.round((visibilityPreview.links.length / totalPotentialPreviewRouteCount) * 100)
    : null;

  return (
    <>
      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">Visibility preview</p>
            <p className="text-sm font-medium text-text-primary">{visibilityPreview.bannerLabel}</p>
            <p className="text-sm text-text-secondary">{visibilityPreview.accessSummary}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">
            <Eye className="w-3 h-3" />
            Guest view
          </span>
        </div>
        <p className="text-sm text-text-secondary">{visibilityPreview.accessDetail}</p>
        <p className="text-xs text-text-tertiary">{visibilityPreview.householdSummary}</p>
        {visibilityPreview.links.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-text-tertiary">
              {visibilityPreview.links.length} guest route{visibilityPreview.links.length === 1 ? '' : 's'} ready
              {guestSpecificPreviewRouteCount > 0 ? ` · ${guestSpecificPreviewRouteCount} guest-specific` : ''}
              {` · ${publicPreviewRouteCount} public shell`}
              {visibleEventCount > 0 ? ` · ${visibleEventCount} visible event${visibleEventCount === 1 ? '' : 's'}` : ''}
              {` · ${hiddenEventCount} hidden event${hiddenEventCount === 1 ? '' : 's'}`}
            </p>
            {(guestSpecificCoverageRate != null || publicShellCoverageRate != null) && (
              <p className="text-xs text-text-tertiary">
                {guestSpecificCoverageRate != null ? `${guestSpecificCoverageRate}% guest-specific coverage` : ''}
                {guestSpecificCoverageRate != null && publicShellCoverageRate != null ? ' · ' : ''}
                {publicShellCoverageRate != null ? `${publicShellCoverageRate}% public-shell coverage` : ''}
              </p>
            )}
            {visibleEventCoverageRate != null && (
              <p className="text-xs text-text-tertiary">
                {visibleEventCoverageRate}% event visibility coverage
                {hiddenEventCoverageRate != null ? ` · ${hiddenEventCoverageRate}% still hidden` : ''}
              </p>
            )}
            {visibilityPreview.visibleEventSummary && (
              <p className="text-xs text-text-tertiary">{visibilityPreview.visibleEventSummary}</p>
            )}
            {visibilityPreview.hiddenEventSummary && (
              <p className="text-xs text-text-tertiary">{visibilityPreview.hiddenEventSummary}</p>
            )}
            {totalPotentialPreviewRouteCount > 0 && (
              <p className="text-xs text-text-tertiary">
                {previewRouteCoverageRate != null ? `${previewRouteCoverageRate}% preview-route coverage` : ''}
                {previewRouteCoverageRate != null ? ' · ' : ''}
                {visibilityPreview.links.length} route{visibilityPreview.links.length === 1 ? '' : 's'} ready
                {' · '}
                {missingPreviewRouteCount === 0
                  ? 'No preview routes missing'
                  : `${missingPreviewRouteCount} preview route${missingPreviewRouteCount === 1 ? '' : 's'} still missing`}
              </p>
            )}
            <p className="text-xs font-medium text-text-secondary">{visibilityPreview.routeReadinessLabel}</p>
            <p className="text-xs text-text-tertiary">{visibilityPreview.pathCoverageSummary}</p>
            {visibilityPreview.mainGapLabel && (
              <p className="text-xs text-text-tertiary">{visibilityPreview.mainGapLabel}</p>
            )}
          </div>
        )}
        {visibilityPreview.links.length === 0 && visibilityPreview.mainGapLabel && (
          <p className="text-xs text-text-tertiary">{visibilityPreview.mainGapLabel}</p>
        )}
        {visibilityPreview.visibleEvents.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {visibilityPreview.visibleEvents.slice(0, 4).map((event) => (
                <span key={event.id} className="rounded-xl border border-primary/20 bg-white px-2 py-1 text-[11px] text-primary">
                  {event.eventName}
                </span>
              ))}
              {visibilityPreview.visibleEvents.length > 4 && (
                <span className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-tertiary">
                  +{visibilityPreview.visibleEvents.length - 4} more
                </span>
              )}
            </div>
            <p className="text-xs text-text-tertiary">
              Visible to this guest: {visibilityPreview.visibleEvents.slice(0, 3).map((event) => event.eventName).join(', ')}
              {visibilityPreview.visibleEvents.length > 3 ? `, and ${visibilityPreview.visibleEvents.length - 3} more` : ''}
              .
            </p>
          </>
        )}
        {visibilityPreview.hiddenEventSummary && (
          <p className="text-xs text-text-tertiary">
            {visibilityPreview.hiddenEvents.length > 0
              ? `Hidden from this guest: ${visibilityPreview.hiddenEvents.slice(0, 3).map((event) => event.eventName).join(', ')}${visibilityPreview.hiddenEvents.length > 3 ? `, and ${visibilityPreview.hiddenEvents.length - 3} more` : ''}`
              : 'No hidden events for this guest.'}
          </p>
        )}
        {visibilityPreview.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {visibilityPreview.links.map((link) => (
              <button
                key={`${link.kind}-${link.href}`}
                onClick={() => window.open(link.href, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {link.label}
              </button>
            ))}
            {visibilityPreview.links.find((link) => link.kind === 'rsvp') && (
              <button
                onClick={async () => {
                  if (copyingKey) return;
                  const rsvpLink = visibilityPreview.links.find((link) => link.kind === 'rsvp');
                  if (!rsvpLink) return;
                  const isCurrentCopyAction = beginGuestCopyAction();
                  setCopyingKey('preview');
                  try {
                    const result = await copyTextOrDownload(`${window.location.origin}${rsvpLink.href}`, 'dayof-guest-preview-link.txt');
                    if (!isCurrentCopyAction()) return;
                    setCopyNotice({ key: 'preview', mode: result });
                    onToast(result === 'copied' ? 'Copied guest preview link' : 'Clipboard was blocked, so the preview link downloaded.', 'success');
                    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
                    copyNoticeTimeoutRef.current = window.setTimeout(() => setCopyNotice((current) => (current?.key === 'preview' ? null : current)), 1800);
                  } catch {
                    if (!isCurrentCopyAction()) return;
                    onToast('Couldn’t copy the guest preview link right now.', 'error');
                  } finally {
                    if (isCurrentCopyAction()) {
                      setCopyingKey((current) => (current === 'preview' ? null : current));
                    }
                  }
                }}
                disabled={Boolean(copyingKey)}
                aria-label={
                  copyingKey === 'preview'
                    ? 'Copying guest preview route link'
                    : copyNotice?.key === 'preview'
                      ? copyNotice.mode === 'downloaded'
                        ? 'Downloaded guest preview route link'
                        : 'Copied guest preview route link'
                      : 'Copy guest preview route link'
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary"
              >
                <Copy className="w-3.5 h-3.5" />
                {copyingKey === 'preview'
                  ? 'Copying preview link...'
                  : copyNotice?.key === 'preview'
                    ? copyNotice.mode === 'downloaded'
                      ? 'Downloaded preview link'
                      : 'Copied preview link'
                    : 'Copy preview link'}
              </button>
            )}
          </div>
        )}
        {(guestRsvpUrl || guestPublicSiteUrl) && (
          <div className="grid gap-3 pt-2">
            {guestRsvpUrl && (
              <ShareQrPanel
                title="Private RSVP QR"
                description="Use this only for this guest or household. The QR is generated locally and the token stays out of public QR services."
                url={guestRsvpUrl}
                copyLabel="Copy RSVP link"
                allowPrivate
                className="bg-white"
              />
            )}
            {guestContactUrl && (
              <ShareQrPanel
                title="Private guest update QR"
                description="Open the guest update path for this guest or household. The QR is generated locally and the private token stays out of public QR services."
                url={guestContactUrl}
                copyLabel="Copy guest update link"
                allowPrivate
                className="bg-white"
              />
            )}
            {guestPublicSiteUrl && (
              <ShareQrPanel
                title="Public site preview QR"
                description="This is the public guest-facing site view for this guest context."
                url={guestPublicSiteUrl}
                copyLabel="Copy preview link"
                className="bg-white"
              />
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => void onRotateGuestInviteToken()}
            disabled={rotatingInviteToken || isGuestsReadOnly}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rotatingInviteToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Rotate private RSVP access
          </button>
          {guest.invite_token && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && !window.confirm('Revoke this guest RSVP link and QR? Existing copies will stop working until you rotate a new one.')) {
                  return;
                }
                void onRevokeGuestInviteToken();
              }}
              disabled={rotatingInviteToken || isGuestsReadOnly}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Revoke private RSVP access
            </button>
          )}
        </div>
        {visibilityPreview.warnings.length > 0 && (
          <div className="space-y-1">
            {visibilityPreview.warnings.map((warning) => (
              <p key={warning} className="text-xs text-text-tertiary">
                <span aria-hidden="true">• </span>
                <span>{warning}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-2">
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

      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-2">
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

      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-2">
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

      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-2">
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
                  <button
                    onClick={() => onAddFollowUpTask(`Resolve RSVP exception for ${guestName}`)}
                    disabled={isGuestsReadOnly}
                    className="rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save follow-up task
                  </button>
                  <button onClick={() => onFocusGuestSearch(guestName)} className="rounded-xl border border-border bg-white px-2 py-1 text-text-secondary hover:border-primary/40 hover:text-primary">Focus this guest</button>
                </div>
              </div>
            : <p className="text-sm text-text-secondary">No active exception states for this guest.</p>;
        })()}
      </div>

      <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4 space-y-2">
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
    <div className="mb-4 rounded-[20px] border border-border bg-surface-subtle p-4">
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
              <div key={entry.id} className="rounded-xl border border-border-subtle bg-surface p-2.5 text-xs text-text-primary">
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
  isGuestsReadOnly,
  itineraryEvents,
  togglingEventId,
  onToggleEventInvite,
}: {
  guestEventIds: Set<string>;
  isGuestsReadOnly: boolean;
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
            disabled={isToggling || isGuestsReadOnly}
            className={`w-full flex items-center gap-3 rounded-[20px] border p-3.5 text-left transition-all ${
              invited
                ? 'border-primary/30 bg-primary/5'
                : isGuestsReadOnly
                  ? 'border-border'
                  : 'border-border hover:border-border hover:bg-surface-subtle'
            } ${isToggling || isGuestsReadOnly ? 'opacity-50' : ''}`}
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
