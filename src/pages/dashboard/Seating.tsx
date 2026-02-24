import React, { useState, useEffect, useCallback, useRef } from 'react';
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
type TableShape = 'round' | 'rectangle' | 'bar' | 'dj_booth' | 'dance_floor';

function getShapeLabel(shape: TableShape): string {
  switch (shape) {
    case 'round': return 'Round Table';
    case 'rectangle': return 'Rectangle Table';
    case 'bar': return 'Service Station';
    case 'dj_booth': return 'Booth';
    case 'dance_floor': return 'Open Zone';
    default: return 'Table';
  }
}

function getShapePalette(shape: TableShape) {
  switch (shape) {
    case 'round':
      return { chip: 'bg-primary/10 border-primary/30 text-primary', fill: 'bg-primary/5 border-primary/20' };
    case 'rectangle':
      return { chip: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600', fill: 'bg-indigo-500/5 border-indigo-500/20' };
    case 'bar':
      return { chip: 'bg-amber-500/10 border-amber-500/30 text-amber-700', fill: 'bg-amber-500/8 border-amber-500/25' };
    case 'dj_booth':
      return { chip: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-700', fill: 'bg-fuchsia-500/8 border-fuchsia-500/25' };
    case 'dance_floor':
      return { chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700', fill: 'bg-emerald-500/8 border-emerald-500/25' };
    default:
      return { chip: 'bg-surface-subtle border-border-subtle text-text-tertiary', fill: 'bg-surface-subtle border-border-subtle' };
  }
}

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
    <div ref={setNodeRef} data-no-table-drag="true" {...listeners} {...attributes}>
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
      data-no-table-drag="true"
      style={style}
      className={`h-9 sm:h-10 rounded-lg border text-[10px] sm:text-[11px] px-1 flex items-center justify-center text-center ${active ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'} ${className ?? ''}`}
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
  onResizeTable,
  isCanvas,
  onStartMove,
  isSelected,
  onSelect,
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
  onResizeTable: (tableId: string, width: number, height: number) => Promise<void>;
  isCanvas: boolean;
  onStartMove: (e: React.MouseEvent) => void;
  isSelected: boolean;
  onSelect: () => void;
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
  const shape = (table.table_shape ?? 'round') as TableShape;
  const palette = getShapePalette(shape);
  assignedGuests.forEach((row) => {
    if (row.assignment.seat_index != null) bySeat.set(row.assignment.seat_index, row);
  });

  const [rectSize, setRectSize] = useState({ width: table.layout_width ?? 260, height: table.layout_height ?? 150 });
  const rectSizeRef = useRef(rectSize);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    setRectSize({ width: table.layout_width ?? 260, height: table.layout_height ?? 150 });
  }, [table.layout_width, table.layout_height]);

  useEffect(() => {
    rectSizeRef.current = rectSize;
  }, [rectSize]);

  function clampSize(width: number, height: number) {
    return {
      width: Math.max(160, Math.min(520, Math.round(width))),
      height: Math.max(100, Math.min(320, Math.round(height))),
    };
  }

  function startRectResize(e: React.MouseEvent) {
    e.preventDefault();
    if ((table.table_shape ?? 'round') !== 'rectangle') return;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: rectSize.width, h: rectSize.height };

    const onMove = (ev: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = ev.clientX - resizeStartRef.current.x;
      const dy = ev.clientY - resizeStartRef.current.y;
      setRectSize(clampSize(resizeStartRef.current.w + dx, resizeStartRef.current.h + dy));
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const current = resizeStartRef.current;
      resizeStartRef.current = null;
      if (!current) return;
      await onResizeTable(table.id, rectSizeRef.current.width, rectSizeRef.current.height);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => {
        if (!isCanvas || e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('[data-no-table-drag="true"],button,input,textarea,select,a')) return;
        onSelect();
        onStartMove(e);
      }}
      className={`
        rounded-xl transition-all cursor-pointer
        ${isCanvas
          ? (isOver && !isFull ? 'bg-transparent ring-2 ring-primary/40' : isSelected ? 'bg-transparent ring-1 ring-border' : 'bg-transparent')
          : (isOver && !isFull
              ? 'border-2 border-primary bg-primary-light/30 shadow-md'
              : isFull
                ? 'border-2 border-border-subtle bg-surface'
                : 'border-2 border-border-subtle bg-surface hover:border-border')}
      `}
    >
      {(!isCanvas || isSelected) && (
        <div className={`flex items-center justify-between px-3 py-2 ${isCanvas ? 'bg-transparent' : 'border-b border-border-subtle'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <TableProperties className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            <span className="text-sm font-semibold text-text-primary truncate">{table.table_name}</span>
            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${palette.chip}`}>{getShapeLabel((table.table_shape ?? 'round') as TableShape)}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isFull ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-tertiary'}`}>
              {occupied}/{table.capacity}
            </span>
            {isSelected && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onEdit(table); }} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(table.id); }} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className={`p-2 min-h-[80px] ${isOver && !isFull ? 'bg-primary-light/20' : ''} ${isCanvas ? 'bg-transparent p-0' : ''}`}>
        {layoutMode === 'visual' ? (
          <>
            {(['bar', 'dj_booth', 'dance_floor'] as TableShape[]).includes((table.table_shape ?? 'round') as TableShape) ? (
              <div className="relative mb-2">
                <div className={`mx-auto border rounded-xl flex items-center justify-center text-xs text-text-tertiary ${palette.fill}`} style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}>
                  {table.table_name || ''}
                </div>
              </div>
            ) : (table.table_shape ?? 'round') === 'round' ? (
              <div className="relative h-52 sm:h-60 mb-2">
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border flex items-center justify-center text-[11px] text-text-tertiary ${palette.fill}`}>
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
                      className="absolute w-16 sm:w-20 h-9 sm:h-10 -ml-8 sm:-ml-10 -mt-4 sm:-mt-5 shadow-sm"
                      style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="relative mb-2">
                <div className="mx-auto relative" style={{ width: `${rectSize.width + 110}px`, height: `${rectSize.height + 110}px` }}>
                  <div
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border rounded-xl ${palette.fill}`}
                    style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}
                  >
                    <div className="absolute left-2 top-1 text-[10px] text-text-tertiary">{rectSize.width}×{rectSize.height}</div>
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-text-tertiary font-medium pointer-events-none">{table.table_name}</div>
                    <button
                      type="button"
                      onMouseDown={startRectResize}
                      className="absolute -bottom-2 -right-2 w-4 h-4 rounded bg-primary border border-white shadow"
                      title="Drag to resize"
                    />
                  </div>

                  {(() => {
                    const total = Math.max(1, table.capacity);
                    const seatsTop = Math.ceil(total / 4);
                    const seatsRight = Math.ceil((total - seatsTop) / 3);
                    const seatsBottom = Math.ceil((total - seatsTop - seatsRight) / 2);
                    const seatsLeft = total - seatsTop - seatsRight - seatsBottom;
                    const slotW = 74;
                    const slotH = 34;
                    const edgeGap = 20;
                    const centerX = (rectSize.width + 110) / 2;
                    const centerY = (rectSize.height + 110) / 2;
                    const left = centerX - rectSize.width / 2;
                    const right = centerX + rectSize.width / 2;
                    const top = centerY - rectSize.height / 2;
                    const bottom = centerY + rectSize.height / 2;

                    const positions = [] as Array<{seatNumber:number,x:number,y:number}>;
                    let seat = 1;
                    for (let i=0;i<seatsTop;i++,seat++) {
                      const x = left + ((i+1)/(seatsTop+1))*rectSize.width;
                      positions.push({seatNumber: seat, x, y: top - edgeGap});
                    }
                    for (let i=0;i<seatsRight;i++,seat++) {
                      const y = top + ((i+1)/(seatsRight+1))*rectSize.height;
                      positions.push({seatNumber: seat, x: right + edgeGap, y});
                    }
                    for (let i=0;i<seatsBottom;i++,seat++) {
                      const x = right - ((i+1)/(seatsBottom+1))*rectSize.width;
                      positions.push({seatNumber: seat, x, y: bottom + edgeGap});
                    }
                    for (let i=0;i<seatsLeft;i++,seat++) {
                      const y = bottom - ((i+1)/(seatsLeft+1))*rectSize.height;
                      positions.push({seatNumber: seat, x: left - edgeGap, y});
                    }

                    return positions.map((pos) => {
                      const seatAssignment = bySeat.get(pos.seatNumber);
                      return (
                        <SeatDropSlot
                          key={`${table.id}-seat-${pos.seatNumber}`}
                          tableId={table.id}
                          seatIndex={pos.seatNumber}
                          guest={seatAssignment?.guest}
                          className="absolute w-[74px] h-[34px] -ml-[37px] -mt-[17px] shadow-sm"
                          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {(table.table_shape === 'bar' || table.table_shape === 'dj_booth' || table.table_shape === 'dance_floor') ? null : (assignedGuests.length === 0 ? (
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
            ))}
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
  const [shape, setShape] = useState<TableShape>((initial?.table_shape as TableShape) ?? 'round');
  const [layoutWidth, setLayoutWidth] = useState(initial?.layout_width ?? 260);
  const [layoutHeight, setLayoutHeight] = useState(initial?.layout_height ?? 150);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tableName = name.trim() || (shape === 'round' || shape === 'rectangle' ? 'Table' : '');
    const seatCap = (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') ? 0 : Number(capacity);
    onSave({ table_name: tableName, capacity: seatCap, table_shape: shape, layout_width: Number(layoutWidth), layout_height: Number(layoutHeight), notes });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 bg-surface-subtle rounded-xl border border-border-subtle">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
        <input
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-36"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Optional label"
          autoFocus
        />
      </div>
      {(shape === 'round' || shape === 'rectangle') && (<div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Capacity</label>
        <input
          type="number"
          min="1"
          max="100"
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-20"
          value={capacity}
          onChange={e => setCapacity(Number(e.target.value))}
        />
      </div>)}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Shape</label>
        <select
          className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          value={shape}
          onChange={e => setShape(e.target.value as TableShape)}
        >
          <option value="round">Round Table</option>
          <option value="rectangle">Rectangle Table</option>
          <option value="bar">Service Station</option>
          <option value="dj_booth">Booth</option>
          <option value="dance_floor">Open Zone</option>
        </select>
      </div>
      {(shape === 'rectangle' || shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') && (
        <>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Width</label>
            <input
              type="number"
              min="160"
              max="520"
              className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-24"
              value={layoutWidth}
              onChange={e => setLayoutWidth(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Height</label>
            <input
              type="number"
              min="100"
              max="320"
              className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-24"
              value={layoutHeight}
              onChange={e => setLayoutHeight(Number(e.target.value))}
            />
          </div>
        </>
      )}
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
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const tableDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
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

    const shape = targetTable.table_shape ?? 'round';
    if (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') {
      toast('This floor object does not accept seating assignments', 'warning');
      return;
    }

    const existingForGuest = assignments.find(a => a.guest_id === guestId);
    const targetAssignments = assignments.filter(a => a.table_id === targetTable.id && a.guest_id !== guestId);
    const currentOccupants = targetAssignments.length;

    // if dropping onto an occupied seat, do a true swap (target occupant gets source seat)
    let occupiedAssignment: SeatingAssignment | null = null;
    const sourceSeatValue: number | null = existingForGuest?.seat_index ?? null;
    const sourceSeatIndex = sourceSeatValue ?? undefined;
    if (targetSeatIndex != null) {
      occupiedAssignment = assignments.find(a => a.table_id === targetTable.id && a.seat_index === targetSeatIndex && a.guest_id !== guestId) ?? null;
    }

    // table-full block should not prevent explicit occupied-seat swap
    if (currentOccupants >= targetTable.capacity && !(targetSeatIndex != null && occupiedAssignment)) {
      toast(`${targetTable.table_name} is full`, 'error');
      return;
    }

    // If dropped on table (not seat), auto-fill first open seat
    if (targetSeatIndex == null) {
      if (targetTable.capacity <= 0) {
        toast('This object has no seats', 'warning');
        return;
      }

      const usedSeats = new Set(
        targetAssignments
          .map(a => a.seat_index)
          .filter((v): v is number => typeof v === 'number' && v > 0)
      );

      for (let i = 1; i <= targetTable.capacity; i++) {
        if (!usedSeats.has(i)) {
          targetSeatIndex = i;
          break;
        }
      }

      if (targetSeatIndex == null) {
        // No open seat index left; keep source if moving inside same table, else fallback undefined
        targetSeatIndex = existingForGuest?.table_id === targetTable.id ? (existingForGuest?.seat_index ?? undefined) : undefined;
      }
    }

    try {
      const assignment = isDemoMode
        ? {
            id: `demo-assignment-${guestId}`,
            seating_event_id: seatingEvent.id,
            table_id: targetTable.id,
            guest_id: guestId,
            seat_index: targetSeatIndex ?? sourceSeatValue,
            is_valid: true,
            checked_in_at: null,
          }
        : await assignGuestToTable(seatingEvent.id, targetTable.id, guestId, targetSeatIndex);

      if (!isDemoMode && occupiedAssignment) {
        await assignGuestToTable(
          seatingEvent.id,
          occupiedAssignment.table_id,
          occupiedAssignment.guest_id,
          sourceSeatIndex
        );
      }

      setAssignments(prev => {
        let next = prev.filter(a => a.guest_id !== guestId);

        if (occupiedAssignment) {
          next = next.map(a => {
            if (a.guest_id === occupiedAssignment!.guest_id) {
              return { ...a, seat_index: sourceSeatValue };
            }
            return a;
          });
        }

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
            table_name: tableData.table_name || (((tableData.table_shape as TableShape) === 'round' || (tableData.table_shape as TableShape) === 'rectangle') ? `Table ${sortOrder + 1}` : ''),
            capacity: tableData.capacity || 8,
            sort_order: sortOrder,
            notes: tableData.notes || '',
            table_shape: (tableData.table_shape as TableShape) || 'round',
            layout_width: Number(tableData.layout_width) || 260,
            layout_height: Number(tableData.layout_height) || 150,
            layout_x: 24 + (sortOrder % 3) * 360,
            layout_y: 24 + Math.floor(sortOrder / 3) * 330,
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

  async function handleResizeTable(id: string, width: number, height: number) {
    const patch = { layout_width: width, layout_height: height };
    try {
      if (!isDemoMode) {
        await updateTable(id, patch);
      }
      setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    } catch {
      toast('Failed to resize table', 'error');
    }
  }

  function getDefaultTablePosition(index: number) {
    return {
      x: 24 + (index % 3) * 360,
      y: 24 + Math.floor(index / 3) * 330,
    };
  }

  function startMoveTable(table: SeatingTable, index: number, e: React.MouseEvent) {
    if (layoutMode !== 'visual') return;
    e.preventDefault();
    e.stopPropagation();

    const fallback = getDefaultTablePosition(index);
    const originX = table.layout_x ?? fallback.x;
    const originY = table.layout_y ?? fallback.y;
    tableDragRef.current = { id: table.id, startX: e.clientX, startY: e.clientY, originX, originY };
    setMovingTableId(table.id);

    const onMove = (ev: MouseEvent) => {
      const ctx = tableDragRef.current;
      if (!ctx) return;
      const x = Math.max(8, Math.round(ctx.originX + (ev.clientX - ctx.startX)));
      const y = Math.max(8, Math.round(ctx.originY + (ev.clientY - ctx.startY)));
      setTables(prev => prev.map(t => t.id === ctx.id ? { ...t, layout_x: x, layout_y: y } : t));
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const ctx = tableDragRef.current;
      tableDragRef.current = null;
      setMovingTableId(null);
      if (!ctx || isDemoMode) return;
      const moved = tables.find(t => t.id === ctx.id);
      try {
        await updateTable(ctx.id, {
          layout_x: moved?.layout_x ?? ctx.originX,
          layout_y: moved?.layout_y ?? ctx.originY,
        });
      } catch {
        toast('Failed to save table position', 'error');
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
            layout_width: 260,
            layout_height: 150,
            layout_x: 24 + ((tables.length + idx) % 3) * 360,
            layout_y: 24 + Math.floor((tables.length + idx) / 3) * 330,
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

  function handleCanvasWheelZoom(e: React.WheelEvent<HTMLDivElement>) {
    // Trackpad pinch on desktop browsers commonly reports wheel + ctrlKey
    if (layoutMode !== 'visual') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY;
    const step = delta > 0 ? -0.05 : 0.05;
    setCanvasZoom(z => Math.max(0.6, Math.min(1.8, Number((z + step).toFixed(2)))));
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
      <div className="max-w-7xl mx-auto space-y-5" onClick={() => setSelectedTableId(null)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Seating</h1>
              <p className="text-sm text-text-secondary">{layoutMode === 'visual' ? 'Drag guests onto specific seats' : 'Drag guests between tables quickly'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center p-2 rounded-xl border border-border-subtle bg-surface-subtle/40">
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
          <div className="hidden sm:flex flex-wrap items-center gap-3 text-xs text-text-tertiary bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2">
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

        <div className="flex flex-wrap gap-2 items-center p-2 rounded-xl border border-border-subtle bg-surface-subtle/40">
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
                placeholder="Search attendee for quick check-in"
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
                <div className="sticky top-24 p-3 rounded-xl border border-border-subtle bg-surface-subtle/40">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-text-primary">Unassigned</h2>
                    <span className="text-xs text-text-tertiary">{unassignedGuests.length} guests</span>
                  </div>
                  <UnassignedPool guests={unassignedGuests} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {layoutMode === 'visual' && (
                  <div className="mb-3 rounded-xl border border-border-subtle bg-gradient-to-b from-surface-subtle to-surface p-2 text-xs text-text-tertiary flex items-center justify-between gap-2">
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
                  <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-xl">
                    <TableProperties className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary mb-2">No tables yet</p>
                    <p className="text-sm text-text-tertiary mb-4">Add tables manually or use auto-create.</p>
                    <Button size="sm" onClick={() => setAddingTable(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Table
                    </Button>
                  </div>
                ) : (
                  layoutMode === 'visual' ? (
                    <>
                    {canvasFullscreen && (
                      <div className="fixed inset-0 bg-black/35 z-[9998]" onClick={() => setCanvasFullscreen(false)} />
                    )}
                    <div
                      className={`relative min-h-[720px] rounded-2xl border border-border-subtle bg-surface-subtle/50 overflow-auto transition-all duration-300 ${canvasFullscreen ? 'rounded-2xl shadow-2xl bg-surface p-3' : ''}`}
                      style={canvasFullscreen ? { position: 'fixed', inset: '16px', zIndex: 9999, background: 'var(--surface, #fff)' } : undefined}
                      onWheel={handleCanvasWheelZoom}
                    >
                      {canvasFullscreen && (
                        <div className="mb-2 flex items-center justify-between animate-in fade-in duration-200">
                          <button
                            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:border-border text-sm"
                            onClick={() => setCanvasFullscreen(false)}
                          >
                            ← Back
                          </button>
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
                                onResizeTable={handleResizeTable}
                                isCanvas
                                onStartMove={(e) => startMoveTable(table, idx, e)}
                                isSelected={selectedTableId === table.id}
                                onSelect={() => setSelectedTableId(table.id)}
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
                            onResizeTable={handleResizeTable}
                            isCanvas={false}
                            onStartMove={(e) => startMoveTable(table, idx, e)}
                            isSelected={selectedTableId === table.id}
                            onSelect={() => setSelectedTableId(table.id)}
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
