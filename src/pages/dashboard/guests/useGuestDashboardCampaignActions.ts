import { useEffect, useRef, useState } from 'react';

import { sendWeddingInvitation } from '../../../lib/emailService';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type { ToastType } from '../../../components/ui/Toast';
import type { GuestWithRSVP, WeddingSiteInfo } from './guestDashboardTypes';
import {
  markGuestInvitationAndReminderSentForSite,
  markGuestInvitationSentForSite,
  markGuestReminderSentForSite,
} from './guestService';

type RequestConfirmation = (
  options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>,
) => Promise<boolean>;

interface UseGuestDashboardCampaignActionsInput {
  contactStats: { withNoContact: number };
  dueReminderCandidatesGlobal: GuestWithRSVP[];
  fetchGuests: () => Promise<void>;
  filterLabel: string;
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  reminderCadenceDays: 1 | 3 | 7;
  reminderCandidates: GuestWithRSVP[];
  requestConfirmation: RequestConfirmation;
  selectedGuestIds: Set<string>;
  setCampaignLog: React.Dispatch<
    React.SetStateAction<Array<{ id: number; segment: string; count: number; sentAt: string }>>
  >;
  skipRecentlyInvited: boolean;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
  weddingSiteInfo: WeddingSiteInfo | null;
}

function getGuestName(guest: GuestWithRSVP) {
  return guest.first_name && guest.last_name
    ? `${guest.first_name} ${guest.last_name}`
    : guest.name;
}

async function sendGuestInvitationEmail({
  guest,
  weddingSiteId,
  weddingSiteInfo,
}: {
  guest: GuestWithRSVP;
  weddingSiteId: string;
  weddingSiteInfo: WeddingSiteInfo | null;
}) {
  await sendWeddingInvitation({
    weddingSiteId: weddingSiteInfo?.id ?? weddingSiteId,
    guestEmail: guest.email ?? '',
    guestName: getGuestName(guest),
    coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
    coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
    weddingDate: weddingSiteInfo?.wedding_date ?? null,
    venueName: weddingSiteInfo?.venue_name ?? null,
    venueAddress: weddingSiteInfo?.venue_address ?? null,
    siteUrl: weddingSiteInfo?.site_url ?? null,
    inviteToken: guest.invite_token ?? null,
  });
}

