import { cateringRowsToCsv } from '../../../lib/seatingCateringExportReadiness';
import type { SeatingLayoutVersion, EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';
import { createSeatingVersion, downloadCSV, exportPlaceCardsCSV, exportSeatingCSV, markSeatingVersionRestored } from './seatingService';
import { buildSeatingLayoutSvg, buildSeatingReportHtml, buildTableSummaryCsv, safeExportSlug } from './seatingDashboardUtils';
import { readSeatingVersions, writeDemoSeatingState, writeSeatingVersions } from './seatingDemoStorage';

export function useSeatingDashboardArtifacts(args: {
  allGuests: EligibleGuest[];
  arrivedCount: number;
  assignments: SeatingAssignment[];
  cateringPacket: ReturnType<typeof import('../../../lib/seatingCateringExportReadiness').buildSeatingCateringPacket>;
  counters: { attending: number; invited: number; declined: number; pending: number; seated: number; unassigned: number } | null;
  isDemoMode: boolean;
  itineraryEvents: Array<{ id: string; event_name: string; event_date: string | null }>;
  requestConfirmation: (options: { title: string; description: string; confirmLabel: string; tone?: 'primary' | 'danger' }) => Promise<boolean>;
  selectedEventId: string | null;
  seatingEvent: { id: string } | null;
  setAssignments: React.Dispatch<React.SetStateAction<SeatingAssignment[]>>;
  setTables: React.Dispatch<React.SetStateAction<SeatingTable[]>>;
  setVersions: React.Dispatch<React.SetStateAction<SeatingLayoutVersion[]>>;
  siteId: string | null;
  tables: SeatingTable[];
  toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  versions: SeatingLayoutVersion[];
}) {
  function getSelectedEvent() {
    return args.itineraryEvents.find((event) => event.id === args.selectedEventId);
  }

  function handleExportCSV() {
    const selectedEvent = getSelectedEvent();
    const payload = exportSeatingCSV(args.allGuests, args.tables, args.assignments, selectedEvent?.event_name ?? 'Event');
    downloadCSV(payload, `seating-${selectedEvent?.event_name ?? 'event'}.csv`);
  }

  function handleExportPlaceCards() {
    const payload = exportPlaceCardsCSV(args.allGuests, args.tables, args.assignments);
    downloadCSV(payload, 'place-cards.csv');
  }

  function handleExportTableSummaryCSV() {
    const selectedEvent = getSelectedEvent();
    const eventName = selectedEvent?.event_name ?? 'Event';
    downloadCSV(buildTableSummaryCsv(args.cateringPacket), `table-summary-${safeExportSlug(eventName)}.csv`);
  }

  function handleExportCateringCSV() {
    const selectedEvent = getSelectedEvent();
    const eventName = selectedEvent?.event_name ?? 'Event';
    downloadCSV(cateringRowsToCsv(args.cateringPacket.rows), `catering-packet-${safeExportSlug(eventName)}.csv`);
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPDF() {
    const selectedEvent = getSelectedEvent();
    const eventName = selectedEvent?.event_name ?? 'Event';
    const now = new Date().toLocaleString();
    const html = buildSeatingReportHtml({
      eventName,
      createdLabel: now,
      guests: args.allGuests,
      tables: args.tables,
      assignments: args.assignments,
      counters: args.counters,
      arrivedCount: args.arrivedCount,
    });

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!popup) {
      args.toast('Popup blocked. Please allow popups to export PDF.', 'error');
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function handleExportImage() {
    const selectedEvent = getSelectedEvent();
    const eventName = selectedEvent?.event_name ?? 'Event';
    const svg = buildSeatingLayoutSvg({ eventName, tables: args.tables, assignments: args.assignments });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seating-layout-${(eventName || 'event').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSaveVersion() {
    if (!args.selectedEventId || !args.siteId || !args.seatingEvent) return;
    const selectedEvent = getSelectedEvent();
    if (!args.isDemoMode) {
      try {
        const saved = await createSeatingVersion({
          weddingSiteId: args.siteId,
          seatingEventId: args.seatingEvent.id,
          itineraryEventId: args.selectedEventId,
          label: `${selectedEvent?.event_name ?? 'Layout'} v${args.versions.length + 1}`,
          tables: args.tables,
          assignments: args.assignments,
        });
        args.setVersions((prev) => [saved, ...prev].slice(0, 12));
        args.toast('Seating version saved for the team', 'success');
      } catch {
        args.toast('Couldn’t save that seating version. Please try again.', 'error');
      }
      return;
    }

    const nextVersion: SeatingLayoutVersion = {
      id: `version-${Date.now()}`,
      wedding_site_id: args.siteId,
      seating_event_id: args.seatingEvent.id,
      itinerary_event_id: args.selectedEventId,
      label: `${selectedEvent?.event_name ?? 'Layout'} v${args.versions.length + 1}`,
      created_at: new Date().toISOString(),
      created_by: null,
      restored_at: null,
      tables: args.tables,
      assignments: args.assignments,
    };
    const allVersions = [nextVersion, ...readSeatingVersions().filter((version) => version.id !== nextVersion.id)].slice(0, 40);
    writeSeatingVersions(allVersions);
    args.setVersions(allVersions.filter((version) => version.itinerary_event_id === args.selectedEventId));
    args.toast('Seating version saved on this device', 'success');
  }

  async function handleRestoreVersion(version: SeatingLayoutVersion) {
    const confirmed = await args.requestConfirmation({
      title: `Restore ${version.label}?`,
      description: 'This replaces the current local layout view with the saved version. You can still apply changes after reviewing it.',
      confirmLabel: 'Restore version',
    });
    if (!confirmed) return;
    args.setTables(version.tables);
    args.setAssignments(version.assignments);
    if (args.isDemoMode && args.selectedEventId) {
      writeDemoSeatingState(args.selectedEventId, version.tables, version.assignments);
    } else {
      try {
        await markSeatingVersionRestored(version.id);
      } catch {
        // ignore restore marker failure
      }
    }
    args.toast(args.isDemoMode ? 'Version restored locally.' : 'Version restored as a working copy. Apply changes to persist the live seating board.', 'success');
  }

  return {
    handleExportCSV,
    handleExportCateringCSV,
    handleExportImage,
    handleExportPDF,
    handleExportPlaceCards,
    handleExportTableSummaryCSV,
    handlePrint,
    handleRestoreVersion,
    handleSaveVersion,
  };
}
