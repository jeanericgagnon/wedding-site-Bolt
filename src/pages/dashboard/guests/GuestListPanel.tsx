import React from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, ExternalLink, Mail, Users } from 'lucide-react';
import { Button } from '../../../components/ui';
import { GUEST_LANGUAGE_LABELS, normalizeGuestLanguageCode } from '../../../lib/guestLanguagePreference';
import { buildGuestPreviewRoutes } from '../../../lib/guestPreviewRoutes';
import { getInviteLifecycleState } from '../../../lib/inviteLifecycle';
import { getPlusOneState } from '../../../lib/plusOneState';
import { hasRespondedRsvpStatus } from '../../../lib/rsvpStatus';
import { formatGuestOpsDate, formatGuestOpsDateTime } from '../guestOpsTime';
import type { GuestWithRSVP } from './guestDashboardTypes';
import { getGuestIssueCount } from './guestDashboardUtils';
import { formatCustomAnswers, parseRsvpEventSelections } from './guestDisplayUtils';

export interface GuestListPanelProps {
  checkInMode: boolean;
  confirmDeleteId: string | null;
  deletingGuestId: string | null;
  displayedGuests: GuestWithRSVP[];
  filteredGuestCount: number;
  isGuestsReadOnly: boolean;
  publicSiteSlug: string | null;
  searchQuery: string;
  sendingInviteId: string | null;
  getStatusBadge: (status: string) => React.ReactNode;
  onDeleteGuest: (guestId: string) => void;
  onOpenAssistedRsvpModal: (guest: GuestWithRSVP) => void;
  onOpenEditModal: (guest: GuestWithRSVP) => void;
  onOpenItineraryDrawer: (guest: GuestWithRSVP) => void;
  onSendInvitation: (guest: GuestWithRSVP) => void;
  onToggleCheckIn: (guest: GuestWithRSVP) => void;
  onMarkThankYouSent: (guest: GuestWithRSVP) => void;
}

