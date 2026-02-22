import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, SlidersHorizontal, ArrowRight, Eye, EyeOff, Plus, ArrowUp, ArrowDown, Undo2, Redo2, CheckCircle2, GripVertical, Keyboard, Command } from 'lucide-react';
import { getSectionComponent } from '../sections/sectionRegistry';
import type { SectionType, SectionInstance } from '../types/layoutConfig';
import type { WeddingDataV1 } from '../types/weddingData';
import { demoWeddingSite, demoEvents } from '../lib/demoData';
import { toBuilderV2Document } from '../builder-v2/adapter';
import type { BuilderV2Document } from '../builder-v2/contracts';
import { validateBuilderV2Document } from '../builder-v2/validate';
import { sanitizeImportedBlockType } from '../builder-v2/importSanitize';
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

type BlockType =
  | 'title'
  | 'text'
  | 'qna'
  | 'photo'
  | 'story'
  | 'timelineItem'
  | 'event'
  | 'travelTip'
  | 'hotelCard'
  | 'registryItem'
  | 'fundHighlight'
  | 'rsvpNote'
  | 'faqItem'
  | 'divider';

const BLOCK_LABELS: Record<BlockType, string> = {
  title: 'Title',
  text: 'Text Block',
  qna: 'Q&A',
  photo: 'Photo',
  story: 'Story Paragraph',
  timelineItem: 'Timeline Item',
  event: 'Event Item',
  travelTip: 'Travel Tip',
  hotelCard: 'Hotel Card',
  registryItem: 'Registry Item',
  fundHighlight: 'Fund Highlight',
  rsvpNote: 'RSVP Note',
  faqItem: 'FAQ Item',
  divider: 'Divider',
};

const BLOCK_META: Record<BlockType, { icon: string; desc: string }> = {
  title: { icon: 'T', desc: 'Section heading text' },
  text: { icon: '≡', desc: 'Paragraph or long-form copy' },
  qna: { icon: '?', desc: 'Question and answer pair' },
  photo: { icon: '▣', desc: 'Image with optional caption' },
  story: { icon: '✎', desc: 'Story paragraph block' },
  timelineItem: { icon: '⏱', desc: 'Milestone in a timeline' },
  event: { icon: '◷', desc: 'Time, title, location' },
  travelTip: { icon: '↗', desc: 'Travel guidance note' },
  hotelCard: { icon: '⌂', desc: 'Hotel recommendation card' },
  registryItem: { icon: '◉', desc: 'Registry gift item' },
  fundHighlight: { icon: '◎', desc: 'Featured fund contribution' },
  rsvpNote: { icon: '✎', desc: 'RSVP instructions/note' },
  faqItem: { icon: '❓', desc: 'FAQ question and answer' },
  divider: { icon: '—', desc: 'Visual section divider' },
};

const BLOCK_DEFAULTS: Record<BlockType, string> = {
  title: 'New heading',
  text: 'Add your text here...',
  qna: 'Q: Your question?\nA: Your answer.',
  photo: 'Photo caption',
  story: 'A short story paragraph',
  timelineItem: 'Our first date · Summer 2022',
  event: 'Ceremony · 4:00 PM · Sunset Gardens',
  travelTip: 'Book early for best rates.',
  hotelCard: 'River Inn · 2-night minimum',
  registryItem: 'KitchenAid Mixer',
  fundHighlight: 'Honeymoon Fund',
  rsvpNote: 'Please reply by our deadline.',
  faqItem: 'Q: Is there parking? A: Yes, valet on-site.',
  divider: '———',
};

const makeDefaultBlockContent = (type: BlockType): AddedBlockContent => {
  switch (type) {
    case 'qna':
      return { question: 'Your question?', answer: 'Your answer.' };
    case 'photo':
      return { imageUrl: '', caption: 'Photo caption' };
    case 'event':
      return { title: 'Ceremony', time: '4:00 PM', location: 'Sunset Gardens', note: 'Guests seated by 3:45 PM.' };
    case 'travelTip':
      return { title: 'Travel tip', note: 'Book flights 6-8 weeks in advance.' };
    case 'hotelCard':
      return { title: 'River Inn', note: '2-night minimum', url: 'https://example.com/hotel' };
    case 'registryItem':
      return { title: 'Stand mixer', note: 'Kitchen wish list item', url: 'https://example.com/registry-item' };
    case 'fundHighlight':
      return { title: 'Honeymoon Fund', note: 'Help us create new memories', url: 'https://example.com/honeymoon' };
    case 'rsvpNote':
      return { note: 'Please reply by our RSVP date.' };
    case 'faqItem':
      return { question: 'Is there parking?', answer: 'Yes, valet is available on-site.' };
    default:
      return { text: BLOCK_DEFAULTS[type] };
  }
};

