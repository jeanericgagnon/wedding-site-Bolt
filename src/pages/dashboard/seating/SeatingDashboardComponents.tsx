import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  RotateCcw,
  RotateCw,
  TableProperties,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';
import {
  getShapeLabel,
  getShapePalette,
  UNASSIGNED_DROPPABLE,
  type TableShape,
} from './seatingDashboardUtils';

export function GuestChip({
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
      flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium
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

export function UnassignedPool({ guests }: { guests: EligibleGuest[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: UNASSIGNED_DROPPABLE });
  const [query, setQuery] = useState('');
  const filteredGuests = guests.filter((guest) => guest.full_name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-[20px] border-2 border-dashed p-3 transition-colors ${isOver ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'}`}
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
      className={`flex h-9 items-center justify-center rounded-xl border px-1 text-center text-[10px] sm:h-10 sm:text-[11px] ${active ? 'border-primary bg-primary-light/50' : 'border-border-subtle bg-surface-subtle'} ${className ?? ''}`}
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

export function TableCard({
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
        rounded-[20px] transition-all cursor-pointer
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
            <span className={`rounded-xl px-1.5 py-0.5 text-xs font-medium ${isFull ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-tertiary'}`}>
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
                <div className={`mx-auto flex items-center justify-center rounded-[20px] text-xs text-text-tertiary ${palette.fill} ${isNonSeatingObject ? 'pointer-events-none select-none border-2 border-dashed' : 'border'}`} style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}>
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
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[20px] border ${palette.fill}`}
                    style={{ width: `${rectSize.width}px`, height: `${rectSize.height}px` }}
                  >
                    <div className="absolute left-2 top-1 text-[10px] text-text-tertiary">{rectSize.width}x{rectSize.height}</div>
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
                    <span className="text-[10px] text-text-tertiary">S{assignment.seat_index ?? '-'}</span>
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

export function TableForm({ initial, onSave, onCancel }: {
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

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setName(initial?.table_name ?? '');
    setCapacity(initial?.capacity ?? 8);
    setShape((initial?.table_shape as TableShape) ?? 'round');
    setLayoutWidth(initial?.layout_width ?? 260);
    setLayoutHeight(initial?.layout_height ?? 150);
    setNotes(initial?.notes ?? '');
  }, [
    initial?.capacity,
    initial?.id,
    initial?.layout_height,
    initial?.layout_width,
    initial?.notes,
    initial?.table_name,
    initial?.table_shape,
  ]);

  const buildPayload = useCallback(() => {
    const tableName = name.trim() || (shape === 'round' || shape === 'rectangle' ? 'Table' : '');
    const seatCap = (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') ? 0 : Number(capacity);
    return { table_name: tableName, capacity: seatCap, table_shape: shape, layout_width: Number(layoutWidth), layout_height: Number(layoutHeight), notes };
  }, [capacity, layoutHeight, layoutWidth, name, notes, shape]);

  useEffect(() => {
    if (!initial?.id) return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      onSave(buildPayload());
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [buildPayload, initial?.id, onSave]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(buildPayload());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-[20px] border border-border-subtle bg-surface-subtle p-3">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
        <input
          className="w-36 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="w-20 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          value={capacity}
          onChange={e => setCapacity(Number(e.target.value))}
        />
      </div>)}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Shape</label>
        <select
          className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-24 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-24 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
