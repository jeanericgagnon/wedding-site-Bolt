import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Eye, EyeOff, ArrowUp, ArrowDown, Undo2, Redo2, CheckCircle2, GripVertical, Keyboard, Command } from 'lucide-react';
import { templateCatalog } from '../builder/constants/templateCatalog';
import { getSectionRenderer } from '../builder/registry';
import type { SectionType, SectionInstance } from '../types/layoutConfig';
import type { WeddingDataV1 } from '../types/weddingData';
import { demoWeddingSite, demoEvents } from '../lib/demoData';
import { buildBuilderV2LabPreviewFieldsFromWeddingData, getInitialBuilderV2LabPreviewFields } from './builderV2LabPreview';
import type { BuilderV2Document } from '../builder-v2/contracts';
import { prepareImportedBuilderV2Document, type BuilderV2ImportReport } from '../builder-v2/importPrepare';
import { consumeBuilderV2UpgradeBridge } from '../builder-v2/upgradeBridge';
import { readSetupDraft, selectSetupDraftTemplate } from '../lib/setupDraft';
import {
  buildBuilderV2AddBlockLibrary,
  buildBuilderV2SectionEditingGuidance,
  getRecommendedBlockTypes,
} from './builderV2SectionEditingModel';
import { buildBuilderV2BlockReviewSummary } from './builderV2BlockReviewModel';
import {
  buildBuilderV2BlockPack,
  buildBuilderV2BlockPackSummary,
} from './builderV2BlockPack';
import {
  buildBuilderV2CommandPaletteGuidance,
  buildBuilderV2ImportGuidance,
  getImportSummaryTone,
  summarizeImportRepairCount,
} from './builderV2WorkflowGuidance';
import { buildBuilderV2ImportComparison } from './builderV2ImportComparison';
import { buildBuilderV2ImportReviewSummary } from './builderV2ImportReviewSummary';
import { buildBuilderV2UpgradeIntake } from './builderV2UpgradeIntake';
import { buildBuilderV2SetupIntake } from './builderV2SetupIntake';
import { buildBuilderV2DocumentAudit, type BuilderV2DocumentAuditIssue } from './builderV2DocumentAudit';
import { buildBuilderV2HandoffGuidance } from './builderV2HandoffGuidance';
import { buildBuilderV2HandoffPacket } from './builderV2HandoffPacket';
import { buildBuilderV2StructureGuidance } from './builderV2StructureGuidance';
import { buildBuilderV2SelectionGuidance } from './builderV2SelectionGuidance';
import { getBuilderGuideRoute } from './builderCutoverRoute';
import { cloneBuilderV2Sections } from './builderV2SectionClone';
import {
  duplicateBuilderV2Block,
  moveBuilderV2Block,
  removeBuilderV2Block,
} from './builderV2BlockOperations';
import {
  createBuilderV2Page,
  duplicateBuilderV2Page,
  moveBuilderV2SectionsToPage,
  removeBuilderV2Page,
  updateBuilderV2Page,
} from './builderV2PageOperations';
import {
  buildBuilderV2SectionLifecycleSummary,
  removeBuilderV2Sections,
} from './builderV2SectionLifecycle';
import {
  buildBuilderV2StarterBlocks,
  buildBuilderV2SectionStarterSummary,
  restoreBuilderV2SectionStarterBlocks,
} from './builderV2SectionStarter';
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
import {
  createInitialBuilderV2Pages,
  ensureUniqueBuilderV2PageSlug,
  getLabPagesFromBuilderV2Document,
  sanitizeBuilderV2PageTitle,
  type LabPage,
  type LabSection,
} from './builderV2PageState';
import type { BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';
import { buildBuilderV2SetupSeed } from './builderV2SetupSeed';
import { applyBuilderV2TemplateSeed, buildBuilderV2TemplateApplyPlan } from './builderV2TemplateApply';
import { buildBuilderV2TemplateSeed } from './builderV2TemplateSeed';
import { buildBuilderV2PreviewInstances } from './builderV2PreviewProjection';
import { buildBuilderV2SectionReviewSignature } from './builderV2PreviewReviewSignature';
import { consumeBuilderV2SetupBridge, readBuilderV2SetupBridge } from './builderV2SetupBridge';
import {
  buildBuilderV2ExportDocument,
  resolveBuilderV2ImportDraftPreview,
} from './builderV2DocumentIo';
import { resolveBuilderV2RouteIntent } from './builderV2RouteIntent';
import {
  createBuilderV2InvertedSelectionState,
  createBuilderV2PrimarySelectionState,
  createBuilderV2SelectAllState,
} from './builderV2SelectionState';
import {
  createBuilderV2HistorySnapshot,
  listBuilderV2CheckpointSummaries,
  pushBuilderV2ChangeWithCheckpoint,
  pushBuilderV2CheckpointSnapshot,
  pushBuilderV2HistorySnapshot,
  resolveBuilderV2CheckpointRestoreTarget,
  type BuilderV2HistorySnapshot,
} from './builderV2History';
import {
  buildBuilderV2LaunchGate,
  type BuilderV2LaunchGatePreviewCoverage,
  type BuilderV2LaunchGateAction,
} from './builderV2LaunchGate';
import {
  buildBuilderV2PreviewCoverage,
  buildBuilderV2PreviewReviewKey,
} from './builderV2PreviewReviewState';
import { buildBuilderV2ExportGate } from './builderV2ExportGate';
import {
  buildBuilderV2BlockFieldDescriptors,
  buildBuilderV2BlockFieldOptions,
  buildBuilderV2BlockPreviewSummary,
} from './builderV2BlockPresentation';
import { getBuilderV2BlockValidationWarning } from './builderV2BlockValidation';
import {
  buildBuilderV2SectionSettingFields,
  updateBuilderV2SectionSetting,
} from './builderV2SectionSettings';
import {
  canRepairBuilderV2SectionStructure,
  repairBuilderV2SectionStructure,
} from './builderV2StructureRepair';
import {
  appendBuilderV2RolloutTelemetryEntry,
  readBuilderV2RolloutTelemetry,
  summarizeBuilderV2RolloutTelemetry,
  writeBuilderV2RolloutTelemetry,
} from './builderV2RolloutTelemetry';

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

const makeGenericDefaultBlockContent = (type: BlockType): AddedBlockContent => {
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

const makeDefaultBlockContent = (sectionType: string, type: BlockType): AddedBlockContent => {
  switch (sectionType) {
    case 'wedding-party':
      if (type === 'title') {
        return { text: 'Partner One Crew', subtitle: 'bridal-title' };
      }
      if (type === 'photo') {
        return {
          imageUrl: '',
          caption: 'Wedding party portrait',
          title: 'Avery',
          role: 'Maid of Honor',
          note: 'Keeps the dance floor and group texts alive.',
          subtitle: 'bridal-party',
        };
      }
      break;
    case 'contact':
      if (type === 'travelTip') {
        return {
          title: 'Maya Chen',
          role: 'Planner',
          email: 'maya@example.com',
          phone: '+1 (415) 555-0199',
          note: 'Reach out for timeline or logistics questions.',
        };
      }
      if (type === 'qna') {
        return { question: 'Email subject', answer: 'Wedding Weekend Question' };
      }
      if (type === 'story') {
        return { text: 'Choose the best person for each question so guests know where to go first.' };
      }
      break;
    case 'quotes':
      if (type === 'photo') {
        return {
          imageUrl: '',
          caption: 'Favorite photo',
          title: 'Maya',
          role: 'Friend',
          note: 'Their joy makes every room feel lighter.',
        };
      }
      if (type === 'title') {
        return { text: 'From the people we love' };
      }
      if (type === 'text') {
        return { text: 'Add a short note, toast line, or message from someone close to you.' };
      }
      break;
    case 'menu':
      if (type === 'title') {
        return { text: 'Dinner Menu', subtitle: 'course:course-1' };
      }
      if (type === 'travelTip') {
        return {
          title: 'Wild Mushroom Risotto',
          note: 'Parmesan, herbs, and roasted shallots.',
          role: 'Vegetarian',
          subtitle: 'course:course-1',
        };
      }
      if (type === 'story') {
        return { text: 'Share dietary guidance, late-night snacks, or anything guests should know before dinner.' };
      }
      break;
    case 'music':
      if (type === 'title') {
        return { text: 'Ceremony Playlist', subtitle: 'playlist:playlist-1' };
      }
      if (type === 'travelTip') {
        return {
          title: 'Bloom',
          note: 'The Paper Kites',
          role: 'Processional',
          subtitle: 'playlist-track:playlist-1',
        };
      }
      if (type === 'story') {
        return { text: 'Tell guests what kind of songs you love, or invite requests with their RSVP.' };
      }
      break;
    case 'video':
      if (type === 'photo') {
        return {
          imageUrl: '',
          caption: 'Video thumbnail',
          title: 'Save the Date',
          note: 'A quick preview of the weekend.',
          role: 'youtube',
          subtitle: 'video:video-1',
        };
      }
      if (type === 'travelTip') {
        return {
          title: 'Watch the teaser',
          url: 'https://youtu.be/abcdefghijk',
          role: 'youtube',
          subtitle: 'video:video-1',
        };
      }
      break;
    default:
      break;
  }

  return makeGenericDefaultBlockContent(type);
};

const makeIndexedDefaultBlockContent = (
  sectionType: string,
  type: BlockType,
  starterIndex?: number,
): AddedBlockContent => {
  if (sectionType === 'wedding-party') {
    if (type === 'title') {
      return starterIndex === 2
        ? { text: 'Partner Two Crew', subtitle: 'groom-title' }
        : { text: 'Partner One Crew', subtitle: 'bridal-title' };
    }
    if (type === 'photo') {
      return starterIndex === 3
        ? {
          imageUrl: '',
          caption: 'Wedding party portrait',
          title: 'Jordan',
          role: 'Best Man',
          note: 'Handles the toast cue and keeps the energy steady.',
          subtitle: 'groom-party',
        }
        : {
          imageUrl: '',
          caption: 'Wedding party portrait',
          title: 'Avery',
          role: 'Maid of Honor',
          note: 'Keeps the dance floor and group texts alive.',
          subtitle: 'bridal-party',
        };
    }
  }

  return makeDefaultBlockContent(sectionType, type);
};

const normalizeBlockData = (block: AddedBlock): AddedBlockContent => {
  if (block.data) return block.data;
  return makeGenericDefaultBlockContent(block.type);
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
  directions: ['travelTip', 'title', 'text', 'photo', 'divider'],
  accommodations: ['hotelCard', 'travelTip', 'text', 'divider'],
  contact: ['travelTip', 'text', 'qna', 'story', 'title', 'divider'],
  quotes: ['photo', 'title', 'text', 'qna', 'divider'],
  menu: ['title', 'travelTip', 'story', 'text', 'qna', 'divider'],
  music: ['title', 'travelTip', 'story', 'text', 'qna', 'divider'],
  video: ['photo', 'travelTip', 'title', 'text', 'qna', 'divider'],
  custom: ['title', 'text', 'photo', 'qna', 'story', 'divider'],
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
  contact: { total: 10, perType: { travelTip: 5, qna: 3 } },
  quotes: { total: 12, perType: { photo: 8 } },
  menu: { total: 14, perType: { travelTip: 10, title: 5 } },
  music: { total: 16, perType: { travelTip: 12, title: 4 } },
  video: { total: 12, perType: { photo: 6, travelTip: 6 } },
  custom: { total: 12 },
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
  phone?: string;
  email?: string;
  role?: string;
  bookingCode?: string;
  blockDeadline?: string;
  priceRange?: string;
  distance?: string;
  rideshareNote?: string;
};

type AddedBlock = {
  id: string;
  type: BlockType;
  content: string;
  data?: AddedBlockContent;
};

const INITIAL_SECTIONS: LabSection[] = [
  { id: 'hero', type: 'hero', title: 'Hero', subtitle: 'Alex & Jordan · June 21, 2026', variant: 'countdown', enabled: true, density: 'comfortable' },
  { id: 'story', type: 'story', title: 'Story', subtitle: 'How we met', variant: 'timeline', enabled: true, density: 'comfortable' },
  { id: 'schedule', type: 'schedule', title: 'Schedule', subtitle: 'Weekend events', variant: 'dayTabs', enabled: true, density: 'comfortable' },
  { id: 'travel', type: 'travel', title: 'Travel', subtitle: 'Stay + transport', variant: 'localGuide', enabled: true, density: 'comfortable' },
  { id: 'registry', type: 'registry', title: 'Registry', subtitle: 'Gift options', variant: 'fundHighlight', enabled: true, density: 'comfortable' },
  { id: 'rsvp', type: 'rsvp', title: 'RSVP', subtitle: 'Let us know', variant: 'card', enabled: true, density: 'comfortable' },
];

const ADDABLE_SECTIONS = ['Gallery', 'FAQ', 'Venue', 'Countdown', 'Wedding Party', 'Dress Code', 'Accommodations', 'Directions', 'Contact', 'Quotes', 'Menu', 'Music', 'Video', 'Custom'];

const VARIANTS_BY_TYPE: Record<string, string[]> = {
  hero: ['default', 'countdown'],
  story: ['default', 'timeline'],
  schedule: ['default', 'dayTabs'],
  travel: ['default', 'localGuide'],
  registry: ['default', 'cards', 'grid', 'fundHighlight', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful'],
  faq: ['default', 'iconGrid'],
  venue: ['default'],
  countdown: ['default'],
  rsvp: ['default'],
  accommodations: ['default', 'cards'],
  contact: ['default', 'minimal'],
  'wedding-party': ['default', 'minimal', 'split-sides', 'scroll'],
  'dress-code': ['default', 'banner', 'mood-board'],
  directions: ['default', 'pin', 'split', 'card'],
  quotes: ['default', 'carousel', 'grid', 'featured', 'guestbook'],
  menu: ['default', 'tabs', 'card', 'simple'],
  music: ['default', 'playlist', 'setlist', 'compact'],
  video: ['default', 'full', 'card', 'inline'],
  custom: ['default'],
};

const isRegistryBuilderSectionType = (type: string) => {
  const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalizedType === 'registry' || normalizedType.startsWith('registrysection');
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
  quotes: 'quotes',
  menu: 'menu',
  music: 'music',
  video: 'video',
  custom: 'custom',
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
  const location = useLocation();
  const navigate = useNavigate();
  const initialDraft = useMemo(() => readSetupDraft(), []);
  const initialSetupBridgeDraft = useMemo(() => readBuilderV2SetupBridge(), []);
  const initialSetupSeed = useMemo(
    () => buildBuilderV2SetupSeed(initialDraft) ?? (initialSetupBridgeDraft ? buildBuilderV2SetupSeed(initialSetupBridgeDraft) : null),
    [initialDraft, initialSetupBridgeDraft],
  );
  const initialTemplateSeed = useMemo(() => buildBuilderV2TemplateSeed(initialDraft.selectedTemplateId), [initialDraft]);
  const initialPages = initialSetupSeed?.pages ?? initialTemplateSeed.pages ?? createInitialBuilderV2Pages(INITIAL_SECTIONS);
  const initialSelectedPageId = initialSetupSeed?.selectedPageId ?? initialTemplateSeed.selectedPageId ?? 'home';
  const initialSelectedSectionId = initialSetupSeed?.selectedSectionId ?? initialTemplateSeed.selectedSectionId ?? INITIAL_SECTIONS[0].id;
  const [history, setHistory] = useState<BuilderV2HistorySnapshot<AddedBlock>[]>([
    createBuilderV2HistorySnapshot({
      id: '',
      pages: initialPages,
      sectionBlocks: {},
    }),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState(initialSelectedPageId);
  const [selectedId, setSelectedId] = useState(initialSelectedSectionId);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string>(initialSelectedSectionId);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [previewFields, setPreviewFields] = useState(() => initialSetupSeed?.previewFields ?? getInitialBuilderV2LabPreviewFields());
  const [addQuery, setAddQuery] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addPickerType, setAddPickerType] = useState<string | null>(null);
  const [showStructure, setShowStructure] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showCommand, setShowCommand] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importDraft, setImportDraft] = useState('');
  const [importError, setImportError] = useState('');
  const [lastImportReport, setLastImportReport] = useState<BuilderV2ImportReport | null>(null);
  const [lastImportSource, setLastImportSource] = useState('Pasted JSON');
  const [rolloutTelemetry, setRolloutTelemetry] = useState(() => readBuilderV2RolloutTelemetry());
  const [upgradeIntakeState, setUpgradeIntakeState] = useState<{
    sourceName: string;
    report: BuilderV2ImportReport;
    hydratedWeddingData: boolean;
  } | null>(null);
  const [setupSeedState, setSetupSeedState] = useState(initialSetupSeed);
  const [selectedTemplateSeedId, setSelectedTemplateSeedId] = useState(initialTemplateSeed.templateId);
  const [preserveTemplateSharedContent, setPreserveTemplateSharedContent] = useState(true);
  const [propertyTab, setPropertyTab] = useState<'content' | 'layout' | 'data'>('content');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [pinnedCommands] = useState<string[]>(['Add section: Hero', 'Select section: Hero']);
  const [showQuickHelp, setShowQuickHelp] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewReviewedSnapshots, setPreviewReviewedSnapshots] = useState<{
    desktop: Record<string, string>;
    mobile: Record<string, string>;
  }>({
    desktop: {},
    mobile: {},
  });
  const [previewScale, setPreviewScale] = useState(100);
  const [focusPreview, setFocusPreview] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [hoveredPreviewId, setHoveredPreviewId] = useState<string | null>(null);
  const [primedPreviewSectionId, setPrimedPreviewSectionId] = useState<string | null>(null);
  const [showAddBlockPicker, setShowAddBlockPicker] = useState(false);
  const [addBlockQuery, setAddBlockQuery] = useState('');
  const [blockReviewQuery, setBlockReviewQuery] = useState('');
  const [blockReviewFilter, setBlockReviewFilter] = useState<'all' | 'warnings' | 'healthy'>('all');
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const launchGateRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeSnapshot = history[historyIndex] ?? history[0];
  const pages = useMemo(() => activeSnapshot?.pages ?? [], [activeSnapshot]);
  const sectionBlocks = useMemo(() => activeSnapshot?.sectionBlocks ?? {}, [activeSnapshot]);
  const activePage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const sections = useMemo(() => activePage?.sections ?? [], [activePage]);
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0];
  const selectedIds = useMemo(() => Array.from(new Set([selectedId, ...multiSelectedIds])), [selectedId, multiSelectedIds]);
  const selectedSections = useMemo(
    () => sections.filter((section) => selectedIds.includes(section.id)),
    [sections, selectedIds],
  );
  const allSections = useMemo(() => pages.flatMap((page) => page.sections), [pages]);
  const sectionPageById = useMemo(
    () => new Map(allSections.map((section) => [section.id, pages.find((page) => page.sections.some((pageSection) => pageSection.id === section.id)) ?? activePage])),
    [activePage, allSections, pages],
  );

  const scrollToPreviewSection = useCallback((id: string) => {
    document.getElementById(`preview-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollRailToSectionType = useCallback((type: string) => {
    document.getElementById(`rail-section-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const selectSection = useCallback((id: string, additive = false, range = false, scroll = false, openEditor = false) => {
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
  }, [lastSelectedId, scrollToPreviewSection, sections]);

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


  const markSaving = useCallback(() => {
    setSaveState('saving');
    window.setTimeout(() => {
      setSaveState('saved');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 600);
  }, []);

  const notify = useCallback((text: string) => {
    setActionNotice(text);
    window.setTimeout(() => setActionNotice(''), 2200);
  }, []);

  const selectPage = useCallback((pageId: string, preserveSelection = false) => {
    const nextPage = pages.find((page) => page.id === pageId);
    if (!nextPage) return;
    setSelectedPageId(pageId);
    if (preserveSelection && nextPage.sections.some((section) => section.id === selectedId)) {
      return;
    }
    const nextSectionId = nextPage.sections[0]?.id ?? '';
    setSelectedId(nextSectionId);
    setLastSelectedId(nextSectionId);
    setMultiSelectedIds([]);
  }, [pages, selectedId]);

  const focusSectionById = useCallback((sectionId: string, openEditor = true) => {
    const page = sectionPageById.get(sectionId);
    if (!page) return;
    selectPage(page.id, true);
    setSelectedId(sectionId);
    setLastSelectedId(sectionId);
    setMultiSelectedIds([]);
    if (openEditor) {
      setShowStructure(false);
      setShowProperties(true);
    }
  }, [sectionPageById, selectPage]);

  const selectAllSections = useCallback(() => {
    const nextSelection = createBuilderV2SelectAllState(sections.map((section) => section.id));
    if (!nextSelection) return;
    setSelectedId(nextSelection.selectedId);
    setLastSelectedId(nextSelection.lastSelectedId);
    setMultiSelectedIds(nextSelection.multiSelectedIds);
    notify('All sections selected');
  }, [sections, notify]);

  const clearSelection = useCallback(() => {
    setMultiSelectedIds([]);
    notify('Multi selection cleared');
  }, [notify]);

  const invertSelection = useCallback(() => {
    const nextSelection = createBuilderV2InvertedSelectionState({
      sectionIds: sections.map((section) => section.id),
      selectedIds,
    });
    if (!nextSelection) return;
    setSelectedId(nextSelection.selectedId);
    setLastSelectedId(nextSelection.lastSelectedId);
    setMultiSelectedIds(nextSelection.multiSelectedIds);
    notify('Selection inverted');
  }, [notify, sections, selectedIds]);


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

  const canAddBlockToSection = useCallback((sectionId: string, sectionType: string, blockType: BlockType) => {
    const cfg = getSectionLimitConfig(sectionType);
    const blocks = sectionBlocks[sectionId] ?? [];
    if (blocks.length >= cfg.total) return { ok: false, reason: `Max ${cfg.total} blocks for this section` };
    const perType = cfg.perType?.[blockType];
    if (typeof perType === 'number') {
      const count = blocks.filter((b) => b.type === blockType).length;
      if (count >= perType) return { ok: false, reason: `Max ${perType} ${BLOCK_LABELS[blockType]} block(s)` };
    }
    return { ok: true as const, reason: '' };
  }, [sectionBlocks]);

  const addBlockToSection = (blockType: BlockType) => {
    const allowed = canAddBlockToSection(selected.id, selected.type, blockType);
    if (!allowed.ok) {
      recordRolloutTelemetry({ action: 'add', outcome: 'failure', operation: 'block', reason: allowed.reason });
      notify(allowed.reason);
      return;
    }

    const block: AddedBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: blockType,
      content: BLOCK_DEFAULTS[blockType],
      data: makeDefaultBlockContent(selected.type, blockType),
    };
    commit(pages, { ...sectionBlocks, [selected.id]: [...(sectionBlocks[selected.id] ?? []), block] });
    setShowAddBlockPicker(false);
    recordRolloutTelemetry({ action: 'add', outcome: 'success', operation: 'block' });
    notify(`${BLOCK_LABELS[blockType]} added`);
  };

  const updateBlockData = (sectionId: string, blockId: string, patch: Partial<AddedBlockContent>) => {
    commit(pages, {
      ...sectionBlocks,
      [sectionId]: (sectionBlocks[sectionId] ?? []).map((b) =>
        b.id === blockId ? { ...b, data: { ...normalizeBlockData(b), ...patch } } : b
      ),
    });
  };

  const updateBlockField = (
    sectionId: string,
    blockId: string,
    key: keyof AddedBlockContent,
    value: string,
  ) => {
    updateBlockData(sectionId, blockId, { [key]: value } as Partial<AddedBlockContent>);
  };

  const updateSelectedSectionSetting = (
    key: string,
    value: string | boolean,
  ) => {
    commit(pages, {
      ...sectionBlocks,
      [selected.id]: updateBuilderV2SectionSetting(selected.type, sectionBlocks[selected.id] ?? [], key, value) as AddedBlock[],
    });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const nextBlocks = removeBuilderV2Block({
      blocks: sectionBlocks[sectionId] ?? [],
      blockId,
    });
    if (nextBlocks === (sectionBlocks[sectionId] ?? [])) return;

    commitWithCheckpoint('Before removing block', pages, {
      ...sectionBlocks,
      [sectionId]: nextBlocks,
    });
    recordRolloutTelemetry({ action: 'remove', outcome: 'success', operation: 'block' });
    notify('Removed block');
  };



  const duplicateBlock = (sectionId: string, blockId: string) => {
    const sourceSection = sections.find((x) => x.id === sectionId);
    if (!sourceSection) return;

    const result = duplicateBuilderV2Block({
      blocks: sectionBlocks[sectionId] ?? [],
      blockId,
      canAdd: (blockType) => canAddBlockToSection(sectionId, sourceSection.type, blockType),
    });
    if (result.blockedReason) {
      recordRolloutTelemetry({ action: 'duplicate', outcome: 'failure', operation: 'block', reason: result.blockedReason });
      notify(result.blockedReason);
      return;
    }
    if (!result.duplicatedBlockId) {
      recordRolloutTelemetry({ action: 'duplicate', outcome: 'failure', operation: 'block', reason: 'Block duplicate did not complete.' });
      return;
    }

    commit(pages, { ...sectionBlocks, [sectionId]: result.blocks });
    recordRolloutTelemetry({ action: 'duplicate', outcome: 'success', operation: 'block' });
    notify('Duplicated block');
  };

  const toggleBlockCollapsed = (blockId: string) => {
    setCollapsedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const moveBlock = (sectionId: string, blockId: string, dir: -1 | 1) => {
    const nextBlocks = moveBuilderV2Block({
      blocks: sectionBlocks[sectionId] ?? [],
      blockId,
      direction: dir,
    });
    if (nextBlocks === (sectionBlocks[sectionId] ?? [])) return;
    commit(pages, { ...sectionBlocks, [sectionId]: nextBlocks });
  };

  const commit = useCallback((nextPages: LabPage[], nextSectionBlocks: Record<string, AddedBlock[]> = sectionBlocks) => {
    const nextState = pushBuilderV2HistorySnapshot({
      history,
      historyIndex,
      nextPages,
      nextSectionBlocks,
    });
    setHistory(nextState.history);
    setHistoryIndex(nextState.historyIndex);
    markSaving();
  }, [history, historyIndex, markSaving, sectionBlocks]);

  const recordRolloutTelemetry = useCallback((
    entry: Parameters<typeof appendBuilderV2RolloutTelemetryEntry>[1],
  ) => {
    setRolloutTelemetry((prev) => {
      const next = appendBuilderV2RolloutTelemetryEntry(prev, entry);
      writeBuilderV2RolloutTelemetry(next);
      return next;
    });
  }, []);

  const commitWithCheckpoint = useCallback((
    checkpointLabel: string,
    nextPages: LabPage[],
    nextSectionBlocks: Record<string, AddedBlock[]> = sectionBlocks,
  ) => {
    const nextState = pushBuilderV2ChangeWithCheckpoint({
      history,
      historyIndex,
      currentPages: pages,
      currentSectionBlocks: sectionBlocks,
      checkpointLabel,
      nextPages,
      nextSectionBlocks,
    });
    setHistory(nextState.history);
    setHistoryIndex(nextState.historyIndex);
    if (nextState.checkpointId) {
      setSelectedCheckpointId(nextState.checkpointId);
    }
    markSaving();
  }, [history, historyIndex, markSaving, pages, sectionBlocks]);

  const checkpointSummaries = useMemo(
    () => listBuilderV2CheckpointSummaries(history, historyIndex),
    [history, historyIndex],
  );
  const recentCheckpointSummaries = useMemo(
    () => checkpointSummaries.slice(0, 3),
    [checkpointSummaries],
  );

  const saveCheckpoint = useCallback(() => {
    const nextState = pushBuilderV2CheckpointSnapshot({
      history,
      historyIndex,
      pages,
      sectionBlocks,
      label: `${activePage?.title ?? 'Document'} checkpoint`,
    });
    const checkpoint = nextState.history[nextState.historyIndex];
    setHistory(nextState.history);
    setHistoryIndex(nextState.historyIndex);
    setSelectedCheckpointId(checkpoint?.id ?? '');
    markSaving();
    notify(`Saved checkpoint: ${checkpoint?.label ?? 'Checkpoint'}`);
  }, [activePage?.title, history, historyIndex, markSaving, notify, pages, sectionBlocks]);

  const applySelectedTemplateSeed = useCallback(() => {
    const applied = applyBuilderV2TemplateSeed({
      templateId: selectedTemplateSeedId,
      currentPages: pages,
      currentSectionBlocks: sectionBlocks,
      preserveSharedBlocks: preserveTemplateSharedContent,
      preserveSharedMetadata: preserveTemplateSharedContent,
    });
    const plan = buildBuilderV2TemplateApplyPlan(selectedTemplateSeedId, pages, sectionBlocks);
    selectSetupDraftTemplate(plan.templateId);
    setSetupSeedState(null);
    setUpgradeIntakeState(null);
    setSelectedPageId(applied.seed.selectedPageId);
    setSelectedId(applied.seed.selectedSectionId);
    setLastSelectedId(applied.seed.selectedSectionId);
    setMultiSelectedIds([]);
    setShowStructure(false);
    setShowProperties(false);
    setPropertyTab('content');
    commitWithCheckpoint(
      `Before applying ${plan.templateName} starter`,
      applied.pages,
      applied.sectionBlocks as Record<string, AddedBlock[]>,
    );
    notify(
      preserveTemplateSharedContent && applied.carryoverBlockCount > 0
        ? `${plan.templateName} starter applied with ${applied.carryoverBlockCount} carried block${applied.carryoverBlockCount === 1 ? '' : 's'}`
        : `${plan.templateName} starter applied`,
    );
  }, [commitWithCheckpoint, notify, pages, preserveTemplateSharedContent, sectionBlocks, selectedTemplateSeedId]);

  const restoreCheckpoint = useCallback((checkpointId: string) => {
    const checkpointIndex = history.findIndex((snapshot) => snapshot.id === checkpointId && snapshot.isCheckpoint);
    if (checkpointIndex < 0) {
      notify('That checkpoint is no longer available');
      return;
    }

    const checkpoint = history[checkpointIndex];
    setHistoryIndex(checkpointIndex);
    setSelectedCheckpointId(checkpointId);
    const restoreTarget = checkpoint
      ? resolveBuilderV2CheckpointRestoreTarget({
          snapshot: checkpoint,
          preferredPageId: selectedPageId,
          preferredSectionId: selectedId,
        })
      : null;
    if (restoreTarget?.pageId) setSelectedPageId(restoreTarget.pageId);
    if (restoreTarget?.sectionId) {
      setSelectedId(restoreTarget.sectionId);
      setLastSelectedId(restoreTarget.sectionId);
      setMultiSelectedIds([]);
    }
    notify(`Restored checkpoint: ${checkpoint?.label ?? 'Checkpoint'}`);
  }, [history, notify, selectedId, selectedPageId]);

  const formatCheckpointTime = useCallback((value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, []);

  const commitActivePageSections = useCallback((nextSections: LabSection[]) => {
    if (!activePage) return;
    commit(pages.map((page) => (
      page.id === activePage.id
        ? { ...page, sections: nextSections }
        : page
    )));
  }, [activePage, commit, pages]);

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    commitActivePageSections(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === String(active.id));
    const newIndex = sections.findIndex((s) => s.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    commitActivePageSections(arrayMove(sections, oldIndex, newIndex));
  };

  const toggleVisibility = (id: string) => {
    commitActivePageSections(sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const updateSelectedSections = useCallback((
    updater: (section: LabSection) => LabSection,
    notice: string,
  ) => {
    const selectedSet = new Set(selectedIds);
    const touchedCount = sections.filter((section) => selectedSet.has(section.id)).length;
    if (!touchedCount) return;
    commitActivePageSections(sections.map((section) => (selectedSet.has(section.id) ? updater(section) : section)));
    notify(notice);
  }, [commitActivePageSections, notify, sections, selectedIds]);

  const hideSelectedSections = useCallback(() => {
    const selectedSet = new Set(selectedIds);
    const touchedCount = sections.filter((section) => selectedSet.has(section.id)).length;
    if (!touchedCount) return;
    commitWithCheckpoint(
      touchedCount === 1 ? 'Before hiding section' : 'Before hiding selected sections',
      activePage ? pages.map((page) => (
        page.id === activePage.id
          ? {
              ...page,
              sections: page.sections.map((section) => (
                selectedSet.has(section.id) ? { ...section, enabled: false } : section
              )),
            }
          : page
      )) : pages,
    );
    notify('Selected sections hidden');
  }, [activePage, commitWithCheckpoint, notify, pages, sections, selectedIds]);

  const showSelectedSections = useCallback(() => {
    updateSelectedSections((section) => ({ ...section, enabled: true }), 'Selected sections shown');
  }, [updateSelectedSections]);

  const setSelectedDensity = useCallback((density: 'compact' | 'comfortable') => {
    updateSelectedSections(
      (section) => ({ ...section, density }),
      density === 'compact' ? 'Selected sections set to compact' : 'Selected sections set to comfortable',
    );
  }, [updateSelectedSections]);

  const reviewSelectionInPreview = useCallback(() => {
    if (!selectedSections.length) return;
    setShowStructure(false);
    setShowProperties(false);
    setFocusPreview(false);
    setShowMinimap(true);
    scrollToPreviewSection(selectedSections[0].id);
    notify(`Reviewing ${selectedSections.length} selected section${selectedSections.length === 1 ? '' : 's'} in preview`);
  }, [notify, scrollToPreviewSection, selectedSections]);

  const duplicateSelectedSections = useCallback(() => {
    const result = cloneBuilderV2Sections({
      sections,
      sectionBlocks,
      selectedIds,
    });
    if (!result.duplicatedIds.length) {
      recordRolloutTelemetry({ action: 'duplicate', outcome: 'failure', operation: 'section', reason: 'No selected sections were available to duplicate.' });
      return;
    }
    setSelectedId(result.duplicatedIds[0]);
    setLastSelectedId(result.duplicatedIds[0]);
    setMultiSelectedIds(result.duplicatedIds.slice(1));
    commit(activePage ? pages.map((page) => (
      page.id === activePage.id
        ? { ...page, sections: result.sections }
        : page
    )) : pages, result.sectionBlocks);
    recordRolloutTelemetry({ action: 'duplicate', outcome: 'success', operation: 'section' });
    notify(`Duplicated ${result.duplicatedIds.length} section${result.duplicatedIds.length === 1 ? '' : 's'}`);
  }, [activePage, commit, notify, pages, recordRolloutTelemetry, sectionBlocks, sections, selectedIds]);

  const removeSelectedSections = useCallback(() => {
    const result = removeBuilderV2Sections({
      sections,
      sectionBlocks,
      selectedIds,
      selectedId,
    });

    if (!result.removedIds.length) {
      recordRolloutTelemetry({
        action: 'remove',
        outcome: 'failure',
        operation: 'section',
        reason: 'Keep at least one section live in the page structure before removing more',
      });
      notify('Keep at least one section live in the page structure before removing more');
      return;
    }

    setSelectedId(result.nextSelectedId ?? '');
    setLastSelectedId(result.nextSelectedId ?? '');
    setMultiSelectedIds([]);
    commitWithCheckpoint(
      result.removedIds.length === 1 ? 'Before removing section' : 'Before removing selected sections',
      activePage ? pages.map((page) => (
      page.id === activePage.id
        ? { ...page, sections: result.sections }
        : page
      )) : pages,
      result.sectionBlocks,
    );
    notify(
      result.removedIds.length === 1
        ? 'Removed section from the page structure'
        : `Removed ${result.removedIds.length} sections from the page structure`,
    );
    recordRolloutTelemetry({ action: 'remove', outcome: 'success', operation: 'section' });
  }, [activePage, commitWithCheckpoint, notify, pages, recordRolloutTelemetry, sectionBlocks, sections, selectedId, selectedIds]);

  const buildStarterBlocks = useCallback((sectionId: string, sectionType: string) => {
    const availableBlockTypes = SECTION_BLOCK_CATALOG[sectionType] ?? ['title', 'text', 'photo'];
    return buildBuilderV2StarterBlocks({
      sectionId,
      sectionType,
      availableBlockTypes,
      labels: BLOCK_DEFAULTS,
      createDefaultData: (starterSectionType, blockType, starterIndex) =>
        makeIndexedDefaultBlockContent(starterSectionType, blockType as BlockType, starterIndex),
    }).map((block) => ({
      ...block,
      id: `${sectionId}-${block.type}-${Math.random().toString(36).slice(2, 6)}`,
      type: block.type as BlockType,
      content: BLOCK_DEFAULTS[block.type as BlockType],
      data: block.data as AddedBlockContent,
    }));
  }, []);

  const addSection = useCallback((typeLabel: string, variant?: string) => {
    const normalizedType = typeLabel.toLowerCase().replace(/\s+/g, '-');
    const id = `${normalizedType}-${Date.now()}`;
    const next = [...sections, { id, type: normalizedType, title: typeLabel, subtitle: '', variant: variant ?? 'default', enabled: true, density: 'comfortable' as const }];
    const starterBlocks = buildStarterBlocks(id, normalizedType);
    const nextSelection = createBuilderV2PrimarySelectionState(id);
    setSelectedId(nextSelection.selectedId);
    setLastSelectedId(nextSelection.lastSelectedId);
    setMultiSelectedIds(nextSelection.multiSelectedIds);
    commit(activePage ? pages.map((page) => (
      page.id === activePage.id
        ? { ...page, sections: next }
        : page
    )) : pages, { ...sectionBlocks, [id]: starterBlocks });
    recordRolloutTelemetry({ action: 'add', outcome: 'success', operation: 'section' });
    notify(starterBlocks.length > 0 ? `Added ${typeLabel} with ${starterBlocks.length} starter block${starterBlocks.length === 1 ? '' : 's'}` : `Added ${typeLabel}`);
  }, [activePage, buildStarterBlocks, commit, notify, pages, recordRolloutTelemetry, sectionBlocks, sections]);

  const addPage = useCallback(() => {
    const pageIndex = pages.length + 1;
    const baseTitle = pageIndex === 1 ? 'Home' : `Page ${pageIndex}`;
    const title = sanitizeBuilderV2PageTitle(baseTitle, `Page ${pageIndex}`);
    const pageId = `page-${Date.now()}`;
    const sectionSlugBase = ensureUniqueBuilderV2PageSlug(title, pages);
    const sectionId = `${sectionSlugBase}-hero`;
    const nextPages = createBuilderV2Page({
      pages,
      pageId,
      title,
      initialSections: [{
        id: sectionId,
        type: 'hero',
        title: 'Hero',
        subtitle: '',
        variant: 'default',
        enabled: true,
        density: 'comfortable',
      }],
    });
    commit(nextPages, { ...sectionBlocks, [sectionId]: buildStarterBlocks(sectionId, 'hero') });
    setSelectedPageId(pageId);
    setSelectedId(sectionId);
    setLastSelectedId(sectionId);
    setMultiSelectedIds([]);
    recordRolloutTelemetry({ action: 'add', outcome: 'success', operation: 'page' });
    notify(`Added ${title}`);
  }, [buildStarterBlocks, commit, notify, pages, recordRolloutTelemetry, sectionBlocks]);

  const renamePage = useCallback((pageId: string, title: string) => {
    commit(updateBuilderV2Page({
      pages,
      pageId,
      patch: { title },
    }));
  }, [commit, pages]);

  const updatePageSlug = useCallback((pageId: string, slug: string) => {
    commit(updateBuilderV2Page({
      pages,
      pageId,
      patch: { slug },
    }));
  }, [commit, pages]);

  const togglePageVisibility = useCallback((pageId: string) => {
    const page = pages.find((entry) => entry.id === pageId);
    if (!page) return;
    commitWithCheckpoint('Before changing page visibility', updateBuilderV2Page({
      pages,
      pageId,
      patch: { hidden: page.isHome ? false : !page.hidden },
    }));
  }, [commitWithCheckpoint, pages]);

  const setHomePage = useCallback((pageId: string) => {
    commit(updateBuilderV2Page({
      pages,
      pageId,
      patch: { isHome: true },
    }));
    notify('Home page updated');
  }, [commit, notify, pages]);

  const removePage = useCallback((pageId: string) => {
    if (pages.length <= 1) {
      recordRolloutTelemetry({ action: 'remove', outcome: 'failure', operation: 'page', reason: 'Keep at least one page in the document' });
      notify('Keep at least one page in the document');
      return;
    }
    const nextPages = removeBuilderV2Page({ pages, pageId });
    commitWithCheckpoint('Before removing page', nextPages);
    if (selectedPageId === pageId) {
      const fallbackPageId = nextPages.find((page) => page.isHome)?.id ?? nextPages[0]?.id ?? '';
      selectPage(fallbackPageId);
    }
    recordRolloutTelemetry({ action: 'remove', outcome: 'success', operation: 'page' });
    notify('Page removed');
  }, [commitWithCheckpoint, notify, pages, recordRolloutTelemetry, selectPage, selectedPageId]);

  const duplicatePage = useCallback((pageId: string) => {
    const result = duplicateBuilderV2Page({
      pages,
      sectionBlocks,
      pageId,
    });
    if (!result.duplicatedPageId) {
      recordRolloutTelemetry({ action: 'duplicate', outcome: 'failure', operation: 'page', reason: 'We could not duplicate that page yet' });
      notify('We could not duplicate that page yet');
      return;
    }
    commitWithCheckpoint('Before duplicating page', result.pages, result.sectionBlocks);
    setSelectedPageId(result.duplicatedPageId);
    setSelectedId(result.duplicatedSectionIds[0] ?? '');
    setLastSelectedId(result.duplicatedSectionIds[0] ?? '');
    setMultiSelectedIds(result.duplicatedSectionIds.slice(1));
    recordRolloutTelemetry({ action: 'duplicate', outcome: 'success', operation: 'page' });
    notify('Page duplicated');
  }, [commitWithCheckpoint, notify, pages, recordRolloutTelemetry, sectionBlocks]);

  const moveSelectedSectionsToPage = useCallback((targetPageId: string) => {
    if (!activePage) return;
    const result = moveBuilderV2SectionsToPage({
      pages,
      sectionBlocks,
      sourcePageId: activePage.id,
      targetPageId,
      selectedIds,
    });
    if (!result.movedSectionIds.length) {
      notify('Pick sections from the current page before you move them');
      return;
    }
    commitWithCheckpoint('Before moving selected sections', result.pages, result.sectionBlocks);
    setSelectedPageId(targetPageId);
    setSelectedId(result.movedSectionIds[0] ?? '');
    setLastSelectedId(result.movedSectionIds[0] ?? '');
    setMultiSelectedIds(result.movedSectionIds.slice(1));
    notify(
      result.movedSectionIds.length === 1
        ? 'Moved section to another page'
        : `Moved ${result.movedSectionIds.length} sections to another page`,
    );
  }, [activePage, commitWithCheckpoint, notify, pages, sectionBlocks, selectedIds]);

  const restoreSelectedSectionsToStarterBlocks = useCallback(() => {
    const result = restoreBuilderV2SectionStarterBlocks({
      sections,
      sectionBlocks,
      selectedIds,
      availableBlockTypesBySection: SECTION_BLOCK_CATALOG,
      buildStarterBlocks,
    });

    if (!result.restoredSectionIds.length) {
      notify('No starter reset is available for this selection yet');
      return;
    }

    commitWithCheckpoint(
      result.restoredSectionIds.length === 1 ? 'Before restoring starter blocks' : 'Before restoring starter blocks in batch',
      pages,
      result.sectionBlocks,
    );
    notify(
      result.restoredSectionIds.length === 1
        ? `Restored ${result.restoredBlockCount} starter block${result.restoredBlockCount === 1 ? '' : 's'}`
        : `Restored starter blocks across ${result.restoredSectionIds.length} sections`,
    );
  }, [buildStarterBlocks, commitWithCheckpoint, notify, pages, sectionBlocks, sections, selectedIds]);

  const renameSelected = (title: string) => {
    commitActivePageSections(sections.map((s) => (s.id === selected.id ? { ...s, title } : s)));
  };

  const updateVariant = useCallback((variant: string) => {
    commitActivePageSections(sections.map((s) => (s.id === selected.id ? { ...s, variant } : s)));
  }, [commitActivePageSections, sections, selected.id]);

  const runCommand = (label: string, action: () => void) => {
    action();
    setRecentCommands((prev) => [label, ...prev.filter((x) => x !== label)].slice(0, 6));
  };

  const getBlockValidationWarning = useCallback((
    sectionType: string,
    block: AddedBlock,
    blocks: AddedBlock[],
  ) => getBuilderV2BlockValidationWarning({
    sectionType,
    block: {
      ...block,
      data: normalizeBlockData(block),
    },
    blocks: blocks.map((candidate) => ({
      ...candidate,
      data: normalizeBlockData(candidate),
    })),
  }), []);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const orderedVisible = useMemo(() => sections.filter((s) => s.enabled), [sections]);
  const documentPages = useMemo<BuilderV2ReviewPageSnapshot[]>(
    () => pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      hidden: page.hidden,
      isHome: page.isHome,
      sections: page.sections.map((section) => ({
        id: section.id,
        title: section.title,
        type: section.type,
        enabled: section.enabled,
        blockCount: (sectionBlocks[section.id] ?? []).length,
        warningCount: (sectionBlocks[section.id] ?? []).filter((block) => getBlockValidationWarning(section.type, block, sectionBlocks[section.id] ?? [])).length,
        reviewSignature: buildBuilderV2SectionReviewSignature({
          section,
          blocks: (sectionBlocks[section.id] ?? []).map((block) => ({
            type: block.type,
            content: block.content,
            data: normalizeBlockData(block),
          })),
        }),
      })),
    })),
    [getBlockValidationWarning, pages, sectionBlocks],
  );
  const filteredAddables = useMemo(() => ADDABLE_SECTIONS.filter((name) => name.toLowerCase().includes(addQuery.trim().toLowerCase())), [addQuery]);
  const selectionGuidance = useMemo(
    () => buildBuilderV2SelectionGuidance({ selectedSections }),
    [selectedSections],
  );
  const sectionLifecycleSummary = useMemo(
    () => buildBuilderV2SectionLifecycleSummary({ sections, selectedSections }),
    [sections, selectedSections],
  );
  const structureGuidance = useMemo(
    () => buildBuilderV2StructureGuidance({
      sections: activePage.sections,
      selectedSectionId: selected.id,
      addQuery,
      filteredAddableCount: filteredAddables.length,
      previewDevice,
      previewScale,
      showMinimap,
    }),
    [activePage.sections, selected.id, addQuery, filteredAddables.length, previewDevice, previewScale, showMinimap],
  );

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
  const templateApplyPlan = useMemo(
    () => buildBuilderV2TemplateApplyPlan(selectedTemplateSeedId, pages, sectionBlocks),
    [pages, sectionBlocks, selectedTemplateSeedId],
  );
  const selectedBlocks = useMemo(() => sectionBlocks[selected.id] ?? [], [sectionBlocks, selected.id]);
  const repairSelectedSectionStructure = useCallback(() => {
    if (!canRepairBuilderV2SectionStructure(selected.type)) {
      notify('No safe automatic structure repair is available for this section yet');
      return;
    }

    const result = repairBuilderV2SectionStructure(selected.type, selectedBlocks);
    if (!result.changedCount) {
      notify(result.summary);
      return;
    }

    commitWithCheckpoint('Before repairing section structure', pages, {
      ...sectionBlocks,
      [selected.id]: result.blocks as AddedBlock[],
    });
    notify(result.summary);
  }, [commitWithCheckpoint, notify, pages, sectionBlocks, selected.id, selected.type, selectedBlocks]);
  const selectedBlockWarningFor = useCallback(
    (block: AddedBlock) => getBlockValidationWarning(selected.type, block, selectedBlocks),
    [getBlockValidationWarning, selected.type, selectedBlocks],
  );

  const selectedBlockWarnings = useMemo(
    () => selectedBlocks.filter((block) => selectedBlockWarningFor(block)).length,
    [selectedBlockWarningFor, selectedBlocks],
  );
  const handoffGuidance = useMemo(
    () => buildBuilderV2HandoffGuidance({
      pages: documentPages,
      previewDevice,
    }),
    [documentPages, previewDevice],
  );
  const documentAudit = useMemo(
    () => buildBuilderV2DocumentAudit({
      pages: documentPages,
      previewDevice,
    }),
    [documentPages, previewDevice],
  );
  const previewReviewed = useMemo<Record<'desktop' | 'mobile', BuilderV2LaunchGatePreviewCoverage>>(() => {
    return {
      desktop: buildBuilderV2PreviewCoverage({
        pages: documentPages,
        reviewedPages: previewReviewedSnapshots.desktop,
        activePageId: activePage.id,
      }),
      mobile: buildBuilderV2PreviewCoverage({
        pages: documentPages,
        reviewedPages: previewReviewedSnapshots.mobile,
        activePageId: activePage.id,
      }),
    };
  }, [activePage.id, documentPages, previewReviewedSnapshots]);
  const launchGate = useMemo(
    () => buildBuilderV2LaunchGate({
      pages: documentPages,
      audit: documentAudit,
      previewDevice,
      activePageId: activePage.id,
      previewReviewed,
    }),
    [activePage.id, documentAudit, documentPages, previewDevice, previewReviewed],
  );
  const handoffPacket = useMemo(
    () => buildBuilderV2HandoffPacket({
      pages: documentPages,
    }),
    [documentPages],
  );
  const downloadExportGate = useMemo(
    () => buildBuilderV2ExportGate({ launchGate, intent: 'download' }),
    [launchGate],
  );
  const copyExportGate = useMemo(
    () => buildBuilderV2ExportGate({ launchGate, intent: 'copy' }),
    [launchGate],
  );
  const currentDocumentSnapshot = useMemo(
    () => documentPages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        warningCount: section.warningCount,
      })),
    })),
    [documentPages],
  );
  const selectedSectionLimit = useMemo(() => getSectionLimitConfig(selected.type), [selected.type]);
  const selectedSectionSettingFields = useMemo(
    () => buildBuilderV2SectionSettingFields(selected.type, selectedBlocks),
    [selected.type, selectedBlocks],
  );
  const selectedSectionCanRepairStructure = useMemo(
    () => canRepairBuilderV2SectionStructure(selected.type),
    [selected.type],
  );
  const recommendedBlockTypesForSelected = useMemo(
    () => getRecommendedBlockTypes(selected.type, addableBlocksForSelected),
    [selected.type, addableBlocksForSelected],
  );
  const sectionEditingGuidance = useMemo(
    () => buildBuilderV2SectionEditingGuidance({
      section: selected,
      blocks: selectedBlocks,
      warningCount: selectedBlockWarnings,
      availableBlockTypes: addableBlocksForSelected,
      recommendedBlockTypes: recommendedBlockTypesForSelected,
      limitTotal: selectedSectionLimit.total,
    }),
    [selected, selectedBlocks, selectedBlockWarnings, addableBlocksForSelected, recommendedBlockTypesForSelected, selectedSectionLimit.total],
  );
  const addBlockAvailability = useMemo(
    () => Object.fromEntries(
      addableBlocksForSelected.map((type) => [type, canAddBlockToSection(selected.id, selected.type, type)]),
    ) as Record<string, { ok: boolean; reason: string }>,
    [addableBlocksForSelected, canAddBlockToSection, selected.id, selected.type],
  );
  const addBlockLibrary = useMemo(
    () => buildBuilderV2AddBlockLibrary({
      query: addBlockQuery,
      availableBlockTypes: addableBlocksForSelected,
      currentBlockTypes: selectedBlocks.map((block) => block.type),
      recommendedBlockTypes: recommendedBlockTypesForSelected,
      labels: BLOCK_LABELS,
      descriptions: Object.fromEntries(
        Object.entries(BLOCK_META).map(([type, meta]) => [type, meta.desc]),
      ) as Record<string, string>,
      availability: addBlockAvailability,
    }),
    [addBlockQuery, addableBlocksForSelected, selectedBlocks, recommendedBlockTypesForSelected, addBlockAvailability],
  );
  const blockReviewSummary = useMemo(
    () => buildBuilderV2BlockReviewSummary({
      blocks: selectedBlocks,
      query: blockReviewQuery,
      statusFilter: blockReviewFilter,
      blockLabels: BLOCK_LABELS,
      getWarning: selectedBlockWarningFor,
    }),
    [selectedBlocks, blockReviewQuery, blockReviewFilter, selectedBlockWarningFor],
  );
  const blockPackSummary = useMemo(
    () => buildBuilderV2BlockPackSummary({
      sectionTitle: selected.title,
      sectionType: selected.type,
      currentBlocks: selectedBlocks,
      availableBlockTypes: addableBlocksForSelected,
      labels: BLOCK_LABELS,
      availability: addBlockAvailability,
    }),
    [addBlockAvailability, addableBlocksForSelected, selected.title, selected.type, selectedBlocks],
  );
  const addRecommendedBlockPack = useCallback(() => {
    const packBlocks = buildBuilderV2BlockPack({
      sectionId: selected.id,
      sectionType: selected.type,
      currentBlocks: selectedBlocks,
      availableBlockTypes: addableBlocksForSelected,
      labels: BLOCK_LABELS,
      availability: addBlockAvailability,
      createDefaultData: (packSectionType, type) => makeDefaultBlockContent(packSectionType, type as BlockType),
    }).map((block) => ({
      ...block,
      id: `${selected.id}-${block.type}-${Math.random().toString(36).slice(2, 6)}`,
      type: block.type as BlockType,
      content: BLOCK_LABELS[block.type as BlockType] ?? block.content,
      data: block.data as AddedBlockContent,
    }));

    if (!packBlocks.length) {
      recordRolloutTelemetry({
        action: 'add',
        outcome: 'failure',
        operation: 'recommended-pack',
        reason: 'No recommended pack is available for this section right now',
      });
      notify('No recommended pack is available for this section right now');
      return;
    }

    commit(pages, {
      ...sectionBlocks,
      [selected.id]: [...(sectionBlocks[selected.id] ?? []), ...packBlocks],
    });
    setShowAddBlockPicker(false);
    recordRolloutTelemetry({ action: 'add', outcome: 'success', operation: 'recommended-pack' });
    notify(`Added ${packBlocks.length} recommended block${packBlocks.length === 1 ? '' : 's'}`);
  }, [addBlockAvailability, addableBlocksForSelected, commit, notify, pages, recordRolloutTelemetry, sectionBlocks, selected.id, selected.type, selectedBlocks]);


  const buildExportDocument = useCallback(() => {
    return buildBuilderV2ExportDocument(pages, sectionBlocks);
  }, [pages, sectionBlocks]);

  const downloadV2Json = useCallback(() => {
    const withBlocks = buildExportDocument();
    const blob = new Blob([JSON.stringify(withBlocks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `builder-v2-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordRolloutTelemetry({ action: 'export', outcome: 'success', operation: 'download-json' });
    notify('Exported V2 JSON');
  }, [buildExportDocument, notify, recordRolloutTelemetry]);

  const copyV2Json = useCallback(async () => {
    const payload = JSON.stringify(buildExportDocument(), null, 2);
    if (!navigator.clipboard?.writeText) {
      recordRolloutTelemetry({ action: 'export', outcome: 'failure', operation: 'copy-json', reason: 'Clipboard is unavailable in this browser context' });
      notify('Clipboard is unavailable in this browser context');
      return;
    }
    await navigator.clipboard.writeText(payload);
    recordRolloutTelemetry({ action: 'export', outcome: 'success', operation: 'copy-json' });
    notify('Copied V2 JSON');
  }, [buildExportDocument, notify, recordRolloutTelemetry]);

  const copyHandoffPacket = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      notify('Clipboard is unavailable in this browser context');
      return;
    }
    await navigator.clipboard.writeText(handoffPacket.summaryText);
    notify('Copied handoff packet');
  }, [handoffPacket.summaryText, notify]);

  const openImportPanel = useCallback(() => {
    setImportError('');
    setLastImportSource('Pasted JSON');
    setShowImportPanel(true);
  }, []);

  const openExportPanel = useCallback(() => {
    setShowExportPanel(true);
  }, []);

  const markPreviewReviewed = useCallback((device: 'desktop' | 'mobile') => {
    const activeReviewPage = documentPages.find((page) => page.id === activePage.id) ?? null;
    if (!activeReviewPage) {
      notify('Preview review state is not ready yet');
      return;
    }

    setPreviewReviewedSnapshots((prev) => ({
      ...prev,
      [device]: {
        ...prev[device],
        [activePage.id]: buildBuilderV2PreviewReviewKey(activeReviewPage),
      },
    }));
    notify(`Marked ${activePage.title} checked on ${device}`);
  }, [activePage.id, activePage.title, documentPages, notify]);

  const runHandoffAction = useCallback(() => {
    switch (handoffGuidance.primaryAction) {
      case 'review-hidden':
      case 'review-empty':
      case 'review-warning':
        if (handoffGuidance.focusSectionId) {
          focusSectionById(handoffGuidance.focusSectionId, true);
          setShowStructure(handoffGuidance.primaryAction === 'review-hidden');
          setShowProperties(true);
          setPropertyTab('content');
        }
        break;
      case 'review-mobile':
        setPreviewDevice('mobile');
        setFocusPreview(true);
        setShowMinimap(true);
        if (handoffGuidance.focusSectionId) {
          focusSectionById(handoffGuidance.focusSectionId, false);
          scrollToPreviewSection(handoffGuidance.focusSectionId);
        }
        break;
      case 'ready-to-export':
        setShowExportPanel(true);
        break;
    }
  }, [focusSectionById, handoffGuidance, scrollToPreviewSection]);

  const reviewDocumentAuditIssue = useCallback((issue: BuilderV2DocumentAuditIssue) => {
    if (issue.actionLabel === 'Review on mobile') {
      setPreviewDevice('mobile');
      setFocusPreview(true);
      setShowMinimap(true);
      focusSectionById(issue.sectionId, false);
      scrollToPreviewSection(issue.sectionId);
      return;
    }

    focusSectionById(issue.sectionId, true);
    setFocusPreview(false);
    setShowStructure(issue.actionLabel === 'Review hidden lane' || issue.actionLabel === 'Review hidden page');
    setShowProperties(true);
    setPropertyTab('content');
  }, [focusSectionById, scrollToPreviewSection]);

  const runLaunchGateAction = useCallback(() => {
    switch (launchGate.primaryAction.kind) {
      case 'review-audit-issue':
        reviewDocumentAuditIssue(launchGate.primaryAction.issue);
        break;
      case 'review-preview-page':
        selectPage(launchGate.primaryAction.pageId, true);
        setPreviewDevice(launchGate.primaryAction.device);
        setFocusPreview(true);
        setShowMinimap(launchGate.primaryAction.device === 'mobile');
        break;
      case 'switch-preview-device':
        setPreviewDevice(launchGate.primaryAction.device);
        setFocusPreview(true);
        setShowMinimap(launchGate.primaryAction.device === 'mobile');
        break;
      case 'mark-preview-reviewed':
        markPreviewReviewed(launchGate.primaryAction.device);
        break;
      case 'open-export':
        setShowExportPanel(true);
        break;
    }
  }, [launchGate.primaryAction, markPreviewReviewed, reviewDocumentAuditIssue, selectPage]);
  const launchGateExportTone = launchGate.status === 'ready'
    ? 'border-emerald-200 bg-emerald-50/60'
    : launchGate.status === 'review'
      ? 'border-sky-200 bg-sky-50/60'
      : 'border-amber-200 bg-amber-50/60';
  const runDownloadV2Json = useCallback(() => {
    if (downloadExportGate.ready) {
      downloadV2Json();
      return;
    }

    runLaunchGateAction();
  }, [downloadExportGate.ready, downloadV2Json, runLaunchGateAction]);
  const runCopyV2Json = useCallback(() => {
    if (copyExportGate.ready) {
      void copyV2Json();
      return;
    }

    runLaunchGateAction();
  }, [copyExportGate.ready, copyV2Json, runLaunchGateAction]);
  const runLaunchGateChecklistAction = useCallback((action: BuilderV2LaunchGateAction) => {
    switch (action.kind) {
      case 'review-audit-issue':
        reviewDocumentAuditIssue(action.issue);
        break;
      case 'review-preview-page':
        selectPage(action.pageId, true);
        setPreviewDevice(action.device);
        setFocusPreview(true);
        setShowMinimap(action.device === 'mobile');
        break;
      case 'switch-preview-device':
        setPreviewDevice(action.device);
        setFocusPreview(true);
        setShowMinimap(action.device === 'mobile');
        break;
      case 'mark-preview-reviewed':
        markPreviewReviewed(action.device);
        break;
      case 'open-export':
        setShowExportPanel(true);
        break;
    }
  }, [markPreviewReviewed, reviewDocumentAuditIssue, selectPage]);

  const applyImportedDocument = useCallback((
    doc: BuilderV2Document,
    report: BuilderV2ImportReport,
    sourceLabel: string,
    options?: { upgradeHydratedWeddingData?: boolean },
  ) => {
    const nextPages = getLabPagesFromBuilderV2Document(doc);
    const sourceSections = (doc.pages ?? []).flatMap((page) => page.sections);
    const nextBlocks = Object.fromEntries(
      sourceSections.map((sec) => [
        sec.id,
        (sec.blocks || []).map((b) => ({
          id: b.id,
          type: b.type as BlockType,
          data: b.data || {},
          content: b.data?.text || b.data?.title || b.data?.note || b.data?.question || '',
        })),
      ]),
    ) as Record<string, AddedBlock[]>;

    const nextState = pushBuilderV2ChangeWithCheckpoint({
      history,
      historyIndex,
      currentPages: pages,
      currentSectionBlocks: sectionBlocks,
      checkpointLabel: `Before import: ${sourceLabel}`,
      nextPages,
      nextSectionBlocks: nextBlocks,
    });
    setHistory(nextState.history);
    setHistoryIndex(nextState.historyIndex);
    setSelectedCheckpointId(nextState.checkpointId);
    setSelectedPageId(nextPages[0]?.id ?? '');
    setSelectedId(nextPages[0]?.sections[0]?.id ?? '');
    setLastSelectedId(nextPages[0]?.sections[0]?.id ?? '');
    setMultiSelectedIds([]);
    setSelectedCheckpointId('');
    setCollapsedBlocks({});
    setLastImportReport(report);
    setLastImportSource(sourceLabel);
    setUpgradeIntakeState(
      options?.upgradeHydratedWeddingData !== undefined
        ? {
            sourceName: sourceLabel,
            report,
            hydratedWeddingData: options.upgradeHydratedWeddingData,
          }
        : null,
    );
    setShowImportPanel(false);
    setImportError('');
    setImportDraft('');
    markSaving();

    const repairs = summarizeImportRepairCount(report);
    const importSummary = buildBuilderV2ImportReviewSummary(report, sourceLabel);
    recordRolloutTelemetry({
      action: 'import',
      outcome: 'success',
      operation: report.sourceKind === 'builder-v2' ? 'builder-v2-layout' : 'legacy-layout',
    });
    notify(repairs > 0 || report.sourceKind !== 'builder-v2' ? importSummary.toastMessage : 'Imported clean V2 layout');
  }, [history, historyIndex, markSaving, notify, pages, recordRolloutTelemetry, sectionBlocks]);

  useEffect(() => {
    consumeBuilderV2SetupBridge();
  }, []);

  useEffect(() => {
    const upgradeBridge = consumeBuilderV2UpgradeBridge();
    if (!upgradeBridge) return;
    setSetupSeedState(null);

    if (upgradeBridge.weddingData) {
      setPreviewFields((prev) => buildBuilderV2LabPreviewFieldsFromWeddingData(upgradeBridge.weddingData as WeddingDataV1, prev));
    }

    const prepared = prepareImportedBuilderV2Document(upgradeBridge.project);
    if (!prepared.ok) {
      setImportDraft(JSON.stringify(upgradeBridge.project, null, 2));
      setImportError(prepared.error);
      setLastImportSource(upgradeBridge.sourceName);
      setShowImportPanel(true);
      recordRolloutTelemetry({ action: 'import', outcome: 'failure', operation: 'legacy-layout', reason: prepared.error });
      notify('Could not open that Builder draft in V2 yet. Review the import details and try again.');
      return;
    }

    applyImportedDocument(prepared.doc, prepared.report, upgradeBridge.sourceName, {
      upgradeHydratedWeddingData: Boolean(upgradeBridge.weddingData),
    });
  }, [applyImportedDocument, notify, recordRolloutTelemetry]);
  const upgradeIntake = useMemo(
    () => (
      upgradeIntakeState
        ? buildBuilderV2UpgradeIntake(upgradeIntakeState.sourceName, upgradeIntakeState.report, {
            hydratedWeddingData: upgradeIntakeState.hydratedWeddingData,
          })
        : null
    ),
    [upgradeIntakeState],
  );
  const setupIntake = useMemo(
    () => (setupSeedState ? buildBuilderV2SetupIntake(setupSeedState) : null),
    [setupSeedState],
  );

  const importV2Json = () => {
    if (!importDraft.trim()) {
      recordRolloutTelemetry({ action: 'import', outcome: 'failure', operation: 'builder-v2-layout', reason: 'Paste Builder V2 JSON or upload a file first.' });
      setImportError('Paste Builder V2 JSON or upload a file first.');
      return;
    }

    if (preparedImportPreview.state !== 'ready') {
      const reason = preparedImportPreview.state === 'invalid'
        ? preparedImportPreview.error
        : 'Paste Builder V2 JSON or upload a file first.';
      recordRolloutTelemetry({ action: 'import', outcome: 'failure', operation: 'builder-v2-layout', reason });
      setImportError(reason);
      return;
    }

    applyImportedDocument(
      preparedImportPreview.prepared.doc,
      preparedImportPreview.prepared.report,
      lastImportSource,
    );
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      setImportDraft(text);
      setImportError('');
      setLastImportSource(file.name);
    } catch {
      recordRolloutTelemetry({ action: 'import', outcome: 'failure', operation: 'upload-json', reason: 'We could not read that file yet. Try another JSON export.' });
      setImportError('We could not read that file yet. Try another JSON export.');
    }
  };

  const rolloutTelemetrySummary = useMemo(
    () => summarizeBuilderV2RolloutTelemetry(rolloutTelemetry),
    [rolloutTelemetry],
  );
  const latestRolloutFailures = useMemo(
    () => rolloutTelemetry.entries.filter((entry) => entry.outcome === 'failure').slice(-3).reverse(),
    [rolloutTelemetry.entries],
  );

  const previewInstances: SectionInstance[] = useMemo(() => (
    buildBuilderV2PreviewInstances({
      pages,
      activePageId: activePage.id,
      sectionBlocks,
    }).map((instance) => (
      instance.type === 'rsvp'
        ? {
            ...instance,
            settings: {
              ...instance.settings,
              title: previewFields.rsvpTitle || instance.settings.title,
            },
          }
        : instance
    ))
  ), [activePage.id, pages, previewFields.rsvpTitle, sectionBlocks]);

  const commandItems = useMemo(() => {
    const latestCheckpoint = checkpointSummaries[0];
    const base = [
      { id: 'page-add', group: 'Pages', label: 'Add page', keywords: ['page', 'new', 'navigation'], action: () => runCommand('Add page', addPage) },
      ...pages.map((page) => ({ id: `page-${page.id}`, group: 'Pages', label: `Open page: ${page.title}`, keywords: ['page', 'open', page.title.toLowerCase(), page.slug.toLowerCase()], action: () => runCommand(`Open page: ${page.title}`, () => selectPage(page.id)) })),
      ...pages.map((page) => ({ id: `page-duplicate-${page.id}`, group: 'Pages', label: `Duplicate page: ${page.title}`, keywords: ['page', 'duplicate', 'copy', page.title.toLowerCase()], action: () => runCommand(`Duplicate page: ${page.title}`, () => duplicatePage(page.id)) })),
      ...pages
        .filter((page) => page.id !== activePage.id)
        .map((page) => ({ id: `page-move-selection-${page.id}`, group: 'Pages', label: `Move selection to page: ${page.title}`, keywords: ['page', 'move', 'selection', page.title.toLowerCase()], action: () => runCommand(`Move selection to page: ${page.title}`, () => moveSelectedSectionsToPage(page.id)) })),
      ...ADDABLE_SECTIONS.map((name) => ({ id: `add-${name}`, group: 'Add', label: `Add section: ${name}`, keywords: ['insert', 'new', name.toLowerCase()], action: () => runCommand(`Add section: ${name}`, () => addSection(name)) })),
      ...sections.map((s) => ({ id: `select-${s.id}`, group: 'Select', label: `Select section: ${s.title}`, keywords: ['focus', 'go to', s.title.toLowerCase()], action: () => runCommand(`Select section: ${s.title}`, () => selectSection(s.id)) })),
      ...['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'cards', 'grid', 'fundHighlight', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful'].map((v) => ({ id: `variant-${v}`, group: 'Variant', label: `Set variant: ${v}`, keywords: ['layout', 'style', v.toLowerCase()], action: () => runCommand(`Set variant: ${v}`, () => updateVariant(v)) })),
      { id: 'sel-clear', group: 'Selection', label: 'Clear multi selection', keywords: ['clear', 'multi', 'selection'], action: () => runCommand('Clear multi selection', clearSelection) },
      { id: 'sel-all', group: 'Selection', label: 'Select all sections', keywords: ['all', 'selection'], action: () => runCommand('Select all sections', selectAllSections) },
      { id: 'sel-invert', group: 'Selection', label: 'Invert selection', keywords: ['invert', 'selection'], action: () => runCommand('Invert selection', invertSelection) },
      { id: 'sel-hide', group: 'Selection', label: 'Hide selected sections', keywords: ['hide', 'selection', 'batch', 'visibility'], action: () => runCommand('Hide selected sections', hideSelectedSections) },
      { id: 'sel-show', group: 'Selection', label: 'Show selected sections', keywords: ['show', 'selection', 'batch', 'visibility'], action: () => runCommand('Show selected sections', showSelectedSections) },
      { id: 'sel-duplicate', group: 'Selection', label: 'Duplicate selected sections', keywords: ['duplicate', 'copy', 'selection', 'batch', 'reuse'], action: () => runCommand('Duplicate selected sections', duplicateSelectedSections) },
      { id: 'sel-remove', group: 'Selection', label: 'Remove selected sections', keywords: ['remove', 'delete', 'selection', 'batch', 'retire'], action: () => runCommand('Remove selected sections', removeSelectedSections) },
      { id: 'sel-restore-starters', group: 'Selection', label: 'Restore starter blocks for selected sections', keywords: ['restore', 'starter', 'reset', 'selection', 'batch', 'repair'], action: () => runCommand('Restore starter blocks for selected sections', restoreSelectedSectionsToStarterBlocks) },
      ...(selectedSectionCanRepairStructure ? [{ id: 'sel-repair-structure', group: 'Selection', label: 'Repair selected section structure', keywords: ['repair', 'structure', 'metadata', 'menu', 'music', 'video', 'wedding party'], action: () => runCommand('Repair selected section structure', repairSelectedSectionStructure) }] : []),
      { id: 'sel-compact', group: 'Selection', label: 'Set selected density: compact', keywords: ['compact', 'density', 'selection', 'batch'], action: () => runCommand('Set selected density: compact', () => setSelectedDensity('compact')) },
      { id: 'sel-comfortable', group: 'Selection', label: 'Set selected density: comfortable', keywords: ['comfortable', 'density', 'selection', 'batch', 'open'], action: () => runCommand('Set selected density: comfortable', () => setSelectedDensity('comfortable')) },
      { id: 'sel-review', group: 'Selection', label: 'Review selected sections in preview', keywords: ['preview', 'selection', 'review', 'batch'], action: () => runCommand('Review selected sections in preview', reviewSelectionInPreview) },
      { id: 'block-pack', group: 'Blocks', label: 'Add recommended block pack', keywords: ['block', 'pack', 'recommended', 'signature', 'section'], action: () => runCommand('Add recommended block pack', addRecommendedBlockPack) },
      { id: 'history-save-checkpoint', group: 'History', label: 'Save restore checkpoint', keywords: ['history', 'checkpoint', 'restore point', 'save'], action: () => runCommand('Save restore checkpoint', saveCheckpoint) },
      ...(latestCheckpoint ? [{
        id: 'history-restore-latest',
        group: 'History',
        label: `Restore checkpoint: ${latestCheckpoint.label}`,
        keywords: ['history', 'checkpoint', 'restore', 'latest'],
        action: () => runCommand(`Restore checkpoint: ${latestCheckpoint.label}`, () => restoreCheckpoint(latestCheckpoint.id)),
      }] : []),
      { id: 'template-apply', group: 'Structure', label: templateApplyPlan.applyLabel, keywords: ['template', 'starter', 'reset', 'replace', 'structure'], action: () => runCommand(templateApplyPlan.applyLabel, applySelectedTemplateSeed) },
      { id: 'export-open', group: 'Handoff', label: 'Open export handoff', keywords: ['export', 'handoff', 'json', 'share'], action: () => runCommand('Open export handoff', openExportPanel) },
      { id: 'launch-review', group: 'Launch', label: launchGate.primaryAction.label, keywords: ['launch', 'preview', 'review', 'gate', 'publish'], action: () => runCommand(launchGate.primaryAction.label, runLaunchGateAction) },
      { id: 'export-download', group: 'Handoff', label: downloadExportGate.ctaLabel, keywords: ['export', 'download', 'json', 'handoff', 'launch'], action: () => runCommand(downloadExportGate.ctaLabel, runDownloadV2Json) },
      { id: 'export-copy', group: 'Handoff', label: copyExportGate.ctaLabel, keywords: ['copy', 'json', 'handoff', 'clipboard', 'launch'], action: () => runCommand(copyExportGate.ctaLabel, runCopyV2Json) },
      { id: 'handoff-copy-packet', group: 'Handoff', label: 'Copy handoff packet', keywords: ['copy', 'handoff', 'packet', 'summary', 'clipboard'], action: () => runCommand('Copy handoff packet', () => { void copyHandoffPacket(); }) },
      { id: 'import-open', group: 'Handoff', label: 'Open import layout', keywords: ['import', 'json', 'recover', 'handoff'], action: () => runCommand('Open import layout', openImportPanel) },
      { id: 'handoff-fix', group: 'Handoff', label: handoffGuidance.primaryActionLabel, keywords: ['fix', 'next', 'handoff', 'review', 'document'], action: () => runCommand(handoffGuidance.primaryActionLabel, runHandoffAction) },
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
  }, [addPage, addRecommendedBlockPack, addSection, activePage.id, applySelectedTemplateSeed, checkpointSummaries, clearSelection, commandQuery, copyExportGate.ctaLabel, copyHandoffPacket, downloadExportGate.ctaLabel, duplicatePage, duplicateSelectedSections, handoffGuidance.primaryActionLabel, hideSelectedSections, invertSelection, launchGate.primaryAction.label, moveSelectedSectionsToPage, openExportPanel, openImportPanel, pages, removeSelectedSections, repairSelectedSectionStructure, restoreCheckpoint, restoreSelectedSectionsToStarterBlocks, reviewSelectionInPreview, runCopyV2Json, runDownloadV2Json, runHandoffAction, runLaunchGateAction, saveCheckpoint, sections, selectAllSections, selectPage, selectSection, selectedSectionCanRepairStructure, setSelectedDensity, showSelectedSections, templateApplyPlan.applyLabel, updateVariant]);
  const importGuidance = useMemo(
    () => buildBuilderV2ImportGuidance(lastImportReport, lastImportSource),
    [lastImportReport, lastImportSource],
  );
  const lastImportSummary = useMemo(
    () => (lastImportReport ? buildBuilderV2ImportReviewSummary(lastImportReport, lastImportSource) : null),
    [lastImportReport, lastImportSource],
  );
  const preparedImportPreview = useMemo(() => {
    const preview = resolveBuilderV2ImportDraftPreview(importDraft);
    if (preview.state !== 'ready') {
      return preview;
    }

    const incomingPages = (preview.prepared.doc.pages ?? []).map((page, index) => ({
      id: page.id || `page-${index + 1}`,
      title: page.title || (page.isHome ? 'Home' : `Page ${index + 1}`),
      slug: page.slug || (page.isHome ? 'home' : `page-${index + 1}`),
      hidden: page.hidden === true,
      isHome: page.isHome,
      sections: page.sections.map((section) => ({
        id: section.id,
        title: section.title || section.type,
        type: section.type,
        enabled: section.enabled !== false,
        blockCount: section.blocks.length,
        warningCount: 0,
      })),
    }));

    return {
      state: 'ready' as const,
      prepared: preview.prepared,
      comparison: buildBuilderV2ImportComparison({
        currentPages: currentDocumentSnapshot,
        incomingPages,
      }),
    };
  }, [currentDocumentSnapshot, importDraft]);

  useEffect(() => {
    const routeIntent = resolveBuilderV2RouteIntent(location.search, location.hash);
    if (!routeIntent.shouldOpenExportHandoff) return;

    setShowExportPanel(true);
    navigate(`${location.pathname}${routeIntent.normalizedSearch}${routeIntent.normalizedHash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const routeIntent = resolveBuilderV2RouteIntent(location.search, location.hash);
    if (!routeIntent.shouldFocusLaunchGate) return;
    launchGateRef.current?.scrollIntoView?.({ block: 'start' });
  }, [location.hash, location.search]);

  const commandPaletteGuidance = useMemo(
    () => buildBuilderV2CommandPaletteGuidance(commandQuery, commandItems, recentCommands, pinnedCommands),
    [commandItems, commandQuery, pinnedCommands, recentCommands],
  );





  useEffect(() => {
    if (!pages.length) return;
    if (!pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);
  useEffect(() => {
    if (!sections.length) return;
    if (!sections.some((x) => x.id === selectedId)) {
      setSelectedId(sections[0].id);
      setLastSelectedId(sections[0].id);
      setMultiSelectedIds([]);
    }
  }, [sections, selectedId]);
  useEffect(() => {
    setAddBlockQuery('');
  }, [selected.id, showAddBlockPicker]);
  useEffect(() => {
    setBlockReviewQuery('');
    setBlockReviewFilter('all');
  }, [selected.id]);
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
        if (idx < sections.length - 1) selectSection(sections[idx + 1].id);
      }
      if (e.key === 'ArrowUp' && isMeta) {
        e.preventDefault();
        const idx = sections.findIndex((s) => s.id === selected.id);
        if (idx > 0) selectSection(sections[idx - 1].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canRedo, canUndo, sections, selected.id, showCommand, commandItems, commandIndex, clearSelection, invertSelection, selectAllSections, selectSection]);

  return (
    <div className="h-screen bg-[#f6f6f6] text-text-primary overflow-hidden">
      <div className="w-full px-0 py-0 h-full flex flex-col gap-0 [--topbar-h:46px] [--rail-head-h:50px] [--page-row-h:52px]">
        <div className="h-[var(--topbar-h)] px-2 md:px-3 border-b border-border-subtle bg-white flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase updates-[0.2em] text-primary font-semibold">Site editor</p>
            <h1 className="text-lg md:text-xl font-semibold mt-0.5">Structured editing with live preview</h1>
            <p className="text-text-secondary mt-0.5 text-xs max-w-2xl">Shape your website quickly, keep the structure clean, and see changes as you go.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full ${saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {saveState === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              {saveState === 'saved' ? `All changes saved${lastSavedAt ? ` · ${lastSavedAt}` : ''}` : 'Saving...'}
            </span>
            <Link to={getBuilderGuideRoute()} className="text-sm border border-border-subtle rounded-sm px-2 py-1 hover:border-primary/40 inline-flex items-center gap-1">Back to editor guide <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/product" className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1">Back <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        <div className="px-2 md:px-3 py-1 border-b border-border-subtle bg-white flex items-center justify-between gap-3 text-[11px] text-text-tertiary">
          <p className="inline-flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> Edit your website by clicking directly in preview.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQuickHelp((v) => !v)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40 inline-flex items-center gap-1"><Keyboard className="w-3.5 h-3.5" /> Shortcuts</button>
            <button onClick={() => setShowCommand(true)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40 inline-flex items-center gap-1"><Command className="w-3.5 h-3.5" /> Actions</button>
            <button onClick={openExportPanel} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">Export layout</button>
            <button onClick={openImportPanel} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">Import layout</button>
            <button onClick={() => setShowStructure((v) => !v)} className="px-2 py-1.5 border rounded-sm hover:border-primary/40">{showStructure ? 'Hide' : 'Reorder or add'} sections</button>
          </div>
        </div>

        {!upgradeIntake && setupIntake && setupSeedState && (
          <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
            <div className="rounded-sm border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">Setup-to-V2 intake</span>
                    <span>{setupSeedState.sourceName}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{setupIntake.title}</p>
                  <p className="mt-1 max-w-3xl leading-relaxed">{setupIntake.detail}</p>
                  {setupSeedState.setupFacts.length > 0 && (
                    <p className="mt-2 text-[11px] leading-relaxed text-violet-900/80">
                      Seed facts: {setupSeedState.setupFacts.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {setupIntake.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-violet-200 bg-white/80 px-2 py-1">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="rounded-md border border-violet-200 bg-white/80 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-violet-900">Main focus</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{setupIntake.steps[0]?.detail}</p>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">{setupIntake.steps[1]?.detail}</p>
                </div>
                <div className="rounded-md border border-violet-200 bg-white/80 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-violet-900">Best next move</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{setupIntake.bestNextMove}</p>
                  <p className="mt-2 text-xs leading-relaxed text-text-primary">
                    <span className="font-semibold">Decision rule:</span> {setupIntake.decisionRule}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">
                    <span className="font-semibold">Watchout:</span> {setupIntake.watchout}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {setupIntake.steps.map((step) => (
                  <div key={step.label} className="rounded-md border border-violet-200 bg-white/80 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-violet-900">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {upgradeIntake && (
          <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
            <div className="rounded-sm border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">V2 upgrade intake</span>
                    <span>{upgradeIntakeState?.sourceName}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{upgradeIntake.title}</p>
                  <p className="mt-1 max-w-3xl leading-relaxed">{upgradeIntake.detail}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {upgradeIntake.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-sky-200 bg-white/80 px-2 py-1">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="rounded-md border border-sky-200 bg-white/80 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-900">Main focus</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{upgradeIntake.steps[0]?.detail}</p>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">{upgradeIntake.steps[1]?.detail}</p>
                </div>
                <div className="rounded-md border border-sky-200 bg-white/80 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-900">Best next move</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{upgradeIntake.bestNextMove}</p>
                  <p className="mt-2 text-xs leading-relaxed text-text-primary">
                    <span className="font-semibold">Decision rule:</span> {upgradeIntake.decisionRule}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">
                    <span className="font-semibold">Watchout:</span> {upgradeIntake.watchout}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {upgradeIntake.steps.map((step) => (
                  <div key={step.label} className="rounded-md border border-sky-200 bg-white/80 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-900">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
          <div className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">Template starter</span>
                  <span>{templateApplyPlan.templateName}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{templateApplyPlan.title}</p>
                <p className="mt-1 max-w-3xl leading-relaxed">{templateApplyPlan.detail}</p>
                {templateApplyPlan.templateDescription && (
                  <p className="mt-2 text-[11px] leading-relaxed text-rose-900/80">
                    {templateApplyPlan.templateDescription}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {templateApplyPlan.keyStats.map((stat) => (
                  <span key={stat} className="rounded-full border border-rose-200 bg-white/80 px-2 py-1">
                    {stat}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="rounded-md border border-rose-200 bg-white/80 px-3 py-3">
                <label className="text-[11px] uppercase tracking-[0.18em] text-rose-900" htmlFor="builder-v2-template-seed">
                  Template choice
                </label>
                <select
                  id="builder-v2-template-seed"
                  value={selectedTemplateSeedId}
                  onChange={(event) => setSelectedTemplateSeedId(event.target.value)}
                  className="mt-2 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {templateCatalog.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-rose-900">Best next move</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">{templateApplyPlan.bestNextMove}</p>
              </div>
              <div className="rounded-md border border-rose-200 bg-white/80 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-rose-900">Template change read</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">Shared lanes:</span>{' '}
                  {templateApplyPlan.sharedSectionTypes.length > 0
                    ? templateApplyPlan.sharedSectionTypes.join(' · ')
                    : 'No shared lanes yet'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">New lanes:</span>{' '}
                  {templateApplyPlan.addedSectionTypes.length > 0
                    ? templateApplyPlan.addedSectionTypes.join(' · ')
                    : 'No new lanes'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">Removed lanes:</span>{' '}
                  {templateApplyPlan.removedSectionTypes.length > 0
                    ? templateApplyPlan.removedSectionTypes.join(' · ')
                    : 'Nothing drops'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">Authored blocks at risk:</span>{' '}
                  {templateApplyPlan.droppedBlockCount > 0
                    ? `${templateApplyPlan.droppedBlockCount} after carryover across ${templateApplyPlan.authoredSectionCount} authored section${templateApplyPlan.authoredSectionCount === 1 ? '' : 's'}`
                    : 'No authored blocks yet'}
                </p>
                {templateApplyPlan.carryoverBlockCount > 0 && (
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">
                    <span className="font-semibold">Shared-lane carryover:</span>{' '}
                    {templateApplyPlan.carryoverBlockCount} block{templateApplyPlan.carryoverBlockCount === 1 ? '' : 's'} across {templateApplyPlan.carryoverSectionCount} matching lane{templateApplyPlan.carryoverSectionCount === 1 ? '' : 's'}
                  </p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">Decision rule:</span> {templateApplyPlan.decisionRule}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                  <span className="font-semibold">Watchout:</span> {templateApplyPlan.watchout}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <div className="rounded-md border border-rose-200 bg-white/80 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-rose-900">Current draft order</p>
                <div className="mt-2 space-y-1.5">
                  {templateApplyPlan.currentPageSummaries.map((summary) => (
                    <p key={`current-${summary}`} className="text-xs leading-relaxed text-text-primary">{summary}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-rose-200 bg-white/80 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-rose-900">Next starter order</p>
                <div className="mt-2 space-y-1.5">
                  {templateApplyPlan.nextPageSummaries.map((summary) => (
                    <p key={`next-${summary}`} className="text-xs leading-relaxed text-text-primary">{summary}</p>
                  ))}
                </div>
              </div>
            </div>
            {templateApplyPlan.carryoverBlockCount > 0 && (
              <div className="mt-3 rounded-md border border-rose-200 bg-white/80 px-3 py-3">
                <label className="flex items-start gap-2 text-xs text-text-primary">
                  <input
                    type="checkbox"
                    checked={preserveTemplateSharedContent}
                    onChange={(event) => setPreserveTemplateSharedContent(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">Preserve authored blocks on matching lanes.</span>{' '}
                    Carry over shared-lane content and section labels when the new starter still has a real place for it.
                  </span>
                </label>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={applySelectedTemplateSeed}
                className="rounded-sm bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {templateApplyPlan.applyLabel}
              </button>
              <p className="text-[11px] leading-relaxed text-rose-900/80">
                Saves a recovery checkpoint first, then replaces the current V2 document with this starter spine{templateApplyPlan.carryoverBlockCount > 0 && preserveTemplateSharedContent ? ' while carrying shared-lane content forward where it still fits' : ''}.
              </p>
            </div>
          </div>
        </div>

        {lastImportReport && lastImportSummary && (
          <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
            <div className={`rounded-sm border px-3 py-2 text-xs ${
              getImportSummaryTone(lastImportReport) === 'clean'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : getImportSummaryTone(lastImportReport) === 'repaired'
                  ? 'border-sky-200 bg-sky-50 text-sky-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">Last import</span>
                    <span>{lastImportSource}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{lastImportSummary.headline}</p>
                  <p className="mt-1 max-w-3xl leading-relaxed">{lastImportSummary.detail}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {lastImportSummary.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-current/20 bg-white/70 px-2 py-1">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
              {lastImportSummary.topNotes.length > 0 && (
                <>
                  <p className="mt-2 font-semibold">{lastImportSummary.notesTitle}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {lastImportSummary.topNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
          <div className={`rounded-md border px-3 py-3 ${
            handoffGuidance.tone === 'ready'
              ? 'border-emerald-200 bg-emerald-50/60'
              : handoffGuidance.tone === 'repair'
                ? 'border-amber-200 bg-amber-50/60'
                : 'border-rose-200 bg-rose-50/60'
          }`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary font-semibold">Document handoff</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{handoffGuidance.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary max-w-3xl">{handoffGuidance.detail}</p>
              </div>
              <div className="shrink-0 flex flex-wrap justify-end gap-1.5 text-[10px]">
                {handoffGuidance.keyStats.map((stat) => (
                  <span key={stat} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">{stat}</span>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              <div className="rounded-md border border-border-subtle bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Main focus</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{handoffGuidance.mainFocus}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{handoffGuidance.bestNextMove}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.watchout}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {handoffGuidance.steps.map((step) => (
                    <div key={step.label} className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-border-subtle bg-white px-3 py-3">
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Handoff packet</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{handoffPacket.headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{handoffPacket.detail}</p>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2 md:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Page map</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">
                      {handoffPacket.pageSummaries.length > 0 ? handoffPacket.pageSummaries.join(' | ') : 'No pages in document yet'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Visible order</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">
                      {handoffPacket.visibleTitles.length > 0 ? handoffPacket.visibleTitles.join(' -> ') : 'No visible lanes yet'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Hidden backlog</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">
                      {handoffPacket.hiddenTitles.length > 0 ? handoffPacket.hiddenTitles.join(', ') : 'No hidden lanes'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {handoffPacket.entries.slice(0, 5).map((entry) => (
                    <div key={`packet-${entry.sectionId}`} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                          entry.status === 'empty'
                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                            : entry.status === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : entry.status === 'hidden'
                                ? 'border-slate-200 bg-slate-50 text-slate-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}>
                          {entry.status}
                        </span>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{entry.pageTitle} / {entry.sectionTitle}</p>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{entry.summary}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Audit queue</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{documentAudit.headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{documentAudit.detail}</p>
                </div>
                {documentAudit.issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {documentAudit.issues.slice(0, 4).map((issue) => (
                      <div key={`${issue.sectionId}-${issue.title}`} className="rounded-md border border-border-subtle bg-white px-2.5 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                                issue.severity === 'critical'
                                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                                  : issue.severity === 'warning'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'border-sky-200 bg-sky-50 text-sky-800'
                              }`}>
                                {issue.severity}
                              </span>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{issue.pageTitle} / {issue.sectionTitle}</p>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{issue.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{issue.detail}</p>
                          </div>
                          <button
                            onClick={() => reviewDocumentAuditIssue(issue)}
                            className="shrink-0 rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2 text-[11px] font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5"
                          >
                            {issue.actionLabel}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Export read</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{downloadExportGate.ctaLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{downloadExportGate.detail}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Copy read</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{copyExportGate.ctaLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{copyExportGate.detail}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <button onClick={runHandoffAction} className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/15">
                    {handoffGuidance.primaryActionLabel}
                  </button>
                  <button onClick={openExportPanel} className="rounded-md border border-border-subtle bg-white px-3 py-2 text-left text-sm font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5">
                    Open export panel
                  </button>
                  <button onClick={() => { void copyHandoffPacket(); }} className="rounded-md border border-border-subtle bg-white px-3 py-2 text-left text-sm font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5">
                    Copy handoff packet
                  </button>
                  <button onClick={runDownloadV2Json} className="rounded-md border border-border-subtle bg-white px-3 py-2 text-left text-sm font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5">
                    {downloadExportGate.ctaLabel}
                  </button>
                  <button onClick={runCopyV2Json} className="rounded-md border border-border-subtle bg-white px-3 py-2 text-left text-sm font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5">
                    {copyExportGate.ctaLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 md:px-3 py-2 border-b border-border-subtle bg-white">
          <div className={`rounded-md border px-3 py-3 ${
            importGuidance.tone === 'clean'
              ? 'border-emerald-200 bg-emerald-50/60'
              : importGuidance.tone === 'repaired'
                ? 'border-sky-200 bg-sky-50/60'
                : importGuidance.tone === 'caution'
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-border-subtle bg-surface-subtle'
          }`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary font-semibold">Import read</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{importGuidance.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary max-w-3xl">{importGuidance.detail}</p>
              </div>
              {importGuidance.keyStats.length > 0 && (
                <div className="shrink-0 flex flex-wrap justify-end gap-1.5 text-[10px]">
                  {importGuidance.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">{stat}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.bestNextMove}</p>
              </div>
              <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.decisionRule}</p>
              </div>
              <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.watchout}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
                {importGuidance.steps.map((step) => (
                  <div key={step.label} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${focusPreview ? 'lg:grid-cols-1' : showStructure && showProperties ? 'lg:grid-cols-[180px_minmax(0,1fr)_620px]' : showProperties ? 'lg:grid-cols-[minmax(0,1fr)_620px]' : showStructure ? 'lg:grid-cols-[180px_minmax(0,1fr)]' : 'lg:grid-cols-1'} gap-0 flex-1 min-h-0`}>
          {!focusPreview && showStructure && (<aside className="border-r border-border bg-surface p-3 h-full min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Page map</h2>
            </div>
            <div className="mb-3 rounded-md border border-border-subtle bg-white p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary font-medium">Structure read</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{structureGuidance.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{structureGuidance.detail}</p>
                </div>
                <div className="shrink-0 flex flex-wrap justify-end gap-1 text-[10px]">
                  {structureGuidance.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-1 text-text-secondary">{stat}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-primary/15 bg-primary/[0.04] px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">Best next move</p>
                <p className="mt-1 text-xs leading-relaxed text-text-primary">{structureGuidance.bestNextMove}</p>
              </div>
              <div className="grid gap-2">
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{structureGuidance.decisionRule}</p>
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{structureGuidance.watchout}</p>
                </div>
                <div className="grid gap-2">
                  {structureGuidance.steps.map((step) => (
                    <div key={step.label} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-3 rounded-md border border-border-subtle bg-white p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary font-medium">Pages</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{activePage.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {pages.length} page{pages.length === 1 ? '' : 's'} in this document. Keep navigation deliberate before you widen the section stack.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPage}
                  className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 text-[11px] font-semibold text-primary hover:bg-primary/15"
                >
                  Add page
                </button>
              </div>
              <div className="space-y-2 max-h-44 overflow-auto pr-0.5">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`rounded-md border px-2.5 py-2 ${page.id === activePage.id ? 'border-primary/40 bg-primary/5' : 'border-border-subtle bg-surface-subtle'}`}
                  >
                    <button
                      type="button"
                      onClick={() => selectPage(page.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-text-primary">{page.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-text-secondary">/{page.slug}</p>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-1 text-[9px] uppercase tracking-[0.14em]">
                          {page.isHome && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800">Home</span>}
                          {page.hidden && <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-700">Hidden</span>}
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        {page.sections.length} section{page.sections.length === 1 ? '' : 's'}
                      </p>
                    </button>
                    <div className="mt-2 grid gap-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Page title</span>
                        <input
                          value={page.title}
                          onChange={(event) => renamePage(page.id, event.target.value)}
                          className="w-full rounded-md border border-border-subtle bg-white px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Slug</span>
                        <input
                          value={page.slug}
                          onChange={(event) => updatePageSlug(page.id, event.target.value)}
                          className="w-full rounded-md border border-border-subtle bg-white px-2 py-1.5 text-xs"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setHomePage(page.id)}
                          className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${page.isHome ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-border-subtle bg-white text-text-primary hover:border-primary/40'}`}
                        >
                          {page.isHome ? 'Home page' : 'Make home'}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePageVisibility(page.id)}
                          disabled={page.isHome}
                          className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${page.isHome ? 'cursor-not-allowed border-border-subtle bg-surface-subtle text-text-tertiary' : 'border-border-subtle bg-white text-text-primary hover:border-primary/40'}`}
                        >
                          {page.hidden ? 'Show page' : 'Hide page'}
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicatePage(page.id)}
                          className="col-span-2 rounded-md border border-border-subtle bg-white px-2 py-1.5 text-[11px] font-medium text-text-primary hover:border-primary/40"
                        >
                          Duplicate page
                        </button>
                        {selectedSections.length > 0 && page.id !== activePage.id && (
                          <button
                            type="button"
                            onClick={() => moveSelectedSectionsToPage(page.id)}
                            className="col-span-2 rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15"
                          >
                            Move selection here
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePage(page.id)}
                          disabled={pages.length <= 1}
                          className={`col-span-2 rounded-md border px-2 py-1.5 text-[11px] font-medium ${pages.length <= 1 ? 'cursor-not-allowed border-border-subtle bg-surface-subtle text-text-tertiary' : 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'}`}
                        >
                          Remove page
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedSections.length > 1 && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800 font-medium">Batch selection</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{selectionGuidance.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{selectionGuidance.detail}</p>
                  </div>
                  <div className="shrink-0 flex flex-wrap justify-end gap-1 text-[10px]">
                    {selectionGuidance.keyStats.map((stat) => (
                      <span key={stat} className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-900">{stat}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800">Best next move</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{selectionGuidance.bestNextMove}</p>
                </div>
                <div className="rounded-md border border-rose-200 bg-rose-50/50 px-2.5 py-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800 font-medium">Retirement read</p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{sectionLifecycleSummary.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">{sectionLifecycleSummary.detail}</p>
                    </div>
                    <div className="shrink-0 flex flex-wrap justify-end gap-1 text-[10px]">
                      {sectionLifecycleSummary.keyStats.map((stat) => (
                        <span key={stat} className="rounded-full border border-rose-200 bg-white px-2 py-1 text-rose-900">{stat}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Best next move</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.bestNextMove}</p>
                    </div>
                    <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Decision rule</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.decisionRule}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.watchout}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{selectionGuidance.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{selectionGuidance.watchout}</p>
                  </div>
                  <div className="grid gap-2">
                    {selectionGuidance.steps.map((step) => (
                      <div key={step.label} className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-800">{step.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={hideSelectedSections} className="rounded-md border border-border-subtle bg-white px-2.5 py-2 text-xs font-medium text-text-primary hover:border-primary/40">Hide selected</button>
                    <button onClick={showSelectedSections} className="rounded-md border border-border-subtle bg-white px-2.5 py-2 text-xs font-medium text-text-primary hover:border-primary/40">Show selected</button>
                    <button onClick={duplicateSelectedSections} className="col-span-2 rounded-md border border-border-subtle bg-white px-2.5 py-2 text-xs font-medium text-text-primary hover:border-primary/40">Duplicate batch</button>
                    <button onClick={restoreSelectedSectionsToStarterBlocks} className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">Restore starter blocks</button>
                    <button onClick={() => setSelectedDensity('compact')} className="rounded-md border border-border-subtle bg-white px-2.5 py-2 text-xs font-medium text-text-primary hover:border-primary/40">Make compact</button>
                    <button onClick={() => setSelectedDensity('comfortable')} className="rounded-md border border-border-subtle bg-white px-2.5 py-2 text-xs font-medium text-text-primary hover:border-primary/40">Make open</button>
                    <button
                      onClick={removeSelectedSections}
                      disabled={!sectionLifecycleSummary.allowRemoval}
                      className={`col-span-2 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors ${sectionLifecycleSummary.allowRemoval ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100' : 'cursor-not-allowed border-border-subtle bg-surface-subtle text-text-tertiary'}`}
                    >
                      Remove batch from structure
                    </button>
                    <button onClick={reviewSelectionInPreview} className="col-span-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/15">Review batch in preview</button>
                  </div>
                </div>
              </div>
            )}
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
              <button
                type="button"
                onClick={() => {
                  setShowAddPicker((v) => !v);
                  setAddPickerType(null);
                }}
                className="w-full rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
              >
                + Add section
              </button>

              {showAddPicker && (
                <div className="rounded-md border border-border bg-white p-2 space-y-2">
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Picker read</p>
                    <p className="mt-1 text-xs font-medium text-text-primary">{structureGuidance.addSectionHeadline}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{structureGuidance.addSectionDetail}</p>
                  </div>
                  {!addPickerType ? (
                    <>
                      <input
                        value={addQuery}
                        onChange={(e) => setAddQuery(e.target.value)}
                        placeholder="Search sections..."
                        className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-white"
                      />
                      <div className="max-h-44 overflow-auto space-y-1 pr-0.5">
                        {filteredAddables.map((name) => {
                          const normalizedType = name.toLowerCase().replace(/\s+/g, '-');
                          const previewVariant = (VARIANTS_BY_TYPE[normalizedType] ?? ['default'])[0];
                          const mappedType = (SECTION_TYPE_MAP[normalizedType] ?? 'custom') as SectionType;
                          const starterSummary = buildBuilderV2SectionStarterSummary(
                            name,
                            normalizedType,
                            SECTION_BLOCK_CATALOG[normalizedType] ?? ['title', 'text', 'photo'],
                            BLOCK_LABELS as Record<string, string>,
                          );
                          let PreviewComp: React.FC<{ data: WeddingDataV1; instance: SectionInstance }> | null = null;
                          try {
                            PreviewComp = getSectionRenderer(mappedType as never, previewVariant) as React.FC<{ data: WeddingDataV1; instance: SectionInstance }>;
                          } catch {
                            PreviewComp = null;
                          }
                          const previewInstance: SectionInstance = {
                            id: `add-preview-${normalizedType}`,
                            type: mappedType,
                            variant: previewVariant,
                            enabled: true,
                            bindings: {},
                            settings: { showTitle: true, title: name, subtitle: '' },
                          };

                          return (
                            <button
                              key={name}
                              onClick={() => setAddPickerType(name)}
                              className="w-full text-left rounded border border-border px-2.5 py-2 hover:border-primary/40"
                            >
                              <div className="h-20 rounded border border-border bg-surface-subtle mb-1.5 overflow-hidden">
                                {PreviewComp ? (
                                  <div className="origin-top-left scale-[0.22] w-[455%] pointer-events-none">
                                    <PreviewComp data={previewData} instance={previewInstance} />
                                  </div>
                                ) : (
                                  <div className="h-full w-full" />
                                )}
                              </div>
                              <p className="text-xs font-medium text-text-primary">{name}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{starterSummary.headline}</p>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-text-primary">{addPickerType} variants</p>
                        <button onClick={() => setAddPickerType(null)} className="text-[11px] text-text-tertiary">Back</button>
                      </div>
                      <div className="max-h-44 overflow-auto space-y-1 pr-0.5">
                        {(VARIANTS_BY_TYPE[addPickerType.toLowerCase().replace(/\s+/g, '-')] ?? ['default']).map((variant) => {
                          const normalizedType = addPickerType.toLowerCase().replace(/\s+/g, '-');
                          const mappedType = (SECTION_TYPE_MAP[normalizedType] ?? 'custom') as SectionType;
                          const starterSummary = buildBuilderV2SectionStarterSummary(
                            addPickerType,
                            normalizedType,
                            SECTION_BLOCK_CATALOG[normalizedType] ?? ['title', 'text', 'photo'],
                            BLOCK_LABELS as Record<string, string>,
                          );
                          let PreviewComp: React.FC<{ data: WeddingDataV1; instance: SectionInstance }> | null = null;
                          try {
                            PreviewComp = getSectionRenderer(mappedType as never, variant) as React.FC<{ data: WeddingDataV1; instance: SectionInstance }>;
                          } catch {
                            PreviewComp = null;
                          }
                          const previewInstance: SectionInstance = {
                            id: `add-preview-${normalizedType}-${variant}`,
                            type: mappedType,
                            variant,
                            enabled: true,
                            bindings: {},
                            settings: { showTitle: true, title: addPickerType, subtitle: '' },
                          };

                          return (
                            <button
                              key={variant}
                              onClick={() => {
                                addSection(addPickerType, variant);
                                setShowAddPicker(false);
                                setAddPickerType(null);
                              }}
                              className="w-full text-left rounded border border-border px-2.5 py-2 hover:border-primary/40"
                            >
                              <div className="h-24 rounded border border-border bg-surface-subtle mb-1.5 overflow-hidden">
                                {PreviewComp ? (
                                  <div className="origin-top-left scale-[0.22] w-[455%] pointer-events-none">
                                    <PreviewComp data={previewData} instance={previewInstance} />
                                  </div>
                                ) : (
                                  <div className="h-full w-full" />
                                )}
                              </div>
                              <p className="text-xs font-medium text-text-primary">{variant}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{starterSummary.detail}</p>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>)}

          <main className="relative flex min-h-0 flex-col border-r border-border bg-surface p-3 h-full overflow-hidden">
            <div className="sticky top-0 z-20 h-12 bg-white/95 backdrop-blur border-b border-border-subtle -mx-3 px-3 mb-2 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Preview · {activePage.title}</h2>
                <p className="text-[11px] leading-relaxed text-text-tertiary">{structureGuidance.previewHeadline}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {(['desktop','mobile'] as const).map((d) => (
                    <button key={d} onClick={() => setPreviewDevice(d)} className={`text-[11px] px-2 py-1 border rounded inline-flex items-center gap-1 ${previewDevice === d ? 'border-primary/50 bg-primary/10 text-primary' : ''}`}>
                      {d}
                      {previewReviewed[d].currentPageReviewed && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
                <select value={previewScale} onChange={(e) => setPreviewScale(Number(e.target.value))} className="text-[11px] border rounded px-2 py-1 bg-white">
                  <option value={80}>80%</option><option value={90}>90%</option><option value={100}>100%</option><option value={110}>110%</option>
                </select>

                <button onClick={() => canUndo && setHistoryIndex((i) => i - 1)} disabled={!canUndo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" />Undo</button>
                <button onClick={() => canRedo && setHistoryIndex((i) => i + 1)} disabled={!canRedo} className="text-xs border rounded px-2 py-1 disabled:opacity-40 inline-flex items-center gap-1"><Redo2 className="w-3.5 h-3.5" />Redo</button>
                <button onClick={saveCheckpoint} className="text-xs border rounded px-2 py-1 bg-white hover:border-primary/40 hover:bg-primary/5">Save checkpoint</button>
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="text-[11px] border rounded px-2 py-1 bg-white max-w-[220px]"
                >
                  <option value="">Restore checkpoint…</option>
                  {checkpointSummaries.map((checkpoint) => (
                    <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedCheckpointId && restoreCheckpoint(selectedCheckpointId)}
                  disabled={!selectedCheckpointId}
                  className="text-xs border rounded px-2 py-1 disabled:opacity-40 bg-white hover:border-primary/40 hover:bg-primary/5"
                >
                  Restore
                </button>
              </div>
            </div>
            {recentCheckpointSummaries.length > 0 && (
              <div className="mb-2 rounded-md border border-border-subtle bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Recovery timeline</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      Recent restore points stay visible here so risky cleanup moves never feel irreversible.
                    </p>
                  </div>
                  <p className="text-[11px] text-text-tertiary">{checkpointSummaries.length} checkpoint{checkpointSummaries.length === 1 ? '' : 's'}</p>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {recentCheckpointSummaries.map((checkpoint) => {
                    const tone = checkpoint.status === 'current'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : checkpoint.status === 'ahead'
                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                        : 'border-border-subtle bg-white text-text-primary';
                    const statusLabel = checkpoint.status === 'current'
                      ? 'Current'
                      : checkpoint.status === 'ahead'
                        ? 'Ahead'
                        : 'Restore';

                    return (
                      <button
                        key={checkpoint.id}
                        onClick={() => restoreCheckpoint(checkpoint.id)}
                        disabled={checkpoint.status === 'current'}
                        className={`rounded-md border px-2.5 py-2 text-left transition-colors disabled:cursor-default ${tone}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{checkpoint.label}</p>
                          <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed opacity-80">
                          {checkpoint.pageCount} page{checkpoint.pageCount === 1 ? '' : 's'} · {checkpoint.sectionCount} section{checkpoint.sectionCount === 1 ? '' : 's'}
                        </p>
                        <p className="mt-1 text-[11px] opacity-70">{formatCheckpointTime(checkpoint.createdAtISO)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div
              id="launch-confidence"
              ref={launchGateRef}
              className={`mb-2 rounded-md border px-3 py-2.5 ${
              launchGate.status === 'ready'
                ? 'border-emerald-200 bg-emerald-50/60'
                : launchGate.status === 'review'
                  ? 'border-sky-200 bg-sky-50/60'
                  : 'border-amber-200 bg-amber-50/60'
            }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Launch gate</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{launchGate.headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{launchGate.detail}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {launchGate.keyStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Checklist</p>
                  <div className="mt-2 space-y-2">
                    {launchGate.checklistItems.map((item) => (
                      (() => {
                        const action = item.action;

                        return (
                          <div key={item.id} className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                                    item.done
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-amber-200 bg-amber-50 text-amber-800'
                                  }`}>
                                    {item.done ? 'done' : 'next'}
                                  </span>
                                  <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.detail}</p>
                              </div>
                              {action && (
                                <button
                                  onClick={() => runLaunchGateChecklistAction(action)}
                                  className="shrink-0 rounded-md border border-border-subtle bg-white px-2 py-1.5 text-[11px] font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5"
                                >
                                  {action.label}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.bestNextMove}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.watchout}</p>
                  </div>
                  <button
                    onClick={runLaunchGateAction}
                    className="w-full rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/15"
                  >
                    {launchGate.primaryAction.label}
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-2 rounded-md border border-border-subtle bg-white px-3 py-2.5">
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Preview read</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{structureGuidance.previewHeadline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{structureGuidance.previewDetail}</p>
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{structureGuidance.bestNextMove}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 border border-border-subtle bg-[#f3f3f3] p-1.5 overflow-auto scroll-smooth [scrollbar-gutter:stable]">
              <div className={`mx-auto bg-white border border-border-subtle overflow-hidden ${previewDevice === 'desktop' ? 'w-full max-w-[1240px]' : 'w-[430px] max-w-full'}`} style={{ transform: `scale(${previewScale / 100})`, transformOrigin: 'top center' }}>
                {activePage.hidden && (
                  <div className="border-b border-border-subtle bg-amber-50 px-5 py-4">
                    <p className="text-sm font-semibold text-amber-900">This page is hidden from the live navigation.</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                      Keep shaping the structure here, then show the page again when you are ready for it to join the guest path.
                    </p>
                  </div>
                )}
                {orderedVisible.length === 0 && (
                  <div className="border-b border-border-subtle bg-white px-5 py-6">
                    <p className="text-sm font-semibold text-text-primary">No visible sections on this page yet.</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      Add a first section or show a hidden lane so this page has a live reading order again.
                    </p>
                  </div>
                )}
                {previewInstances.map((instance) => {
                  const sectionState = orderedVisible.find((x) => x.id === instance.id);
                  if (!sectionState) return null;

                  let Content: React.FC<{ data: WeddingDataV1; instance: SectionInstance }> | null = null;
                  try {
                    Content = getSectionRenderer(instance.type as never, instance.variant) as React.FC<{ data: WeddingDataV1; instance: SectionInstance }>;
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
                            (() => {
                              const preview = buildBuilderV2BlockPreviewSummary(instance.type, b.type, normalizeBlockData(b));

                              return (
                                <div key={b.id} className="px-5 py-3.5 border-b border-border-subtle bg-white/95">
                                  <p className="text-[11px] uppercase updates-wide text-text-tertiary mb-1">{BLOCK_LABELS[b.type]}</p>
                                  <div className="space-y-2">
                                    {b.type === 'photo' && (
                                      preview.imageUrl ? (
                                        <img src={preview.imageUrl} alt={preview.imageAlt || 'Photo'} className="w-full h-40 object-cover rounded" />
                                      ) : (
                                        <div className="w-full h-24 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center text-xs text-text-tertiary">Photo placeholder</div>
                                      )
                                    )}
                                    {preview.primary && <p className="text-sm text-text-primary font-medium whitespace-pre-wrap">{preview.primary}</p>}
                                    {preview.secondary && <p className="text-sm text-text-secondary whitespace-pre-wrap">{preview.secondary}</p>}
                                    {preview.detail && <p className="text-sm text-text-secondary whitespace-pre-wrap">{preview.detail}</p>}
                                    {preview.url && <p className="text-xs text-primary break-all">{preview.url}</p>}
                                  </div>
                                </div>
                              );
                            })()
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
                  <p className="text-[10px] uppercase updates-wide text-text-tertiary">Mini-map</p>
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
                <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Now editing</p>
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
                <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">{propertyTab === 'content' ? 'Content' : 'Settings'}</p>
                {propertyTab === 'content' && (
                  <>
                    <div className="rounded-md border border-primary/15 bg-primary/[0.04] p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">Section read</p>
                          <p className="mt-1 text-sm font-semibold text-text-primary">{sectionEditingGuidance.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{sectionEditingGuidance.detail}</p>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-1.5 text-[10px]">
                          <span className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                            {sectionEditingGuidance.blockCount} block{sectionEditingGuidance.blockCount === 1 ? '' : 's'}
                          </span>
                          <span className={`rounded-full border px-2 py-1 ${sectionEditingGuidance.warningCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {sectionEditingGuidance.warningCount > 0 ? `${sectionEditingGuidance.warningCount} warning${sectionEditingGuidance.warningCount === 1 ? '' : 's'}` : 'Ready to refine'}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-md border border-border-subtle bg-white p-2.5">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Main focus</p>
                          <p className="mt-1 text-sm text-text-primary">{sectionEditingGuidance.mainFocus}</p>
                        </div>
                        <div className="rounded-md border border-border-subtle bg-white p-2.5">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                          <p className="mt-1 text-sm text-text-primary">{sectionEditingGuidance.bestNextMove}</p>
                        </div>
                      </div>

                      <div className="rounded-md border border-border-subtle bg-white p-2.5 space-y-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{sectionEditingGuidance.decisionRule}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{sectionEditingGuidance.watchout}</p>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          {sectionEditingGuidance.steps.map((step) => (
                            <div key={step.label} className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                            </div>
                          ))}
                        </div>
                        {sectionEditingGuidance.suggestedBlockTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sectionEditingGuidance.suggestedBlockTypes.map((type) => (
                              <button
                                key={`suggested-${type}`}
                                onClick={() => {
                                  setShowAddBlockPicker(true);
                                  addBlockToSection(type as BlockType);
                                }}
                                disabled={!addBlockAvailability[type]?.ok}
                                className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${addBlockAvailability[type]?.ok ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15' : 'border-border-subtle bg-surface-subtle text-text-tertiary cursor-not-allowed'}`}
                                title={addBlockAvailability[type]?.ok ? `Add ${BLOCK_LABELS[type as BlockType]}` : addBlockAvailability[type]?.reason}
                              >
                                Add {BLOCK_LABELS[type as BlockType]}
                              </button>
                            ))}
                          </div>
                        )}
                        {blockPackSummary.buildableTypes.length > 0 && (
                          <div className="rounded-md border border-primary/20 bg-primary/[0.05] px-2.5 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">Recommended pack</p>
                                <p className="mt-1 text-sm text-text-primary">{blockPackSummary.headline}</p>
                                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{blockPackSummary.detail}</p>
                              </div>
                              <button
                                onClick={addRecommendedBlockPack}
                                className="shrink-0 rounded-md border border-primary/30 bg-white px-2.5 py-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                              >
                                Add pack
                              </button>
                            </div>
                            <div className="mt-2 rounded-md border border-border-subtle bg-white px-2.5 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{blockPackSummary.bestNextMove}</p>
                            </div>
                          </div>
                        )}
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800">Starter recovery</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">
                                Replace this section&apos;s current blocks with a fresh starter spine when the lane has drifted too far to clean up block by block.
                              </p>
                            </div>
                            <button
                              onClick={restoreSelectedSectionsToStarterBlocks}
                              className="shrink-0 rounded-md border border-amber-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                            >
                              Restore starter blocks
                            </button>
                          </div>
                        </div>
                        {selectedSectionCanRepairStructure && (
                          <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-900">Structure repair</p>
                                <p className="mt-1 text-xs leading-relaxed text-text-primary">
                                  Re-key course, playlist, video-group, or wedding-party side metadata when the section structure has drifted but the real content is still worth keeping.
                                </p>
                              </div>
                              <button
                                onClick={repairSelectedSectionStructure}
                                className="shrink-0 rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
                              >
                                Repair structure
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAddBlockPicker((v) => !v)}
                      className="w-full border rounded-md px-3 py-2.5 text-left text-sm font-medium hover:border-primary/40 bg-white shadow-sm hover:shadow transition-all"
                    >
                      + Add to your page
                    </button>

                    {showAddBlockPicker && (
                      <div className="border border-border-subtle rounded-md p-2.5 bg-white">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Block library</p>
                              <p className="mt-1 text-sm font-medium text-text-primary">{addBlockLibrary.headline}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{addBlockLibrary.detail}</p>
                            </div>
                            <div className="shrink-0 flex flex-wrap justify-end gap-1.5 text-[10px]">
                              <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-1 text-text-secondary">
                                {addBlockLibrary.visibleCount} visible
                              </span>
                              {addBlockLibrary.recommendedVisibleCount > 0 && (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">
                                  {addBlockLibrary.recommendedVisibleCount} recommended
                                </span>
                              )}
                            </div>
                          </div>

                          <input
                            value={addBlockQuery}
                            onChange={(e) => setAddBlockQuery(e.target.value)}
                            placeholder="Search block types..."
                            className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />

                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{addBlockLibrary.bestNextMove}</p>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{addBlockLibrary.decisionRule}</p>
                            </div>
                          </div>

                          <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-primary">{addBlockLibrary.watchout}</p>
                          </div>

                          {blockPackSummary.buildableTypes.length > 0 && (
                            <div className="rounded-md border border-primary/20 bg-primary/[0.05] px-2.5 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Recommended pack</p>
                                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{blockPackSummary.headline}</p>
                                </div>
                                <button
                                  onClick={addRecommendedBlockPack}
                                  className="shrink-0 rounded-md border border-primary/30 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                                >
                                  Add pack
                                </button>
                              </div>
                            </div>
                          )}

                          {addBlockLibrary.empty ? (
                            <div className="rounded-md border border-dashed border-border-subtle bg-surface-subtle px-3 py-4 text-xs text-text-secondary">
                              No blocks match this search yet. Broaden the search to compare the structural options again.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2.5">
                              {addBlockLibrary.entries.map((entry) => (
                                <button
                                  key={entry.type}
                                  onClick={() => addBlockToSection(entry.type as BlockType)}
                                  disabled={!entry.allowed}
                                  title={entry.allowed ? `Add ${entry.label}` : entry.disabledReason}
                                  className={`text-left text-xs border rounded-md px-2.5 py-2.5 transition-all ${entry.allowed ? 'hover:border-primary/40 hover:bg-primary/5 border-border' : 'opacity-60 cursor-not-allowed bg-surface-subtle border-dashed border-border'} ${entry.recommended ? 'ring-1 ring-primary/20 bg-primary/[0.03]' : 'bg-white'}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="text-[12px] leading-none mt-[1px]">{BLOCK_META[entry.type as BlockType].icon}</span>
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-1">
                                        <span className="block text-[12px] font-medium text-text-primary">{entry.label}</span>
                                        {entry.recommended && (
                                          <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                                            Recommended
                                          </span>
                                        )}
                                      </span>
                                      <span className="block text-[10px] text-text-tertiary mt-0.5 leading-snug">{entry.description}</span>
                                      {!entry.allowed && entry.disabledReason && (
                                        <span className="mt-1 block text-[10px] text-amber-700">{entry.disabledReason}</span>
                                      )}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <p className="text-[11px] text-text-tertiary">Page content</p>
                      <p className="text-[10px] text-text-tertiary">
                        Section limits: content blocks are capped to keep pages clean and readable. {selectedBlocks.length}/{selectedSectionLimit.total} used.
                      </p>

                      <div className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                        <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Header</p>
                        <label className="block">
                          <span className="text-[11px] text-text-tertiary">Title</span>
                          <input value={selected.title} onChange={(e) => renameSelected(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </label>
                      </div>

                      {selectedSectionSettingFields.length > 0 && (
                        <div className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Section settings</p>
                          {selectedSectionSettingFields.map((field) => (
                            field.kind === 'boolean' ? (
                              <label key={field.key} className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3 py-2.5">
                                <span className="text-sm text-text-primary">{field.label}</span>
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.value)}
                                  onChange={(e) => updateSelectedSectionSetting(field.key, e.target.checked)}
                                  className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary/20"
                                />
                              </label>
                            ) : field.kind === 'select' ? (
                              <label key={field.key} className="block">
                                <span className="text-[11px] text-text-tertiary">{field.label}</span>
                                <select
                                  value={String(field.value ?? '')}
                                  onChange={(e) => updateSelectedSectionSetting(field.key, e.target.value)}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                  {(field.options ?? []).map((option) => (
                                    <option key={`${field.key}-${option.value || 'empty'}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <label key={field.key} className="block">
                                <span className="text-[11px] text-text-tertiary">{field.label}</span>
                                <input
                                  value={String(field.value ?? '')}
                                  onChange={(e) => updateSelectedSectionSetting(field.key, e.target.value)}
                                  className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </label>
                            )
                          ))}
                        </div>
                      )}

                      {selected.type === 'hero' && (
                        <>
                          <div id="rail-section-hero" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                            <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Couple names</p>
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
                            <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Date</p>
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
                          <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Story</p>
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
                            <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Primary event</p>
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
                          <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Travel details</p>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Flights</span><input value={previewFields.travelFlights} onChange={(e) => updatePreviewField('travelFlights', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Parking</span><input value={previewFields.travelParking} onChange={(e) => updatePreviewField('travelParking', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Hotels</span><input value={previewFields.travelHotels} onChange={(e) => updatePreviewField('travelHotels', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Local tips</span><textarea value={previewFields.travelTips} onChange={(e) => updatePreviewField('travelTips', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" /></label>
                        </div>
                      )}

                      {isRegistryBuilderSectionType(selected.type) && (
                        <div id="rail-section-registry" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">Registry</p>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Featured registry item</span><input value={previewFields.registryTitle} onChange={(e) => updatePreviewField('registryTitle', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
                          <label className="block"><span className="text-[11px] text-text-tertiary">Registry note</span><textarea value={previewFields.registryNote} onChange={(e) => updatePreviewField('registryNote', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white text-sm min-h-20" /></label>
                        </div>
                      )}


                      {(sectionBlocks[selected.id] ?? []).length === 0 && (
                        <div className="border border-dashed border-border rounded-md p-3 bg-white text-[11px] text-text-tertiary">
                          No blocks yet. Use <span className="font-medium">+ Add to your page</span> to add your first block.
                        </div>
                      )}

                      {selectedBlocks.length > 0 && (
                        <div className="rounded-md border border-border-subtle bg-white p-3 space-y-2.5 shadow-sm transition-all duration-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary font-medium">Block review</p>
                              <p className="mt-1 text-sm font-medium text-text-primary">{blockReviewSummary.headline}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{blockReviewSummary.detail}</p>
                            </div>
                            <div className="shrink-0 flex flex-wrap justify-end gap-1.5 text-[10px]">
                              <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-1 text-text-secondary">
                                {blockReviewSummary.visibleCount} visible
                              </span>
                              {blockReviewSummary.warningVisibleCount > 0 && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                                  {blockReviewSummary.warningVisibleCount} warning{blockReviewSummary.warningVisibleCount === 1 ? '' : 's'}
                                </span>
                              )}
                              {blockReviewSummary.hiddenByFilterCount > 0 && (
                                <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-1 text-text-secondary">
                                  {blockReviewSummary.hiddenByFilterCount} hidden
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                            <input
                              value={blockReviewQuery}
                              onChange={(e) => setBlockReviewQuery(e.target.value)}
                              placeholder="Search blocks by type or warning..."
                              className="w-full rounded-md border border-border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <div className="grid grid-cols-3 gap-1 rounded-sm border border-border-subtle bg-surface-subtle p-1">
                              {(['all', 'warnings', 'healthy'] as const).map((filter) => (
                                <button
                                  key={filter}
                                  onClick={() => setBlockReviewFilter(filter)}
                                  className={`px-2 py-1.5 text-[11px] rounded-sm transition-colors ${blockReviewFilter === filter ? 'bg-white border border-border shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                  {filter === 'all' ? 'All' : filter === 'warnings' ? 'Warnings' : 'Healthy'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{blockReviewSummary.bestNextMove}</p>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-primary">{blockReviewSummary.decisionRule}</p>
                            </div>
                          </div>

                          <div className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-primary">{blockReviewSummary.watchout}</p>
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            {blockReviewSummary.steps.map((step) => (
                              <div key={step.label} className="rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                                <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {blockReviewSummary.visibleBlocks.map((block) => {
                        const d = normalizeBlockData(block);
                        return (
                        <div key={block.id} className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <div className="sticky top-0 z-[1] -mx-3 px-3 py-1.5 mb-1 bg-white/95 backdrop-blur flex items-center justify-between gap-2 border-b border-border-subtle">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-text-tertiary cursor-grab select-none" title="Reorder block">⋮⋮</span>
                              <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium truncate">Block · {BLOCK_LABELS[block.type]}</p>
                            </div>
                            <div className="flex items-center gap-1 p-0.5 rounded-md border border-border-subtle bg-surface-subtle">
                              <button title="Move block up" onClick={() => moveBlock(selected.id, block.id, -1)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">↑</button>
                              <button title="Move block down" onClick={() => moveBlock(selected.id, block.id, 1)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">↓</button>
                              <button title="Duplicate block" onClick={() => duplicateBlock(selected.id, block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">⧉</button>
                              <button title={collapsedBlocks[block.id] ? 'Expand block' : 'Collapse block'} onClick={() => toggleBlockCollapsed(block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">{collapsedBlocks[block.id] ? '▸' : '▾'}</button>
                              <button title="Remove block" onClick={() => removeBlock(selected.id, block.id)} className="text-[10px] border rounded px-1.5 py-0.5 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">✕</button>
                            </div>
                          </div>

                          {!collapsedBlocks[block.id] && selectedBlockWarningFor(block) && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              {selectedBlockWarningFor(block)}
                            </div>
                          )}

                          {!collapsedBlocks[block.id] && buildBuilderV2BlockFieldDescriptors(selected.type, block.type, d).map((field) => {
                            const value = (d[field.key] ?? (field.key === 'text' ? block.content : '')) as string;
                            const optionMap = buildBuilderV2BlockFieldOptions(selected.type, block.type, d, selectedBlocks);
                            const options = field.options ?? optionMap[field.key];
                            const baseClassName = 'mt-1 w-full border rounded-md px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

                            return (
                              <label key={`${block.id}-${field.key}`} className="block">
                                <span className="text-[11px] text-text-tertiary">{field.label}</span>
                                {field.multiline ? (
                                  <textarea
                                    value={value}
                                    onChange={(e) => updateBlockField(selected.id, block.id, field.key, e.target.value)}
                                    className={`${baseClassName} ${field.key === 'text' || field.key === 'answer' || field.key === 'note' ? 'min-h-20' : 'min-h-16'}`}
                                  />
                                ) : options ? (
                                  <select
                                    value={value}
                                    onChange={(e) => updateBlockField(selected.id, block.id, field.key, e.target.value)}
                                    className={baseClassName}
                                  >
                                    {options.map((option: { value: string; label: string }) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={field.inputType ?? 'text'}
                                    value={value}
                                    onChange={(e) => updateBlockField(selected.id, block.id, field.key, e.target.value)}
                                    className={baseClassName}
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                        );
                      })}

                      {selected.type === 'rsvp' && (
                        <div id="rail-section-rsvp" className="border border-border-subtle rounded-md p-3 bg-white space-y-2.5 shadow-sm transition-all duration-200">
                          <p className="text-[11px] uppercase updates-wide text-text-tertiary font-medium">RSVP</p>
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
                      {selected.enabled ? 'Archive section from preview' : 'Show section in preview'}
                    </button>
                    <div className="rounded-md border border-rose-200 bg-rose-50/50 p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800 font-medium">Section lifecycle</p>
                          <p className="mt-1 text-sm font-semibold text-text-primary">{sectionLifecycleSummary.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{sectionLifecycleSummary.detail}</p>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-1 text-[10px]">
                          {sectionLifecycleSummary.keyStats.map((stat) => (
                            <span key={stat} className="rounded-full border border-rose-200 bg-white px-2 py-1 text-rose-900">{stat}</span>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Best next move</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.bestNextMove}</p>
                        </div>
                        <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Decision rule</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.decisionRule}</p>
                        </div>
                      </div>
                      <div className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-rose-800">Watchout</p>
                        <p className="mt-1 text-xs leading-relaxed text-text-primary">{sectionLifecycleSummary.watchout}</p>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {sectionLifecycleSummary.steps.map((step) => (
                          <div key={step.label} className="rounded-md border border-rose-200 bg-white px-2.5 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-rose-800">{step.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={removeSelectedSections}
                        disabled={!sectionLifecycleSummary.allowRemoval}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${sectionLifecycleSummary.allowRemoval ? 'border-rose-200 bg-white text-rose-900 hover:bg-rose-100' : 'cursor-not-allowed border-border-subtle bg-surface-subtle text-text-tertiary'}`}
                      >
                        Remove section from structure
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>)}
        </div>
      </div>

      {actionNotice && (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border-subtle bg-white px-4 py-2 text-xs font-medium text-text-primary shadow-lg">
          {actionNotice}
        </div>
      )}


      {showQuickHelp && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-start justify-center pt-24" onClick={() => setShowQuickHelp(false)}>
          <div className="w-full max-w-lg bg-white rounded-xl border border-border shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2">Builder V2 Lab shortcuts</h3>
            <ul className="text-xs text-text-secondary space-y-1.5">
              <li>⌘/Ctrl + K — open command palette</li>
              <li>⌘/Ctrl + Z / ⇧⌘/Ctrl + Z — undo / redo</li>
              <li>Save checkpoints before big cleanup or replacement moves</li>
              <li>⌘/Ctrl + A — select all sections</li>
              <li>⇧⌘/Ctrl + I — invert selection</li>
              <li>Esc — clear multi-selection</li>
              <li>Shift click — select a range</li>
              <li>Cmd/Ctrl click — additive selection</li>
            </ul>
          </div>
        </div>
      )}

      {showImportPanel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-16" onClick={() => setShowImportPanel(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div>
                <h3 className="font-semibold text-sm">Import Builder V2 layout</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Paste a Builder V2 export, a legacy builder project, or a legacy layout config. We will recover obvious drift, keep usable structure, and tell you what got repaired or migrated.
                </p>
              </div>
              <button onClick={() => setShowImportPanel(false)} className="text-sm text-text-tertiary hover:text-text-primary">✕</button>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.bestNextMove}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.watchout}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Current</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{importGuidance.steps[0]?.detail}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleImportFile(file);
                    e.currentTarget.value = '';
                  }}
                />
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5"
                >
                  Upload JSON file
                </button>
                <button
                  onClick={() => {
                    setImportDraft('');
                    setImportError('');
                    setLastImportSource('Pasted JSON');
                  }}
                  className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5"
                >
                  Clear
                </button>
                <span className="text-xs text-text-tertiary">{lastImportSource}</span>
              </div>

              <textarea
                value={importDraft}
                onChange={(e) => {
                  setImportDraft(e.target.value);
                  setImportError('');
                  setLastImportSource('Pasted JSON');
                }}
                placeholder={`{\n  "version": "v2",\n  "sections": [\n    {\n      "type": "hero",\n      "variant": "default",\n      "enabled": true,\n      "blocks": []\n    }\n  ]\n}`}
                className="min-h-[320px] w-full rounded-lg border border-border-subtle bg-surface px-3 py-3 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {preparedImportPreview.state === 'ready' && (
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3 space-y-3">
                  {(() => {
                    const importReviewSummary = buildBuilderV2ImportReviewSummary(
                      preparedImportPreview.prepared.report,
                      lastImportSource,
                    );
                    return (
                      <div className="rounded-md border border-border-subtle bg-white px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Migration summary</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{importReviewSummary.headline}</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{importReviewSummary.detail}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {importReviewSummary.keyStats.map((stat) => (
                              <span key={stat} className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-1 text-text-secondary">{stat}</span>
                            ))}
                          </div>
                        </div>
                        {importReviewSummary.topNotes.length > 0 && (
                          <div className="mt-3 rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{importReviewSummary.notesTitle}</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-text-primary">
                              {importReviewSummary.topNotes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Replacement impact</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{preparedImportPreview.comparison.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{preparedImportPreview.comparison.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {preparedImportPreview.comparison.keyStats.map((stat) => (
                      <span key={stat} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">{stat}</span>
                    ))}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2 md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Incoming page map</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {preparedImportPreview.comparison.incomingPageSummaries.length > 0
                          ? preparedImportPreview.comparison.incomingPageSummaries.join(' | ')
                          : 'No incoming pages in layout'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Incoming visible order</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {preparedImportPreview.comparison.incomingVisibleOrder.length > 0
                          ? preparedImportPreview.comparison.incomingVisibleOrder.join(' -> ')
                          : 'No visible lanes in incoming layout'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Incoming hidden backlog</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {preparedImportPreview.comparison.incomingHiddenTitles.length > 0
                          ? preparedImportPreview.comparison.incomingHiddenTitles.join(', ')
                          : 'No hidden incoming lanes'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {preparedImportPreview.comparison.entries.slice(0, 8).map((entry) => (
                      <div key={`${entry.sectionTitle}-${entry.status}`} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                            entry.status === 'added'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : entry.status === 'removed'
                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                : entry.status === 'changed'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}>
                            {entry.status}
                          </span>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{entry.pageTitle} / {entry.sectionTitle}</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-primary">{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preparedImportPreview.state === 'invalid' && importDraft.trim() && (
                <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {preparedImportPreview.error}
                </div>
              )}

              {importError && (
                <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {importError}
                </div>
              )}

              <div className="rounded-sm border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                We preserve usable sections, migrate legacy builder shapes onto the V2 document model, repair obvious ids/types/variants, and drop only sections or blocks that cannot be recovered safely.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
              <p className="text-xs text-text-tertiary">Importing replaces the current Builder V2 Lab structure.</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowImportPanel(false)} className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5">
                  Cancel
                </button>
                <button onClick={importV2Json} className="rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15">
                  Import layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportPanel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-16" onClick={() => setShowExportPanel(false)}>
          <div className="w-full max-w-3xl bg-white rounded-xl border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div>
                <h3 className="font-semibold text-sm">Export Builder V2 layout</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Capture the current document as a reusable JSON handoff, but keep the document guidance honest about what still wants review first.
                </p>
              </div>
              <button onClick={() => setShowExportPanel(false)} className="text-sm text-text-tertiary hover:text-text-primary">✕</button>
            </div>
            <div className="space-y-3 p-4">
              <div className={`rounded-md border px-3 py-3 ${launchGateExportTone}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Launch read</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{launchGate.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{launchGate.detail}</p>
                  </div>
                  <div className="shrink-0 flex flex-wrap gap-1.5 text-[10px]">
                    {launchGate.keyStats.map((stat) => (
                      <span key={`export-launch-${stat}`} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">{stat}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.bestNextMove}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{launchGate.watchout}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Primary action</p>
                    <button
                      onClick={() => {
                        setShowExportPanel(false);
                        runLaunchGateAction();
                      }}
                      className="mt-1 w-full rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      {launchGate.primaryAction.label}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`rounded-md border px-3 py-3 ${
                handoffGuidance.tone === 'ready'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : handoffGuidance.tone === 'repair'
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-rose-200 bg-rose-50/60'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Handoff read</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{handoffGuidance.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{handoffGuidance.detail}</p>
                  </div>
                  <div className="shrink-0 flex flex-wrap gap-1.5 text-[10px]">
                    {handoffGuidance.keyStats.map((stat) => (
                      <span key={stat} className="rounded-full border border-border-subtle bg-white px-2 py-1 text-text-secondary">{stat}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Main focus</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.mainFocus}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.bestNextMove}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.decisionRule}</p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-primary">{handoffGuidance.watchout}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {handoffGuidance.steps.map((step) => (
                    <div key={step.label} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{step.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Session rollout signal</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">Builder V2 action outcomes for this browser session</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      This is an internal session-only meter for add, duplicate, remove, import, and export outcomes while you review Builder V2. Nothing here claims live product analytics or sends data anywhere.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-text-secondary">
                    {rolloutTelemetry.entries.length} recorded action{rolloutTelemetry.entries.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  {rolloutTelemetrySummary.map((metric) => (
                    <div key={metric.action} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{metric.label}</p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{metric.failureCount}/{metric.totalCount} failures</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {metric.totalCount > 0
                          ? `${Math.round(metric.failureRate * 100)}% failure rate in this session`
                          : 'No attempts recorded in this session'}
                      </p>
                      {metric.latestFailureReason && (
                        <p className="mt-1 text-[11px] leading-relaxed text-amber-900">{metric.latestFailureReason}</p>
                      )}
                    </div>
                  ))}
                </div>
                {latestRolloutFailures.length > 0 && (
                  <div className="mt-3 rounded-md border border-border-subtle bg-white px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Latest failure notes</p>
                    <div className="mt-2 space-y-1.5">
                      {latestRolloutFailures.map((entry, index) => (
                        <p key={`${entry.recordedAtISO}-${entry.action}-${index}`} className="text-xs leading-relaxed text-text-secondary">
                          <span className="font-semibold text-text-primary">{entry.action}</span>
                          {' · '}
                          {entry.operation}
                          {' · '}
                          {entry.reason ?? 'No reason captured'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Handoff packet</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{handoffPacket.headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{handoffPacket.detail}</p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Page map</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {handoffPacket.pageSummaries.length > 0 ? handoffPacket.pageSummaries.join(' | ') : 'No pages in document yet'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Visible order</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {handoffPacket.visibleTitles.length > 0 ? handoffPacket.visibleTitles.join(' -> ') : 'No visible lanes yet'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Hidden backlog</p>
                      <p className="mt-1 text-xs leading-relaxed text-text-primary">
                        {handoffPacket.hiddenTitles.length > 0 ? handoffPacket.hiddenTitles.join(', ') : 'No hidden lanes'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 max-h-56 overflow-auto pr-1">
                    {handoffPacket.entries.map((entry) => (
                      <div key={`export-packet-${entry.sectionId}`} className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                            entry.status === 'empty'
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : entry.status === 'warning'
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : entry.status === 'hidden'
                                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}>
                            {entry.status}
                          </span>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{entry.pageTitle} / {entry.sectionTitle}</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-primary">{entry.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Audit queue</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{documentAudit.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{documentAudit.detail}</p>
                    {documentAudit.issues.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {documentAudit.issues.slice(0, 6).map((issue) => (
                          <div key={`export-${issue.sectionId}-${issue.title}`} className="rounded-md border border-border-subtle bg-white px-2.5 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                                    issue.severity === 'critical'
                                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                                      : issue.severity === 'warning'
                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                        : 'border-sky-200 bg-sky-50 text-sky-800'
                                  }`}>
                                    {issue.severity}
                                  </span>
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{issue.pageTitle} / {issue.sectionTitle}</p>
                                </div>
                                <p className="mt-1 text-xs font-semibold text-text-primary">{issue.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{issue.detail}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setShowExportPanel(false);
                                  reviewDocumentAuditIssue(issue);
                                }}
                                className="shrink-0 rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-2 text-[11px] font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5"
                              >
                                {issue.actionLabel}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Export read</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{downloadExportGate.ctaLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{downloadExportGate.detail}</p>
                  </div>
                <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Copy read</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{copyExportGate.ctaLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{copyExportGate.detail}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
              <button onClick={runHandoffAction} className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-primary/40 hover:bg-primary/5">
                {handoffGuidance.primaryActionLabel}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowExportPanel(false)} className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5">
                  Close
                </button>
                <button onClick={() => { void copyHandoffPacket(); }} className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5">
                  Copy handoff packet
                </button>
                <button onClick={runCopyV2Json} className="rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5">
                  {copyExportGate.ctaLabel}
                </button>
                <button
                  onClick={runDownloadV2Json}
                  className="rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  {downloadExportGate.ctaLabel}
                </button>
              </div>
            </div>
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
            <div className="px-3 py-3 border-b border-border-subtle bg-surface-subtle space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Action read</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{commandPaletteGuidance.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{commandPaletteGuidance.detail}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border-subtle bg-white px-2 py-1 text-[10px] text-text-secondary">
                  {commandPaletteGuidance.visibleCount} visible
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{commandPaletteGuidance.bestNextMove}</p>
                </div>
                <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{commandPaletteGuidance.decisionRule}</p>
                </div>
                <div className="rounded-md border border-border-subtle bg-white px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-primary">{commandPaletteGuidance.watchout}</p>
                </div>
              </div>
              {commandPaletteGuidance.suggestedQueries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {commandPaletteGuidance.suggestedQueries.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setCommandQuery(suggestion)}
                      className="rounded-full border border-border-subtle bg-white px-2.5 py-1 text-[11px] hover:border-primary/30 hover:bg-primary/5"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {pinnedCommands.length > 0 && (
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-[11px] uppercase updates-wide text-text-tertiary mb-1">Pinned</p>
                <div className="flex flex-wrap gap-1">
                  {pinnedCommands.map((label) => (
                    <button key={label} onClick={() => setCommandQuery(label)} className="text-[11px] px-2 py-1 rounded-full bg-amber-50 border border-amber-200 hover:border-amber-300">{label}</button>
                  ))}
                </div>
              </div>
            )}

            {recentCommands.length > 0 && (
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-[11px] uppercase updates-wide text-text-tertiary mb-1">Recent</p>
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
                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase updates-wide text-text-tertiary">{item.group}</p>
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
