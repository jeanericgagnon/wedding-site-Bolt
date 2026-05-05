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
import { Users, Download, Wand2, Plus, Edit2, Trash2, X, AlertTriangle, RotateCcw, RotateCw, TableProperties, CheckCircle2, RefreshCw, History, Image as ImageIcon } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests } from '../../lib/demoData';
import { supabase } from '../../lib/supabase';
import { isAttendingRsvpStatus } from '../../lib/rsvpStatus';
import { buildSeatingCateringHandoffReview, buildSeatingCateringPacket, cateringRowsToCsv } from '../../lib/seatingCateringExportReadiness';
import { formatSeatingEventLabel } from './seatingEventDate';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import {
  ItineraryEvent, SeatingEvent, SeatingTable, SeatingAssignment, EligibleGuest,
  EventCounters, getWeddingSiteId, loadItineraryEvents, getOrCreateSeatingEvent,
  loadTables, createTable, updateTable, deleteTable, loadAssignments,
  assignGuestToTable, unassignGuest, resetSeating, getEligibleGuests,
  getEventCounters, autoCreateTables, autoSeatGuests, exportSeatingCSV,
  exportPlaceCardsCSV, downloadCSV, invalidateDriftedAssignments, setGuestCheckedIn,
  SeatingLayoutVersion, loadSeatingVersions, createSeatingVersion, markSeatingVersionRestored,
  deriveEventCountersFromGuests,
} from './seating/seatingService';
import {
  UNASSIGNED_DROPPABLE,
  buildArrivedGuestIdSet,
  buildAssignedGuestIdSet,
  buildDemoAutoSeatAssignments,
  buildDemoAutoTables,
  buildSeatingLayoutSvg,
  buildSeatingReportHtml,
  buildTableSummaryCsv,
  countArrivedAttendingGuests,
  getAssignmentsForTable,
  getCheckInCandidates,
  getGuestsAssignedToTable,
  getSeatPickerOptions,
  getShapeLabel,
  getShapePalette,
  getUnassignedAttendingGuests,
  safeExportSlug,
  type SeatingCheckInFilter,
  type TableShape,
} from './seating/seatingDashboardUtils';
import {
  DEMO_ITINERARY_STORAGE_KEY,
  loadDemoItineraryEventsFromStorage,
  readDemoSeatingState,
  readSeatingVersions,
  writeDemoSeatingState,
  writeSeatingVersions,
} from './seating/seatingDemoStorage';

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
      ${isDragging ? 'opacity-90 ring-2 ring-primary/20' : ''}
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
      className={`min-h-[120px] rounded-lg border-2 border-dashed p-3 transition-colors ${isOver ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'}`}
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
        rounded-lg transition-all cursor-pointer
        ${isCanvas
          ? (isOver && !isFull ? 'bg-transparent ring-2 ring-primary/40' : isSelected ? 'bg-transparent ring-1 ring-border' : 'bg-transparent')
          : (isOver && !isFull
              ? 'border-2 border-primary bg-primary-light/30'
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
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${palette.chip}`}>{getShapeLabel((table.table_shape ?? 'round') as TableShape)}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${isFull ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-tertiary'}`}>
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
                <div className={`mx-auto flex items-center justify-center rounded-lg text-xs text-text-tertiary ${palette.fill} ${isNonSeatingObject ? 'pointer-events-none select-none border-2 border-dashed' : 'border'}`} style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}>
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
                      className="absolute h-9 w-16 -ml-8 -mt-4 sm:h-10 sm:w-20 sm:-ml-10 sm:-mt-5"
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
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border ${palette.fill}`}
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
                          className="absolute h-[34px] w-[74px] -ml-[37px] -mt-[17px]"
                          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                          onSelectSeat={onSelectSeat}
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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-3">
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
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(buildPayload())}
          >
            Save
          </Button>
        )}
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
  const [seatingBusyAction, setSeatingBusyAction] = useState<'auto-create' | 'auto-seat' | 'reset' | null>(null);
  const [invalidCount, setInvalidCount] = useState(0);
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<SeatingCheckInFilter>('not_arrived');
  const [layoutMode, setLayoutMode] = useState<'visual' | 'list'>('visual');
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [seatPicker, setSeatPicker] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [seatPickerQuery, setSeatPickerQuery] = useState('');
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
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [versions, setVersions] = useState<SeatingLayoutVersion[]>([]);
  const tableDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const { toast } = useToast();
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
        setCounters(deriveEventCountersFromGuests(guestsData, saved.assignments));
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
      try {
        setVersions(await loadSeatingVersions(se.id));
      } catch {
        setVersions([]);
      }
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

  useEffect(() => {
    if (!selectedEventId) {
      setVersions([]);
      return;
    }
    if (isDemoMode) {
      setVersions(readSeatingVersions().filter((version) => version.itinerary_event_id === selectedEventId));
    }
  }, [selectedEventId]);

  const unassignedGuests = getUnassignedAttendingGuests(allGuests, assignments);

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
    if (!seatingEvent) {
      toast('Seating is still loading. Please try again in a moment.', 'warning');
      return;
    }
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
        ? buildDemoAutoTables({
            seatingEventId: seatingEvent.id,
            attendingCount: counters.attending,
            capacity: autoCapacity,
            existingTableCount: tables.length,
          })
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
        ? buildDemoAutoSeatAssignments({
            seatingEventId: seatingEvent.id,
            guests: allGuests,
            tables,
            existingAssignments: assignments,
          })
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

  function handleExportTableSummaryCSV() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const packet = buildSeatingCateringPacket({ guests: allGuests, tables, assignments });

    const safeName = safeExportSlug(eventName);
    downloadCSV(buildTableSummaryCsv(packet), `table-summary-${safeName}.csv`);
  }

  function handleExportCateringCSV() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const packet = buildSeatingCateringPacket({ guests: allGuests, tables, assignments });
    downloadCSV(cateringRowsToCsv(packet.rows), `catering-packet-${safeExportSlug(eventName)}.csv`);
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPDF() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const now = new Date().toLocaleString();
    const html = buildSeatingReportHtml({
      eventName,
      createdLabel: now,
      guests: allGuests,
      tables,
      assignments,
      counters,
      arrivedCount,
    });

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

  function handleExportImage() {
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    const eventName = selectedEvent?.event_name ?? 'Event';
    const svg = buildSeatingLayoutSvg({ eventName, tables, assignments });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seating-layout-${(eventName || 'event').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSaveVersion() {
    if (!selectedEventId || !siteId || !seatingEvent) return;
    const selectedEvent = itineraryEvents.find(e => e.id === selectedEventId);
    if (!isDemoMode) {
      try {
        const saved = await createSeatingVersion({
          weddingSiteId: siteId,
          seatingEventId: seatingEvent.id,
          itineraryEventId: selectedEventId,
          label: `${selectedEvent?.event_name ?? 'Layout'} v${versions.length + 1}`,
          tables,
          assignments,
        });
        setVersions((prev) => [saved, ...prev].slice(0, 12));
        toast('Seating version saved for the team', 'success');
      } catch {
        toast('Couldn’t save that seating version. Please try again.', 'error');
      }
      return;
    }

    const nextVersion: SeatingLayoutVersion = {
      id: `version-${Date.now()}`,
      wedding_site_id: siteId,
      seating_event_id: seatingEvent.id,
      itinerary_event_id: selectedEventId,
      label: `${selectedEvent?.event_name ?? 'Layout'} v${versions.length + 1}`,
      created_at: new Date().toISOString(),
      created_by: null,
      restored_at: null,
      tables,
      assignments,
    };
    const allVersions = [nextVersion, ...readSeatingVersions().filter((version) => version.id !== nextVersion.id)].slice(0, 40);
    writeSeatingVersions(allVersions);
    setVersions(allVersions.filter((version) => version.itinerary_event_id === selectedEventId));
    toast('Seating version saved on this device', 'success');
  }

  async function handleRestoreVersion(version: SeatingLayoutVersion) {
    const confirmed = await requestConfirmation({
      title: `Restore ${version.label}?`,
      description: 'This replaces the current local layout view with the saved version. You can still apply changes after reviewing it.',
      confirmLabel: 'Restore version',
    });
    if (!confirmed) return;
    setTables(version.tables);
    setAssignments(version.assignments);
    if (isDemoMode && selectedEventId) {
      writeDemoSeatingState(selectedEventId, version.tables, version.assignments);
    } else {
      try {
        await markSeatingVersionRestored(version.id);
      } catch {}
    }
    toast(isDemoMode ? 'Version restored locally.' : 'Version restored as a working copy. Apply changes to persist the live seating board.', 'success');
  }

  const selectedItineraryEvent = itineraryEvents.find(e => e.id === selectedEventId);
  const arrivedGuestIds = buildArrivedGuestIdSet(assignments);
  const assignedGuestIdSet = buildAssignedGuestIdSet(assignments);
  const arrivedCount = countArrivedAttendingGuests(allGuests, arrivedGuestIds);
  const checkInCandidates = getCheckInCandidates({
    guests: allGuests,
    arrivedIds: arrivedGuestIds,
    assignedIds: assignedGuestIdSet,
    filter: checkInFilter,
    query: checkInQuery,
  });

  const cateringPacket = buildSeatingCateringPacket({ guests: allGuests, tables, assignments });
  const cateringHandoffReview = buildSeatingCateringHandoffReview(cateringPacket);
  const mealHeadcountByTable = cateringPacket.tableSummaries;
  const packetReadyTone = cateringPacket.readiness.status === 'ready'
    ? 'border-success/25 bg-success/5'
    : cateringPacket.readiness.status === 'needs-review'
      ? 'border-primary/25 bg-primary/5'
      : 'border-border-subtle bg-surface';

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
