import { useEffect, useMemo, useRef } from 'react';
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
  const copyActionRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyActionContextKey = useMemo(() => JSON.stringify({
    segmentLabel,
    filterStatus,
    contactStats,
    rsvpOps,
    reminderGuests: reminderCandidates.map((guest) => [
      guest.id,
      guest.email ?? null,
      guest.phone ?? null,
      guest.invite_token ?? null,
      guest.rsvp_status ?? null,
    ]),
    filteredGuests: filteredGuests.map((guest) => [
      guest.id,
      guest.email ?? null,
      guest.phone ?? null,
      guest.rsvp_status ?? null,
      guest.rsvp?.meal_choice ?? null,
    ]),
    exceptionGuestIds: Array.from(exceptionStateByGuest.keys()).sort(),
    followUpTasks: followUpTasks.map((task) => task.text),
  }), [contactStats, exceptionStateByGuest, filteredGuests, filterStatus, followUpTasks, reminderCandidates, rsvpOps, segmentLabel]);
  const copyActionContextKeyRef = useRef(copyActionContextKey);
  copyActionContextKeyRef.current = copyActionContextKey;

  useEffect(() => () => {
    mountedRef.current = false;
    copyActionRequestIdRef.current += 1;
  }, []);

  const beginClipboardCopyAction = () => {
    const requestId = ++copyActionRequestIdRef.current;
    const requestContextKey = copyActionContextKeyRef.current;
    return () => (
      mountedRef.current &&
      requestId === copyActionRequestIdRef.current &&
      requestContextKey === copyActionContextKeyRef.current
    );
  };

  const copyWithFeedback = async (
    value: string,
    filename: string,
    successMessage: string,
    downloadedMessage: string,
    failureMessage: string,
    contentType?: string,
  ) => {
    const isCurrentClipboardCopyAction = beginClipboardCopyAction();
    try {
      const result = await copyTextOrDownload(value, filename, contentType);
      if (!isCurrentClipboardCopyAction()) return null;
      toast(result === 'copied' ? successMessage : downloadedMessage, 'success');
      return result;
    } catch {
      if (!isCurrentClipboardCopyAction()) return null;
      toast(failureMessage, 'error');
      return null;
    }
  };

  const handleCopyOpsSummary = async () => {
    const summary = buildRsvpFollowUpSummary({
      generatedAt: new Date(),
      segmentLabel,
      eligibleReminderCount: reminderCandidates.length,
      rsvpOps,
      contactStats,
    });
    await copyWithFeedback(
      summary,
      'dayof-rsvp-follow-up-summary.txt',
      'Copied RSVP follow-up summary',
      'Clipboard was blocked, so the RSVP follow-up summary downloaded.',
      'Couldn’t copy the RSVP follow-up summary right now.',
    );
  };

  const handleCopyExceptionChecklist = async () => {
    const lines = buildRsvpExceptionChecklistLines({ guests: filteredGuests, exceptionStateByGuest });
    if (lines.length === 0) {
      toast('No RSVP exceptions in this segment.', 'error');
      return null;
    }
    const payload = lines.join('\n');
    return copyWithFeedback(
      payload,
      'dayof-rsvp-exception-checklist.txt',
      `Copied RSVP exception checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`,
      'Clipboard was blocked, so the exception checklist downloaded.',
      'Couldn’t copy the RSVP exception checklist right now.',
    );
  };

  const handleCopyMissingMealChecklist = async () => {
    const lines = buildMissingMealChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('No missing meal choices in this segment.', 'error');
      return null;
    }
    const payload = lines.join('\n');
    return copyWithFeedback(
      payload,
      'dayof-meal-follow-up-checklist.txt',
      `Copied meal follow-up checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`,
      'Clipboard was blocked, so the meal checklist downloaded.',
      'Couldn’t copy the meal follow-up checklist right now.',
    );
  };

  const handleCopyNoContactChecklist = async () => {
    const lines = buildNoContactChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('Everyone in this group has a contact path.', 'error');
      return null;
    }
    const payload = lines.join('\n');
    return copyWithFeedback(
      payload,
      'dayof-missing-contact-list.txt',
      `Copied missing-contact list for ${lines.length} guest${lines.length === 1 ? '' : 's'}`,
      'Clipboard was blocked, so the missing-contact list downloaded.',
      'Couldn’t copy the missing-contact list right now.',
    );
  };

  const handleCopyFilteredEmails = async () => {
    const emails = buildFilteredEmailList(reminderCandidates);
    if (emails.length === 0) {
      toast('No emails available in this filtered segment.', 'error');
      return null;
    }
    const payload = emails.join(', ');
    return copyWithFeedback(
      payload,
      'dayof-filtered-guest-emails.txt',
      `Copied ${emails.length} email${emails.length === 1 ? '' : 's'}`,
      'Clipboard was blocked, so the filtered emails downloaded.',
      'Couldn’t copy the filtered guest emails right now.',
    );
  };

  const handleCopyChecklist = async () => {
    const lines = followUpTasks.map((task) => `- [ ] ${task.text}`);
    const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
    return copyWithFeedback(
      text,
      'dayof-guest-checklist.md',
      'Copied checklist markdown',
      'Clipboard was blocked, so the checklist downloaded.',
      'Couldn’t copy the guest checklist right now.',
      'text/markdown;charset=utf-8',
    );
  };

  const handleCopyCampaignDryRun = async () => {
    toast(`Dry run ready for ${reminderCandidates.length} ${reminderCandidates.length === 1 ? 'recipient' : 'recipients'}.`);
    const preview = reminderCandidates.slice(0, 8).map((guest: any) =>
      (guest.first_name || guest.last_name)
        ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
        : guest.name,
    );
    await copyWithFeedback(
      `Campaign dry run (${segmentLabel})\nRecipients: ${reminderCandidates.length}\n\n${preview.join('\n')}${reminderCandidates.length > preview.length ? `\n+${reminderCandidates.length - preview.length} more` : ''}`,
      'dayof-campaign-dry-run.txt',
      'Copied campaign dry run preview',
      'Clipboard was blocked, so the campaign dry run downloaded.',
      'Couldn’t copy the campaign dry run right now.',
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
