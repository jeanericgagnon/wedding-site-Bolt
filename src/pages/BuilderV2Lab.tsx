import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, SlidersHorizontal, ArrowRight, Eye, EyeOff, Plus, ArrowUp, ArrowDown, Undo2, Redo2, CheckCircle2, GripVertical, Keyboard, Command } from 'lucide-react';
import { getSectionComponent } from '../sections/sectionRegistry';
import type { SectionType, SectionInstance } from '../types/layoutConfig';
import type { WeddingDataV1 } from '../types/weddingData';
import { demoWeddingSite, demoEvents } from '../lib/demoData';
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
  subtitle?: string;
  density?: 'compact' | 'comfortable';
};

const INITIAL_SECTIONS: LabSection[] = [
  { id: 'hero', type: 'hero', title: 'Hero', subtitle: 'Alex & Jordan · June 21, 2026', variant: 'countdown', enabled: true, density: 'comfortable' },
  { id: 'story', type: 'story', title: 'Story', subtitle: 'How we met', variant: 'timeline', enabled: true, density: 'comfortable' },
  { id: 'schedule', type: 'schedule', title: 'Schedule', subtitle: 'Weekend events', variant: 'dayTabs', enabled: true, density: 'comfortable' },
  { id: 'travel', type: 'travel', title: 'Travel', subtitle: 'Stay + transport', variant: 'localGuide', enabled: true, density: 'comfortable' },
  { id: 'registry', type: 'registry', title: 'Registry', subtitle: 'Gift options', variant: 'fundHighlight', enabled: true, density: 'comfortable' },
  { id: 'rsvp', type: 'rsvp', title: 'RSVP', subtitle: 'Let us know', variant: 'card', enabled: true, density: 'comfortable' },
];

const ADDABLE_SECTIONS = ['Gallery', 'FAQ', 'Venue', 'Countdown', 'Wedding Party', 'Dress Code', 'Accommodations', 'Directions'];

const VARIANTS_BY_TYPE: Record<string, string[]> = {
  hero: ['default', 'countdown'],
  story: ['default', 'timeline'],
  schedule: ['default', 'dayTabs'],
  travel: ['default', 'localGuide'],
  registry: ['default', 'fundHighlight'],
  faq: ['default', 'iconGrid'],
  venue: ['default'],
  countdown: ['default'],
  rsvp: ['default'],
};

const SECTION_TYPE_MAP: Record<string, SectionType> = {
  hero: 'hero',
  story: 'story',
  schedule: 'schedule',
  travel: 'travel',
  registry: 'registry',
  rsvp: 'rsvp',
  faq: 'faq',
  venue: 'venue',
  countdown: 'countdown',
  gallery: 'gallery',
  accommodations: 'accommodations',
  contact: 'contact',
  'wedding-party': 'wedding-party',
  'dress-code': 'dress-code',
  directions: 'directions',
};


type StructureItemProps = {
  section: LabSection;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onSelectAdditive: () => void;
  onSelectRange: () => void;
  multiSelected: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
};

