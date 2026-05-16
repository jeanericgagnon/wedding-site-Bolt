import type React from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { AlertTriangle, CheckCircle2, Download, History, Image as ImageIcon, Plus, RefreshCw, TableProperties, Users } from 'lucide-react';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { formatSeatingEventLabel } from '../seatingEventDate';
import { GuestChip, TableCard, TableForm, UnassignedPool } from './SeatingDashboardComponents';
import { getAssignmentsForTable, getGuestsAssignedToTable } from './seatingDashboardUtils';
import type { EligibleGuest, SeatingAssignment, SeatingTable, SeatingLayoutVersion } from './seatingService';

type ItineraryEventOption = {
  id: string;
  event_name: string;
  event_date: string | null;
};

type CateringPacket = {
  readiness: {
    status: string;
    summary: string;
    assignedCount: number;
    attendingCount: number;
    mealChoiceCount: number;
    dietaryNoteCount: number;
    checklist: Array<{ id: string; label: string; detail: string; state: string }>;
  };
};

type CateringHandoffReview = {
  status: string;
  summary: string;
  sourceCounts: {
    attendingGuests: number;
    tablesWithGuests: number;
    mealRows: number;
    dietaryRows: number;
    unassignedGuests: number;
    invalidAssignments: number;
  };
  files: Array<{ id: string; label: string; format: string; detail: string; status: string }>;
  warnings: string[];
};