export function GuestListPanel({
  checkInMode,
  confirmDeleteId,
  deletingGuestId,
  displayedGuests,
  filteredGuestCount,
  isGuestsReadOnly,
  publicSiteSlug,
  searchQuery,
  sendingInviteId,
  getStatusBadge,
  onDeleteGuest,
  onOpenAssistedRsvpModal,
  onOpenEditModal,
  onOpenItineraryDrawer,
  onSendInvitation,
  onToggleCheckIn,
  onMarkThankYouSent,
}: GuestListPanelProps) {
  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-tertiary">Guest</th>
              <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-tertiary">Status</th>
              <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-tertiary hidden md:table-cell">Plus One</th>
              <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-tertiary hidden lg:table-cell">Meal Choice</th>
              <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-tertiary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {displayedGuests.map((guest) => {
              const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
              const checkedInAt = guest.checked_in_at ?? null;
              const thankYouSentAt = guest.thank_you_sent_at ?? null;
              const preferredLanguage = normalizeGuestLanguageCode(guest.preferred_language);
              const guestPreviewRoutes = buildGuestPreviewRoutes({
                guestId: guest.id,
                inviteToken: guest.invite_token,
                publicSiteSlug,
                preferredLanguage: guest.preferred_language,
              });

              return (
                <tr
                  key={guest.id}
                  className="border-b border-border-subtle/70 hover:bg-surface-subtle/60 transition-colors cursor-pointer"
                  onClick={() => onOpenItineraryDrawer(guest)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{guestName}</p>
                        <p className="text-sm text-text-secondary">{guest.email || '—'}</p>
                        {preferredLanguage && (
                          <p className="text-xs text-text-tertiary">
                            Prefers {GUEST_LANGUAGE_LABELS[preferredLanguage]}
                          </p>
                        )}
                        {checkInMode && checkedInAt && (
                          <p className="text-xs text-success">Checked in {formatGuestOpsDateTime(checkedInAt, { hour: 'numeric', minute: '2-digit' })}</p>
                        )}
                        {!checkInMode && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 py-1 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenItineraryDrawer(guest);
                              }}
                              title="Manage event invitations"
                            >
                              <CalendarDays className="mr-1 h-3.5 w-3.5" />
                              Events
                            </Button>
                            {guestPreviewRoutes.primaryHref && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 py-1 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.open(guestPreviewRoutes.primaryHref ?? '', '_blank', 'noopener,noreferrer');
                                }}
                                title={guestPreviewRoutes.publicSiteHref ? 'Preview the guest-facing site as this guest' : 'Preview the RSVP flow as this guest'}
                              >
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                Guest view
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <GuestStatusStack guest={guest} getStatusBadge={getStatusBadge} />
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary hidden md:table-cell">
                    {getPlusOneState({ plusOneAllowed: guest.plus_one_allowed, plusOneName: guest.rsvp?.plus_one_name, attending: guest.rsvp?.attending }).label}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary hidden lg:table-cell">
                    {guest.rsvp?.meal_choice || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      {checkInMode ? (
                        <Button
                          variant={checkedInAt ? 'outline' : 'primary'}
                          size="sm"
                          className={`px-3 py-1.5 text-xs ${checkedInAt ? 'text-success border-success/40' : ''}`}
                          onClick={() => onToggleCheckIn(guest)}
                          title={checkedInAt ? 'Clear check-in' : 'Mark checked in'}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {checkedInAt ? 'Checked in' : 'Check in'}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 py-1 text-xs"
                            onClick={() => onOpenItineraryDrawer(guest)}
                            title="Manage event invitations"
                          >
                            <CalendarDays className="w-4 h-4 mr-1" />
                            Events
                          </Button>
                          {guestPreviewRoutes.primaryHref && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 py-1 text-xs"
                              onClick={() => window.open(guestPreviewRoutes.primaryHref ?? '', '_blank', 'noopener,noreferrer')}
                              title={guestPreviewRoutes.publicSiteHref ? 'Preview the guest-facing site as this guest' : 'Preview the RSVP flow as this guest'}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Guest view
                            </Button>
                          )}
                          {guest.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 py-1 text-xs"
                              onClick={() => onSendInvitation(guest)}
                              disabled={sendingInviteId === guest.id || isGuestsReadOnly}
                              title={guest.invite_token ? 'Send invitation email' : 'Send invitation'}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              {sendingInviteId === guest.id ? 'Sending…' : 'Invite'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`px-2 py-1 text-xs ${checkedInAt ? 'text-success' : ''}`}
                            onClick={() => onToggleCheckIn(guest)}
                            disabled={isGuestsReadOnly}
                            title={checkedInAt ? 'Clear check-in' : 'Mark checked in'}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {checkedInAt ? 'Checked in' : 'Check in'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`px-2 py-1 text-xs ${thankYouSentAt ? 'text-success' : ''}`}
                            onClick={() => onMarkThankYouSent(guest)}
                            disabled={isGuestsReadOnly}
                            title={thankYouSentAt ? 'Clear thank-you sent' : 'Mark thank-you sent'}
                          >
                            {thankYouSentAt ? 'Thanked' : 'Thank-you'}
                          </Button>
                          <Button variant="ghost" size="sm" className="px-2 py-1 text-xs" onClick={() => onOpenAssistedRsvpModal(guest)} disabled={isGuestsReadOnly}>
                            Record RSVP
                          </Button>
                          <Button variant="ghost" size="sm" className="px-2 py-1 text-xs" onClick={() => onOpenEditModal(guest)} disabled={isGuestsReadOnly}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteGuest(guest.id)}
                            disabled={deletingGuestId === guest.id || isGuestsReadOnly}
                            className={`px-2 py-1 text-xs ${confirmDeleteId === guest.id ? 'text-text-primary' : ''}`}
                          >
                            {deletingGuestId === guest.id
                              ? 'Removing…'
                              : confirmDeleteId === guest.id
                              ? 'Confirm?'
                              : 'Delete'}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredGuestCount === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3" aria-hidden="true" />
          <p className="text-text-secondary font-medium mb-1">No guests found</p>
          <p className="text-sm text-text-tertiary">
            {searchQuery ? 'Try a different search term' : 'Add your first guest to get started.'}
          </p>
        </div>
      )}
    </>
  );
}

function GuestStatusStack({
  guest,
  getStatusBadge,
}: {
  guest: GuestWithRSVP;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const guestWithLifecycle = guest as GuestWithRSVP & {
    invitation_sent_at?: string | null;
    reminder_last_sent_at?: string | null;
  };
  const lifecycle = getInviteLifecycleState({
    invitationSentAt: guestWithLifecycle.invitation_sent_at ?? null,
    reminderLastSentAt: guestWithLifecycle.reminder_last_sent_at ?? null,
    rsvpStatus: guest.rsvp_status,
    manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
  });
  const issues = getGuestIssueCount(guest);
  const events = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
  const custom = formatCustomAnswers(guest.rsvp?.custom_answers || null);

  return (
    <div className="flex flex-col gap-1">
      {getStatusBadge(guest.rsvp_status)}
      {guest.rsvp_received_at && hasRespondedRsvpStatus(guest.rsvp_status) && (
        <span className="text-xs text-text-tertiary break-words">
          {formatGuestOpsDate(guest.rsvp_received_at)}
        </span>
      )}
      <span className="text-[10px] px-2 py-0.5 rounded-lg border bg-surface-subtle text-text-tertiary border-border">
        {lifecycle.label}
      </span>
      {issues > 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${issues >= 3 ? 'bg-surface-subtle text-text-secondary border-border-subtle' : 'bg-primary/5 text-primary border-primary/20'}`}>
          {issues >= 3 ? 'High risk' : 'Needs review'} · {issues}
        </span>
      )}
      {events && (
        <div className="flex flex-wrap gap-1 pt-1">
          {typeof events.ceremony === 'boolean' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${events.ceremony ? 'bg-success-light text-success border-success/20' : 'bg-surface-subtle text-text-tertiary border-border'}`}>
              Ceremony: {events.ceremony ? 'Yes' : 'No'}
            </span>
          )}
          {typeof events.reception === 'boolean' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${events.reception ? 'bg-success-light text-success border-success/20' : 'bg-surface-subtle text-text-tertiary border-border'}`}>
              Reception: {events.reception ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      )}
      {custom && (
        <p className="text-[11px] text-text-tertiary pt-1 truncate" title={custom}>
          Custom answers saved
        </p>
      )}
    </div>
  );
}