const StructureItem: React.FC<StructureItemProps> = ({ section, selected, multiSelected, isFirst, isLast, onSelect, onSelectAdditive, onSelectRange, onMoveUp, onMoveDown, onToggleVisibility }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }}
      onClick={(e) => {
        if (e.shiftKey) onSelectRange(); else if (e.metaKey || e.ctrlKey) onSelectAdditive();
        else onSelect();
      }}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${selected ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' : multiSelected ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-surface-subtle border-border text-text-secondary'}`}
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
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string>(INITIAL_SECTIONS[0].id);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [previewFields, setPreviewFields] = useState({
    coupleDisplayName: `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`,
    eventDateISO: `${demoWeddingSite.wedding_date}T16:00:00`,
    storyText: 'A modern love story from city coffee dates to sunset vows in Napa.',
    scheduleTitle: 'Wedding Day',
    scheduleNote: 'Weekend events',
    travelFlights: 'Fly into SFO/OAK, then shuttle or rideshare.',
    travelParking: 'On-site valet + overflow lot',
    travelHotels: 'Room blocks at River Inn and Garden Suites',
    travelTips: 'Book early for best rates. Shuttle details shared 2 weeks before.',
    registryTitle: 'Honeymoon Fund',
    registryNote: 'Your presence is our favorite gift.',
    rsvpTitle: 'Kindly reply',
    rsvpDeadlineISO: `${demoWeddingSite.wedding_date}T00:00:00`,
  });
  const [addQuery, setAddQuery] = useState('');
  const [showStructure, setShowStructure] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showCommand, setShowCommand] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [propertyTab, setPropertyTab] = useState<'content' | 'layout' | 'data'>('content');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [pinnedCommands] = useState<string[]>(['Add section: Hero', 'Select section: Hero']);
  const [showQuickHelp, setShowQuickHelp] = useState(false);
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewScale, setPreviewScale] = useState(100);
  const [focusPreview, setFocusPreview] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sections = history[historyIndex];
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0];
  const selectedIds = useMemo(() => Array.from(new Set([selectedId, ...multiSelectedIds])), [selectedId, multiSelectedIds]);

  const selectSection = (id: string, additive = false, range = false) => {
    const currentIndex = sections.findIndex((s) => s.id === id);
    const lastIndex = sections.findIndex((s) => s.id === lastSelectedId);

    if (range && lastIndex >= 0 && currentIndex >= 0) {
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      const rangeIds = sections.slice(start, end + 1).map((s) => s.id);
      setSelectedId(id);
      setMultiSelectedIds(rangeIds.filter((x) => x !== id));
      setLastSelectedId(id);
      return;
    }

    setSelectedId(id);
    setLastSelectedId(id);
    if (!additive) {
      setMultiSelectedIds([]);
      return;
    }
    setMultiSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };


  const selectAllSections = () => {
    if (!sections.length) return;
    setSelectedId(sections[0].id);
    setMultiSelectedIds(sections.slice(1).map((s) => s.id));
    notify('All sections selected');
  };

  const clearSelection = () => {
    setMultiSelectedIds([]);
    notify('Multi selection cleared');
  };

  const invertSelection = () => {
    if (!sections.length) return;
    const selectedSet = new Set(selectedIds);
    const inverted = sections.map((s) => s.id).filter((id) => !selectedSet.has(id));
    if (!inverted.length) return;
    setSelectedId(inverted[0]);
    setMultiSelectedIds(inverted.slice(1));
    notify('Selection inverted');
  };

  const markSaving = () => {
    setSaveState('saving');
    window.setTimeout(() => {
      setSaveState('saved');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 600);
  };

  const notify = (text: string) => {
    setActionNotice(text);
    window.setTimeout(() => setActionNotice(''), 2200);
  };


  const updatePreviewField = (
    key:
      | 'coupleDisplayName'
      | 'eventDateISO'
      | 'storyText'
      | 'scheduleTitle'
      | 'scheduleNote'
      | 'travelFlights'
      | 'travelParking'
      | 'travelHotels'
      | 'travelTips'
      | 'registryTitle'
      | 'registryNote'
      | 'rsvpTitle'
      | 'rsvpDeadlineISO',
    value: string
  ) => {
    setPreviewFields((prev) => ({ ...prev, [key]: value }));
    markSaving();
  };


  const commit = (next: LabSection[]) => {
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, next]);
    setHistoryIndex(trimmed.length);
    markSaving();
  };

  const bulkToggleVisibility = () => {
    if (selectedIds.length <= 1) return;
    const selectedSet = new Set(selectedIds);
    const shouldShow = sections.filter((s) => selectedSet.has(s.id)).some((s) => !s.enabled);
    commit(sections.map((s) => (selectedSet.has(s.id) ? { ...s, enabled: shouldShow } : s)));
    notify(`${selectedIds.length} sections ${shouldShow ? 'shown' : 'hidden'}`);
  };

  const bulkMoveBlock = (dir: -1 | 1) => {
    if (selectedIds.length <= 1) return;
    const selectedSet = new Set(selectedIds);
    const selectedBlock = sections.filter((s) => selectedSet.has(s.id));
    const remaining = sections.filter((s) => !selectedSet.has(s.id));
    const currentMin = Math.min(...selectedBlock.map((s) => sections.findIndex((x) => x.id === s.id)));
    const currentMax = Math.max(...selectedBlock.map((s) => sections.findIndex((x) => x.id === s.id)));
    const targetIndex = dir === -1
      ? Math.max(0, currentMin - 1)
      : Math.min(sections.length - selectedBlock.length, currentMax + 1 - selectedBlock.length + 1);
    const next = [...remaining];
    next.splice(Math.min(targetIndex, next.length), 0, ...selectedBlock);
    commit(next);
    notify(`${selectedIds.length} sections moved ${dir === -1 ? 'up' : 'down'}`);
  };

  const bulkDuplicate = () => {
    if (selectedIds.length <= 1) return;
    if (!window.confirm(`Duplicate ${selectedIds.length} selected sections?`)) return;
    const selectedSet = new Set(selectedIds);
    const next: typeof sections = [];
    for (const section of sections) {
      next.push(section);
      if (selectedSet.has(section.id)) {
        next.push({
          ...section,
          id: `${section.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: `${section.title} Copy`,
        });
      }
    }
    commit(next);
    notify(`${selectedIds.length} sections duplicated`);
  };


  const applyVariantToSelection = (variant: string) => {
    if (selectedIds.length <= 1) return;
    const selectedSet = new Set(selectedIds);
    let updated = 0;
    let skipped = 0;
    commit(
      sections.map((s) => {
        if (!selectedSet.has(s.id)) return s;
        const allowed = VARIANTS_BY_TYPE[s.type] ?? ['default'];
        if (allowed.includes(variant)) {
          updated += 1;
          return { ...s, variant };
        }
        skipped += 1;
        return s;
      })
    );
    notify(`${updated} updated${skipped ? `, ${skipped} skipped` : ''}`);
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
    const normalizedType = typeLabel.toLowerCase().replace(/\s+/g, '-');
    const id = `${normalizedType}-${Date.now()}`;
    const next = [...sections, { id, type: normalizedType, title: typeLabel, subtitle: '', variant: 'default', enabled: true, density: 'comfortable' as const }];
    setSelectedId(id);
    commit(next);
  };

  const renameSelected = (title: string) => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, title } : s)));
  };

  const updateVariant = (variant: string) => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, variant } : s)));
  };


  const updateSubtitle = (subtitle: string) => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, subtitle } : s)));
  };

  const updateDensity = (density: 'compact' | 'comfortable') => {
    commit(sections.map((s) => (s.id === selected.id ? { ...s, density } : s)));
  };


  const applyLayoutPreset = (preset: 'airy' | 'balanced' | 'compact') => {
    if (preset === 'airy') {
      updateDensity('comfortable');
      notify('Applied Airy preset');
      return;
    }
    if (preset === 'compact') {
      updateDensity('compact');
      notify('Applied Compact preset');
      return;
    }
    updateDensity('comfortable');
    notify('Applied Balanced preset');
  };

  const runCommand = (label: string, action: () => void) => {
    action();
    setRecentCommands((prev) => [label, ...prev.filter((x) => x !== label)].slice(0, 6));
  };


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const orderedVisible = useMemo(() => sections.filter((s) => s.enabled), [sections]);
  const filteredAddables = useMemo(() => ADDABLE_SECTIONS.filter((name) => name.toLowerCase().includes(addQuery.trim().toLowerCase())), [addQuery]);

  const previewData: WeddingDataV1 = useMemo(() => ({
    version: '1',
    couple: {
      partner1Name: demoWeddingSite.couple_name_1,
      partner2Name: demoWeddingSite.couple_name_2,
      displayName: previewFields.coupleDisplayName,
      story: previewFields.storyText,
    },
    event: {
      weddingDateISO: previewFields.eventDateISO,
      timezone: 'America/Los_Angeles',
    },
    venues: [
      { id: 'venue-main', name: demoWeddingSite.venue_name, address: demoWeddingSite.venue_location },
    ],
    schedule: demoEvents.map((e, i) => ({
      id: e.id,
      label: i === 0 ? previewFields.scheduleTitle : e.event_name,
      startTimeISO: `${e.event_date}T${e.start_time}:00`,
      venueId: 'venue-main',
      notes: i === 0 ? previewFields.scheduleNote : e.description,
    })),
    rsvp: { enabled: true, deadlineISO: previewFields.rsvpDeadlineISO },
    travel: { notes: previewFields.travelTips, parkingInfo: previewFields.travelParking, hotelInfo: previewFields.travelHotels, flightInfo: previewFields.travelFlights },
    registry: { links: [{ id: 'reg-1', label: previewFields.registryTitle, url: 'https://example.com/honeymoon' }], notes: previewFields.registryNote },
    faq: [
      { id: 'faq-1', q: 'What should I wear?', a: 'Cocktail attire encouraged.' },
      { id: 'faq-2', q: 'Can I bring a plus one?', a: 'If your invite includes one, yes.' },
    ],
    theme: { preset: 'romantic' },
    media: { heroImageUrl: demoWeddingSite.hero_image_url, gallery: [{ id: 'g1', url: demoWeddingSite.hero_image_url || '', caption: 'Engagement' }] },
    meta: { createdAtISO: new Date().toISOString(), updatedAtISO: new Date().toISOString() },
  }), [previewFields]);

  const previewInstances: SectionInstance[] = useMemo(() => orderedVisible.map((s) => ({
    id: s.id,
    type: (SECTION_TYPE_MAP[s.type] ?? 'custom') as SectionType,
    variant: s.variant,
    enabled: s.enabled,
    bindings: {},
    settings: { showTitle: true, title: s.type === 'rsvp' ? previewFields.rsvpTitle : s.title, subtitle: s.subtitle },
  })), [orderedVisible]);

  const commandItems = useMemo(() => {
    const base = [
      ...ADDABLE_SECTIONS.map((name) => ({ id: `add-${name}`, group: 'Add', label: `Add section: ${name}`, keywords: ['insert', 'new', name.toLowerCase()], action: () => runCommand(`Add section: ${name}`, () => addSection(name)) })),
      ...sections.map((s) => ({ id: `select-${s.id}`, group: 'Select', label: `Select section: ${s.title}`, keywords: ['focus', 'go to', s.title.toLowerCase()], action: () => runCommand(`Select section: ${s.title}`, () => setSelectedId(s.id)) })),
      ...['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'fundHighlight'].map((v) => ({ id: `variant-${v}`, group: 'Variant', label: `Set variant: ${v}`, keywords: ['layout', 'style', v.toLowerCase()], action: () => runCommand(`Set variant: ${v}`, () => updateVariant(v)) })),
      { id: 'sel-clear', group: 'Selection', label: 'Clear multi selection', keywords: ['clear', 'multi', 'selection'], action: () => runCommand('Clear multi selection', clearSelection) },
      { id: 'sel-all', group: 'Selection', label: 'Select all sections', keywords: ['all', 'selection'], action: () => runCommand('Select all sections', selectAllSections) },
      { id: 'sel-invert', group: 'Selection', label: 'Invert selection', keywords: ['invert', 'selection'], action: () => runCommand('Invert selection', invertSelection) },
    ];
    const q = commandQuery.trim().toLowerCase();
    if (!q) return base;

    const score = (item: (typeof base)[number]) => {
      const hay = `${item.label} ${item.keywords.join(' ')}`.toLowerCase();
      if (item.label.toLowerCase().startsWith(q)) return 100;
      if (item.label.toLowerCase().includes(q)) return 80;
      if (hay.includes(q)) return 60;
      return 0;
    };

    return base
      .map((item) => ({ item, s: score(item) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.item);
  }, [commandQuery, sections, selected.id]);



  useEffect(() => {
    setCommandIndex(0);
  }, [commandQuery, showCommand]);

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
      if (e.key === '?') {
        e.preventDefault();
        setShowQuickHelp((v) => !v);
      }
      if (isMeta && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setFocusPreview((v) => !v);
      }
      if (isMeta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllSections();
      }
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        invertSelection();
      }
      if (e.key === 'Escape' && !showCommand) {
        e.preventDefault();
        clearSelection();
      }
      if (showCommand) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCommand(false);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCommandIndex((i) => Math.min(i + 1, Math.max(commandItems.length - 1, 0)));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCommandIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const item = commandItems[commandIndex];
          if (item) {
            item.action();
            setShowCommand(false);
            setCommandQuery('');
          }
          return;
        }
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
  }, [canRedo, canUndo, sections, selected.id, showCommand, commandItems, commandIndex]);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Builder v2 Lab</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">Functional shell (Sprint 2 in progress)</h1>
            <p className="text-text-secondary mt-2 max-w-2xl">Focused editor lab: fast structure editing, keyboard flow, and live preview quality.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full ${saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {saveState === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {saveState === 'saved' ? `All changes saved${lastSavedAt ? ` · ${lastSavedAt}` : ''}` : 'Saving...'}
            </span>
            <Link to="/product" className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1">Back <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
          <p className="inline-flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> Canvas-first mode. Open tools only when needed.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQuickHelp((v) => !v)} className="px-2 py-1 border rounded-md hover:border-primary/40 inline-flex items-center gap-1"><Keyboard className="w-3.5 h-3.5" /> Shortcuts</button>
            <button onClick={() => setShowCommand(true)} className="px-2 py-1 border rounded-md hover:border-primary/40 inline-flex items-center gap-1"><Command className="w-3.5 h-3.5" /> Actions</button>
            <button onClick={() => setShowProperties((v) => !v)} className="px-2 py-1 border rounded-md hover:border-primary/40">{showProperties ? 'Hide' : 'Show'} Edit rail</button>
            <button onClick={() => setShowStructure((v) => !v)} className="px-2 py-1 border rounded-md hover:border-primary/40">{showStructure ? 'Hide' : 'Show'} Pages</button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${focusPreview ? 'lg:grid-cols-1' : showStructure && showProperties ? 'lg:grid-cols-[250px_1fr_380px]' : showProperties ? 'lg:grid-cols-[1fr_380px]' : showStructure ? 'lg:grid-cols-[260px_1fr]' : 'lg:grid-cols-1'} gap-4`}>
          {!focusPreview && showStructure && (<aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Pages</h2>
            </div>
            <div className="mb-3 text-[11px] text-text-tertiary">Drag to reorder pages. Select to edit in the right rail.</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sections.map((s, idx) => (
                    <StructureItem
                      key={s.id}
                      section={s}
                      selected={selected.id === s.id}
                      multiSelected={multiSelectedIds.includes(s.id)}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onSelect={() => selectSection(s.id)}
                      onSelectAdditive={() => selectSection(s.id, true)}
                      onSelectRange={() => selectSection(s.id, false, true)}
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

          <main className="relative rounded-2xl border border-border bg-surface p-4 min-h-[560px]">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-border-subtle -mx-4 px-4 py-2.5 mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {(['desktop','mobile'] as const).map((d) => (
                    <button key={d} onClick={() => setPreviewDevice(d)} className={`text-[11px] px-2 py-1 border rounded ${previewDevice === d ? 'border-primary/50 bg-primary/10 text-primary' : ''}`}>{d}</button>
                  ))}
                </div>
                <select value={previewScale} onChange={(e) => setPreviewScale(Number(e.target.value))} className="text-[11px] border rounded px-2 py-1 bg-white">
                  <option value={80}>80%</option><option value={90}>90%</option><option value={100}>100%</option><option value={110}>110%</option>
                </select>

                <button onClick={() => canUndo && setHistoryIndex((i) => i - 1)} disabled={!canUndo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" />Undo</button>
                <button onClick={() => canRedo && setHistoryIndex((i) => i + 1)} disabled={!canRedo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Redo2 className="w-3.5 h-3.5" />Redo</button>
              </div>
            </div>
            <div className="h-[640px] rounded-xl border border-border-subtle bg-surface-subtle p-3 overflow-auto">
              <div className={`mx-auto bg-white rounded-lg border border-border-subtle overflow-hidden ${previewDevice === 'desktop' ? 'w-full max-w-[1240px]' : 'w-[430px] max-w-full'}`} style={{ transform: `scale(${previewScale / 100})`, transformOrigin: 'top center' }}>
                {previewInstances.map((instance) => {
                  const sectionState = orderedVisible.find((x) => x.id === instance.id);
                  if (!sectionState) return null;

                  let Content: React.FC<{ data: WeddingDataV1; instance: SectionInstance }> | null = null;
                  try {
                    Content = getSectionComponent(instance.type, instance.variant) as React.FC<{ data: WeddingDataV1; instance: SectionInstance }>;
                  } catch {
                    Content = null;
                  }

                  return (
                    <div
                      key={instance.id}
                      className={`relative transition-all duration-200 ease-out ${selected.id === instance.id ? 'ring-2 ring-primary/25' : multiSelectedIds.includes(instance.id) ? 'ring-1 ring-primary/15' : ''}`}
                      onClick={(e) => { if (e.shiftKey) selectSection(instance.id, false, true); else if (e.metaKey || e.ctrlKey) selectSection(instance.id, true); else selectSection(instance.id); }}
                    >
                      <div className="absolute top-2 left-2 z-10 text-[11px] px-2 py-1 rounded bg-black/65 text-white">{sectionState.title} · {instance.variant}</div>
                      {Content ? (
                        <Content data={previewData} instance={instance} />
                      ) : (
                        <div className={`border-b border-border-subtle bg-white ${sectionState.density === 'compact' ? 'p-3' : 'p-4'}`}>
                          <p className="font-medium text-sm">{sectionState.title}</p>
                          <p className="text-xs text-text-tertiary mt-1">Preview placeholder ({instance.type}:{instance.variant})</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {showMinimap && (
              <div className="absolute right-6 bottom-6 z-30 w-44 max-h-64 overflow-auto rounded-lg border border-border bg-white/95 shadow-sm p-2 space-y-1">
                <div className="flex items-center justify-between px-1 pb-1">
                  <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Mini-map</p>
                  <button onClick={() => setShowMinimap(false)} className="text-[10px] text-text-tertiary hover:text-text-primary">Close</button>
                </div>
                {orderedVisible.map((s) => (
                  <button
                    key={`mini-${s.id}`}
                    onClick={() => selectSection(s.id)}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded ${selected.id === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle text-text-secondary'}`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </main>

          {!focusPreview && showProperties && (<aside className="rounded-xl border border-border bg-white p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-[1.02rem] font-semibold">Edit website</h2>
              <button onClick={() => setShowProperties(false)} className="text-sm text-text-tertiary hover:text-text-primary">✕</button>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="space-y-2">
                <button className="w-full text-left border border-border rounded-md px-3 py-2 hover:border-primary/30">
                  <p className="text-sm font-medium">Design</p>
                  <p className="text-xs text-text-tertiary">Update style, color and layout</p>
                </button>
                <button className="w-full text-left border border-border rounded-md px-3 py-2 hover:border-primary/30">
                  <p className="text-sm font-medium">Privacy & URL</p>
                  <p className="text-xs text-text-tertiary">Manage visibility and link preferences</p>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Pages</p>
                  <button onClick={() => setShowStructure(true)} className="text-xs text-primary hover:text-primary-hover">Open page organizer</button>
                </div>
                <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                  {orderedVisible.map((page) => (
                    <button
                      key={`rail-${page.id}`}
                      onClick={() => selectSection(page.id)}
                      className={`w-full text-left border rounded-md px-3 py-2 transition-colors ${selected.id === page.id ? 'border-primary/35 bg-primary/5' : 'border-border hover:border-primary/25'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{page.title}</p>
                          {page.subtitle && <p className="text-xs text-text-tertiary truncate mt-0.5">{page.subtitle}</p>}
                        </div>
                        <span className="text-text-tertiary text-sm">›</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-md p-3 bg-surface-subtle space-y-2.5">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Selected page</p>
                <label className="block">
                  <span className="text-xs text-text-tertiary">Title</span>
                  <input value={selected.title} onChange={(e) => renameSelected(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                </label>
                {selected.type === 'hero' && (
                  <>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Couple display name</span>
                      <input
                        value={previewFields.coupleDisplayName}
                        onChange={(e) => updatePreviewField('coupleDisplayName', e.target.value)}
                        className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Wedding datetime (ISO)</span>
                      <input
                        value={previewFields.eventDateISO}
                        onChange={(e) => updatePreviewField('eventDateISO', e.target.value)}
                        className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm"
                      />
                    </label>
                  </>
                )}
                {selected.type === 'story' && (
                  <label className="block">
                    <span className="text-xs text-text-tertiary">Story text</span>
                    <textarea
                      value={previewFields.storyText}
                      onChange={(e) => updatePreviewField('storyText', e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-24"
                    />
                  </label>
                )}
                {selected.type === 'schedule' && (
                  <>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">First event title</span>
                      <input value={previewFields.scheduleTitle} onChange={(e) => updatePreviewField('scheduleTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">First event note</span>
                      <input value={previewFields.scheduleNote} onChange={(e) => updatePreviewField('scheduleNote', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                  </>
                )}
                {selected.type === 'travel' && (
                  <>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Flights</span>
                      <input value={previewFields.travelFlights} onChange={(e) => updatePreviewField('travelFlights', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Parking</span>
                      <input value={previewFields.travelParking} onChange={(e) => updatePreviewField('travelParking', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Hotels</span>
                      <input value={previewFields.travelHotels} onChange={(e) => updatePreviewField('travelHotels', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Local tips</span>
                      <textarea value={previewFields.travelTips} onChange={(e) => updatePreviewField('travelTips', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" />
                    </label>
                  </>
                )}
                {selected.type === 'registry' && (
                  <>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Featured registry title</span>
                      <input value={previewFields.registryTitle} onChange={(e) => updatePreviewField('registryTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">Registry note</span>
                      <textarea value={previewFields.registryNote} onChange={(e) => updatePreviewField('registryNote', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" />
                    </label>
                  </>
                )}
                {selected.type === 'rsvp' && (
                  <>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">RSVP section title</span>
                      <input value={previewFields.rsvpTitle} onChange={(e) => updatePreviewField('rsvpTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-text-tertiary">RSVP deadline (ISO)</span>
                      <input value={previewFields.rsvpDeadlineISO} onChange={(e) => updatePreviewField('rsvpDeadlineISO', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm" />
                    </label>
                  </>
                )}
                <label className="block">
                  <span className="text-xs text-text-tertiary">Layout variant</span>
                  <select value={selected.variant} onChange={(e) => updateVariant(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm">
                    {(VARIANTS_BY_TYPE[selected.type] ?? ['default']).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button onClick={() => toggleVisibility(selected.id)} className="w-full border rounded-md px-3 py-2 text-left text-sm hover:border-primary/40">
                  {selected.enabled ? 'Hide page' : 'Show page'}
                </button>
              </div>
            </div>
          </aside>)}
        </div>
      </div>



      {showQuickHelp && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-start justify-center pt-24" onClick={() => setShowQuickHelp(false)}>
          <div className="w-full max-w-lg bg-white rounded-xl border border-border shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2">Builder V2 Lab shortcuts</h3>
            <ul className="text-xs text-text-secondary space-y-1.5">
              <li>⌘/Ctrl + K — open command palette</li>
              <li>⌘/Ctrl + Z / ⇧⌘/Ctrl + Z — undo / redo</li>
              <li>⌘/Ctrl + A — select all sections</li>
              <li>⇧⌘/Ctrl + I — invert selection</li>
              <li>Esc — clear multi-selection</li>
              <li>Shift click — select a range</li>
              <li>Cmd/Ctrl click — additive selection</li>
            </ul>
          </div>
        </div>
      )}

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
            {pinnedCommands.length > 0 && (
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Pinned</p>
                <div className="flex flex-wrap gap-1">
                  {pinnedCommands.map((label) => (
                    <button key={label} onClick={() => setCommandQuery(label)} className="text-[11px] px-2 py-1 rounded-full bg-amber-50 border border-amber-200 hover:border-amber-300">{label}</button>
                  ))}
                </div>
              </div>
            )}

            {recentCommands.length > 0 && (
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">Recent</p>
                <div className="flex flex-wrap gap-1">
                  {recentCommands.map((label) => (
                    <button key={label} onClick={() => setCommandQuery(label)} className="text-[11px] px-2 py-1 rounded-full bg-surface-subtle border border-border-subtle hover:border-primary/30">{label}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-80 overflow-auto p-2">
              {commandItems.slice(0, 18).map((item, idx, arr) => (
                <div key={item.id}>
                  {(idx === 0 || arr[idx - 1].group !== item.group) && (
                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-text-tertiary">{item.group}</p>
                  )}
                  <button
                    onClick={() => { item.action(); setShowCommand(false); setCommandQuery(''); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${idx === commandIndex ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-subtle'}`}
                  >
                    {item.label}
                  </button>
                </div>
              ))}
              {commandItems.length === 0 && <p className="text-sm text-text-tertiary px-3 py-2">No matching commands</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