const normalizeBlockData = (block: AddedBlock): AddedBlockContent => {
  if (block.data) return block.data;
  return makeDefaultBlockContent(block.type);
};


const SECTION_BLOCK_CATALOG: Record<string, BlockType[]> = {
  hero: ['title', 'text', 'photo', 'divider'],
  story: ['story', 'timelineItem', 'text', 'photo', 'title', 'divider'],
  schedule: ['event', 'title', 'text', 'divider'],
  travel: ['travelTip', 'hotelCard', 'text', 'photo', 'qna', 'divider'],
  registry: ['registryItem', 'fundHighlight', 'title', 'text', 'photo', 'divider'],
  rsvp: ['rsvpNote', 'title', 'text', 'qna', 'divider'],
  faq: ['faqItem', 'qna', 'title', 'text', 'divider'],
  venue: ['title', 'text', 'photo', 'divider'],
  gallery: ['photo', 'title', 'text', 'divider'],
  'wedding-party': ['photo', 'title', 'text', 'divider'],
  'dress-code': ['title', 'text', 'photo', 'divider'],
  directions: ['title', 'text', 'photo', 'divider'],
  accommodations: ['hotelCard', 'travelTip', 'text', 'divider'],
};

const SECTION_BLOCK_LIMITS: Record<string, { total: number; perType?: Partial<Record<BlockType, number>> }> = {
  hero: { total: 6, perType: { fundHighlight: 0 } },
  story: { total: 10 },
  schedule: { total: 10, perType: { event: 6 } },
  travel: { total: 10, perType: { hotelCard: 4, travelTip: 6 } },
  registry: { total: 10, perType: { fundHighlight: 1 } },
  rsvp: { total: 8, perType: { rsvpNote: 2 } },
  faq: { total: 12, perType: { faqItem: 10, qna: 10 } },
  venue: { total: 8 },
  gallery: { total: 14, perType: { photo: 10 } },
  'wedding-party': { total: 12 },
  'dress-code': { total: 8 },
  directions: { total: 8 },
  accommodations: { total: 10, perType: { hotelCard: 5 } },
};


type AddedBlockContent = {
  text?: string;
  question?: string;
  answer?: string;
  imageUrl?: string;
  caption?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  location?: string;
  note?: string;
  url?: string;
};