export function useGuestDashboardCampaignActions({
  contactStats,
  dueReminderCandidatesGlobal,
  fetchGuests,
  filterLabel,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  reminderCadenceDays,
  reminderCandidates,
  requestConfirmation,
  selectedGuestIds,
  setCampaignLog,
  skipRecentlyInvited,
  toast,
  weddingSiteId,
  weddingSiteInfo,
}: UseGuestDashboardCampaignActionsInput) {
  const guestCampaignContextVersionRef = useRef(0);
  const [bulkSending, setBulkSending] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  useEffect(() => {
    guestCampaignContextVersionRef.current += 1;
    setBulkSending(false);
    setSendingInviteId(null);
  }, [isDemoMode, weddingSiteId]);

  function isCurrentGuestCampaignContext(contextVersion: number) {
    return contextVersion === guestCampaignContextVersionRef.current;
  }

  const handleSendInvitation = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest invitations.', 'info');
      return;
    }
    if (!guest.email) {
      toast('This guest has no email address', 'error');
      return;
    }
    if (isDemoMode) {
      toast('Demo: invitation send simulated (no real email sent)', 'success');
      return;
    }
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const contextVersion = guestCampaignContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    setSendingInviteId(guest.id);
    try {
      await sendGuestInvitationEmail({ guest, weddingSiteId: targetWeddingSiteId, weddingSiteInfo });
      if (!isCurrentGuestCampaignContext(contextVersion)) return;
      await markGuestInvitationSentForSite(targetWeddingSiteId, guest.id, new Date().toISOString());
      if (!isCurrentGuestCampaignContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCampaignContext(contextVersion)) return;
      toast(`Invitation sent to ${getGuestName(guest)}`, 'success');
    } catch {
      if (!isCurrentGuestCampaignContext(contextVersion)) return;
      toast('Couldn’t send invitation. Please try again.', 'error');
    } finally {
      if (isCurrentGuestCampaignContext(contextVersion)) {
        setSendingInviteId(null);
      }
    }
  };

  const handleSendSelectedInvitations = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send selected guest reminders.', 'info');
      return;
    }

    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const contextVersion = guestCampaignContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const selectedRecipients = guests.filter((guest) => selectedGuestIds.has(guest.id) && !!guest.email && !!guest.invite_token);
    if (selectedRecipients.length === 0) {
      toast('No selected guests with email and RSVP link.', 'error');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send selected reminders?',
      description: `This will email RSVP reminders to ${selectedRecipients.length} selected ${selectedRecipients.length === 1 ? 'guest' : 'guests'}. You can review and edit the message before sending.`,
      confirmLabel: 'Send reminders',
    });
    if (!isCurrentGuestCampaignContext(contextVersion)) return;
    if (!confirmed) return;

    if (isDemoMode) {
      toast(`Demo: simulated reminders for ${selectedRecipients.length} selected guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of selectedRecipients) {
        if (!guest.email) continue;
        try {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          await sendGuestInvitationEmail({ guest, weddingSiteId: targetWeddingSiteId, weddingSiteInfo });
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          const sentAtIso = new Date().toISOString();
          await markGuestInvitationAndReminderSentForSite(targetWeddingSiteId, guest.id, sentAtIso);
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          successCount += 1;
        } catch {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          failedCount += 1;
        }
      }

      if (successCount > 0) {
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
        await fetchGuests();
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
      }
      toast(
        successCount > 0
          ? (failedCount > 0
              ? `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
              : `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}`)
          : (failedCount > 0
              ? `${failedCount} selected reminder${failedCount === 1 ? '' : 's'} need review.`
              : 'No selected reminders were sent.'),
        successCount > 0 ? (failedCount > 0 ? 'info' : 'success') : 'error',
      );
    } finally {
      if (isCurrentGuestCampaignContext(contextVersion)) {
        setBulkSending(false);
      }
    }
  };

  const handleSendBulkInvitations = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest reminders from this view.', 'info');
      return;
    }
    if (reminderCandidates.length === 0) {
      toast('No reminder recipients in this filtered view.', 'error');
      return;
    }
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const contextVersion = guestCampaignContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const previewNames = reminderCandidates
      .slice(0, 3)
      .map((guest) => (guest.first_name || guest.last_name) ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim() : guest.name);
    const previewText = previewNames.length
      ? `\n\nFirst recipients: ${previewNames.join(', ')}${reminderCandidates.length > 3 ? ` +${reminderCandidates.length - 3} more` : ''}`
      : '';
    const noContactWarning = contactStats.withNoContact > 0 ? `\nGuests without contact info: ${contactStats.withNoContact} (not included)` : '';
    const confirmed = await requestConfirmation({
      title: 'Send RSVP reminder campaign?',
      description: `Group: ${filterLabel}. Recipients: ${reminderCandidates.length}. Skip recent reminders: ${skipRecentlyInvited ? 'On' : 'Off'}.${noContactWarning ? ` ${noContactWarning.trim()}` : ''}${previewText ? ` ${previewText.trim()}` : ''}`,
      confirmLabel: 'Send campaign',
    });
    if (!isCurrentGuestCampaignContext(contextVersion)) return;
    if (!confirmed) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog((prev) => [{ id: Date.now(), segment: filterLabel, count: reminderCandidates.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${reminderCandidates.length} guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of reminderCandidates) {
        if (!guest.email) continue;
        try {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          await sendGuestInvitationEmail({ guest, weddingSiteId: targetWeddingSiteId, weddingSiteInfo });
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          const sentAtIso = new Date().toISOString();
          await markGuestInvitationAndReminderSentForSite(targetWeddingSiteId, guest.id, sentAtIso);
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          successCount += 1;
        } catch {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          failedCount += 1;
        }
      }

      if (successCount > 0) {
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog((prev) => [{ id: Date.now(), segment: filterLabel, count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
            : `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
      } else {
        toast(failedCount > 0 ? `${failedCount} reminder${failedCount === 1 ? '' : 's'} need review.` : 'No reminders were sent. Please try again.', 'error');
      }
    } finally {
      if (isCurrentGuestCampaignContext(contextVersion)) {
        setBulkSending(false);
      }
    }
  };

  const handleSendDueRemindersNow = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send due reminders.', 'info');
      return;
    }
    if (dueReminderCandidatesGlobal.length === 0) {
      toast('No guests are currently due for reminders.', 'error');
      return;
    }
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const contextVersion = guestCampaignContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const confirmed = await requestConfirmation({
      title: 'Send due reminders now?',
      description: `This will email ${dueReminderCandidatesGlobal.length} ${dueReminderCandidatesGlobal.length === 1 ? 'guest' : 'guests'} who are ready for another reminder after ${reminderCadenceDays} days.`,
      confirmLabel: 'Send due reminders',
    });
    if (!isCurrentGuestCampaignContext(contextVersion)) return;
    if (!confirmed) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog((prev) => [{ id: Date.now(), segment: 'Due Reminder', count: dueReminderCandidatesGlobal.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${dueReminderCandidatesGlobal.length} due guests`, 'success');
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of dueReminderCandidatesGlobal) {
        if (!guest.email) continue;
        try {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          await sendGuestInvitationEmail({ guest, weddingSiteId: targetWeddingSiteId, weddingSiteInfo });
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          await markGuestReminderSentForSite(targetWeddingSiteId, guest.id, new Date().toISOString());
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          successCount += 1;
        } catch {
          if (!isCurrentGuestCampaignContext(contextVersion)) return;
          failedCount += 1;
        }
      }

      if (successCount > 0) {
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog((prev) => [{ id: Date.now(), segment: 'Due Reminder', count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
            : `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
        if (!isCurrentGuestCampaignContext(contextVersion)) return;
      } else {
        toast(failedCount > 0 ? `${failedCount} due reminder${failedCount === 1 ? '' : 's'} need review.` : 'No due reminders were sent. Please try again.', 'error');
      }
    } finally {
      if (isCurrentGuestCampaignContext(contextVersion)) {
        setBulkSending(false);
      }
    }
  };

  return {
    bulkSending,
    handleSendBulkInvitations,
    handleSendDueRemindersNow,
    handleSendInvitation,
    handleSendSelectedInvitations,
    sendingInviteId,
  };
}
