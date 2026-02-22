import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, SlidersHorizontal, ArrowRight, Eye, EyeOff, Plus, ArrowUp, ArrowDown, Undo2, Redo2, CheckCircle2, GripVertical, Keyboard, Command } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type LabSection = {
  id: string;
  type: string;
  title: string;
  variant: string;
  enabled: boolean;
};

const INITIAL_SECTIONS: LabSection[] = [
  { id: 'hero', type: 'hero', title: 'Hero', variant: 'countdown', enabled: true },
  { id: 'story', type: 'story', title: 'Story', variant: 'timeline', enabled: true },
  { id: 'schedule', type: 'schedule', title: 'Schedule', variant: 'dayTabs', enabled: true },
  { id: 'travel', type: 'travel', title: 'Travel', variant: 'localGuide', enabled: true },
  { id: 'registry', type: 'registry', title: 'Registry', variant: 'fundHighlight', enabled: true },
  { id: 'rsvp', type: 'rsvp', title: 'RSVP', variant: 'card', enabled: true },
];

const ADDABLE_SECTIONS = ['Gallery', 'FAQ', 'Venue', 'Countdown', 'Wedding Party', 'Dress Code', 'Accommodations', 'Directions'];

type StructureItemProps = {
  section: LabSection;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
};

const StructureItem: React.FC<StructureItemProps> = ({ section, selected, isFirst, isLast, onSelect, onMoveUp, onMoveDown, onToggleVisibility }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }}
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${selected ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' : 'bg-surface-subtle border-border text-text-secondary'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing text-text-tertiary">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <span className="truncate">{section.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-0.5" disabled={isFirst}><ArrowUp className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-0.5" disabled={isLast}><ArrowDown className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className="p-0.5">{section.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
        </div>
      </div>
      <p className="text-[11px] opacity-70 mt-0.5">{section.variant}</p>
    </button>
  );
};

