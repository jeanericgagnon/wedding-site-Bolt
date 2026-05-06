import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus, hasRespondedRsvpStatus } from '../../../lib/rsvpStatus';
import { copyTextOrDownload } from '../../../lib/copyText';
import { resolvePublicSiteSlugFromRow } from '../../../lib/publicSiteSlug';
import type { ToastType } from '../../../components/ui/Toast';
import type { GuestWithRSVP, ItineraryEvent, WeddingSiteInfo } from './guestDashboardTypes';
import {
  buildCheckedInGuestsCsv,
  buildEventAttendanceCsv,
  buildGuestAddressCollectionCsv,
  buildGuestExportCsv,
  buildGuestSmsRsvpLinkRows,
  buildHouseholdLabelsCsv,
  buildThankYouDueCsv,
  downloadGuestCsv,
  getGuestExportSegmentSuffix,
} from './guestDashboardUtils';

interface UseGuestDashboardExportsInput {
  dueThankYouGuestIds: Set<string>;
  effectiveItineraryEvents: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
  filteredGuests: GuestWithRSVP[];
  guests: GuestWithRSVP[];
  reminderCandidates: GuestWithRSVP[];
  segmentLabel: string;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
  weddingSiteInfo: WeddingSiteInfo | null;
}

export function useGuestDashboardExports({
  dueThankYouGuestIds,
  effectiveItineraryEvents,
  eventInviteGuestMap,
  filteredGuests,
  guests,
  reminderCandidates,
  segmentLabel,
  toast,
  weddingSiteId,
  weddingSiteInfo,
}: UseGuestDashboardExportsInput) {
  const exportCSV = (rowsSource: GuestWithRSVP[] = guests, suffix = 'guests') => {
    downloadGuestCsv(buildGuestExportCsv({ guests: rowsSource, origin: window.location.origin }), suffix);
  };

  const copyContactRequestLink = async () => {
    if (!weddingSiteId || !weddingSiteInfo) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const publicSlug = resolvePublicSiteSlugFromRow(weddingSiteInfo as unknown as Record<string, unknown>);
    if (!publicSlug) {
      toast('Set a public site slug before sharing the guest update link', 'error');
      return;
    }

    const url = `https://${publicSlug}.dayof.love/guest-contact/${publicSlug}`;
    const result = await copyTextOrDownload(url, 'dayof-guest-update-link.txt');
    toast(result === 'copied' ? 'Guest update link copied' : 'Clipboard was blocked, so the guest update link downloaded.', 'success');
  };

  const copySmsRsvpLinksForFiltered = async () => {
    if (!weddingSiteId || !weddingSiteInfo?.site_slug) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const rows = buildGuestSmsRsvpLinkRows({ guests: reminderCandidates, siteSlug: weddingSiteInfo.site_slug });
    if (rows.length === 0) {
      toast('No RSVP links available for this segment.', 'error');
      return;
    }

    const result = await copyTextOrDownload(rows.join('\n'), 'dayof-text-rsvp-links.txt');
    toast(
      result === 'copied'
        ? `Copied ${rows.length} text RSVP link${rows.length === 1 ? '' : 's'}`
        : 'Clipboard was blocked, so the text RSVP links downloaded.',
      'success',
    );
  };

  return {
    copyContactRequestLink,
    copySmsRsvpLinksForFiltered,
    exportAddressCollectionCSV: () => downloadGuestCsv(buildGuestAddressCollectionCsv(guests), 'guest-addresses'),
    exportAttendingGuestsCSV: () => exportCSV(guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)), 'guests-attending'),
    exportCheckedInCSV: () => downloadGuestCsv(buildCheckedInGuestsCsv(guests.filter((guest) => !!guest.checked_in_at)), 'checked-in-guests'),
    exportCSV,
    exportDeclinedGuestsCSV: () => exportCSV(guests.filter((guest) => isDeclinedRsvpStatus(guest.rsvp_status)), 'guests-declined'),
    exportEventAttendanceCSV: () => downloadGuestCsv(buildEventAttendanceCsv({ guests, events: effectiveItineraryEvents, eventInviteGuestMap }), 'event-attendance'),
    exportFilteredCSV: () => exportCSV(filteredGuests, `guests-${getGuestExportSegmentSuffix(segmentLabel)}`),
    exportHouseholdLabelsCSV: () => downloadGuestCsv(buildHouseholdLabelsCsv({ guests, origin: window.location.origin }), 'household-labels'),
    exportMissingMealCSV: () => exportCSV(guests.filter((guest) => guest.rsvp?.attending && !guest.rsvp?.meal_choice), 'guests-missing-meal'),
    exportPendingGuestsCSV: () => exportCSV(guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)), 'guests-pending-rsvp'),
    exportRsvpRespondersCSV: () => exportCSV(guests.filter((guest) => hasRespondedRsvpStatus(guest.rsvp_status)), 'guests-rsvp-responders'),
    exportThankYouDueCSV: () => downloadGuestCsv(buildThankYouDueCsv(guests.filter((guest) => dueThankYouGuestIds.has(guest.id))), 'thank-you-due'),
  };
}