type AddedBlock = {
  id: string;
  type: BlockType;
  content: string;
  data?: AddedBlockContent;
};

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
        <div className="flex items-center gap-1.5">
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
  const [hoveredPreviewId, setHoveredPreviewId] = useState<string | null>(null);
  const [primedPreviewSectionId, setPrimedPreviewSectionId] = useState<string | null>(null);
  const [showAddBlockPicker, setShowAddBlockPicker] = useState(false);
  const [sectionBlocks, setSectionBlocks] = useState<Record<string, AddedBlock[]>>({});
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sections = history[historyIndex];
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0];
  const selectedIds = useMemo(() => Array.from(new Set([selectedId, ...multiSelectedIds])), [selectedId, multiSelectedIds]);

  const scrollToPreviewSection = (id: string) => {
    document.getElementById(`preview-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollRailToSectionType = (type: string) => {
    document.getElementById(`rail-section-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectSection = (id: string, additive = false, range = false, scroll = false, openEditor = false) => {
    const currentIndex = sections.findIndex((s) => s.id === id);
    const lastIndex = sections.findIndex((s) => s.id === lastSelectedId);

    if (range && lastIndex >= 0 && currentIndex >= 0) {
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      const rangeIds = sections.slice(start, end + 1).map((s) => s.id);
      setSelectedId(id);
      setMultiSelectedIds(rangeIds.filter((x) => x !== id));
      setLastSelectedId(id);
      if (openEditor) { setShowStructure(false); setShowProperties(true); }
      if (scroll) scrollToPreviewSection(id);
      return;
    }

    setSelectedId(id);
    setLastSelectedId(id);
    if (!additive) {
      setMultiSelectedIds([]);
      if (openEditor) { setShowStructure(false); setShowProperties(true); }
      if (scroll) scrollToPreviewSection(id);
      return;
    }
    setMultiSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (openEditor) { setShowStructure(false); setShowProperties(true); }
    if (scroll) scrollToPreviewSection(id);
  };

  const handlePreviewSectionClick = (id: string, type: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey) {
      selectSection(id, false, true, false, true);
      setPrimedPreviewSectionId(null);
      window.setTimeout(() => scrollRailToSectionType(type), 0);
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      selectSection(id, true, false, false, true);
      setPrimedPreviewSectionId(null);
      window.setTimeout(() => scrollRailToSectionType(type), 0);
      return;
    }

    if (primedPreviewSectionId === id) {
      selectSection(id, false, false, false, true);
      setShowStructure(false);
      setShowProperties(true);
      setPropertyTab('content');
      setPrimedPreviewSectionId(null);
      window.setTimeout(() => scrollRailToSectionType(type), 0);
      return;
    }

    selectSection(id, false, false, true, false);
    setShowStructure(false);
    setShowProperties(false);
    setShowAddBlockPicker(false);
    setPrimedPreviewSectionId(id);
    notify('Section selected. Click again to open editor.');
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


  const toDateInputValue = (iso: string) => {
    if (!iso) return '';
    const idx = iso.indexOf('T');
    return idx > 0 ? iso.slice(0, idx) : iso;
  };

  const toDateTimeLocalValue = (iso: string) => {
    if (!iso) return '';
    const [date, timeRaw] = iso.split('T');
    if (!date || !timeRaw) return '';
    const hhmm = timeRaw.slice(0, 5);
    return `${date}T${hhmm}`;
  };

  const updateRsvpDeadlineDate = (dateOnly: string) => {
    if (!dateOnly) return;
    updatePreviewField('rsvpDeadlineISO', `${dateOnly}T00:00:00`);
  };

  const updateWeddingDateTime = (localDateTime: string) => {
    if (!localDateTime) return;
    updatePreviewField('eventDateISO', `${localDateTime}:00`);
  };


  const getSectionLimitConfig = (sectionType: string) =>
    SECTION_BLOCK_LIMITS[sectionType] ?? { total: 10, perType: {} };

  const canAddBlockToSection = (sectionId: string, sectionType: string, blockType: BlockType) => {
    const cfg = getSectionLimitConfig(sectionType);
    const blocks = sectionBlocks[sectionId] ?? [];
    if (blocks.length >= cfg.total) return { ok: false, reason: `Max ${cfg.total} blocks for this section` };
    const perType = cfg.perType?.[blockType];
    if (typeof perType === 'number') {
      const count = blocks.filter((b) => b.type === blockType).length;
      if (count >= perType) return { ok: false, reason: `Max ${perType} ${BLOCK_LABELS[blockType]} block(s)` };
    }
    return { ok: true as const, reason: '' };
  };

  const addBlockToSection = (blockType: BlockType) => {
    const allowed = canAddBlockToSection(selected.id, selected.type, blockType);
    if (!allowed.ok) {
      notify(allowed.reason);
      return;
    }

    const block: AddedBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: blockType,
      content: BLOCK_DEFAULTS[blockType],
      data: makeDefaultBlockContent(blockType),
    };
    setSectionBlocks((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), block] }));
    setShowAddBlockPicker(false);
    markSaving();
    notify(`${BLOCK_LABELS[blockType]} added`);
  };

  const updateBlockData = (sectionId: string, blockId: string, patch: Partial<AddedBlockContent>) => {
    setSectionBlocks((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map((b) =>
        b.id === blockId ? { ...b, data: { ...normalizeBlockData(b), ...patch } } : b
      ),
    }));
    markSaving();
  };

  const updateBlockContent = (sectionId: string, blockId: string, content: string) => {
    setSectionBlocks((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map((b) => (b.id === blockId ? { ...b, content } : b)),
    }));
    markSaving();
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    setSectionBlocks((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((b) => b.id !== blockId),
    }));
    markSaving();
    notify('Removed block');
  };



  const duplicateBlock = (sectionId: string, blockId: string) => {
    const sourceSection = sections.find((x) => x.id === sectionId);
    if (!sourceSection) return;

    setSectionBlocks((prev) => {
      const arr = [...(prev[sectionId] ?? [])];
      const idx = arr.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const source = arr[idx];
      const allowed = canAddBlockToSection(sectionId, sourceSection.type, source.type);
      if (!allowed.ok) {
        notify(allowed.reason);
        return prev;
      }
      const dup: AddedBlock = {
        ...source,
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      arr.splice(idx + 1, 0, dup);
      return { ...prev, [sectionId]: arr };
    });
    markSaving();
    notify('Duplicated block');
  };

  const toggleBlockCollapsed = (blockId: string) => {
    setCollapsedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const moveBlock = (sectionId: string, blockId: string, dir: -1 | 1) => {
    setSectionBlocks((prev) => {
      const arr = [...(prev[sectionId] ?? [])];
      const idx = arr.findIndex((b) => b.id === blockId);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= arr.length) return prev;
      const [item] = arr.splice(idx, 1);
      arr.splice(nextIdx, 0, item);
      return { ...prev, [sectionId]: arr };
    });
    markSaving();
  };

  const scrollToRailSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const addableBlocksForSelected = useMemo(() => SECTION_BLOCK_CATALOG[selected.type] ?? ['title', 'text', 'photo', 'qna'], [selected.type]);


  const getBlockValidationWarning = (block: AddedBlock) => {
    const d = normalizeBlockData(block);
    if (block.type === 'qna' && (!(d.question || '').trim() || !(d.answer || '').trim())) return 'Question and answer are required';
    if (block.type === 'photo' && !(d.imageUrl || '').trim()) return 'Image URL is recommended';
    if (block.type === 'event' && (!(d.title || '').trim() || !(d.time || '').trim())) return 'Event title and time are required';
    if ((block.type === 'registryItem' || block.type === 'fundHighlight') && !(d.title || '').trim()) return 'Item title is required';
    return '';
  };


  const allInstancesForExport: SectionInstance[] = useMemo(() => sections.map((s) => ({
    id: s.id,
    type: (SECTION_TYPE_MAP[s.type] ?? 'custom') as SectionType,
    variant: s.variant,
    enabled: s.enabled,
    bindings: {},
    settings: { showTitle: true, title: s.title, subtitle: s.subtitle },
  })), [sections]);

  const exportV2Json = () => {
    const doc = toBuilderV2Document(allInstancesForExport);
    const withBlocks = {
      ...doc,
      sections: doc.sections.map((sec) => ({
        ...sec,
        blocks: (sectionBlocks[sec.id] ?? sec.blocks).map((b) => ({
          id: b.id,
          type: b.type,
          data: b.data ?? { text: b.content },
        })),
      })),
    } as BuilderV2Document;
    const blob = new Blob([JSON.stringify(withBlocks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `builder-v2-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported V2 JSON');
  };

  const importV2Json = () => {
    const raw = window.prompt('Paste Builder V2 JSON');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const checked = validateBuilderV2Document(parsed);
      if (!checked.ok) throw new Error(checked.error);
      const doc = checked.doc;
      const nextSections = doc.sections.map((sec) => ({
        id: sec.id,
        type: sec.type,
        title: sec.title || sec.type,
        subtitle: sec.subtitle || '',
        variant: sec.variant || 'default',
        enabled: sec.enabled !== false,
        density: 'comfortable' as const,
      }));
      const nextBlocks = Object.fromEntries(
        doc.sections.map((sec) => [
          sec.id,
          (sec.blocks || []).map((b) => ({
            id: b.id,
            type: sanitizeImportedBlockType(b.type) as BlockType,
            data: b.data || {},
            content: b.data?.text || b.data?.title || b.data?.note || '',
          })),
        ])
      ) as Record<string, AddedBlock[]>;
      setHistory([nextSections]);
      setHistoryIndex(0);
      setSelectedId(nextSections[0]?.id ?? '');
      setMultiSelectedIds([]);
      setSectionBlocks(nextBlocks);
      notify('Imported V2 JSON');
      markSaving();
    } catch {
      notify('Import failed: invalid JSON');
    }
  };

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
    if (!sections.length) return;
    if (!sections.some((x) => x.id === selectedId)) {
      setSelectedId(sections[0].id);
    }
  }, [sections, selectedId]);
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
    <div className="h-screen bg-[#f6f6f6] text-text-primary overflow-hidden">
      <div className="w-full px-0 py-0 h-full flex flex-col gap-0 [--topbar-h:46px] [--rail-head-h:50px] [--page-row-h:52px]">
        <div className="h-[var(--topbar-h)] px-2 md:px-3 border-b border-border-subtle bg-white flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Builder v2 Lab</p>
            <h1 className="text-lg md:text-xl font-semibold mt-0.5">Functional shell (Sprint 2 in progress)</h1>
            <p className="text-text-secondary mt-0.5 text-xs max-w-2xl">Focused editor lab: fast structure editing, keyboard flow, and live preview quality.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full ${saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {saveState === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {saveState === 'saved' ? `All changes saved${lastSavedAt ? ` · ${lastSavedAt}` : ''}` : 'Saving...'}
            </span>
            <Link to="/dashboard/builder" className="text-sm border border-border-subtle rounded-sm px-2 py-1 hover:border-primary/40 inline-flex items-center gap-1">Back to guidance <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/product" className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1">Back <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        <div className="px-2 md:px-3 py-1 border-b border-border-subtle bg-white flex items-center justify-between gap-3 text-[11px] text-text-tertiary">
          <p className="inline-flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> Edit your page by clicking directly in preview.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQuickHelp((v) => !v)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40 inline-flex items-center gap-1"><Keyboard className="w-3.5 h-3.5" /> Shortcuts</button>
            <button onClick={() => setShowCommand(true)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40 inline-flex items-center gap-1"><Command className="w-3.5 h-3.5" /> Actions</button>
            <button onClick={exportV2Json} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">Export V2</button>
            <button onClick={importV2Json} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">Import V2</button>
            <button onClick={() => setShowStructure((v) => !v)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">{showStructure ? 'Hide' : 'Reorder or add'} Pages</button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${focusPreview ? 'lg:grid-cols-1' : showStructure && showProperties ? 'lg:grid-cols-[180px_minmax(0,1fr)_620px]' : showProperties ? 'lg:grid-cols-[minmax(0,1fr)_620px]' : showStructure ? 'lg:grid-cols-[180px_minmax(0,1fr)]' : 'lg:grid-cols-1'} gap-0 flex-1 min-h-0`}>
          {!focusPreview && showStructure && (<aside className="border-r border-border bg-surface p-3 h-full min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Pages</h2>
            </div>
            <div className="mb-3 text-[11px] text-text-tertiary">Drag to reorder pages. Select a section to focus it in preview.</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 overflow-auto pr-1 max-h-[38vh]">
                  {sections.map((s, idx) => (
                    <StructureItem
                      key={s.id}
                      section={s}
                      selected={selected.id === s.id}
                      multiSelected={multiSelectedIds.includes(s.id)}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onSelect={() => selectSection(s.id, false, false, true)}
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

          <main className="relative border-r border-border bg-surface p-3 h-full min-h-0 overflow-hidden">
            <div className="sticky top-0 z-20 h-12 bg-white/95 backdrop-blur border-b border-border-subtle -mx-3 px-3 mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
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
            <div className="h-[calc(100%-56px)] border border-border-subtle bg-[#f3f3f3] p-1.5 overflow-auto scroll-smooth [scrollbar-gutter:stable]">
              <div className={`mx-auto bg-white border border-border-subtle overflow-hidden ${previewDevice === 'desktop' ? 'w-full max-w-[1240px]' : 'w-[430px] max-w-full'}`} style={{ transform: `scale(${previewScale / 100})`, transformOrigin: 'top center' }}>
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
                      id={`preview-section-${instance.id}`}
                      key={instance.id}
                      className={`relative transition-all duration-300 ease-out ${hoveredPreviewId && hoveredPreviewId !== instance.id ? 'opacity-60' : 'opacity-100'} ${hoveredPreviewId === instance.id ? 'ring-2 ring-primary/30' : ''} ${selected.id === instance.id ? 'ring-2 ring-primary/30 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]' : multiSelectedIds.includes(instance.id) ? 'ring-1 ring-primary/15' : ''}`}
                      onMouseEnter={() => setHoveredPreviewId(instance.id)}
                      onMouseLeave={() => setHoveredPreviewId(null)}
                      onClick={(e) => handlePreviewSectionClick(instance.id, instance.type, e)}
                    >
                      <div className={`absolute top-2 left-2 z-10 text-[11px] px-2 py-1 rounded text-white transition-colors ${hoveredPreviewId === instance.id ? 'bg-black/80' : 'bg-black/55'}`}>{sectionState.title} · {instance.variant}</div>
                      {hoveredPreviewId === instance.id && (
                        <>
                          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/70" />
                          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-primary/70" />
                        </>
                      )}
                      {Content ? (
                        <Content data={previewData} instance={instance} />
                      ) : (
                        <div className={`border-b border-border-subtle bg-white ${sectionState.density === 'compact' ? 'p-3' : 'p-4'}`}>
                          <p className="font-medium text-sm">{sectionState.title}</p>
                          <p className="text-[11px] text-text-tertiary mt-1">Preview placeholder ({instance.type}:{instance.variant})</p>
                        </div>
                      )}

                      {(sectionBlocks[instance.id] ?? []).length > 0 && (
                        <div className="border-t border-border-subtle bg-white">
                          {(sectionBlocks[instance.id] ?? []).map((b) => (
                            <div key={b.id} className="px-5 py-3.5 border-b border-border-subtle bg-white/95">
                              <p className="text-[11px] uppercase tracking-wide text-text-tertiary mb-1">{BLOCK_LABELS[b.type]}</p>
                              {b.type === 'qna' ? (
                                <div className="space-y-1">
                                  <p className="text-sm text-text-primary"><span className="font-medium">Q:</span> {normalizeBlockData(b).question}</p>
                                  <p className="text-sm text-text-secondary"><span className="font-medium">A:</span> {normalizeBlockData(b).answer}</p>
                                </div>
                              ) : b.type === 'photo' ? (
                                <div className="space-y-2">
                                  {normalizeBlockData(b).imageUrl ? (
                                    <img src={normalizeBlockData(b).imageUrl} alt={normalizeBlockData(b).caption || 'Photo'} className="w-full h-40 object-cover rounded" />
                                  ) : (
                                    <div className="w-full h-24 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center text-xs text-text-tertiary">Photo placeholder</div>
                                  )}
                                  {normalizeBlockData(b).caption && <p className="text-sm text-text-secondary">{normalizeBlockData(b).caption}</p>}
                                </div>
                              ) : b.type === 'timelineItem' ? (
                                <div className="space-y-1">
                                  <p className="text-sm text-text-primary font-medium">{normalizeBlockData(b).title}</p>
                                  {normalizeBlockData(b).note && <p className="text-sm text-text-secondary">{normalizeBlockData(b).note}</p>}
                                </div>
                              ) : b.type === 'divider' ? (
                                <p className="text-xs text-text-tertiary tracking-[0.2em]">{normalizeBlockData(b).text || '———'}</p>
                              ) : b.type === 'event' ? (
                                <div className="space-y-1">
                                  <p className="text-sm text-text-primary font-medium">{normalizeBlockData(b).title}</p>
                                  <p className="text-sm text-text-secondary">{normalizeBlockData(b).time} · {normalizeBlockData(b).location}</p>
                                  {normalizeBlockData(b).note && <p className="text-sm text-text-secondary">{normalizeBlockData(b).note}</p>}
                                </div>
                              ) : b.type === 'travelTip' || b.type === 'hotelCard' || b.type === 'registryItem' || b.type === 'fundHighlight' ? (
                                <div className="space-y-1">
                                  <p className="text-sm text-text-primary font-medium">{normalizeBlockData(b).title}</p>
                                  {normalizeBlockData(b).note && <p className="text-sm text-text-secondary">{normalizeBlockData(b).note}</p>}
                                  {normalizeBlockData(b).url && <p className="text-xs text-primary">{normalizeBlockData(b).url}</p>}
                                </div>
                              ) : b.type === 'rsvpNote' ? (
                                <p className="text-sm text-text-secondary whitespace-pre-wrap">{normalizeBlockData(b).note}</p>
                              ) : b.type === 'faqItem' ? (
                                <div className="space-y-1">
                                  <p className="text-sm text-text-primary"><span className="font-medium">Q:</span> {normalizeBlockData(b).question}</p>
                                  <p className="text-sm text-text-secondary"><span className="font-medium">A:</span> {normalizeBlockData(b).answer}</p>
                                </div>
                              ) : (
                                <p className="text-sm text-text-secondary whitespace-pre-wrap">{normalizeBlockData(b).text ?? b.content}</p>
                              )}
                            </div>
                          ))}
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
                    onClick={() => selectSection(s.id, false, false, true)}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded ${selected.id === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle text-text-secondary'}`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </main>

          {!focusPreview && showProperties && (<aside className="border-l border-border bg-white p-0 overflow-hidden h-full min-h-0">
            <div className="px-4 h-[var(--rail-head-h)] border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-[1.02rem] font-semibold truncate">{selected.title}</h2>
              <button onClick={() => setShowProperties(false)} className="text-sm text-text-tertiary hover:text-text-primary">✕</button>
            </div>

            <div className="p-3.5 space-y-3 overflow-auto h-[calc(100%-var(--rail-head-h))] scroll-smooth">
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border border-border-subtle rounded-sm px-2.5 py-2 space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Now editing</p>
                <p className="text-sm font-medium text-text-primary truncate">{selected.title}</p>
                <button
                  onClick={() => {
                    setShowAddBlockPicker(false);
                    setFocusPreview(false);
                    setShowStructure(false);
                    setShowProperties(false);
                    setPrimedPreviewSectionId(null);
                    notify('Guide mode on. Click a section, then click again to open editor.');
                  }}
                  className="text-[11px] border border-border-subtle rounded-sm px-2 py-1 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  ← Back to section guide
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-sm border border-border-subtle bg-surface-subtle">
                <button onClick={() => setPropertyTab('content')} className={`text-xs px-2 py-1.5 rounded-sm transition-colors ${propertyTab === 'content' ? 'bg-white border border-border shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Content</button>
                <button onClick={() => setPropertyTab('layout')} className={`text-xs px-2 py-1.5 rounded-sm transition-colors ${propertyTab === 'layout' ? 'bg-white border border-border shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Settings</button>
              </div>

              <div className="border border-border rounded-sm p-2.5 bg-surface-subtle space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">{propertyTab === 'content' ? 'Content' : 'Settings'}</p>
                {propertyTab === 'content' && (
                  <>
                    <button
                      onClick={() => setShowAddBlockPicker((v) => !v)}
                      className="w-full border rounded-md px-3 py-2.5 text-left text-sm font-medium hover:border-primary/40 bg-white shadow-sm hover:shadow transition-all"
                    >
                      + Add to your page
                    </button>

                    {showAddBlockPicker && (
                      <div className="border border-border-subtle rounded-md p-2.5 bg-white">
                        <p className="text-[11px] text-text-tertiary mb-2">Add blocks to this section (limits apply)</p>
                        <div className="grid grid-cols-2 gap-2.5">
                        {addableBlocksForSelected.map((k) => {
                          const allowed = canAddBlockToSection(selected.id, selected.type, k);
                          return (
                            <button
                              key={k}
                              onClick={() => addBlockToSection(k)}
                              disabled={!allowed.ok}
                              title={allowed.ok ? `Add ${BLOCK_LABELS[k]}` : allowed.reason}
                              className={`text-left text-xs border border-border rounded-md px-2.5 py-2.5 transition-all ${allowed.ok ? 'hover:border-primary/40 hover:bg-primary/5' : 'opacity-60 cursor-not-allowed bg-surface-subtle border-dashed'}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-[12px] leading-none mt-[1px]">{BLOCK_META[k].icon}</span>
                                <span className="min-w-0">
                                  <span className="block text-[12px] font-medium text-text-primary">{BLOCK_LABELS[k]}</span>
                                  <span className="block text-[10px] text-text-tertiary mt-0.5 leading-snug">{BLOCK_META[k].desc}</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <p className="text-[11px] text-text-tertiary">Page content</p>
                      <p className="text-[10px] text-text-tertiary">Section limits: content blocks are capped to keep pages clean and readable.</p>

                      <div className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                        <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Header</p>
                        <label className="block">
                          <span className="text-[11px] text-text-tertiary">Title</span>
                          <input value={selected.title} onChange={(e) => renameSelected(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </label>
                      </div>

                      {selected.type === 'hero' && (
                        <>
                          <div id="rail-section-hero" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                            <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Couple names</p>
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Couple names</span>
                              <input
                                value={previewFields.coupleDisplayName}
                                onChange={(e) => updatePreviewField('coupleDisplayName', e.target.value)}
                                className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </label>
                          </div>
                          <div className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                            <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Date</p>
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Wedding date & time</span>
                              <input
                                type="datetime-local"
                                value={toDateTimeLocalValue(previewFields.eventDateISO)}
                                onChange={(e) => updateWeddingDateTime(e.target.value)}
                                className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {selected.type === 'story' && (
                        <div id="rail-section-story" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Story</p>
                          <label className="block">
                            <span className="text-[11px] text-text-tertiary">Story text</span>
                            <textarea
                              value={previewFields.storyText}
                              onChange={(e) => updatePreviewField('storyText', e.target.value)}
                              className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-24"
                            />
                          </label>
                        </div>
                      )}

                      {selected.type === 'schedule' && (
                        <>
                          <div id="rail-section-schedule" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                            <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Primary event</p>
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Primary event title</span>
                              <input value={previewFields.scheduleTitle} onChange={(e) => updatePreviewField('scheduleTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </label>
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Primary event note</span>
                              <input value={previewFields.scheduleNote} onChange={(e) => updatePreviewField('scheduleNote', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </label>
                          </div>
                        </>
                      )}

                      {selected.type === 'travel' && (
                        <div id="rail-section-travel" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Travel details</p>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Flights</span><input value={previewFields.travelFlights} onChange={(e) => updatePreviewField('travelFlights', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Parking</span><input value={previewFields.travelParking} onChange={(e) => updatePreviewField('travelParking', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Hotels</span><input value={previewFields.travelHotels} onChange={(e) => updatePreviewField('travelHotels', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Local tips</span><textarea value={previewFields.travelTips} onChange={(e) => updatePreviewField('travelTips', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" /></label>
                        </div>
                      )}

                      {selected.type === 'registry' && (
                        <div id="rail-section-registry" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">Registry</p>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Featured registry item</span><input value={previewFields.registryTitle} onChange={(e) => updatePreviewField('registryTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Registry note</span><textarea value={previewFields.registryNote} onChange={(e) => updatePreviewField('registryNote', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" /></label>
                        </div>
                      )}


                      {(sectionBlocks[selected.id] ?? []).length === 0 && (
                        <div className="border border-dashed border-border rounded-md p-3 bg-white text-[11px] text-text-tertiary">
                          No blocks yet. Use <span className="font-medium">+ Add to your page</span> to insert your first block.
                        </div>
                      )}

                      {(sectionBlocks[selected.id] ?? []).map((block, idx) => {
                        const d = normalizeBlockData(block);
                        return (
                        <div key={block.id} className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <div className="sticky top-0 z-[1] -mx-3 px-3 py-1.5 mb-1 bg-white/95 backdrop-blur flex items-center justify-between gap-2 border-b border-border-subtle">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-text-tertiary cursor-grab select-none" title="Reorder block">⋮⋮</span>
                              <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium truncate">Block · {BLOCK_LABELS[block.type]}</p>
                            </div>
                            <div className="flex items-center gap-1 p-0.5 rounded-md border border-border-subtle bg-surface-subtle">
                              <button title="Move block up" onClick={() => moveBlock(selected.id, block.id, -1)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">↑</button>
                              <button title="Move block down" onClick={() => moveBlock(selected.id, block.id, 1)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">↓</button>
                              <button title="Duplicate block" onClick={() => duplicateBlock(selected.id, block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">⧉</button>
                              <button title={collapsedBlocks[block.id] ? 'Expand block' : 'Collapse block'} onClick={() => toggleBlockCollapsed(block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">{collapsedBlocks[block.id] ? '▸' : '▾'}</button>
                              <button title="Remove block" onClick={() => removeBlock(selected.id, block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">✕</button>
                            </div>
                          </div>

                          {!collapsedBlocks[block.id] && getBlockValidationWarning(block) && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              {getBlockValidationWarning(block)}
                            </div>
                          )}

                          {!collapsedBlocks[block.id] && (block.type === 'qna' ? (
                            <>
                              <label className="block">
                                <span className="text-[11px] text-text-tertiary">Question</span>
                                <input
                                  value={d.question ?? ''}
                                  onChange={(e) => updateBlockData(selected.id, block.id, { question: e.target.value })}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] text-text-tertiary">Answer</span>
                                <textarea
                                  value={d.answer ?? ''}
                                  onChange={(e) => updateBlockData(selected.id, block.id, { answer: e.target.value })}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </label>
                            </>
                          ) : block.type === 'photo' ? (
                            <>
                              <label className="block">
                                <span className="text-[11px] text-text-tertiary">Image URL</span>
                                <input
                                  value={d.imageUrl ?? ''}
                                  onChange={(e) => updateBlockData(selected.id, block.id, { imageUrl: e.target.value })}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[11px] text-text-tertiary">Caption</span>
                                <input
                                  value={d.caption ?? ''}
                                  onChange={(e) => updateBlockData(selected.id, block.id, { caption: e.target.value })}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </label>
                            </>
                          ) : block.type === 'timelineItem' ? (
                            <>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Milestone title</span><input value={d.title ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { title: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Milestone note</span><textarea value={d.note ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { note: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                            </>
                          ) : block.type === 'divider' ? (
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Divider text</span>
                              <input value={d.text ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { text: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </label>
                          ) : block.type === 'event' ? (
                            <>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Title</span><input value={d.title ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { title: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Time</span><input value={d.time ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { time: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Location</span><input value={d.location ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { location: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Note</span><textarea value={d.note ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { note: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                            </>
                          ) : block.type === 'travelTip' || block.type === 'hotelCard' || block.type === 'registryItem' || block.type === 'fundHighlight' ? (
                            <>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Title</span><input value={d.title ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { title: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Note</span><textarea value={d.note ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { note: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">URL (optional)</span><input value={d.url ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { url: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                            </>
                          ) : block.type === 'rsvpNote' ? (
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">RSVP note</span>
                              <textarea
                                value={d.note ?? ''}
                                onChange={(e) => updateBlockData(selected.id, block.id, { note: e.target.value })}
                                className="w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </label>
                          ) : block.type === 'faqItem' ? (
                            <>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Question</span><input value={d.question ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { question: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                              <label className="block"><span className="text-[11px] text-text-tertiary">Answer</span><textarea value={d.answer ?? ''} onChange={(e) => updateBlockData(selected.id, block.id, { answer: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                            </>
                          ) : (
                            <label className="block">
                              <span className="text-[11px] text-text-tertiary">Content</span>
                              <textarea
                                value={d.text ?? block.content}
                                onChange={(e) => updateBlockData(selected.id, block.id, { text: e.target.value })}
                                className="w-full border rounded-md px-3 py-2.5 bg-white text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </label>
                          ))}
                        </div>
                        );
                      })}

                      {selected.type === 'rsvp' && (
                        <div id="rail-section-rsvp" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-medium">RSVP</p>
                          <label className="block"><span className="text-[11px] text-text-tertiary">RSVP heading</span><input value={previewFields.rsvpTitle} onChange={(e) => updatePreviewField('rsvpTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">RSVP deadline</span><input type="date" value={toDateInputValue(previewFields.rsvpDeadlineISO)} onChange={(e) => updateRsvpDeadlineDate(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                        </div>
                      )}

                    </div>
                  </>
                )}

                {propertyTab === 'layout' && (
                  <>
                    <label id="design-section" className="block">
                      <span className="text-[11px] text-text-tertiary">Layout</span>
                      <select value={selected.variant} onChange={(e) => updateVariant(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {(VARIANTS_BY_TYPE[selected.type] ?? ['default']).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <button id="privacy-section" onClick={() => toggleVisibility(selected.id)} className="w-full border rounded-md px-3 py-2 text-left text-sm hover:border-primary/40">
                      {selected.enabled ? 'Hide page' : 'Show page'}
                    </button>
                  </>
                )}
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
