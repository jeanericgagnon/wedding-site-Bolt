import { copyTextOrDownload } from '../../../lib/copyText';
import { buildFilteredEmailList } from './guestDashboardUtils';
import {
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  buildRsvpFollowUpSummary,
} from './guestDashboardUtils';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

interface UseGuestDashboardClipboardActionsInput {
  contactStats: Parameters<typeof buildRsvpFollowUpSummary>[0]['contactStats'];
  exceptionStateByGuest: Parameters<typeof buildRsvpExceptionChecklistLines>[0]['exceptionStateByGuest'];
  filteredGuests: Parameters<typeof buildRsvpExceptionChecklistLines>[0]['guests'];
  filterStatus: string;
  followUpTasks: Array<{ text: string }>;
  reminderCandidates: Parameters<typeof buildFilteredEmailList>[0];
  rsvpOps: Parameters<typeof buildRsvpFollowUpSummary>[0]['rsvpOps'];
  segmentLabel: string;
  toast: ToastFn;
}

export function useGuestDashboardClipboardActions({
  contactStats,
  exceptionStateByGuest,
  filteredGuests,
  filterStatus,
  followUpTasks,
  reminderCandidates,
  rsvpOps,
  segmentLabel,
  toast,
}: UseGuestDashboardClipboardActionsInput) {
  const handleCopyOpsSummary = async () => {
    const summary = buildRsvpFollowUpSummary({
      generatedAt: new Date(),
      segmentLabel,
      eligibleReminderCount: reminderCandidates.length,
      rsvpOps,
      contactStats,
    });
    const result = await copyTextOrDownload(summary, 'dayof-rsvp-follow-up-summary.txt');
    if (result === 'copied') {
      toast('Copied RSVP follow-up summary', 'success');
    } else {
      toast('Clipboard was blocked, so the RSVP follow-up summary downloaded.', 'success');
    }
  };

  const handleCopyExceptionChecklist = async () => {
    const lines = buildRsvpExceptionChecklistLines({ guests: filteredGuests, exceptionStateByGuest });
    if (lines.length === 0) {
      toast('No RSVP exceptions in this segment.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-rsvp-exception-checklist.txt');
    if (result === 'copied') {
      toast(`Copied RSVP exception checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the exception checklist downloaded.', 'success');
    }
  };

  const handleCopyMissingMealChecklist = async () => {
    const lines = buildMissingMealChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('No missing meal choices in this segment.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-meal-follow-up-checklist.txt');
    if (result === 'copied') {
      toast(`Copied meal follow-up checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the meal checklist downloaded.', 'success');
    }
  };

  const handleCopyNoContactChecklist = async () => {
    const lines = buildNoContactChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('Everyone in this group has a contact path.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-missing-contact-list.txt');
    if (result === 'copied') {
      toast(`Copied missing-contact list for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the missing-contact list downloaded.', 'success');
    }
  };

  const handleCopyFilteredEmails = async () => {
    const emails = buildFilteredEmailList(reminderCandidates);
    if (emails.length === 0) {
      toast('No emails available in this filtered segment.', 'error');
      return;
    }
    const payload = emails.join(', ');
    const result = await copyTextOrDownload(payload, 'dayof-filtered-guest-emails.txt');
    if (result === 'copied') {
      toast(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the filtered emails downloaded.', 'success');
    }
  };

  const handleCopyChecklist = async () => {
    const lines = followUpTasks.map((task) => `- [ ] ${task.text}`);
    const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
    const result = await copyTextOrDownload(text, 'dayof-guest-checklist.md', 'text/markdown;charset=utf-8');
    toast(
      result === 'copied'
        ? 'Copied checklist markdown'
        : 'Clipboard was blocked, so the checklist downloaded.',
      'success',
    );
  };

  const handleCopyCampaignDryRun = async () => {
    toast(`Dry run ready for ${reminderCandidates.length} ${reminderCandidates.length === 1 ? 'recipient' : 'recipients'}.`);
    const preview = reminderCandidates.slice(0, 8).map((guest: any) =>
      (guest.first_name || guest.last_name)
        ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
        : guest.name,
    );
    await copyTextOrDownload(
      `Campaign dry run (${segmentLabel})\nRecipients: ${reminderCandidates.length}\n\n${preview.join('\n')}${reminderCandidates.length > preview.length ? `\n+${reminderCandidates.length - preview.length} more` : ''}`,
      'dayof-campaign-dry-run.txt',
    );
  };

  return {
    handleCopyCampaignDryRun,
    handleCopyChecklist,
    handleCopyExceptionChecklist,
    handleCopyFilteredEmails,
    handleCopyMissingMealChecklist,
    handleCopyNoContactChecklist,
    handleCopyOpsSummary,
  };
}