export const BuilderV2Lab: React.FC = () => {
  const [history, setHistory] = useState<LabSection[][]>([INITIAL_SECTIONS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(INITIAL_SECTIONS[0].id);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [addQuery, setAddQuery] = useState('');
  const [showStructure, setShowStructure] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showCommand, setShowCommand] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sections = history[historyIndex];
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0];

  const markSaving = () => {
    setSaveState('saving');
    window.setTimeout(() => setSaveState('saved'), 600);
  };

  const commit = (next: LabSection[]) => {
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, next]);
    setHistoryIndex(trimmed.length);
    markSaving();
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    commit(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === String(active.id));
    const newIndex = sections.findIndex((s) => s.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(sections, oldIndex, newIndex));
  };

  const toggleVisibility = (id: string) => {
    commit(sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const addSection = (typeLabel: string) => {
    const id = `${typeLabel.toLowerCase()}-${Date.now()}`;
    const next = [...sections, { id, type: typeLabel.toLowerCase(), title: typeLabel, variant: 'default', enabled: true }];
    setSelectedId(id);
    commit(next);
  };

  const renameSelected = (title: string) => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, title } : s)));
  };

  const updateVariant = (variant: string) => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, variant } : s)));
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const orderedVisible = useMemo(() => sections.filter((s) => s.enabled), [sections]);
  const filteredAddables = useMemo(() => ADDABLE_SECTIONS.filter((name) => name.toLowerCase().includes(addQuery.trim().toLowerCase())), [addQuery]);

  const commandItems = useMemo(() => {
    const base = [
      ...ADDABLE_SECTIONS.map((name) => ({ id: `add-${name}`, label: `Add section: ${name}`, action: () => addSection(name) })),
      ...sections.map((s) => ({ id: `select-${s.id}`, label: `Select section: ${s.title}`, action: () => setSelectedId(s.id) })),
      ...['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'fundHighlight'].map((v) => ({ id: `variant-${v}`, label: `Set variant: ${v}`, action: () => updateVariant(v) })),
    ];
    const q = commandQuery.trim().toLowerCase();
    return q ? base.filter((i) => i.label.toLowerCase().includes(q)) : base;
  }, [commandQuery, sections, selected.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) setHistoryIndex((i) => i - 1);
      }
      if ((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        if (canRedo) setHistoryIndex((i) => i + 1);
      }
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommand((v) => !v);
      }
      if (e.key === 'ArrowDown' && isMeta) {
        e.preventDefault();
        const idx = sections.findIndex((s) => s.id === selected.id);
        if (idx < sections.length - 1) setSelectedId(sections[idx + 1].id);
      }
      if (e.key === 'ArrowUp' && isMeta) {
        e.preventDefault();
        const idx = sections.findIndex((s) => s.id === selected.id);
        if (idx > 0) setSelectedId(sections[idx - 1].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canRedo, canUndo, sections, selected.id]);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Builder v2 Lab</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">Functional shell (Sprint 2 in progress)</h1>
            <p className="text-text-secondary mt-2 max-w-2xl">Isolated V2 with real section state, selection, reorder, visibility, undo/redo, autosave indicator, plus searchable add-section flow.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full ${saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {saveState === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {saveState === 'saved' ? 'All changes saved' : 'Saving...'}
            </span>
            <Link to="/product" className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1">Back <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
          <p className="inline-flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> Shortcuts: ⌘/Ctrl+Z undo · ⇧⌘/Ctrl+Z redo · ⌘/Ctrl+↑/↓ select section</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCommand(true)} className="px-2 py-1 border rounded-md hover:border-primary/40 inline-flex items-center gap-1"><Command className="w-3.5 h-3.5" /> Command</button>
            <button onClick={() => setShowStructure((v) => !v)} className="px-2 py-1 border rounded-md hover:border-primary/40">{showStructure ? 'Hide' : 'Show'} Structure</button>
            <button onClick={() => setShowProperties((v) => !v)} className="px-2 py-1 border rounded-md hover:border-primary/40">{showProperties ? 'Hide' : 'Show'} Properties</button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${showStructure && showProperties ? 'lg:grid-cols-[290px_1fr_320px]' : showStructure || showProperties ? 'lg:grid-cols-[290px_1fr]' : 'lg:grid-cols-1'} gap-4`}>
          {showStructure && (<aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Structure</h2>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sections.map((s, idx) => (
                    <StructureItem
                      key={s.id}
                      section={s}
                      selected={selected.id === s.id}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onSelect={() => setSelectedId(s.id)}
                      onMoveUp={() => moveSection(s.id, -1)}
                      onMoveDown={() => moveSection(s.id, 1)}
                      onToggleVisibility={() => toggleVisibility(s.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-[11px] text-text-tertiary">Add section</span>
                <input
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="Search sections..."
                  className="mt-1 w-full border rounded-md px-2.5 py-1.5 text-xs bg-white"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-auto pr-0.5">
                {filteredAddables.map((name) => (
                  <button key={name} onClick={() => addSection(name)} className="text-xs border border-border rounded-md px-2 py-1.5 hover:border-primary/40 inline-flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" /> {name}
                  </button>
                ))}
                {filteredAddables.length === 0 && (
                  <p className="col-span-2 text-[11px] text-text-tertiary">No matches. Try another keyword.</p>
                )}
              </div>
            </div>
          </aside>)}

          <main className="rounded-2xl border border-border bg-surface p-4 min-h-[560px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Canvas</h2>
              <div className="flex gap-2">
                <button onClick={() => canUndo && setHistoryIndex((i) => i - 1)} disabled={!canUndo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" />Undo</button>
                <button onClick={() => canRedo && setHistoryIndex((i) => i + 1)} disabled={!canRedo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Redo2 className="w-3.5 h-3.5" />Redo</button>
              </div>
            </div>
            <div className="h-[500px] rounded-xl border border-border-subtle bg-surface-subtle p-5 space-y-3 overflow-auto">
              {orderedVisible.map((s) => (
                <div key={s.id} className={`rounded-xl bg-white border p-4 ${selected.id === s.id ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border-subtle'}`} onClick={() => setSelectedId(s.id)}>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-text-tertiary mt-1">Variant: {s.variant}</p>
                </div>
              ))}
            </div>
          </main>

          {showStructure && (<aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Properties</h2>
            </div>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-text-tertiary">Section title</span>
                <input value={selected.title} onChange={(e) => renameSelected(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white" />
              </label>
              <label className="block">
                <span className="text-xs text-text-tertiary">Variant</span>
                <select value={selected.variant} onChange={(e) => updateVariant(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
                  {['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'fundHighlight'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button onClick={() => toggleVisibility(selected.id)} className="w-full border rounded-md px-3 py-2 text-left hover:border-primary/40">
                {selected.enabled ? 'Hide section' : 'Show section'}
              </button>
            </div>
          </aside>)}
        </div>
      </div>

      {showCommand && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-24" onClick={() => setShowCommand(false)}>
          <div className="w-full max-w-xl bg-white rounded-xl border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-border-subtle">
              <input
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {commandItems.slice(0, 18).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { item.action(); setShowCommand(false); setCommandQuery(''); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-subtle text-sm"
                >
                  {item.label}
                </button>
              ))}
              {commandItems.length === 0 && <p className="text-sm text-text-tertiary px-3 py-2">No matching commands</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
