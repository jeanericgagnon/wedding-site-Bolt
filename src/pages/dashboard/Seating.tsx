import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Users, ChevronDown, Download, Printer, RefreshCw, Wand2, Plus, Edit2, Trash2, X, AlertTriangle, RotateCcw, TableProperties, CheckCircle2, FileDown } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests } from '../../lib/demoData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ItineraryEvent, SeatingEvent, SeatingTable, SeatingAssignment, EligibleGuest,
  EventCounters, getWeddingSiteId, loadItineraryEvents, getOrCreateSeatingEvent,
  loadTables, createTable, updateTable, deleteTable, loadAssignments,
  assignGuestToTable, unassignGuest, resetSeating, getEligibleGuests,
  getEventCounters, autoCreateTables, autoSeatGuests, exportSeatingCSV,
  exportPlaceCardsCSV, downloadCSV, invalidateDriftedAssignments, setGuestCheckedIn,
} from './seating/seatingService';

const UNASSIGNED_DROPPABLE = 'unassigned-pool';

function GuestChip({
  guest,
  isDragging = false,
  isInvalid = false,
  onRemove,
}: {
  guest: EligibleGuest;
  isDragging?: boolean;
  isInvalid?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
      select-none cursor-grab active:cursor-grabbing
      transition-colors border
      ${isDragging ? 'shadow-lg opacity-90 rotate-1' : ''}
      ${isInvalid ? 'bg-error/10 border-error/30 text-error' : 'bg-surface border-border-subtle text-text-primary hover:border-border hover:bg-surface-subtle'}
    `}>
      {isInvalid && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate max-w-[140px]">{guest.full_name}</span>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 text-text-tertiary hover:text-error transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function DraggableGuestChip({ guest, isInvalid, onRemove }: {
  guest: EligibleGuest;
  isInvalid?: boolean;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <GuestChip guest={guest} isDragging={isDragging} isInvalid={isInvalid} onRemove={onRemove} />
    </div>
  );
}

function UnassignedPool({ guests }: { guests: EligibleGuest[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: UNASSIGNED_DROPPABLE });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-3 rounded-xl border-2 border-dashed transition-colors ${isOver ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'}`}
    >
      {guests.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">All attending guests are seated</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {guests.map(g => (
            <DraggableGuestChip key={g.id} guest={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function SeatDropSlot({
  tableId,
  seatIndex,
  guest,
  isOver,
  className,
  style,
}: {
  tableId: string;
  seatIndex: number;
  guest?: EligibleGuest;
  isOver?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver: overSelf } = useDroppable({ id: `seat:${tableId}:${seatIndex}` });
  const active = isOver ?? overSelf;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-10 rounded-lg border text-[11px] px-1 flex items-center justify-center text-center ${active ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'} ${className ?? ''}`}
      title={`Seat ${seatIndex}`}
    >
      {guest ? (
        <span className="truncate max-w-[90px]">{guest.full_name}</span>
      ) : (
        <span className="text-text-tertiary">Seat {seatIndex}</span>
      )}
    </div>
  );
}

function TableCard({
  table,
  guests,
  assignments,
  allGuests,
  onEdit,
  onDelete,
  onRemoveGuest,
  checkInMode,
  onToggleCheckIn,
  layoutMode,
}: {
  table: SeatingTable;
  guests: EligibleGuest[];
  assignments: SeatingAssignment[];
  allGuests: EligibleGuest[];
  onEdit: (table: SeatingTable) => void;
  onDelete: (id: string) => void;
  onRemoveGuest: (guestId: string) => void;
  checkInMode: boolean;
  onToggleCheckIn: (guestId: string, checkedIn: boolean) => void;
  layoutMode: 'visual' | 'list';
}) {
  const { isOver, setNodeRef } = useDroppable({ id: table.id });
  const occupied = guests.length;
  const isFull = occupied >= table.capacity;

  const guestMap = new Map(allGuests.map(g => [g.id, g]));
  const assignedGuests = assignments
    .filter(a => a.table_id === table.id)
    .map(a => ({ assignment: a, guest: guestMap.get(a.guest_id) }))
    .filter(x => x.guest) as { assignment: SeatingAssignment; guest: EligibleGuest }[];
  const bySeat = new Map<number, { assignment: SeatingAssignment; guest: EligibleGuest }>();
  assignedGuests.forEach((row) => {
    if (row.assignment.seat_index != null) bySeat.set(row.assignment.seat_index, row);
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border-2 transition-all
        ${isOver && !isFull ? 'border-primary bg-primary-light/30 shadow-md' : isFull ? 'border-border-subtle bg-surface' : 'border-border-subtle bg-surface hover:border-border'}
      `}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <TableProperties className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          <span className="text-sm font-semibold text-text-primary truncate">{table.table_name}</span>
          <span className="text-[10px] uppercase text-text-tertiary">{table.table_shape ?? 'round'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isFull ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-tertiary'}`}>
            {occupied}/{table.capacity}
          </span>
          <button onClick={() => onEdit(table)} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(table.id)} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className={`p-2 min-h-[80px] ${isOver && !isFull ? 'bg-primary-light/20' : ''}`}>
        {layoutMode === 'visual' ? (
          <>
            {(table.table_shape ?? 'round') === 'round' ? (
              <div className="relative h-60 mb-2">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-border bg-surface-subtle flex items-center justify-center text-[11px] text-text-tertiary">
                  {table.table_name}
                </div>
                {Array.from({ length: table.capacity }).map((_, idx) => {
                  const seatNumber = idx + 1;
                  const angle = (idx / table.capacity) * Math.PI * 2 - Math.PI / 2;
                  const radius = Math.max(88, Math.min(112, 78 + table.capacity * 2));
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  const seatAssignment = bySeat.get(seatNumber);
                  return (
                    <SeatDropSlot
                      key={`${table.id}-seat-${seatNumber}`}
                      tableId={table.id}
                      seatIndex={seatNumber}
                      guest={seatAssignment?.guest}
                      className="absolute w-20 h-10 -ml-10 -mt-5 shadow-sm"
                      style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                {Array.from({ length: table.capacity }).map((_, idx) => {
                  const seatNumber = idx + 1;
                  const seatAssignment = bySeat.get(seatNumber);
                  return (
                    <SeatDropSlot
                      key={`${table.id}-seat-${seatNumber}`}
                      tableId={table.id}
                      seatIndex={seatNumber}
                      guest={seatAssignment?.guest}
                    />
                  );
                })}
              </div>
            )}

            {assignedGuests.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-1">Drop guests on seats</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedGuests.map(({ assignment, guest }) => (
                  <div key={guest.id} className="flex items-center gap-1">
                    <DraggableGuestChip
                      guest={guest}
                      isInvalid={!assignment.is_valid}
                      onRemove={() => onRemoveGuest(guest.id)}
                    />
                    <span className="text-[10px] text-text-tertiary">S{assignment.seat_index ?? '—'}</span>
                    {checkInMode && (
                      <button
                        onClick={() => onToggleCheckIn(guest.id, !assignment.checked_in_at)}
                        className={`p-1 rounded border transition-colors ${assignment.checked_in_at ? 'bg-success/10 border-success/40 text-success' : 'bg-surface border-border-subtle text-text-tertiary hover:text-success hover:border-success/40'}`}
                        title={assignment.checked_in_at ? 'Mark not arrived' : 'Mark arrived'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {assignedGuests.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-3">Drop guests here</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedGuests.map(({ assignment, guest }) => (
                  <div key={guest.id} className="flex items-center gap-1">
                    <DraggableGuestChip
                      guest={guest}
                      isInvalid={!assignment.is_valid}
                      onRemove={() => onRemoveGuest(guest.id)}
                    />
                    {checkInMode && (
                      <button
                        onClick={() => onToggleCheckIn(guest.id, !assignment.checked_in_at)}
                        className={`p-1 rounded border transition-colors ${assignment.checked_in_at ? 'bg-success/10 border-success/40 text-success' : 'bg-surface border-border-subtle text-text-tertiary hover:text-success hover:border-success/40'}`}
                        title={assignment.checked_in_at ? 'Mark not arrived' : 'Mark arrived'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TableForm({ initial, onSave, onCancel }: {
  initial?: Partial<SeatingTable>;
  onSave: (t: Partial<SeatingTable>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.table_name ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? 8);
  const [shape, setShape] = useState<'round' | 'rectangle'>((initial?.table_shape as 'round' | 'rectangle') ?? 'round');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ table_name: name, capacity: Number(capacity), table_shape: shape, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 bg-surface-subtle rounded-xl border border-border-subtle">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
        <input
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-36"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Table 1"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Capacity</label>
        <input
          type="number"
          min="1"
          max="100"
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-20"
          value={capacity}
          onChange={e => setCapacity(Number(e.target.value))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Shape</label>
        <select
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          value={shape}
          onChange={e => setShape(e.target.value as 'round' | 'rectangle')}
        >
          <option value="round">Round</option>
          <option value="rectangle">Rectangle</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

const DEMO_EVENT_ID = 'demo-event-reception';
const DEMO_SEATING_EVENT_ID = 'demo-seating-event';

export const DashboardSeating: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [seatingEvent, setSeatingEvent] = useState<SeatingEvent | null>(null);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [allGuests, setAllGuests] = useState<EligibleGuest[]>([]);
  const [counters, setCounters] = useState<EventCounters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeating, setLoadingSeating] = useState(false);
  const [addingTable, setAddingTable] = useState(false);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [activeGuest, setActiveGuest] = useState<EligibleGuest | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAutoTablesModal, setShowAutoTablesModal] = useState(false);
  const [autoCapacity, setAutoCapacity] = useState(8);
  const [invalidCount, setInvalidCount] = useState(0);
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'visual' | 'list'>('visual');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      if (isDemoMode) {
        setSiteId(demoWeddingSite.id);
        const demoEvent: ItineraryEvent = {
          id: DEMO_EVENT_ID,
          event_name: 'Reception',
          event_date: new Date().toISOString().slice(0, 10),
          start_time: '18:00',
          location_name: 'Grand Ballroom',
        };
        setItineraryEvents([demoEvent]);
        setSelectedEventId(demoEvent.id);
        return;
      }

      const id = await getWeddingSiteId();
      if (!id) return;
      setSiteId(id);
      const events = await loadItineraryEvents(id);
      setItineraryEvents(events);
      if (events.length > 0) {
        const best = events.find(e =>
          /reception|dinner|ceremony/i.test(e.event_name)
        ) ?? events[0];
        setSelectedEventId(best.id);
      }
    } catch {
      toast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (siteId && selectedEventId) {
      loadSeatingData();
    }
  }, [siteId, selectedEventId]);

  async function loadSeatingData() {
    if (!siteId || !selectedEventId) return;
    setLoadingSeating(true);
    try {
      if (isDemoMode) {
        const se: SeatingEvent = {
          id: DEMO_SEATING_EVENT_ID,
          wedding_site_id: siteId,
          itinerary_event_id: selectedEventId,
          default_table_capacity: 8,
          notes: '',
          created_at: new Date().toISOString(),
        };
        setSeatingEvent(se);

        const guestsData: EligibleGuest[] = demoGuests.map((g, idx) => {
          const fullName = g.name || [g.first_name, g.last_name].filter(Boolean).join(' ') || `Guest ${idx + 1}`;
          return {
            id: g.id,
            full_name: fullName,
            email: g.email ?? null,
            rsvp_status: g.rsvp_status,
            household_id: null,
            group_name: null,
            is_attending: g.rsvp_status === 'confirmed',
            is_invited_to_event: true,
          };
        });

        setTables([]);
        setAssignments([]);
        setAllGuests(guestsData);
        const attending = guestsData.filter(g => g.is_attending).length;
        const declined = guestsData.filter(g => g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending').length;
        const pending = guestsData.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
        setCounters({ invited: guestsData.length, attending, declined, pending, seated: 0, unassigned: attending });
        setInvalidCount(0);
        return;
      }

      const se = await getOrCreateSeatingEvent(siteId, selectedEventId);
      setSeatingEvent(se);
      const [tablesData, assignmentsData, guestsData] = await Promise.all([
        loadTables(se.id),
        loadAssignments(se.id),
        getEligibleGuests(siteId, selectedEventId),
      ]);
      setTables(tablesData);
      setAssignments(assignmentsData);
      setAllGuests(guestsData);
      const ctrs = await getEventCounters(siteId, selectedEventId, se.id);
      setCounters(ctrs);
      const invalid = assignmentsData.filter(a => !a.is_valid).length;
      setInvalidCount(invalid);
    } catch {
      toast('Failed to load seating data', 'error');
    } finally {
      setLoadingSeating(false);
    }
  }

  const assignedGuestIds = new Set(assignments.map(a => a.guest_id));
  const unassignedGuests = allGuests.filter(g => g.is_attending && !assignedGuestIds.has(g.id));

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
        toast('Failed to unassign guest', 'error');
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

    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    const existingForGuest = assignments.find(a => a.guest_id === guestId);
    const currentOccupants = assignments
      .filter(a => a.table_id === targetTable.id && a.guest_id !== guestId).length;
    if (currentOccupants >= targetTable.capacity) {
      toast(`${targetTable.table_name} is full`, 'error');
      return;
    }

    // if dropping onto an occupied seat, bump that guest to unseated at same table
    let bumpedGuestId: string | null = null;
    if (targetSeatIndex != null) {
      const occupied = assignments.find(a => a.table_id === targetTable.id && a.seat_index === targetSeatIndex && a.guest_id !== guestId);
      if (occupied) bumpedGuestId = occupied.guest_id;
    }

    try {
      const assignment = isDemoMode
        ? {
            id: `demo-assignment-${guestId}`,
            seating_event_id: seatingEvent.id,
            table_id: targetTable.id,
            guest_id: guestId,
            seat_index: targetSeatIndex ?? existingForGuest?.seat_index ?? null,
            is_valid: true,
            checked_in_at: null,
          }
        : await assignGuestToTable(seatingEvent.id, targetTable.id, guestId, targetSeatIndex);
      setAssignments(prev => {
        let next = prev.filter(a => a.guest_id !== guestId).map(a => {
          if (bumpedGuestId && a.guest_id === bumpedGuestId) return { ...a, seat_index: null };
          return a;
        });
        next = [...next, assignment];
        return next;
      });
    } catch {
      toast('Failed to assign guest', 'error');
    }
  }

  const handleRemoveGuest = useCallback(async (guestId: string) => {
    if (!seatingEvent) return;
    try {
      if (!isDemoMode) {
        await unassignGuest(seatingEvent.id, guestId);
      }
      setAssignments(prev => prev.filter(a => a.guest_id !== guestId));
    } catch {
      toast('Failed to unassign guest', 'error');
    }
  }, [seatingEvent, toast, isDemoMode]);

  async function handleAddTable(tableData: Partial<SeatingTable>) {
    if (!seatingEvent) return;
    try {
      const sortOrder = tables.length;
      const created = isDemoMode
        ? {
            id: `demo-table-${Date.now()}`,
            seating_event_id: seatingEvent.id,
            table_name: tableData.table_name || `Table ${sortOrder + 1}`,
            capacity: tableData.capacity || 8,
            sort_order: sortOrder,
            notes: tableData.notes || '',
            table_shape: (tableData.table_shape as 'round' | 'rectangle') || 'round',
          }
        : await createTable({ ...tableData, seating_event_id: seatingEvent.id, sort_order: sortOrder });
      setTables(prev => [...prev, created]);
      setAddingTable(false);
      toast('Table added', 'success');
    } catch {
      toast('Failed to add table', 'error');
    }
  }

  async function handleUpdateTable(id: string, tableData: Partial<SeatingTable>) {
    try {
      if (!isDemoMode) {
        await updateTable(id, tableData);
      }
      setTables(prev => prev.map(t => t.id === id ? { ...t, ...tableData } : t));
      setEditingTable(null);
      toast('Table updated', 'success');
    } catch {
      toast('Failed to update table', 'error');
    }
  }

  async function handleDeleteTable(id: string) {
    try {
      if (!isDemoMode) {
        await deleteTable(id);
      }
      setTables(prev => prev.filter(t => t.id !== id));
      setAssignments(prev => prev.filter(a => a.table_id !== id));
      toast('Table deleted', 'success');
    } catch {
      toast('Failed to delete table', 'error');
    }
  }

  async function handleReset() {
    if (!seatingEvent) return;
    try {
      if (!isDemoMode) {
        await resetSeating(seatingEvent.id);
      }
      setAssignments([]);
      setShowResetConfirm(false);
      toast('Seating reset', 'success');
    } catch {
      toast('Failed to reset seating', 'error');
    }
  }

  async function handleAutoCreateTables() {
    if (!seatingEvent || !counters) return;
    try {
      const created = isDemoMode
        ? Array.from({ length: Math.ceil(counters.attending / autoCapacity) }).map((_, idx) => ({
            id: `demo-auto-table-${Date.now()}-${idx}`,
            seating_event_id: seatingEvent.id,
            table_name: `Table ${tables.length + idx + 1}`,
            capacity: autoCapacity,
            sort_order: tables.length + idx,
            notes: '',
            table_shape: 'round' as const,
          }))
        : await autoCreateTables(seatingEvent.id, counters.attending, autoCapacity);
      setTables(prev => [...prev, ...created]);
      setShowAutoTablesModal(false);
      toast(`Created ${created.length} tables`, 'success');
    } catch {
      toast('Failed to auto-create tables', 'error');
    }
  }

  async function handleAutoSeat() {
    if (!seatingEvent) return;
    if (tables.length === 0) {
      toast('Add tables first before auto-seating', 'error');
      return;
    }
    try {
      const newAssignments = isDemoMode
        ? (() => {
            const attendees = allGuests.filter(g => g.is_attending);
            const occupancy = new Map<string, number>(tables.map(t => [t.id, 0]));
            const generated: SeatingAssignment[] = [];
            for (const guest of attendees) {
              const table = tables.find(t => (occupancy.get(t.id) ?? 0) < t.capacity);
              if (!table) break;
              occupancy.set(table.id, (occupancy.get(table.id) ?? 0) + 1);
              generated.push({
                id: `demo-auto-assign-${guest.id}`,
                seating_event_id: seatingEvent.id,
                table_id: table.id,
                guest_id: guest.id,
                seat_index: null,
                is_valid: true,
              });
            }
            return generated;
          })()
        : await autoSeatGuests(seatingEvent.id, tables, allGuests);
      setAssignments(prev => {
        const existingMap = new Map(prev.map(a => [a.guest_id, a]));
        newAssignments.forEach(a => existingMap.set(a.guest_id, a));
        return Array.from(existingMap.values());
      });
      toast(`Seated ${newAssignments.length} guests`, 'success');
    } catch {
      toast('Failed to auto-seat guests', 'error');
    }
  }

  async function handleCheckDrift() {
    if (!seatingEvent || !selectedEventId || !siteId) return;
    if (isDemoMode) {
      toast('All assignments are valid', 'success');
      return;
    }
    try {
      const count = await invalidateDriftedAssignments(seatingEvent.id, selectedEventId, siteId);
      if (count > 0) {
        await loadSeatingData();
        toast(`${count} assignment(s) flagged as invalid due to RSVP changes`, 'warning');
      } else {
        toast('All assignments are valid', 'success');
      }
    } catch {
      toast('Failed to check drift', 'error');
    }
  }

  async function handleToggleCheckIn(guestId: string, checkedIn: boolean) {
    if (!seatingEvent) return;
    try {
      if (isDemoMode) {
        setAssignments(prev => prev.map(a => (
          a.guest_id === guestId ? { ...a, checked_in_at: checkedIn ? new Date().toISOString() : null } : a
        )));
      } else {
        await setGuestCheckedIn(seatingEvent.id, guestId, checkedIn);
        await loadSeatingData();
      }
      toast(checkedIn ? 'Guest marked arrived' : 'Arrival removed', 'success');
    } catch {
      toast('Failed to update check-in', 'error');
    }
  }

  function handleExportCSV() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const csv = exportSeatingCSV(allGuests, tables, assignments, selectedEvent?.event_name ?? 'Event');
    downloadCSV(csv, `seating-${selectedEvent?.event_name ?? 'event'}.csv`);
  }

  function handleExportPlaceCards() {
    const csv = exportPlaceCardsCSV(allGuests, tables, assignments);
    downloadCSV(csv, 'place-cards.csv');
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPDF() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const now = new Date().toLocaleString();

    const tableBlocks = tables.map((table) => {
      const tableGuests = allGuests.filter(g =>
        assignments.some(a => a.table_id === table.id && a.guest_id === g.id)
      );
      const rows = tableGuests.map((g) => {
        const assignment = assignments.find(a => a.table_id === table.id && a.guest_id === g.id);
        return `<tr><td>${g.full_name}</td><td>${g.email ?? ''}</td><td>${assignment?.checked_in_at ? 'Yes' : 'No'}</td></tr>`;
      }).join('');

      return `
        <section style="margin-bottom:18px; page-break-inside:avoid;">
          <h3 style="margin:0 0 8px 0;">${table.table_name} (${tableGuests.length}/${table.capacity})</h3>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Guest</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Email</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Arrived</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:8px; color:#666;">No guests assigned</td></tr>'}</tbody>
          </table>
        </section>
      `;
    }).join('');

    const html = `
      <html>
        <head><title>Seating Export - ${eventName}</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding:24px; color:#111;">
          <h1 style="margin:0 0 6px 0;">Seating Report — ${eventName}</h1>
          <p style="margin:0 0 14px 0; color:#555;">Generated ${now}</p>
          <p style="margin:0 0 20px 0; color:#333;">Attending: ${counters?.attending ?? 0} · Seated: ${counters?.seated ?? 0} · Arrived: ${arrivedCount}</p>
          ${tableBlocks || '<p>No tables yet.</p>'}
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!w) {
      toast('Popup blocked. Please allow popups to export PDF.', 'error');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  const selectedItineraryEvent = itineraryEvents.find(e => e.id === selectedEventId);
  const arrivedGuestIds = new Set(assignments.filter(a => !!a.checked_in_at).map(a => a.guest_id));
  const arrivedCount = allGuests.filter(g => g.is_attending && arrivedGuestIds.has(g.id)).length;
  const checkInCandidates = allGuests
    .filter(g => g.is_attending)
    .filter(g => g.full_name.toLowerCase().includes(checkInQuery.toLowerCase().trim()))
    .slice(0, 8);

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
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Seating</h1>
              <p className="text-sm text-text-secondary">Drag guests to tables</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPlaceCards}>
              <Download className="w-4 h-4 mr-1" /> Place Cards
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCheckDrift}>
              <RefreshCw className="w-4 h-4 mr-1" /> Check RSVP Drift
            </Button>
            <Button variant={checkInMode ? 'primary' : 'outline'} size="sm" onClick={() => setCheckInMode(v => !v)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> {checkInMode ? 'Exit Check-in' : 'Check-in Mode'}
            </Button>
            <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-0.5">
              <button
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${layoutMode === 'visual' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('visual')}
              >
                Visual
              </button>
              <button
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${layoutMode === 'list' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('list')}
              >
                List
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-medium text-text-secondary whitespace-nowrap">Event:</label>
            <select
              className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedEventId ?? ''}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              {itineraryEvents.map(e => (
                <option key={e.id} value={e.id}>
                  {e.event_name} — {new Date(e.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {layoutMode === 'visual' && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface border border-border-subtle" /> Empty seat</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-light border border-primary/40" /> Active drop zone</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success/10 border border-success/40" /> Arrived (check-in)</span>
          </div>
        )}

        {counters && (
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {[
              { label: 'Invited', value: counters.invited, color: 'text-text-primary' },
              { label: 'Attending', value: counters.attending, color: 'text-success' },
              { label: 'Arrived', value: arrivedCount, color: 'text-success' },
              { label: 'Declined', value: counters.declined, color: 'text-error' },
              { label: 'Pending', value: counters.pending, color: 'text-warning' },
              { label: 'Seated', value: counters.seated, color: 'text-primary' },
              { label: 'Unassigned', value: counters.unassigned, color: counters.unassigned > 0 ? 'text-warning' : 'text-text-tertiary' },
            ].map(stat => (
              <Card key={stat.label} padding="sm" className="text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-text-tertiary">{stat.label}</p>
              </Card>
            ))}
          </div>
        )}

        {invalidCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
            <span className="text-text-primary">
              <span className="font-medium text-error">{invalidCount}</span> assignment(s) are invalid due to RSVP changes.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" onClick={() => setAddingTable(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Table
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAutoTablesModal(true)}>
            <Wand2 className="w-4 h-4 mr-1" /> Auto-Create Tables
          </Button>
          {tables.length > 0 && unassignedGuests.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleAutoSeat}>
              <Wand2 className="w-4 h-4 mr-1" /> Auto-Seat Guests
            </Button>
          )}
          {assignments.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(true)} className="text-error hover:text-error hover:bg-error/5">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset All
            </Button>
          )}
        </div>

        {checkInMode && (
          <div className="p-3 bg-surface-subtle border border-border-subtle rounded-xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={checkInQuery}
                onChange={(e) => setCheckInQuery(e.target.value)}
                placeholder="Search attendee name for quick check-in"
                className="flex-1 min-w-[220px] px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-xs text-text-tertiary">{arrivedCount}/{counters?.attending ?? 0} arrived</span>
            </div>
            {checkInQuery.trim().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {checkInCandidates.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No attendees match that search.</p>
                ) : checkInCandidates.map((guest) => {
                  const checked = arrivedGuestIds.has(guest.id);
                  return (
                    <button
                      key={guest.id}
                      onClick={() => handleToggleCheckIn(guest.id, !checked)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${checked ? 'bg-success/10 border-success/40 text-success' : 'bg-surface border-border-subtle text-text-secondary hover:border-success/40 hover:text-success'}`}
                    >
                      {guest.full_name} {checked ? '• Arrived' : '• Mark arrived'}
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
          <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Auto-Create Tables</h3>
            <p className="text-xs text-text-tertiary">
              Creates enough tables to seat {counters?.attending ?? 0} attending guests.
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
              <Button size="sm" onClick={handleAutoCreateTables}>Create Tables</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAutoTablesModal(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-xl flex items-start justify-between gap-4">
            <p className="text-sm text-text-primary">Reset all seating assignments for this event? This cannot be undone.</p>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={handleReset} className="border-error text-error hover:bg-error/5">Reset</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
            </div>
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
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-text-primary">Unassigned</h2>
                    <span className="text-xs text-text-tertiary">{unassignedGuests.length} guests</span>
                  </div>
                  <UnassignedPool guests={unassignedGuests} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {tables.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-xl">
                    <TableProperties className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary mb-2">No tables yet</p>
                    <p className="text-sm text-text-tertiary mb-4">Add tables manually or use auto-create.</p>
                    <Button size="sm" onClick={() => setAddingTable(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Table
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tables.map(table => (
                      editingTable?.id === table.id ? null : (
                        <TableCard
                          key={table.id}
                          table={table}
                          guests={allGuests.filter(g =>
                            assignments.some(a => a.table_id === table.id && a.guest_id === g.id)
                          )}
                          assignments={assignments.filter(a => a.table_id === table.id)}
                          allGuests={allGuests}
                          onEdit={setEditingTable}
                          onDelete={handleDeleteTable}
                          onRemoveGuest={handleRemoveGuest}
                          checkInMode={checkInMode}
                          onToggleCheckIn={handleToggleCheckIn}
                          layoutMode={layoutMode}
                        />
                      )
                    ))}
                  </div>
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
            const tableGuests = allGuests.filter(g =>
              assignments.some(a => a.table_id === table.id && a.guest_id === g.id)
            );
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
    </DashboardLayout>
  );
};
