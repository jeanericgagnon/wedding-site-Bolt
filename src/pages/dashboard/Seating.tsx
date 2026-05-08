import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Users, Download, Wand2, Plus, AlertTriangle, TableProperties, CheckCircle2, RefreshCw, History, Image as ImageIcon } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { formatSeatingEventLabel } from './seatingEventDate';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import {
  SeatingTable, SeatingAssignment, EligibleGuest,
  createTable, updateTable, deleteTable,
  assignGuestToTable, unassignGuest, resetSeating, autoCreateTables, autoSeatGuests, invalidateDriftedAssignments, refreshSeatingSession, setGuestCheckedIn,
  SeatingLayoutVersion,
} from './seating/seatingService';
import {
  UNASSIGNED_DROPPABLE,
  buildDemoAutoSeatAssignments,
  buildDemoAutoTables,
  getAssignmentsForTable,
  getGuestsAssignedToTable,
  getSeatPickerOptions,
  getShapeLabel,
  type SeatingCheckInFilter,
  type TableShape,
} from './seating/seatingDashboardUtils';
import {
  readSeatingVersions,
  writeDemoSeatingState,
  writeSeatingVersions,
} from './seating/seatingDemoStorage';
import { useSeatingDashboardData } from './seating/useSeatingDashboardData';
import { buildSeatingDashboardDerivedState } from './seating/buildSeatingDashboardDerivedState';
import { useSeatingDashboardArtifacts } from './seating/useSeatingDashboardArtifacts';
import { useSeatingDashboardActions } from './seating/useSeatingDashboardActions';
import {
  GuestChip,
  TableCard,
  TableForm,
  UnassignedPool,
} from './seating/SeatingDashboardComponents';

