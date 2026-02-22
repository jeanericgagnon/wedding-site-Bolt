import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, SlidersHorizontal, ArrowRight, Eye, EyeOff, Plus, ArrowUp, ArrowDown, Undo2, Redo2, CheckCircle2 } from 'lucide-react';

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

export const BuilderV2Lab: React.FC = () => {
  const [history, setHistory] = useState<LabSection[][]>([INITIAL_SECTIONS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(INITIAL_SECTIONS[0].id);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [addQuery, setAddQuery] = useState('');

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

        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr_320px] gap-4">
          <aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Structure</h2>
            </div>
            <div className="space-y-2">
              {sections.map((s, idx) => (
                <button key={s.id} onClick={() => setSelectedId(s.id)} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${selected.id === s.id ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' : 'bg-surface-subtle border-border text-text-secondary'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.title}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1); }} className="p-0.5" disabled={idx === 0}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1); }} className="p-0.5" disabled={idx === sections.length - 1}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); toggleVisibility(s.id); }} className="p-0.5">{s.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-70 mt-0.5">{s.variant}</p>
                </button>
              ))}
            </div>
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
          </aside>

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

          <aside className="rounded-2xl border border-border bg-surface p-4">
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
          </aside>
        </div>
      </div>
    </div>
  );
};
