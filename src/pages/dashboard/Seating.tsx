import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Users, Download, Wand2, Plus, Edit2, Trash2, X, AlertTriangle, RotateCcw, RotateCw, TableProperties, CheckCircle2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests, demoEvents } from '../../lib/demoData';
import { supabase } from '../../lib/supabase';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { formatSeatingEventLabel } from './seatingEventDate';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  ItineraryEvent, SeatingEvent, SeatingTable, SeatingAssignment, EligibleGuest,
  EventCounters, getWeddingSiteId, loadItineraryEvents, getOrCreateSeatingEvent,
  loadTables, createTable, updateTable, deleteTable, loadAssignments,
  assignGuestToTable, unassignGuest, resetSeating, getEligibleGuests,
  getEventCounters, autoCreateTables, autoSeatGuests, exportSeatingCSV,
  exportPlaceCardsCSV, downloadCSV, invalidateDriftedAssignments, setGuestCheckedIn,
} from './seating/seatingService';
import { buildSeatingInsightCard } from './seating/seatingIntelligence';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import { buildDayOfRelayModel, type DayOfRelayStep } from './dayOfRelay';
import { DayOfRelayCard } from './DayOfRelayCard';

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
  const [query, setQuery] = useState('');
  const filteredGuests = guests.filter((guest) => guest.full_name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-3 rounded-xl border-2 border-dashed transition-colors ${isOver ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'}`}
    >
      {guests.length > 0 && (
        <div className="mb-3 space-y-2">
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search unassigned guests"
          />
          <p className="text-[11px] text-text-tertiary">
            {filteredGuests.length === guests.length ? `${guests.length} guest${guests.length !== 1 ? 's' : ''} ready to seat` : `${filteredGuests.length} of ${guests.length} guests shown`}
          </p>
        </div>
      )}
      {guests.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">All attending guests are seated</p>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-text-tertiary">No unassigned guests match that search.</p>
          <button type="button" onClick={() => setQuery('')} className="text-xs text-primary">Clear search</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {filteredGuests.map(g => (
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
  onSelectSeat,
}: {
  tableId: string;
  seatIndex: number;
  guest?: EligibleGuest;
  isOver?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelectSeat?: (tableId: string, seatIndex: number) => void;
}) {
  const { setNodeRef, isOver: overSelf } = useDroppable({ id: `seat:${tableId}:${seatIndex}` });
  const active = isOver ?? overSelf;
  return (
    <button
      type="button"
      ref={setNodeRef}
      data-no-table-drag="true"
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSeat?.(tableId, seatIndex);
      }}
      className={`h-9 sm:h-10 rounded-lg border text-[10px] sm:text-[11px] px-1 flex items-center justify-center text-center ${active ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'} ${className ?? ''}`}
      title={`Seat ${seatIndex}`}
    >
      {guest ? (
        <span className="truncate max-w-[90px]">{guest.full_name}</span>
      ) : (
        <span className="text-text-tertiary">Seat {seatIndex}</span>
      )}
    </button>
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
  onRotate,
  onSelectSeat,
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
  onRotate: (deltaDeg: number) => void;
  onSelectSeat: (tableId: string, seatIndex: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: table.id });
  const occupied = guests.length;
  const effectiveCapacity = Math.max(table.capacity, occupied, 1);
  const isFull = occupied >= effectiveCapacity;

  const guestMap = new Map(allGuests.map(g => [g.id, g]));
  const assignedGuests = assignments
    .filter(a => a.table_id === table.id)
    .map(a => ({ assignment: a, guest: guestMap.get(a.guest_id) }))
    .filter(x => x.guest) as { assignment: SeatingAssignment; guest: EligibleGuest }[];
  const bySeat = new Map<number, { assignment: SeatingAssignment; guest: EligibleGuest }>();
  const shape = (table.table_shape ?? 'round') as TableShape;
  const palette = getShapePalette(shape);
  const isNonSeatingObject = shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor';
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
              {occupied}/{effectiveCapacity}
            </span>
            {isSelected && (
              <>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRotate(-15); }} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors" title="Rotate left">
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRotate(15); }} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors" title="Rotate right">
                  <RotateCw className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-text-tertiary">{Math.round(table.rotation_deg ?? 0)}°</span>
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
          <div style={{ transform: `rotate(${table.rotation_deg ?? 0}deg)`, transformOrigin: '50% 50%' }}>
            {(['bar', 'dj_booth', 'dance_floor'] as TableShape[]).includes((table.table_shape ?? 'round') as TableShape) ? (
              <div className="relative mb-2">
                <div className={`mx-auto rounded-xl flex items-center justify-center text-xs text-text-tertiary ${palette.fill} ${isNonSeatingObject ? 'border-2 border-dashed shadow-sm pointer-events-none select-none' : 'border'}`} style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}>
                  {table.table_name || ''}
                </div>
              </div>
            ) : (table.table_shape ?? 'round') === 'round' ? (
              <div className="relative h-52 sm:h-60 mb-2">
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border flex items-center justify-center text-[11px] text-text-tertiary ${palette.fill}`}>
                  {table.table_name}
                </div>
                {Array.from({ length: effectiveCapacity }).map((_, idx) => {
                  const seatNumber = idx + 1;
                  const angle = (idx / effectiveCapacity) * Math.PI * 2 - Math.PI / 2;
                  const radius = Math.max(88, Math.min(112, 78 + effectiveCapacity * 2));
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
                      onSelectSeat={onSelectSeat}
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
                    const total = effectiveCapacity;
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
              (!isCanvas || isSelected) ? <p className="text-xs text-text-tertiary text-center py-1">Drop guests on seats</p> : null
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
          </div>
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
  const autoSaveTimerRef = useRef<number | null>(null);

  function buildPayload() {
    const tableName = name.trim() || (shape === 'round' || shape === 'rectangle' ? 'Table' : '');
    const seatCap = (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') ? 0 : Number(capacity);
    return { table_name: tableName, capacity: seatCap, table_shape: shape, layout_width: Number(layoutWidth), layout_height: Number(layoutHeight), notes };
  }

  useEffect(() => {
    // Auto-save only while editing an existing table
    if (!initial?.id) return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      onSave(buildPayload());
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, capacity, shape, layoutWidth, layoutHeight, notes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(buildPayload());
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
        {initial?.id ? (
          <Button type="button" size="sm" onClick={onCancel}>Done</Button>
        ) : (
          <Button type="submit" size="sm">Save</Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

const DEMO_EVENT_ID = 'demo-event-reception';
const DEMO_SEATING_EVENT_ID = 'demo-seating-event';
const DEMO_ITINERARY_STORAGE_KEY = 'dayof.demo.itinerary.events';
const DEMO_SEATING_STORAGE_KEY = 'dayof.demo.seating.state';

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
  const [seatingBusyAction, setSeatingBusyAction] = useState<'auto-create' | 'auto-seat' | 'reset' | null>(null);
  const [invalidCount, setInvalidCount] = useState(0);
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'not_arrived' | 'arrived' | 'seated' | 'unseated'>('not_arrived');
  const [layoutMode, setLayoutMode] = useState<'visual' | 'list'>('visual');
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [seatPicker, setSeatPicker] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [seatPickerQuery, setSeatPickerQuery] = useState('');
  const activeSeatAssignment = seatPicker ? assignments.find((assignment) => assignment.table_id === seatPicker.tableId && assignment.seat_index === seatPicker.seatIndex) ?? null : null;
  const activeSeatGuest = activeSeatAssignment ? allGuests.find((guest) => guest.id === activeSeatAssignment.guest_id) ?? null : null;
  const seatPickerOptions = seatPicker
    ? allGuests
        .filter((guest) => !assignments.some((assignment) => assignment.guest_id === guest.id) || assignments.some((assignment) => assignment.guest_id === guest.id && assignment.table_id === seatPicker.tableId && assignment.seat_index === seatPicker.seatIndex))
        .filter((guest) => guest.full_name.toLowerCase().includes(seatPickerQuery.toLowerCase()))
    : [];
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const tableDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function loadDemoItineraryEventsFromStorage() {
    const fallbackEvents: ItineraryEvent[] = demoEvents.map((e: any) => ({
      id: e.id,
      event_name: e.event_name,
      event_date: e.event_date,
      start_time: e.start_time || '18:00',
      location_name: e.location_name || '',
    }));

    let parsedEvents: ItineraryEvent[] = [];
    try {
      const raw = localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<any>;
        parsedEvents = (Array.isArray(parsed) ? parsed : []).map((e) => ({
          id: e.id,
          event_name: e.event_name,
          event_date: e.event_date,
          start_time: e.start_time || '18:00',
          location_name: e.location_name || '',
        })).filter((e) => e.id && e.event_name && e.event_date);
      }
    } catch {}

    return parsedEvents.length > 0 ? parsedEvents : fallbackEvents;
  }


  function readDemoSeatingState(eventId: string): { tables: SeatingTable[]; assignments: SeatingAssignment[] } {
    try {
      const raw = localStorage.getItem(DEMO_SEATING_STORAGE_KEY);
      if (!raw) return { tables: [], assignments: [] };
      const parsed = JSON.parse(raw) as Record<string, { tables?: SeatingTable[]; assignments?: SeatingAssignment[] }>;
      const item = parsed?.[eventId];
      return {
        tables: Array.isArray(item?.tables) ? item.tables : [],
        assignments: Array.isArray(item?.assignments) ? item.assignments : [],
      };
    } catch {
      return { tables: [], assignments: [] };
    }
  }

  function writeDemoSeatingState(eventId: string, tablesData: SeatingTable[], assignmentsData: SeatingAssignment[]) {
    try {
      const raw = localStorage.getItem(DEMO_SEATING_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as Record<string, any> : {};
      parsed[eventId] = { tables: tablesData, assignments: assignmentsData };
      localStorage.setItem(DEMO_SEATING_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!isDemoMode) return;

    const syncDemoItinerary = () => {
      const events = loadDemoItineraryEventsFromStorage();
      setItineraryEvents(events);
      setSelectedEventId((prev) => (prev && events.some((e) => e.id === prev) ? prev : events[0]?.id ?? null));
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_ITINERARY_STORAGE_KEY) syncDemoItinerary();
    };

    const onFocus = () => syncDemoItinerary();

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isDemoMode]);

  async function loadInitial() {
    try {
      if (isDemoMode) {
        setSiteId(demoWeddingSite.id);

        const usableEvents = loadDemoItineraryEventsFromStorage();
        setItineraryEvents(usableEvents);
        setSelectedEventId(usableEvents[0].id);
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
      toast('Couldn’t load events right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!itineraryEvents.length) return;
    if (!selectedEventId || !itineraryEvents.some(e => e.id === selectedEventId)) {
      const fallback = itineraryEvents.find(e => /reception|dinner|ceremony/i.test(e.event_name)) ?? itineraryEvents[0];
      setSelectedEventId(fallback.id);
    }
  }, [itineraryEvents, selectedEventId]);

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
            is_attending: isAttendingRsvpStatus(g.rsvp_status),
            is_invited_to_event: true,
          };
        });

        const saved = readDemoSeatingState(selectedEventId);
        setTables(saved.tables);
        setAssignments(saved.assignments);
        setAllGuests(guestsData);
        const invitedGuests = guestsData.filter(g => g.is_invited_to_event);
        const attending = invitedGuests.filter(g => g.is_attending).length;
        const declined = invitedGuests.filter(g => isDeclinedRsvpStatus(g.rsvp_status)).length;
        const pending = invitedGuests.filter(g => isPendingRsvpStatus(g.rsvp_status)).length;
        const seated = invitedGuests.filter(g => g.is_attending && saved.assignments.some(a => a.is_valid && a.guest_id === g.id)).length;
        setCounters({ invited: invitedGuests.length, attending, declined, pending, seated, unassigned: Math.max(attending - seated, 0) });
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
      toast('Couldn’t load seating data right now. Please try again.', 'error');
    } finally {
      setLoadingSeating(false);
    }
  }

  useEffect(() => {
    if (!isDemoMode || !selectedEventId) return;
    writeDemoSeatingState(selectedEventId, tables, assignments);
  }, [isDemoMode, selectedEventId, tables, assignments]);

  const assignedGuestIds = new Set(assignments.map(a => a.guest_id));
  const unassignedGuests = allGuests.filter(g => g.is_attending && !assignedGuestIds.has(g.id));

  function handleDragStart(event: DragStartEvent) {
    const guest = allGuests.find(g => g.id === event.active.id);
    if (guest) setActiveGuest(guest);
  }

  async function clearSeatAssignment(tableId: string, seatIndex: number) {
    const assignment = assignments.find((item) => item.table_id === tableId && item.seat_index === seatIndex);
    if (!assignment) return;
    try {
      if (!isDemoMode && seatingEvent) {
        await unassignGuest(seatingEvent.id, assignment.guest_id);
      }
      setAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
      setSeatPicker(null);
    } catch {
      toast('Couldn’t clear that seat. Please try again.', 'error');
    }
  }

  async function assignGuestToSeatDirect(guestId: string, targetTableId: string, targetSeatIndex?: number) {
    if (!seatingEvent) return;
    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    const shape = targetTable.table_shape ?? 'round';
    if (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') {
      toast('This floor item can’t take seating assignments.', 'warning');
      return;
    }

    const existingForGuest = assignments.find(a => a.guest_id === guestId);
    const targetAssignments = assignments.filter(a => a.table_id === targetTable.id && a.guest_id !== guestId);
    const currentOccupants = targetAssignments.length;
    let occupiedAssignment: SeatingAssignment | null = null;
    const sourceSeatValue: number | null = existingForGuest?.seat_index ?? null;
    const sourceSeatIndex = sourceSeatValue ?? undefined;

    if (targetSeatIndex != null) {
      occupiedAssignment = assignments.find(a => a.table_id === targetTable.id && a.seat_index === targetSeatIndex && a.guest_id !== guestId) ?? null;
    }

    if (currentOccupants >= targetTable.capacity && !(targetSeatIndex != null && occupiedAssignment)) {
      toast(`${targetTable.table_name} is full`, 'error');
      return;
    }

    if (targetSeatIndex == null) {
      const usedSeats = new Set(
        targetAssignments.map(a => a.seat_index).filter((v): v is number => typeof v === 'number' && v > 0)
      );
      for (let i = 1; i <= targetTable.capacity; i++) {
        if (!usedSeats.has(i)) {
          targetSeatIndex = i;
          break;
        }
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
        await assignGuestToTable(seatingEvent.id, occupiedAssignment.table_id, occupiedAssignment.guest_id, sourceSeatIndex);
      }

      setAssignments(prev => {
        let next = prev.filter(a => a.guest_id !== guestId);
        if (occupiedAssignment) {
          next = next.map(a => (a.guest_id === occupiedAssignment!.guest_id ? { ...a, seat_index: sourceSeatValue } : a));
        }
        return [...next, assignment];
      });
      setSeatPicker(null);
    } catch {
      toast('Couldn’t assign that guest. Please try again.', 'error');
    }
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

  const handleRemoveGuest = useCallback(async (guestId: string) => {
    if (!seatingEvent) return;
    try {
      if (!isDemoMode) {
        await unassignGuest(seatingEvent.id, guestId);
      }
      setAssignments(prev => prev.filter(a => a.guest_id !== guestId));
    } catch {
      toast('Couldn’t unassign that guest. Please try again.', 'error');
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
            rotation_deg: Number(tableData.rotation_deg) || 0,
          }
        : await createTable({ ...tableData, seating_event_id: seatingEvent.id, sort_order: sortOrder });
      setTables(prev => [...prev, created]);
      setAddingTable(false);
      toast('Table added', 'success');
    } catch {
      toast('Couldn’t add that table. Please try again.', 'error');
    }
  }

  async function handleUpdateTable(id: string, tableData: Partial<SeatingTable>) {
    try {
      if (!isDemoMode) {
        await updateTable(id, tableData);
      }
      setTables(prev => prev.map(t => t.id === id ? { ...t, ...tableData } : t));
    } catch {
      toast('Couldn’t update that table. Please try again.', 'error');
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
      toast('Couldn’t resize that table. Please try again.', 'error');
    }
  }


  async function handleRotateTable(id: string, deltaDeg: number) {
    let next = 0;

    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      const current = t.rotation_deg ?? 0;
      next = current + deltaDeg; // unbounded so users can spin freely
      return { ...t, rotation_deg: next };
    }));

    try {
      if (!isDemoMode) {
        await updateTable(id, { rotation_deg: next });
      }
    } catch {
      toast('Couldn’t rotate this layout item. Please try again.', 'error');
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
        toast('Couldn’t save that table position. Please try again.', 'error');
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
      toast('Couldn’t remove that table. Please try again.', 'error');
    }
  }

  async function handleReset() {
    if (!seatingEvent) return;
    setSeatingBusyAction('reset');
    try {
      if (!isDemoMode) {
        await resetSeating(seatingEvent.id);
      }
      setAssignments([]);
      setShowResetConfirm(false);
      toast('Seating reset', 'success');
    } catch {
      toast('Couldn’t reset seating right now. Please try again.', 'error');
    } finally {
      setSeatingBusyAction(null);
    }
  }

  async function handleAutoCreateTables() {
    if (!seatingEvent || !counters) return;
    setSeatingBusyAction('auto-create');
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
            rotation_deg: 0,
          }))
        : await autoCreateTables(seatingEvent.id, counters.attending, autoCapacity);
      setTables(prev => [...prev, ...created]);
      setShowAutoTablesModal(false);
      toast(`Created ${created.length} tables`, 'success');
    } catch {
      toast('Couldn’t auto-create tables right now. Please try again.', 'error');
    } finally {
      setSeatingBusyAction(null);
    }
  }

  async function handleAutoSeat() {
    if (!seatingEvent) return;
    if (tables.length === 0) {
      toast('Add tables first before auto-seating', 'error');
      return;
    }
    setSeatingBusyAction('auto-seat');
    try {
      const newAssignments = isDemoMode
        ? (() => {
            const existingAssignments = assignments;
            const assignedGuestIds = new Set(existingAssignments.map((assignment) => assignment.guest_id));
            const attendees = allGuests.filter(g => g.is_attending && !assignedGuestIds.has(g.id));
            const occupancy = new Map<string, number>(tables.map(t => [t.id, existingAssignments.filter((assignment) => assignment.table_id === t.id).length]));
            const seatUsage = new Map<string, Set<number>>(
              tables.map((table) => [
                table.id,
                new Set(
                  existingAssignments
                    .filter((assignment) => assignment.table_id === table.id)
                    .map((assignment) => assignment.seat_index)
                    .filter((seat): seat is number => typeof seat === 'number' && seat > 0),
                ),
              ]),
            );
            const generated: SeatingAssignment[] = [];
            const nextSeat = (tableId: string, capacity: number) => {
              const usedSeats = seatUsage.get(tableId) ?? new Set<number>();
              for (let i = 1; i <= capacity; i++) {
                if (!usedSeats.has(i)) {
                  usedSeats.add(i);
                  seatUsage.set(tableId, usedSeats);
                  return i;
                }
              }
              return null;
            };
            for (const guest of attendees) {
              const table = tables.find(t => (occupancy.get(t.id) ?? 0) < t.capacity);
              if (!table) break;
              occupancy.set(table.id, (occupancy.get(table.id) ?? 0) + 1);
              generated.push({
                id: `demo-auto-assign-${guest.id}`,
                seating_event_id: seatingEvent.id,
                table_id: table.id,
                guest_id: guest.id,
                seat_index: nextSeat(table.id, table.capacity),
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
      if (newAssignments.length === 0) {
        toast('No unassigned attending guests were available to auto-seat.', 'info');
      } else {
        toast(`Seated ${newAssignments.length} guest${newAssignments.length !== 1 ? 's' : ''}`, 'success');
      }
    } catch {
      toast('Couldn’t auto-seat guests right now. Please try again.', 'error');
    } finally {
      setSeatingBusyAction(null);
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
      toast('Couldn’t run the seating check right now. Please try again.', 'error');
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
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (!isDemoMode && authish) {
        try {
          await supabase.auth.refreshSession();
          await setGuestCheckedIn(seatingEvent.id, guestId, checkedIn);
          await loadSeatingData();
          toast(checkedIn ? 'Guest marked arrived' : 'Arrival removed', 'success');
          return;
        } catch {
          // fall through
        }
      }
      toast('Couldn’t update check-in right now. Please try again.', 'error');
    }
  }

  async function handleBulkCheckIn(guestIds: string[], checkedIn: boolean) {
    if (!seatingEvent || guestIds.length === 0) return;
    try {
      if (isDemoMode) {
        const stamp = checkedIn ? new Date().toISOString() : null;
        const guestIdSet = new Set(guestIds);
        setAssignments(prev => prev.map((assignment) => (
          guestIdSet.has(assignment.guest_id)
            ? { ...assignment, checked_in_at: stamp }
            : assignment
        )));
      } else {
        await Promise.all(guestIds.map((guestId) => setGuestCheckedIn(seatingEvent.id, guestId, checkedIn)));
        await loadSeatingData();
      }
      toast(
        checkedIn
          ? `Marked ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''} arrived`
          : `Cleared arrival for ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''}`,
        'success',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (!isDemoMode && authish) {
        try {
          await supabase.auth.refreshSession();
          await Promise.all(guestIds.map((guestId) => setGuestCheckedIn(seatingEvent.id, guestId, checkedIn)));
          await loadSeatingData();
          toast(
            checkedIn
              ? `Marked ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''} arrived`
              : `Cleared arrival for ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''}`,
            'success',
          );
          return;
        } catch {
          // fall through
        }
      }
      toast('Couldn’t update those arrivals right now. Please try again.', 'error');
    }
  }

  function matchesCheckInFilter(guest: EligibleGuest, arrivedIds: Set<string>, assignedIds: Set<string>) {
    const hasArrived = arrivedIds.has(guest.id);
    const isAssigned = assignedIds.has(guest.id);
    switch (checkInFilter) {
      case 'arrived':
        return hasArrived;
      case 'not_arrived':
        return !hasArrived;
      case 'seated':
        return isAssigned;
      case 'unseated':
        return !isAssigned;
      default:
        return true;
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

  function handleExportExcel() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const assignmentMap = new Map(assignments.map(a => [a.guest_id, a]));
    const tableMap = new Map(tables.map(t => [t.id, t]));

    const seatingRows = allGuests
      .filter(g => g.is_attending)
      .map((guest) => {
        const assignment = assignmentMap.get(guest.id);
        const table = assignment ? tableMap.get(assignment.table_id) : null;
        return {
          Guest: guest.full_name,
          Email: guest.email ?? '',
          Table: table?.table_name ?? 'Unassigned',
          Seat: assignment?.seat_index ?? '',
          Arrived: assignment?.checked_in_at ? 'Yes' : 'No',
          Event: eventName,
        };
      });

    const tableRows = tables
      .map((table) => {
        const assigned = assignments.filter(a => a.table_id === table.id).length;
        const arrived = assignments.filter(a => a.table_id === table.id && !!a.checked_in_at).length;
        return {
          Table: table.table_name,
          Capacity: table.capacity,
          Assigned: assigned,
          Arrived: arrived,
          'Meal Headcount': assigned,
        };
      })
      .sort((a, b) => a.Table.localeCompare(b.Table));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(seatingRows), 'Seating');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tableRows), 'Table Summary');

    const safeName = (eventName || 'event').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    XLSX.writeFile(wb, `seating-${safeName}.xlsx`);
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
          <p style="margin:0 0 14px 0; color:#555;">Created ${now}</p>
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
  const daysUntilWedding = selectedItineraryEvent?.event_date
    ? Math.ceil((new Date(`${selectedItineraryEvent.event_date}T12:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const arrivedGuestIds = new Set(assignments.filter(a => !!a.checked_in_at).map(a => a.guest_id));
  const assignedGuestIdSet = new Set(assignments.map(a => a.guest_id));
  const arrivedCount = allGuests.filter(g => g.is_attending && arrivedGuestIds.has(g.id)).length;
  const splitHouseholdCount = useMemo(() => {
    const assignedGuestIds = new Set(assignments.filter((assignment) => assignment.is_valid).map((assignment) => assignment.guest_id));
    const householdMap = new Map<string, { total: number; assigned: number }>();

    allGuests
      .filter((guest) => guest.is_attending)
      .forEach((guest) => {
        const key = guest.household_id || guest.group_name || guest.id;
        const current = householdMap.get(key) ?? { total: 0, assigned: 0 };
        current.total += 1;
        if (assignedGuestIds.has(guest.id)) current.assigned += 1;
        householdMap.set(key, current);
      });

    return Array.from(householdMap.values()).filter((household) => household.assigned > 0 && household.assigned < household.total).length;
  }, [allGuests, assignments]);
  const dayOfRelay = useMemo(() => buildDayOfRelayModel({
    daysUntilWedding,
    pendingGuestCount: counters?.pending ?? 0,
    invalidSeatCount: invalidCount,
    unassignedSeatCount: counters?.unassigned ?? 0,
    splitHouseholdCount,
    liveIssueCount: invalidCount + (checkInMode ? 1 : 0),
    checkedInCount: arrivedCount,
  }), [arrivedCount, checkInMode, counters?.pending, counters?.unassigned, daysUntilWedding, invalidCount, splitHouseholdCount]);
  const checkInCandidates = allGuests
    .filter(g => g.is_attending)
    .filter(g => matchesCheckInFilter(g, arrivedGuestIds, assignedGuestIdSet))
    .filter(g => g.full_name.toLowerCase().includes(checkInQuery.toLowerCase().trim()))
    .slice(0, 12);

  const mealHeadcountByTable = tables
    .map((table) => {
      const assigned = assignments.filter(a => a.table_id === table.id).length;
      return { tableName: table.table_name, assigned, capacity: table.capacity };
    })
    .filter((row) => row.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned);

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
            <Button onClick={() => window.location.href = '/dashboard/itinerary#itinerary-readiness'}>
              Go to Itinerary
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="seating">
      <div className="max-w-7xl mx-auto space-y-6" onClick={() => setSelectedTableId(null)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Seating</h1>
              <p className="text-sm text-text-secondary">{layoutMode === 'visual' ? 'Drag guests onto specific seats' : 'Drag guests between tables quickly'}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <a href="/dashboard/seating-lookup" className="text-xs text-primary hover:text-primary-hover">Open Seating Lookup</a>
                <a href="/dashboard/coordinator" className="text-xs text-primary hover:text-primary-hover">Open Coordinator Mode</a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center p-2 rounded-xl border border-border-subtle bg-surface-subtle/40">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button variant={checkInMode ? 'primary' : 'outline'} size="sm" onClick={() => setCheckInMode(v => !v)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> {checkInMode ? 'Check-in: On' : 'Check-in Mode'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleCheckDrift()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Check assignments
            </Button>
            <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-0.5">
              <button
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${layoutMode === 'visual' ? 'bg-primary/10 text-primary shadow-sm border border-primary/30' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('visual')}
              >
                Canvas Layout
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${layoutMode === 'list' ? 'bg-primary/10 text-primary shadow-sm border border-primary/30' : 'text-text-tertiary hover:text-text-primary'}`}
                onClick={() => setLayoutMode('list')}
              >
                List Layout
              </button>
            </div>
            <div className="px-3 py-2 rounded-lg border border-border-subtle bg-surface text-xs text-text-secondary">
              Current Event: <span className="font-medium text-text-primary">{selectedItineraryEvent?.event_name ?? '—'}</span>
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
                  {formatSeatingEventLabel(e.event_name, e.event_date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(() => {
          const seatingInsight = buildSeatingInsightCard({
            counters,
            guests: allGuests,
            tables,
            assignments,
            invalidCount,
            arrivedCount,
            daysUntilWedding,
            liveIssueCount: invalidCount + (checkInMode ? 1 : 0),
          });

          const runInsightAction = (mode: 'auto-seat' | 'auto-create' | 'check-drift' | 'check-in' | 'open-coordinator') => {
            if (mode === 'auto-seat') {
              void handleAutoSeat();
              return;
            }
            if (mode === 'auto-create') {
              setShowAutoTablesModal(true);
              return;
            }
            if (mode === 'check-drift') {
              void handleCheckDrift();
              return;
            }
            if (mode === 'open-coordinator') {
              window.location.assign('/dashboard/coordinator');
              return;
            }
            setCheckInMode(true);
          };

          const runDayOfRelayAction = (step: DayOfRelayStep) => {
            if (step.target === 'coordinator') {
              window.location.assign('/dashboard/coordinator');
              return;
            }
            if (step.target === 'guests') {
              window.location.assign('/dashboard/guests');
              return;
            }
            if (step.target === 'messages') {
              window.location.assign('/dashboard/messages');
              return;
            }
            if (step.target === 'check-in') {
              setCheckInMode(true);
              return;
            }
            runInsightAction(step.target === 'check-drift' ? 'check-drift' : 'auto-seat');
          };

          return (
            <div className="space-y-4">
              <DayOfRelayCard relay={dayOfRelay} onAction={runDayOfRelayAction} />

              <Card variant="bordered" padding="lg" className="shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">{seatingInsight.eyebrow}</p>
                      <h2 className="mt-1 text-lg font-semibold text-text-primary">{seatingInsight.title}</h2>
                      <p className="mt-1 text-sm text-text-secondary">{seatingInsight.detail}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Readiness</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{seatingInsight.readinessLabel}</p>
                      </div>
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{seatingInsight.focusTitle}</p>
                        <p className="mt-1 text-xs leading-5 text-text-secondary">{seatingInsight.focusDetail}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-1">
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                        <p className="mt-1 text-sm text-text-secondary">{seatingInsight.bestNextMove}</p>
                        <div className="mt-3 border-t border-border-subtle pt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                          <p className="mt-1 text-sm text-text-secondary">{seatingInsight.decisionRule}</p>
                          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Watchout</p>
                          <p className="mt-1 text-sm text-text-secondary">{seatingInsight.watchout}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {seatingInsight.sequence.map((step) => (
                        <div key={step.id} className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                            <Badge variant={step.status === 'current' ? 'primary' : 'secondary'}>
                              {getFlowStatusLabel(step.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seatingInsight.badges.map((badge) => (
                        <Badge key={badge} variant="secondary">{badge}</Badge>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {seatingInsight.callouts.map((callout) => (
                        <p key={callout} className="text-sm text-text-secondary">{callout}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                    {seatingInsight.primaryAction && (
                      <Button size="sm" variant="primary" onClick={() => runInsightAction(seatingInsight.primaryAction!.mode)}>
                        {seatingInsight.primaryAction.label}
                      </Button>
                    )}
                    {seatingInsight.secondaryAction && (
                      <Button size="sm" variant="outline" onClick={() => runInsightAction(seatingInsight.secondaryAction!.mode)}>
                        {seatingInsight.secondaryAction.label}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })()}

        <details className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-text-primary">Seating insights</span>
            <span className="text-xs text-text-tertiary">View details</span>
          </summary>
          <div className="mt-3 space-y-3">
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
                      <p className="text-xs text-text-secondary mt-0.5">{row.assigned}/{row.capacity} meals</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {invalidCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-xl text-sm">
                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-text-primary">
                  <span className="font-medium text-error">{invalidCount}</span> assignment(s) are invalid due to RSVP changes.
                </span>
              </div>
            )}
          </div>
        </details>

        <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Table actions</p>
              <p className="mt-1 text-sm text-text-secondary">Create tables fast, auto-seat where it helps, or reset the room when plans changed.</p>
            </div>
            <Button size="sm" onClick={() => setAddingTable(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Table
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setShowAutoTablesModal(true)}
              disabled={seatingBusyAction !== null}
              className="rounded-2xl border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/30 hover:bg-primary-light/10 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">Auto-create tables</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Build enough tables for the current attending count.</p>
            </button>
            <button
              type="button"
              onClick={() => { void handleAutoSeat(); }}
              disabled={tables.length === 0 || unassignedGuests.length === 0 || seatingBusyAction !== null}
              className="rounded-2xl border border-border-subtle bg-white px-4 py-4 text-left hover:border-primary/30 hover:bg-primary-light/10 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">{seatingBusyAction === 'auto-seat' ? 'Auto-seating guests…' : 'Auto-seat guests'}</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Fill open seats for the {unassignedGuests.length} guests still waiting.</p>
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={assignments.length === 0 || seatingBusyAction !== null}
              className="rounded-2xl border border-border-subtle bg-white px-4 py-4 text-left hover:border-error/30 hover:bg-error/5 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">Reset seating</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Clear every seat assignment for this event and start fresh.</p>
            </button>
          </div>
        </div>

        {checkInMode && (
          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Check-in mode</p>
                <p className="mt-1 text-sm text-text-secondary">Search an attendee, then mark them arrived without leaving the seating board.</p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-white px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">Arrivals</p>
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
                  className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-success hover:bg-success/15"
                >
                  Mark visible arrived
                </button>
              )}
              {checkInCandidates.some((guest) => arrivedGuestIds.has(guest.id)) && (
                <button
                  type="button"
                  onClick={() => void handleBulkCheckIn(checkInCandidates.filter((guest) => arrivedGuestIds.has(guest.id)).map((guest) => guest.id), false)}
                  className="rounded-full border border-border-subtle bg-white px-3 py-1 text-text-secondary hover:border-primary/30 hover:text-primary"
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
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${checked ? 'bg-success/10 border-success/40 text-success' : 'bg-surface border-border-subtle text-text-secondary hover:border-success/40 hover:text-success'}`}
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
              <Button size="sm" onClick={handleAutoCreateTables} disabled={seatingBusyAction !== null}>{seatingBusyAction === 'auto-create' ? 'Creating…' : 'Create Tables'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAutoTablesModal(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-xl flex items-start justify-between gap-4">
            <p className="text-sm text-text-primary">Reset all seating assignments for this event? This cannot be undone.</p>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={handleReset} disabled={seatingBusyAction !== null} className="border-error text-error hover:bg-error/5">{seatingBusyAction === 'reset' ? 'Resetting…' : 'Reset'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)} disabled={seatingBusyAction !== null}>Cancel</Button>
            </div>
          </div>
        )}

        {seatPicker && (
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-subtle/40 space-y-4">
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
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">Current seat assignment</p>
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
                <div className="sticky top-24 p-3 rounded-xl border border-border-subtle bg-surface-subtle/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">Unassigned</h2>
                      <p className="text-xs text-text-tertiary mt-0.5">Drag guests into seats or use auto-seat to place them faster.</p>
                    </div>
                    <span className="text-xs text-text-tertiary">{unassignedGuests.length} guests</span>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-white px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">Open work</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{unassignedGuests.length} guest{unassignedGuests.length !== 1 ? 's' : ''} still need seats</p>
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
                    <p className="text-sm text-text-tertiary mb-4">Add tables manually or let Dayof create a starting layout from your guest count.</p>
                    <Button size="sm" onClick={() => setAddingTable(true)}>
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
                      className={`relative min-h-[720px] rounded-2xl border border-border-subtle bg-white overflow-auto transition-all duration-300 ${canvasFullscreen ? 'rounded-2xl shadow-2xl bg-white p-3' : ''}`}
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
                            <Button size="sm" onClick={() => { setCanvasFullscreen(false); setAddingTable(true); }}>
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