export const DashboardSeating: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [addingTable, setAddingTable] = useState(false);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [activeGuest, setActiveGuest] = useState<EligibleGuest | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAutoTablesModal, setShowAutoTablesModal] = useState(false);
  const [autoCapacity, setAutoCapacity] = useState(8);
  const [seatingBusyAction, setSeatingBusyAction] = useState<'auto-create' | 'auto-seat' | 'reset' | null>(null);
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<SeatingCheckInFilter>('not_arrived');
  const [layoutMode, setLayoutMode] = useState<'visual' | 'list'>('visual');
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [seatPicker, setSeatPicker] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [seatPickerQuery, setSeatPickerQuery] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const tableDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const { toast } = useToast();
  const {
    allGuests,
    assignments,
    counters,
    invalidCount,
    itineraryEvents,
    loading,
    loadingSeating,
    loadSeatingData,
    seatingEvent,
    selectedEventId,
    setAssignments,
    setSelectedEventId,
    setTables,
    setVersions,
    siteId,
    tables,
    versions,
  } = useSeatingDashboardData({ isDemoMode, toast });
  const activeSeatAssignment = seatPicker ? assignments.find((assignment) => assignment.table_id === seatPicker.tableId && assignment.seat_index === seatPicker.seatIndex) ?? null : null;
  const activeSeatGuest = activeSeatAssignment ? allGuests.find((guest) => guest.id === activeSeatAssignment.guest_id) ?? null : null;
  const seatPickerOptions = seatPicker
    ? getSeatPickerOptions({
        guests: allGuests,
        assignments,
        tableId: seatPicker.tableId,
        seatIndex: seatPicker.seatIndex,
        query: seatPickerQuery,
      })
    : [];
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const guest = allGuests.find(g => g.id === event.active.id);
    if (guest) setActiveGuest(guest);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null);
    const { active, over } = event;
    if (!over || !seatingEvent) return;

    const guestId = active.id as string;
    const dropId = over.id as string;

    if (dropId === UNASSIGNED_DROPPABLE) {
      try {
        if (!isDemoMode) {
          await unassignGuest(seatingEvent.id, guestId);
        }
        setAssignments(prev => prev.filter(a => a.guest_id !== guestId));
      } catch {
        toast('Couldn’t unassign that guest. Please try again.', 'error');
      }
      return;
    }

    let targetTableId: string | null = null;
    let targetSeatIndex: number | undefined;

    if (dropId.startsWith('seat:')) {
      const [, tableId, seatRaw] = dropId.split(':');
      targetTableId = tableId;
      targetSeatIndex = Number(seatRaw);
    } else {
      targetTableId = dropId;
    }

    await assignGuestToSeatDirect(guestId, targetTableId, targetSeatIndex);
  }
  function handleCanvasWheelZoom(e: React.WheelEvent<HTMLDivElement>) {
    // Trackpad pinch on desktop browsers commonly reports wheel + ctrlKey
    if (layoutMode !== 'visual') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY;
    const step = delta > 0 ? -0.05 : 0.05;
    setCanvasZoom(z => Math.max(0.6, Math.min(1.8, Number((z + step).toFixed(2)))));
  }

  const {
    arrivedCount,
    arrivedGuestIds,
    assignedGuestIdSet,
    cateringHandoffReview,
    cateringPacket,
    checkInCandidates,
    mealHeadcountByTable,
    packetReadyTone,
    selectedItineraryEvent,
    unassignedGuests,
  } = buildSeatingDashboardDerivedState({
    allGuests,
    assignments,
    checkInFilter,
    checkInQuery,
    counters,
    itineraryEvents,
    selectedEventId,
    tables,
  });
  const {
    assignGuestToSeatDirect,
    clearSeatAssignment,
    getDefaultTablePosition,
    handleAddTable,
    handleAutoCreateTables,
    handleAutoSeat,
    handleBulkCheckIn,
    handleCheckDrift,
    handleDeleteTable,
    handleRemoveGuest,
    handleReset,
    handleResizeTable,
    handleRotateTable,
    handleToggleCheckIn,
    handleUpdateTable,
    startMoveTable,
  } = useSeatingDashboardActions({
    allGuests,
    assignments,
    autoCapacity,
    counters,
    isDemoMode,
    loadSeatingData,
    seatingEvent,
    selectedEventId,
    setAddingTable,
    setAssignments,
    setMovingTableId,
    setSeatPicker,
    setSeatingBusyAction,
    setShowAutoTablesModal,
    setShowResetConfirm,
    setTables,
    siteId,
    tableDragRef,
    tables,
    toast,
  });
  const {
    handleExportCSV,
    handleExportCateringCSV,
    handleExportImage,
    handleExportPDF,
    handleExportPlaceCards,
    handleExportTableSummaryCSV,
    handlePrint,
    handleRestoreVersion,
    handleSaveVersion,
  } = useSeatingDashboardArtifacts({
    allGuests,
    arrivedCount,
    assignments,
    cateringPacket,
    counters,
    isDemoMode,
    itineraryEvents,
    requestConfirmation,
    selectedEventId,
    seatingEvent,
    setAssignments,
    setTables,
    setVersions,
    siteId,
    tables,
    toast,
    versions,
  });

  if (loading) {
    return (
      <DashboardLayout currentPage="seating">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (itineraryEvents.length === 0) {
    return (
      <DashboardLayout currentPage="seating">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Events Yet</h2>
            <p className="text-text-secondary mb-4">Create itinerary events first to start managing seating.</p>
            <Button onClick={() => window.location.href = '/dashboard/itinerary'}>
              Go to Itinerary
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="seating">
      <div className="max-w-[1100px] mx-auto space-y-5" onClick={() => setSelectedTableId(null)}>
        <DashboardPageHero
          eyebrow="Seating"
          title="Place guests at tables without losing the room."
          description={layoutMode === 'visual' ? 'Use the canvas when the venue layout matters, or switch to the list when you just need to move people quickly.' : 'Move guests between tables quickly, then switch back to the canvas when you want the room view.'}
          stats={[
            { label: 'Tables', value: tables.length, detail: selectedItineraryEvent?.event_name ?? 'current event' },
            { label: 'Seated', value: counters?.seated ?? assignments.length, detail: `${unassignedGuests.length} still unassigned` },
            { label: 'Arrived', value: arrivedCount, detail: checkInMode ? 'check-in is on' : 'check-in off' },
          ]}
          actions={
            <>
              <a href="/dashboard/seating-lookup" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Lookup</a>
              <a href="/dashboard/coordinator" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Day-of view</a>
            </>
          }
        >
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTableSummaryCSV}>
              <Download className="w-4 h-4 mr-1" /> Table summary
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCateringCSV}>
              <Download className="w-4 h-4 mr-1" /> Catering CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportImage}>
              <ImageIcon className="w-4 h-4 mr-1" /> Image
            </Button>
            <Button variant={checkInMode ? 'primary' : 'outline'} size="sm" onClick={() => setCheckInMode(v => !v)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> {checkInMode ? 'Check-in: On' : 'Check-in Mode'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleCheckDrift()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Check assignments
            </Button>
              <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5">
              <button
                className={`rounded-md px-4 py-2 text-sm transition-colors ${layoutMode === 'visual' ? 'border border-primary/25 bg-primary/10 text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('visual')}
              >
                Canvas Layout
              </button>
              <button
                className={`rounded-md px-4 py-2 text-sm transition-colors ${layoutMode === 'list' ? 'border border-primary/25 bg-primary/10 text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('list')}
              >
                List Layout
              </button>
            </div>
            <div className="px-3 py-2 rounded-lg border border-border-subtle bg-surface text-xs text-text-secondary">
              Current Event: <span className="font-medium text-text-primary">{selectedItineraryEvent?.event_name ?? '—'}</span>
            </div>
          </div>
        </DashboardPageHero>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-medium text-text-secondary whitespace-nowrap">Event:</label>
            <select
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedEventId ?? ''}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              {itineraryEvents.map(e => (
                <option key={e.id} value={e.id}>
                  {formatSeatingEventLabel(e.event_name, e.event_date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${packetReadyTone}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {cateringPacket.readiness.status === 'ready' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-primary" />
                )}
                <p className="text-sm font-semibold text-text-primary">Venue and catering packet</p>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{cateringPacket.readiness.summary}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
                <p className="text-lg font-semibold text-text-primary">{cateringPacket.readiness.assignedCount}/{cateringPacket.readiness.attendingCount}</p>
                <p className="text-[11px] text-text-tertiary">Seated</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
                <p className="text-lg font-semibold text-text-primary">{cateringPacket.readiness.mealChoiceCount}</p>
                <p className="text-[11px] text-text-tertiary">Meals</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
                <p className="text-lg font-semibold text-text-primary">{cateringPacket.readiness.dietaryNoteCount}</p>
                <p className="text-[11px] text-text-tertiary">Notes</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {cateringPacket.readiness.checklist.map((item) => {
              const iconClass = item.state === 'ready'
                ? 'text-success'
                : item.state === 'needs-action'
                  ? 'text-primary'
                  : 'text-text-tertiary';
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
                <p className="mt-1 text-xs text-text-secondary">{cateringHandoffReview.summary}</p>
              </div>
              <Badge variant={cateringHandoffReview.status === 'ready' ? 'success' : 'warning'}>
                {cateringHandoffReview.status === 'ready' ? 'Ready' : 'Review'}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Guests', value: cateringHandoffReview.sourceCounts.attendingGuests },
                { label: 'Tables', value: cateringHandoffReview.sourceCounts.tablesWithGuests },
                { label: 'Meals', value: cateringHandoffReview.sourceCounts.mealRows },
                { label: 'Notes', value: cateringHandoffReview.sourceCounts.dietaryRows },
                { label: 'Unseated', value: cateringHandoffReview.sourceCounts.unassignedGuests },
                { label: 'Review', value: cateringHandoffReview.sourceCounts.invalidAssignments },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border-subtle bg-surface-subtle px-2 py-2 text-center">
                  <p className="text-base font-semibold text-text-primary">{stat.value}</p>
                  <p className="text-[11px] text-text-tertiary">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {cateringHandoffReview.files.map((file) => (
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
            {cateringHandoffReview.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <p className="text-xs font-semibold text-text-primary">Before final handoff</p>
                <ul className="mt-1 space-y-1">
                  {cateringHandoffReview.warnings.map((warning) => (
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
            {layoutMode === 'visual' && (
              <div className="hidden flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-tertiary sm:flex">
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface border border-border-subtle" /> Empty seat</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-light border border-primary/40" /> Active drop zone</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success/10 border border-success/40" /> Arrived (check-in)</span>
              </div>
            )}

            {counters && (
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { label: 'Invited', value: counters.invited, color: 'text-text-primary' },
                  { label: 'Attending', value: counters.attending, color: 'text-primary' },
                  { label: 'Arrived', value: arrivedCount, color: 'text-primary' },
                  { label: 'Declined', value: counters.declined, color: 'text-text-secondary' },
                  { label: 'Pending', value: counters.pending, color: 'text-text-secondary' },
                  { label: 'Seated', value: counters.seated, color: 'text-primary' },
                  { label: 'Unassigned', value: counters.unassigned, color: counters.unassigned > 0 ? 'text-primary' : 'text-text-tertiary' },
                ].map(stat => (
                  <Card key={stat.label} padding="sm" className="text-center">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-text-tertiary">{stat.label}</p>
                  </Card>
                ))}
              </div>
            )}

            {mealHeadcountByTable.length > 0 && (
              <Card padding="sm" className="bg-surface border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-text-primary">Meal headcount by table</p>
                  <span className="text-xs text-text-tertiary">Assigned guests</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {mealHeadcountByTable.map((row) => (
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

            {invalidCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-text-primary">
                  <span className="font-medium text-error">{invalidCount}</span> assignment(s) are invalid due to RSVP changes.
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
            <Button size="sm" variant="outline" onClick={() => void handleSaveVersion()}>Save version</Button>
          </div>
          {versions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {versions.slice(0, 6).map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => handleRestoreVersion(version)}
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
            <Button size="sm" onClick={() => setAddingTable(true)} disabled={!seatingEvent || loadingSeating}>
              <Plus className="w-4 h-4 mr-1" /> Add Table
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setShowAutoTablesModal(true)}
              disabled={seatingBusyAction !== null}
              className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-primary-light/10 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">Auto-create tables</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Build enough tables for the current attending count.</p>
            </button>
            <button
              type="button"
              onClick={() => { void handleAutoSeat(); }}
              disabled={tables.length === 0 || unassignedGuests.length === 0 || seatingBusyAction !== null}
              className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-primary-light/10 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">{seatingBusyAction === 'auto-seat' ? 'Auto-seating guests…' : 'Auto-seat guests'}</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Fill open seats for the {unassignedGuests.length} guests still waiting.</p>
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={assignments.length === 0 || seatingBusyAction !== null}
              className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/25 hover:bg-surface-subtle/60 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">Reset seating</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Clear every seat assignment for this event and start fresh.</p>
            </button>
          </div>
        </div>

        {checkInMode && (
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-tertiary">Check-in mode</p>
                <p className="mt-1 text-sm text-text-secondary">Search an attendee, then mark them arrived without leaving the seating board.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-right">
                <p className="text-[11px] text-text-tertiary">Arrivals</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{arrivedCount}/{counters?.attending ?? 0}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={checkInQuery}
                onChange={(e) => setCheckInQuery(e.target.value)}
                placeholder="Search attendee for quick check-in"
                className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value as typeof checkInFilter)}
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
              <span>{checkInCandidates.length} match{checkInCandidates.length !== 1 ? 'es' : ''} shown</span>
              {checkInCandidates.some((guest) => !arrivedGuestIds.has(guest.id)) && (
                <button
                  type="button"
                  onClick={() => void handleBulkCheckIn(checkInCandidates.filter((guest) => !arrivedGuestIds.has(guest.id)).map((guest) => guest.id), true)}
                  className="rounded-md border border-primary/25 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/15"
                >
                  Mark visible arrived
                </button>
              )}
              {checkInCandidates.some((guest) => arrivedGuestIds.has(guest.id)) && (
                <button
                  type="button"
                  onClick={() => void handleBulkCheckIn(checkInCandidates.filter((guest) => arrivedGuestIds.has(guest.id)).map((guest) => guest.id), false)}
                  className="rounded-md border border-border-subtle bg-white px-3 py-1 text-text-secondary hover:border-primary/30 hover:text-primary"
                >
                  Clear visible arrivals
                </button>
              )}
            </div>
            {(checkInQuery.trim().length > 0 || checkInFilter !== 'not_arrived') && (
              <div className="flex flex-wrap gap-2">
                {checkInCandidates.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No attendees match that search.</p>
                ) : checkInCandidates.map((guest) => {
                  const checked = arrivedGuestIds.has(guest.id);
                  const isAssigned = assignedGuestIdSet.has(guest.id);
                  return (
                    <button
                      key={guest.id}
                      onClick={() => handleToggleCheckIn(guest.id, !checked)}
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

        {addingTable && (
          <TableForm
            onSave={handleAddTable}
            onCancel={() => setAddingTable(false)}
          />
        )}

        {editingTable && (
          <TableForm
            initial={editingTable}
            onSave={(data) => handleUpdateTable(editingTable.id, data)}
            onCancel={() => setEditingTable(null)}
          />
        )}

        {showAutoTablesModal && (
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <h3 className="text-sm font-semibold text-text-primary">Auto-Create Tables</h3>
            <p className="text-xs text-text-tertiary">
              Creates enough tables for {counters?.attending ?? 0} attending guests.
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-text-secondary">Guests per table:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={autoCapacity}
                onChange={e => setAutoCapacity(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-xs text-text-tertiary">
                = {Math.ceil((counters?.attending ?? 0) / autoCapacity)} tables
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAutoCreateTables} disabled={seatingBusyAction !== null}>{seatingBusyAction === 'auto-create' ? 'Creating…' : 'Create tables'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAutoTablesModal(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-error/20 bg-error/5 p-4">
            <p className="text-sm text-text-primary">Reset all seating assignments for this event? This cannot be undone.</p>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={handleReset} disabled={seatingBusyAction !== null} className="border-error text-error hover:bg-error/5">{seatingBusyAction === 'reset' ? 'Resetting…' : 'Reset'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)} disabled={seatingBusyAction !== null}>Cancel</Button>
            </div>
          </div>
        )}

        {seatPicker && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Map a guest to seat {seatPicker.seatIndex}</h3>
                <p className="text-xs text-text-tertiary">Choose from RSVP’d guests not already assigned somewhere else.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setSeatPicker(null); setSeatPickerQuery(''); }}>Close</Button>
            </div>
            {activeSeatGuest && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/20 px-3 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">Current seat assignment</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{activeSeatGuest.full_name}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void clearSeatAssignment(seatPicker.tableId, seatPicker.seatIndex)}>
                  Clear seat
                </Button>
              </div>
            )}
            <Input
              value={seatPickerQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeatPickerQuery(e.target.value)}
              placeholder="Search RSVP’d guests"
            />
            <p className="text-xs text-text-tertiary">Choosing a new guest here will replace the current seat assignment.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {seatPickerOptions.slice(0, 18).map((guest) => (
                <button
                  key={guest.id}
                  type="button"
                  onClick={() => void assignGuestToSeatDirect(guest.id, seatPicker.tableId, seatPicker.seatIndex)}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-left hover:border-primary/40 hover:bg-primary-light/20"
                >
                  <p className="text-sm font-medium text-text-primary">{guest.full_name}</p>
                  <p className="text-xs text-text-tertiary">{guest.rsvp_status === 'attending' ? 'RSVP’d attending' : 'Guest'}</p>
                </button>
              ))}
            </div>
            {seatPickerOptions.length === 0 && (
              <div className="rounded-lg border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                No RSVP’d guests match that search.
              </div>
            )}
          </div>
        )}

        {loadingSeating ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="lg:w-64 xl:w-72 flex-shrink-0">
                <div className="sticky top-24 space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">Unassigned</h2>
                      <p className="text-xs text-text-tertiary mt-0.5">Drag guests into seats or use auto-seat to place them faster.</p>
                    </div>
                    <span className="text-xs text-text-tertiary">{unassignedGuests.length} guests</span>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-white px-3 py-2">
                    <p className="text-[11px] text-text-tertiary">Still needs seats</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{unassignedGuests.length} guest{unassignedGuests.length !== 1 ? 's' : ''} still need seats</p>
                  </div>
                  <UnassignedPool guests={unassignedGuests} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {layoutMode === 'visual' && (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-2 text-xs text-text-tertiary">
                    <span>Canvas mode: arrange tables and seats visually.</span>
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                        onClick={() => setCanvasZoom(z => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                        title="Zoom out"
                      >
                        −
                      </button>
                      <span className="min-w-[52px] text-center">{Math.round(canvasZoom * 100)}%</span>
                      <button
                        className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                        onClick={() => setCanvasZoom(z => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                        title="Zoom in"
                      >
                        +
                      </button>
                      <button
                        className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                        onClick={() => setCanvasZoom(1)}
                        title="Reset zoom"
                      >
                        100%
                      </button>
                      <button
                        className="px-2 py-1 rounded border border-border-subtle bg-surface hover:border-border"
                        onClick={() => setCanvasFullscreen(true)}
                        title="Open fullscreen canvas"
                      >
                        Fullscreen
                      </button>
                    </div>
                  </div>
                )}
                {tables.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-border-subtle py-16 text-center">
                    <TableProperties className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary mb-2">No tables yet</p>
                    <p className="text-sm text-text-tertiary mb-4">Add your own tables or let dayof create a starting layout from your guest count.</p>
                    <Button size="sm" onClick={() => setAddingTable(true)} disabled={!seatingEvent || loadingSeating}>
                      <Plus className="w-4 h-4 mr-1" /> Add table
                    </Button>
                  </div>
                ) : (
                  layoutMode === 'visual' ? (
                    <>
                    {canvasFullscreen && (
                      <div className="fixed inset-0 bg-black/35 z-[9998]" onClick={() => setCanvasFullscreen(false)} />
                    )}
                    <div
                      className={`relative min-h-[720px] overflow-auto rounded-lg border border-border-subtle bg-white transition-all duration-300 ${canvasFullscreen ? 'bg-white p-3' : ''}`}
                      style={canvasFullscreen ? { position: 'fixed', inset: '16px', zIndex: 9999, background: '#fff' } : undefined}
                      onWheel={handleCanvasWheelZoom}
                    >
                      {canvasFullscreen && (
                        <div className="mb-2 flex items-center justify-between animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:border-border text-sm"
                              onClick={() => setCanvasFullscreen(false)}
                            >
                              ← Back
                            </button>
                            <Button size="sm" onClick={() => { setCanvasFullscreen(false); setAddingTable(true); }} disabled={!seatingEvent || loadingSeating}>
                              <Plus className="w-4 h-4 mr-1" /> Add Table
                            </Button>
                          </div>
                          <span className="text-xs text-text-tertiary">Fullscreen canvas</span>
                        </div>
                      )}
                      <div
                        className="relative min-h-[720px] min-w-[960px]"
                        style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'top left' }}
                      >
                        {tables.map((table, idx) => {
                          if (editingTable?.id === table.id) return null;
                          const fallback = getDefaultTablePosition(idx);
                          const x = table.layout_x ?? fallback.x;
                          const y = table.layout_y ?? fallback.y;
                          return (
                            <div
                              key={table.id}
                              className={`absolute w-[340px] ${movingTableId === table.id ? 'z-30' : 'z-10'}`}
                              style={{ left: `${x}px`, top: `${y}px` }}
                            >
                              <TableCard
                                table={table}
                                guests={getGuestsAssignedToTable(allGuests, assignments, table.id)}
                                assignments={getAssignmentsForTable(assignments, table.id)}
                                allGuests={allGuests}
                                onEdit={setEditingTable}
                                onDelete={handleDeleteTable}
                                onRemoveGuest={handleRemoveGuest}
                                checkInMode={checkInMode}
                                onToggleCheckIn={handleToggleCheckIn}
                                layoutMode={layoutMode}
                                onResizeTable={handleResizeTable}
                                isCanvas
                                onStartMove={(e) => startMoveTable(table, idx, e, layoutMode)}
                                isSelected={selectedTableId === table.id}
                                onSelect={() => setSelectedTableId(table.id)}
                                onRotate={(delta) => handleRotateTable(table.id, delta)}
                                onSelectSeat={(tableId, seatIndex) => { setSeatPicker({ tableId, seatIndex }); setSeatPickerQuery(''); }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {tables.map((table, idx) => (
                        editingTable?.id === table.id ? null : (
                          <TableCard
                            key={table.id}
                            table={table}
                            guests={getGuestsAssignedToTable(allGuests, assignments, table.id)}
                            assignments={getAssignmentsForTable(assignments, table.id)}
                            allGuests={allGuests}
                            onEdit={setEditingTable}
                            onDelete={handleDeleteTable}
                            onRemoveGuest={handleRemoveGuest}
                            checkInMode={checkInMode}
                            onToggleCheckIn={handleToggleCheckIn}
                            layoutMode={layoutMode}
                            onResizeTable={handleResizeTable}
                            isCanvas={false}
                            onStartMove={(e) => startMoveTable(table, idx, e, layoutMode)}
                            isSelected={selectedTableId === table.id}
                            onSelect={() => setSelectedTableId(table.id)}
                            onRotate={(delta) => handleRotateTable(table.id, delta)}
                            onSelectSeat={(tableId, seatIndex) => { setSeatPicker({ tableId, seatIndex }); setSeatPickerQuery(''); }}
                          />
                        )
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            <DragOverlay>
              {activeGuest && <GuestChip guest={activeGuest} isDragging />}
            </DragOverlay>
          </DndContext>
        )}

        <div className="print:block hidden">
          <h2 className="text-xl font-bold mb-4">
            Seating Chart — {selectedItineraryEvent?.event_name}
          </h2>
          {tables.map(table => {
            const tableGuests = getGuestsAssignedToTable(allGuests, assignments, table.id);
            return (
              <div key={table.id} className="mb-6 break-inside-avoid">
                <h3 className="font-semibold text-lg mb-2">{table.table_name} ({tableGuests.length}/{table.capacity})</h3>
                <ul className="list-disc ml-6 space-y-0.5">
                  {tableGuests.map(g => <li key={g.id} className="text-sm">{g.full_name}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </DashboardLayout>
  );
};