export function SeatingDashboardRouteContent(props: {
  activeGuest: EligibleGuest | null;
  activeSeatGuest: EligibleGuest | null;
  addingTable: boolean;
  allGuests: EligibleGuest[];
  assignments: SeatingAssignment[];
  arrivedCount: number;
  arrivedGuestIds: Set<string>;
  assignedGuestIdSet: Set<string>;
  autoCapacity: number;
  assignGuestToSeatDirect: (guestId: string, targetTableId: string, targetSeatIndex?: number) => Promise<void>;
  canvasFullscreen: boolean;
  canvasZoom: number;
  cateringHandoffReview: CateringHandoffReview;
  cateringPacket: CateringPacket;
  checkInCandidates: EligibleGuest[];
  checkInFilter: 'not_arrived' | 'arrived' | 'seated' | 'unseated' | 'all';
  checkInMode: boolean;
  checkInQuery: string;
  clearSeatAssignment: (tableId: string, seatIndex: number) => Promise<void>;
  closeSeatPicker: () => void;
  counters: {
    invited: number;
    attending: number;
    declined: number;
    pending: number;
    seated: number;
    unassigned: number;
  } | null;
  editingTable: SeatingTable | null;
  getDefaultTablePosition: (index: number) => { x: number; y: number };
  handleAddTable: (tableData: Partial<SeatingTable>) => Promise<void>;
  handleAutoCreateTables: () => Promise<void>;
  handleAutoSeat: () => Promise<void>;
  handleBulkCheckIn: (guestIds: string[], checkedIn: boolean) => Promise<void>;
  handleCanvasWheelZoom: (event: React.WheelEvent<HTMLDivElement>) => void;
  handleCheckDrift: () => Promise<void>;
  handleDeleteTable: (id: string) => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleDragStart: (event: DragStartEvent) => void;
  handleExportCSV: () => void;
  handleExportCateringCSV: () => void;
  handleExportKitchenSummaryCSV: () => void;
  handleExportImage: () => void;
  handleExportPDF: () => void;
  handleExportTableSummaryCSV: () => void;
  handleRemoveGuest: (guestId: string) => Promise<void>;
  handleReset: () => Promise<void>;
  handleResizeTable: (id: string, width: number, height: number) => Promise<void>;
  handleRestoreVersion: (version: SeatingLayoutVersion) => void;
  handleRotateTable: (id: string, deltaDeg: number) => Promise<void>;
  handleSaveVersion: () => Promise<void>;
  handleToggleCheckIn: (guestId: string, checkedIn: boolean) => Promise<void>;
  handleUpdateTable: (id: string, tableData: Partial<SeatingTable>) => Promise<void>;
  invalidCount: number;
  itineraryEvents: ItineraryEventOption[];
  layoutMode: 'visual' | 'list';
  loadingSeating: boolean;
  mealHeadcountByTable: Array<{ tableName: string; assigned: number; capacity: number; mealCounts: Array<{ meal: string; count: number }>; dietaryNotes: number }>;
  movingTableId: string | null;
  openSeatPicker: (tableId: string, seatIndex: number) => void;
  packetReadyTone: string;
  seatPicker: { tableId: string; seatIndex: number } | null;
  seatPickerOptions: EligibleGuest[];
  seatPickerQuery: string;
  seatingBusyAction: 'auto-create' | 'auto-seat' | 'reset' | null;
  seatingEvent: { id: string } | null;
  selectedEventId: string | null;
  selectedItineraryEvent: { event_name: string } | null | undefined;
  selectedTableId: string | null;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  setAddingTable: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoCapacity: React.Dispatch<React.SetStateAction<number>>;
  setCanvasFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  setCheckInFilter: React.Dispatch<React.SetStateAction<'not_arrived' | 'arrived' | 'seated' | 'unseated' | 'all'>>;
  setCheckInMode: React.Dispatch<React.SetStateAction<boolean>>;
  setCheckInQuery: React.Dispatch<React.SetStateAction<string>>;
  setEditingTable: React.Dispatch<React.SetStateAction<SeatingTable | null>>;
  setLayoutMode: React.Dispatch<React.SetStateAction<'visual' | 'list'>>;
  setSelectedEventId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>;
  setSeatPickerQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowAutoTablesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResetConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showAutoTablesModal: boolean;
  showResetConfirm: boolean;
  startMoveTable: (table: SeatingTable, index: number, event: React.MouseEvent, layoutMode: 'visual' | 'list') => void;
  tables: SeatingTable[];
  unassignedGuests: EligibleGuest[];
  versions: SeatingLayoutVersion[];
}) {
  return (
    <div className="max-w-[1100px] mx-auto space-y-5" onClick={() => props.setSelectedTableId(null)}>
      <DashboardPageHero
        eyebrow="Seating"
        title="Tables, assignments, and lookup."
        description="Build seating arrangements and make it easy for guests or helpers to find the right table."
        stats={[
          { label: 'Tables', value: props.tables.length, detail: props.selectedItineraryEvent?.event_name ?? 'current event' },
          { label: 'Seated', value: props.counters?.seated ?? props.assignments.length, detail: `${props.unassignedGuests.length} still unassigned` },
          { label: 'Arrived', value: props.arrivedCount, detail: props.checkInMode ? 'check-in is on' : 'check-in off' },
        ]}
        actions={
          <>
            <a href="/dashboard/seating-lookup" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Open seating lookup</a>
            <a href="/dashboard/coordinator" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Wedding Day</a>
          </>
        }
      >
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={props.handleExportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={props.handleExportTableSummaryCSV}>
            <Download className="w-4 h-4 mr-1" /> Table summary
          </Button>
          <Button variant="outline" size="sm" onClick={props.handleExportCateringCSV}>
            <Download className="w-4 h-4 mr-1" /> Catering CSV
          </Button>
          <Button variant="outline" size="sm" onClick={props.handleExportKitchenSummaryCSV}>
            <Download className="w-4 h-4 mr-1" /> Kitchen summary
          </Button>
          <Button variant="outline" size="sm" onClick={props.handleExportPDF}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={props.handleExportImage}>
            <ImageIcon className="w-4 h-4 mr-1" /> Image
          </Button>
          <Button variant={props.checkInMode ? 'primary' : 'outline'} size="sm" onClick={() => props.setCheckInMode((value) => !value)}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> {props.checkInMode ? 'Check-in: On' : 'Check-in Mode'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void props.handleCheckDrift()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Check assignments
          </Button>
          <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5">
            <button
              className={`rounded-md px-4 py-2 text-sm transition-colors ${props.layoutMode === 'visual' ? 'border border-primary/25 bg-primary/10 text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
              onClick={() => props.setLayoutMode('visual')}
            >
              Canvas Layout
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm transition-colors ${props.layoutMode === 'list' ? 'border border-primary/25 bg-primary/10 text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
              onClick={() => props.setLayoutMode('list')}
            >
              List Layout
            </button>
          </div>
          <div className="px-3 py-2 rounded-lg border border-border-subtle bg-surface text-xs text-text-secondary">
            Current Event: <span className="font-medium text-text-primary">{props.selectedItineraryEvent?.event_name ?? '—'}</span>
          </div>
        </div>
      </DashboardPageHero>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm font-medium text-text-secondary whitespace-nowrap">Event:</label>
          <select
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={props.selectedEventId ?? ''}
            onChange={(event) => props.setSelectedEventId(event.target.value)}
          >
            {props.itineraryEvents.map((item) => (
              <option key={item.id} value={item.id}>
                {formatSeatingEventLabel(item.event_name, item.event_date)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${props.packetReadyTone}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {props.cateringPacket.readiness.status === 'ready' ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-primary" />
              )}
              <p className="text-sm font-semibold text-text-primary">Venue and catering packet</p>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{props.cateringPacket.readiness.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{props.cateringPacket.readiness.assignedCount}/{props.cateringPacket.readiness.attendingCount}</p>
              <p className="text-[11px] text-text-tertiary">Seated</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{props.cateringPacket.readiness.mealChoiceCount}</p>
              <p className="text-[11px] text-text-tertiary">Meals</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{props.cateringPacket.readiness.dietaryNoteCount}</p>
              <p className="text-[11px] text-text-tertiary">Notes</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {props.cateringPacket.readiness.checklist.map((item) => {
            const iconClass = item.state === 'ready' ? 'text-success' : item.state === 'needs-action' ? 'text-primary' : 'text-text-tertiary';
            return (
              <div key={item.id} className="flex gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2">
                {item.state === 'ready' ? (
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-secondary">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg border border-border-subtle bg-surface p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Venue handoff review</p>
              <p className="mt-1 text-xs text-text-secondary">{props.cateringHandoffReview.summary}</p>
            </div>
            <Badge variant={props.cateringHandoffReview.status === 'ready' ? 'success' : 'warning'}>
              {props.cateringHandoffReview.status === 'ready' ? 'Ready' : 'Review'}
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Guests', value: props.cateringHandoffReview.sourceCounts.attendingGuests },
              { label: 'Tables', value: props.cateringHandoffReview.sourceCounts.tablesWithGuests },
              { label: 'Meals', value: props.cateringHandoffReview.sourceCounts.mealRows },
              { label: 'Notes', value: props.cateringHandoffReview.sourceCounts.dietaryRows },
              { label: 'Unseated', value: props.cateringHandoffReview.sourceCounts.unassignedGuests },
              { label: 'Review', value: props.cateringHandoffReview.sourceCounts.invalidAssignments },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border-subtle bg-surface-subtle px-2 py-2 text-center">
                <p className="text-base font-semibold text-text-primary">{stat.value}</p>
                <p className="text-[11px] text-text-tertiary">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {props.cateringHandoffReview.files.map((file) => (
              <div key={file.id} className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2">
                {file.status === 'ready' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{file.label} <span className="font-normal text-text-tertiary">({file.format})</span></p>
                  <p className="text-xs text-text-secondary">{file.detail}</p>
                </div>
              </div>
            ))}
          </div>
          {props.cateringHandoffReview.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-xs font-semibold text-text-primary">Before final handoff</p>
              <ul className="mt-1 space-y-1">
                {props.cateringHandoffReview.warnings.map((warning) => (
                  <li key={warning} className="text-xs text-text-secondary">{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-3">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text-primary">Seating insights</span>
          <span className="text-xs text-text-tertiary">View details</span>
        </summary>
        <div className="mt-3 space-y-3">
          {props.layoutMode === 'visual' && (
            <div className="hidden flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-tertiary sm:flex">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface border border-border-subtle" /> Empty seat</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-light border border-primary/40" /> Active drop zone</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success/10 border border-success/40" /> Arrived (check-in)</span>
            </div>
          )}

          {props.counters && (
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {[
                { label: 'Invited', value: props.counters.invited, color: 'text-text-primary' },
                { label: 'Attending', value: props.counters.attending, color: 'text-primary' },
                { label: 'Arrived', value: props.arrivedCount, color: 'text-primary' },
                { label: 'Declined', value: props.counters.declined, color: 'text-text-secondary' },
                { label: 'Pending', value: props.counters.pending, color: 'text-text-secondary' },
                { label: 'Seated', value: props.counters.seated, color: 'text-primary' },
                { label: 'Unassigned', value: props.counters.unassigned, color: props.counters.unassigned > 0 ? 'text-primary' : 'text-text-tertiary' },
              ].map((stat) => (
                <Card key={stat.label} padding="sm" className="text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-text-tertiary">{stat.label}</p>
                </Card>
              ))}
            </div>
          )}

          {props.mealHeadcountByTable.length > 0 && (
            <Card padding="sm" className="bg-surface border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-text-primary">Meal headcount by table</p>
                <span className="text-xs text-text-tertiary">Assigned guests</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {props.mealHeadcountByTable.map((row) => (
                  <div key={row.tableName} className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2">
                    <p className="text-sm font-medium text-text-primary truncate">{row.tableName}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {row.assigned}/{row.capacity} guests · {row.mealCounts.map((meal) => `${meal.meal}: ${meal.count}`).join(', ')}
                    </p>
                    {row.dietaryNotes > 0 && (
                      <p className="mt-0.5 text-[11px] text-primary">{row.dietaryNotes} dietary note{row.dietaryNotes === 1 ? '' : 's'}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {props.invalidCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
              <span className="text-text-primary">
                <span className="font-medium text-error">{props.invalidCount}</span> assignment(s) are invalid due to RSVP changes.
              </span>
            </div>
          )}
        </div>
      </details>

      <Card className="p-4 border border-border-subtle bg-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-text-primary">Layout versions</p>
            </div>
            <p className="mt-1 text-xs text-text-secondary">Save comparison points before trying a new seating plan. Versions are local snapshots for fast iteration.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void props.handleSaveVersion()}>Save version</Button>
        </div>
        {props.versions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {props.versions.slice(0, 6).map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => props.handleRestoreVersion(version)}
                className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-left text-xs hover:border-primary/40"
              >
                <span className="block font-medium text-text-primary">{version.label}</span>
                <span className="text-text-tertiary">{new Date(version.created_at).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">Table actions</p>
            <p className="mt-1 text-sm text-text-secondary">Create tables fast, auto-seat where it helps, or reset the room when plans changed.</p>
          </div>
          <Button size="sm" onClick={() => props.setAddingTable(true)} disabled={!props.seatingEvent || props.loadingSeating}>
            <Plus className="w-4 h-4 mr-1" /> Add Table
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => props.setShowAutoTablesModal(true)}
            disabled={props.seatingBusyAction !== null}
            className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-primary-light/10 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-text-primary">Auto-create tables</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Build enough tables for the current attending count.</p>
          </button>
          <button
            type="button"
            onClick={() => { void props.handleAutoSeat(); }}
            disabled={props.tables.length === 0 || props.unassignedGuests.length === 0 || props.seatingBusyAction !== null}
            className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-primary-light/10 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-text-primary">{props.seatingBusyAction === 'auto-seat' ? 'Auto-seating guests…' : 'Auto-seat guests'}</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Fill open seats for the {props.unassignedGuests.length} guests still waiting.</p>
          </button>
          <button
            type="button"
            onClick={() => props.setShowResetConfirm(true)}
            disabled={props.assignments.length === 0 || props.seatingBusyAction !== null}
            className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-surface-subtle/60 disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-text-primary">Reset seating</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Clear every seat assignment for this event and start fresh.</p>
          </button>
        </div>
      </div>

      {props.checkInMode && (
        <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-tertiary">Check-in mode</p>
              <p className="mt-1 text-sm text-text-secondary">Search an attendee, then mark them arrived without leaving the seating board.</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-right">
              <p className="text-[11px] text-text-tertiary">Arrivals</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{props.arrivedCount}/{props.counters?.attending ?? 0}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={props.checkInQuery}
              onChange={(event) => props.setCheckInQuery(event.target.value)}
              placeholder="Search attendee for quick check-in"
              className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={props.checkInFilter}
              onChange={(event) => props.setCheckInFilter(event.target.value as typeof props.checkInFilter)}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="not_arrived">Not arrived</option>
              <option value="arrived">Arrived</option>
              <option value="seated">Seated only</option>
              <option value="unseated">Unseated only</option>
              <option value="all">All attendees</option>
            </select>
            <span className="text-xs text-text-tertiary">Live check-in updates</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span>{props.checkInCandidates.length} match{props.checkInCandidates.length !== 1 ? 'es' : ''} shown</span>
            {props.checkInCandidates.some((guest) => !props.arrivedGuestIds.has(guest.id)) && (
              <button
                type="button"
                onClick={() => void props.handleBulkCheckIn(props.checkInCandidates.filter((guest) => !props.arrivedGuestIds.has(guest.id)).map((guest) => guest.id), true)}
                className="rounded-md border border-primary/25 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/15"
              >
                Mark visible arrived
              </button>
            )}
            {props.checkInCandidates.some((guest) => props.arrivedGuestIds.has(guest.id)) && (
              <button
                type="button"
                onClick={() => void props.handleBulkCheckIn(props.checkInCandidates.filter((guest) => props.arrivedGuestIds.has(guest.id)).map((guest) => guest.id), false)}
                className="rounded-md border border-border-subtle bg-white px-3 py-1 text-text-secondary hover:border-primary/30 hover:text-primary"
              >
                Clear visible arrivals
              </button>
            )}
          </div>
          {(props.checkInQuery.trim().length > 0 || props.checkInFilter !== 'not_arrived') && (
            <div className="flex flex-wrap gap-2">
              {props.checkInCandidates.length === 0 ? (
                <p className="text-xs text-text-tertiary">No attendees match that search.</p>
              ) : props.checkInCandidates.map((guest) => {
                const checked = props.arrivedGuestIds.has(guest.id);
                const isAssigned = props.assignedGuestIdSet.has(guest.id);
                return (
                  <button
                    key={guest.id}
                    onClick={() => props.handleToggleCheckIn(guest.id, !checked)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${checked ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border-subtle bg-surface text-text-secondary hover:border-primary/40 hover:text-primary'}`}
                  >
                    {guest.full_name} {isAssigned ? '• Seated' : '• Unseated'} {checked ? '• Arrived' : '• Mark arrived'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {props.addingTable && (
        <TableForm onSave={props.handleAddTable} onCancel={() => props.setAddingTable(false)} />
      )}

      {props.editingTable && (
        <TableForm
          initial={props.editingTable}
          onSave={(data) => props.handleUpdateTable(props.editingTable!.id, data)}
          onCancel={() => props.setEditingTable(null)}
        />
      )}

      {props.showAutoTablesModal && (
        <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle p-4">
          <h3 className="text-sm font-semibold text-text-primary">Auto-Create Tables</h3>
          <p className="text-xs text-text-tertiary">
            Creates enough tables for {props.counters?.attending ?? 0} attending guests.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Guests per table:</label>
            <input
              type="number"
              min="1"
              max="50"
              value={props.autoCapacity}
              onChange={(event) => props.setAutoCapacity(Number(event.target.value))}
              className="w-20 px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-text-tertiary">
              = {Math.ceil((props.counters?.attending ?? 0) / props.autoCapacity)} tables
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={props.handleAutoCreateTables} disabled={props.seatingBusyAction !== null}>{props.seatingBusyAction === 'auto-create' ? 'Creating…' : 'Create tables'}</Button>
            <Button size="sm" variant="ghost" onClick={() => props.setShowAutoTablesModal(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {props.showResetConfirm && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-error/20 bg-error/5 p-4">
          <p className="text-sm text-text-primary">Reset all seating assignments for this event? This cannot be undone.</p>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={props.handleReset} disabled={props.seatingBusyAction !== null} className="border-error text-error hover:bg-error/5">{props.seatingBusyAction === 'reset' ? 'Resetting…' : 'Reset'}</Button>
            <Button size="sm" variant="ghost" onClick={() => props.setShowResetConfirm(false)} disabled={props.seatingBusyAction !== null}>Cancel</Button>
          </div>
        </div>
      )}

      {props.seatPicker && (
        <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Map a guest to seat {props.seatPicker.seatIndex}</h3>
              <p className="text-xs text-text-tertiary">Choose from RSVP’d guests not already assigned somewhere else.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={props.closeSeatPicker}>Close</Button>
          </div>
          {props.activeSeatGuest && (
            <div className="rounded-lg border border-primary/20 bg-primary-light/20 px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-tertiary">Current seat assignment</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{props.activeSeatGuest.full_name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void props.clearSeatAssignment(props.seatPicker!.tableId, props.seatPicker!.seatIndex)}>
                Clear seat
              </Button>
            </div>
          )}
          <Input
            value={props.seatPickerQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.setSeatPickerQuery(event.target.value)}
            placeholder="Search RSVP’d guests"
          />
          <p className="text-xs text-text-tertiary">Choosing a new guest here will replace the current seat assignment.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {props.seatPickerOptions.slice(0, 18).map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => void props.assignGuestToSeatDirect(guest.id, props.seatPicker!.tableId, props.seatPicker!.seatIndex)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-left hover:border-primary/40 hover:bg-primary-light/20"
              >
                <p className="text-sm font-medium text-text-primary">{guest.full_name}</p>
                <p className="text-xs text-text-tertiary">{guest.rsvp_status === 'attending' ? 'RSVP’d attending' : 'Guest'}</p>
              </button>
            ))}
          </div>
          {props.seatPickerOptions.length === 0 && (
            <div className="rounded-lg border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
              No RSVP’d guests match that search.
            </div>
          )}
        </div>
      )}

      {props.loadingSeating ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DndContext sensors={props.sensors} onDragStart={props.handleDragStart} onDragEnd={props.handleDragEnd}>
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="lg:w-64 xl:w-72 flex-shrink-0">
              <div className="sticky top-24 space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">Unassigned</h2>
                    <p className="text-xs text-text-tertiary mt-0.5">Drag guests into seats or use auto-seat to place them faster.</p>
                  </div>
                  <span className="text-xs text-text-tertiary">{props.unassignedGuests.length} guests</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-white px-3 py-2">
                  <p className="text-[11px] text-text-tertiary">Still needs seats</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{props.unassignedGuests.length} guest{props.unassignedGuests.length !== 1 ? 's' : ''} still need seats</p>
                </div>
                <UnassignedPool guests={props.unassignedGuests} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {props.layoutMode === 'visual' && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-2 text-xs text-text-tertiary">
                  <span>Canvas mode: arrange tables and seats visually.</span>
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                      onClick={() => props.setCanvasZoom((zoom) => Math.max(0.6, Number((zoom - 0.1).toFixed(2))))}
                      title="Zoom out"
                    >
                      -
                    </button>
                    <span className="min-w-[52px] text-center">{Math.round(props.canvasZoom * 100)}%</span>
                    <button
                      className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                      onClick={() => props.setCanvasZoom((zoom) => Math.min(1.6, Number((zoom + 0.1).toFixed(2))))}
                      title="Zoom in"
                    >
                      +
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                      onClick={() => props.setCanvasZoom(1)}
                      title="Reset zoom"
                    >
                      100%
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                      onClick={() => props.setCanvasFullscreen(true)}
                      title="Open fullscreen canvas"
                    >
                      Fullscreen
                    </button>
                  </div>
                </div>
              )}
              {props.tables.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border-subtle py-16 text-center">
                  <TableProperties className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-text-secondary mb-2">No tables yet</p>
                  <p className="text-sm text-text-tertiary mb-4">Add your own tables or let dayof create a starting layout from your guest count.</p>
                  <Button size="sm" onClick={() => props.setAddingTable(true)} disabled={!props.seatingEvent || props.loadingSeating}>
                    <Plus className="w-4 h-4 mr-1" /> Add table
                  </Button>
                </div>
              ) : props.layoutMode === 'visual' ? (
                <>
                  {props.canvasFullscreen && (
                    <div className="fixed inset-0 bg-black/35 z-[9998]" onClick={() => props.setCanvasFullscreen(false)} />
                  )}
                  <div
                    className={`relative min-h-[720px] overflow-auto rounded-lg border border-border-subtle bg-white transition-all duration-300 ${props.canvasFullscreen ? 'bg-white p-3' : ''}`}
                    style={props.canvasFullscreen ? { position: 'fixed', inset: '16px', zIndex: 9999, background: '#fff' } : undefined}
                    onWheel={props.handleCanvasWheelZoom}
                  >
                    {props.canvasFullscreen && (
                      <div className="mb-2 flex items-center justify-between animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:border-border text-sm"
                            onClick={() => props.setCanvasFullscreen(false)}
                          >
                            ← Back
                          </button>
                          <Button size="sm" onClick={() => { props.setCanvasFullscreen(false); props.setAddingTable(true); }} disabled={!props.seatingEvent || props.loadingSeating}>
                            <Plus className="w-4 h-4 mr-1" /> Add Table
                          </Button>
                        </div>
                        <span className="text-xs text-text-tertiary">Fullscreen canvas</span>
                      </div>
                    )}
                    <div
                      className="relative min-h-[720px] min-w-[960px]"
                      style={{ transform: `scale(${props.canvasZoom})`, transformOrigin: 'top left' }}
                    >
                      {props.tables.map((table, idx) => {
                        if (props.editingTable?.id === table.id) return null;
                        const fallback = props.getDefaultTablePosition(idx);
                        const x = table.layout_x ?? fallback.x;
                        const y = table.layout_y ?? fallback.y;
                        return (
                          <div
                            key={table.id}
                            className={`absolute w-[340px] ${props.movingTableId === table.id ? 'z-30' : 'z-10'}`}
                            style={{ left: `${x}px`, top: `${y}px` }}
                          >
                            <TableCard
                              table={table}
                              guests={getGuestsAssignedToTable(props.allGuests, props.assignments, table.id)}
                              assignments={getAssignmentsForTable(props.assignments, table.id)}
                              allGuests={props.allGuests}
                              onEdit={props.setEditingTable}
                              onDelete={props.handleDeleteTable}
                              onRemoveGuest={props.handleRemoveGuest}
                              checkInMode={props.checkInMode}
                              onToggleCheckIn={props.handleToggleCheckIn}
                              layoutMode={props.layoutMode}
                              onResizeTable={props.handleResizeTable}
                              isCanvas
                              onStartMove={(event) => props.startMoveTable(table, idx, event, props.layoutMode)}
                              isSelected={props.selectedTableId === table.id}
                              onSelect={() => props.setSelectedTableId(table.id)}
                              onRotate={(delta) => props.handleRotateTable(table.id, delta)}
                              onSelectSeat={props.openSeatPicker}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {props.tables.map((table, idx) => (
                    props.editingTable?.id === table.id ? null : (
                      <TableCard
                        key={table.id}
                        table={table}
                        guests={getGuestsAssignedToTable(props.allGuests, props.assignments, table.id)}
                        assignments={getAssignmentsForTable(props.assignments, table.id)}
                        allGuests={props.allGuests}
                        onEdit={props.setEditingTable}
                        onDelete={props.handleDeleteTable}
                        onRemoveGuest={props.handleRemoveGuest}
                        checkInMode={props.checkInMode}
                        onToggleCheckIn={props.handleToggleCheckIn}
                        layoutMode={props.layoutMode}
                        onResizeTable={props.handleResizeTable}
                        isCanvas={false}
                        onStartMove={(event) => props.startMoveTable(table, idx, event, props.layoutMode)}
                        isSelected={props.selectedTableId === table.id}
                        onSelect={() => props.setSelectedTableId(table.id)}
                        onRotate={(delta) => props.handleRotateTable(table.id, delta)}
                        onSelectSeat={props.openSeatPicker}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          </div>

          <DragOverlay>
            {props.activeGuest && <GuestChip guest={props.activeGuest} isDragging />}
          </DragOverlay>
        </DndContext>
      )}

      <div className="print:block hidden">
        <h2 className="text-xl font-bold mb-4">
          Seating Chart — {props.selectedItineraryEvent?.event_name}
        </h2>
        {props.tables.map((table) => {
          const tableGuests = getGuestsAssignedToTable(props.allGuests, props.assignments, table.id);
          return (
            <div key={table.id} className="mb-6 break-inside-avoid">
              <h3 className="font-semibold text-lg mb-2">{table.table_name} ({tableGuests.length}/{table.capacity})</h3>
              <ul className="list-disc ml-6 space-y-0.5">
                {tableGuests.map((guest) => <li key={guest.id} className="text-sm">{guest.full_name}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
