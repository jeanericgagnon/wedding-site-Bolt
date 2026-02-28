import React, { useState, useCallback, useMemo } from 'react';
import { DeleteSectionModal } from './DeleteSectionModal';
import { SkeletonPickerModal } from './SkeletonPickerModal';
import {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
  Layout, Palette, FolderOpen, ChevronRight, ArrowLeft, Plus, LucideIcon,
  Layers, Eye, EyeOff, Trash2, GripVertical, Sparkles,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllSectionManifests, BuilderSectionDefinitionWithMeta, VariantMeta, getSectionManifest } from '../registry/sectionManifests';
import { BuilderSectionType, BuilderSectionInstance, createDefaultSectionInstance } from '../../types/builder/section';
import { createEmptyWeddingData, WeddingDataV1 } from '../../types/weddingData';
import { SectionRenderer } from './SectionRenderer';
import { selectActivePageSections } from '../state/builderSelectors';
import { CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';
import { getDefinition } from '../../sections/registry';
import { SECTION_REGISTRY as LEGACY_SECTION_REGISTRY } from '../../sections/sectionRegistry';

type SidebarTab = 'sections' | 'layers' | 'templates' | 'media';

const SECTION_ICONS: Record<string, LucideIcon> = {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
};

const LEGACY_PLACEHOLDER_TYPES = new Set<BuilderSectionType>(['quotes', 'menu', 'music', 'directions', 'video'] as BuilderSectionType[]);

const PREVIEW_FIXTURES_BY_TYPE: Partial<Record<BuilderSectionType, Record<string, unknown>>> = {
  hero: { title: 'We are getting married', headline: 'Alex & Sam', subtitle: 'June 12, 2027 · Rosewood Estate', showTitle: true },
  story: { title: 'Our Story', showTitle: true },
  venue: { title: 'Venue', showMap: true, showTitle: true },
  schedule: { title: 'Weekend Timeline', showTitle: true },
  travel: { title: 'Travel & Stay', showParking: true, showTitle: true },
  registry: { title: 'Registry', message: 'Your presence is gift enough, but here are a few ideas.', showTitle: true },
  faq: { title: 'FAQ', showTitle: true },
  rsvp: { title: 'RSVP', showTitle: true },
  gallery: { title: 'Gallery', showTitle: true },
  countdown: { showTitle: true, title: 'Countdown', message: 'Celebration starts soon' },
  'wedding-party': { showTitle: true, title: 'Wedding Party' },
  'dress-code': { showTitle: true, title: 'Dress Code', dressCodeLabel: 'Black Tie Optional' },
  accommodations: { showTitle: true, title: 'Accommodations' },
  contact: { showTitle: true, title: 'Questions?' },
  'footer-cta': { headline: 'Join us for our wedding', buttonLabel: 'RSVP' },
  quotes: { headline: 'Sweet words from our favorite people', eyebrow: 'Guest Notes' },
  menu: { headline: 'Dinner & Drinks', eyebrow: 'Reception Menu' },
  music: { headline: 'Our Playlist', eyebrow: 'On Repeat' },
  directions: { headline: 'How to get there', eyebrow: 'Directions' },
  video: { headline: 'Watch our story', eyebrow: 'Featured Video' },
};

const PREVIEW_FIXTURES_BY_VARIANT: Record<string, Record<string, unknown>> = {
  'hero:countdown': { title: 'Save the Date', subtitle: 'Ceremony starts in 47 days' },
  'hero:invitation': { title: 'Together with their families', subtitle: 'request the honor of your presence' },
  'hero:split': { title: 'Napa Weekend', subtitle: 'Vows · Dinner · Dancing' },
  'story:timeline': { title: 'Our Story in Three Chapters' },
  'story:milestones': { title: 'Moments That Brought Us Here' },
  'venue:detailsFirst': { title: 'Venue Details & Logistics', showMap: false },
  'venue:mapFirst': { title: 'Find the Estate', showMap: true },
  'schedule:agendaCards': { title: 'Weekend Events at a Glance' },
  'schedule:program': { title: 'Ceremony & Reception Program' },
  'travel:mapPins': { title: 'Where to Stay Nearby' },
  'travel:compact': { title: 'Quick Travel Notes' },
  'registry:featured': { title: 'Featured Gifts' },
  'registry:minimal': { title: 'Your Presence Is the Present' },
  'rsvp:multiEvent': { title: 'RSVP for Each Event' },
  'rsvp:formal': { title: 'Kindly Reply' },
  'gallery:polaroid': { title: 'Wedding Weekend Snapshots' },
  'gallery:filmStrip': { title: 'Story Frames' },
  'countdown:simple': { title: 'Big Day Countdown', message: 'We cannot wait to celebrate with you' },
  'dress-code:moodBoard': { title: 'Dress Inspiration', colorPalette: [{ id: 'c1', color: '#1f2937', label: 'Midnight' }, { id: 'c2', color: '#e5e7eb', label: 'Silver' }, { id: 'c3', color: '#9f1239', label: 'Rose' }] },
  'contact:form': { title: 'Need Help?', showTitle: true },
  'footer-cta:rsvpPush': { headline: 'RSVP by May 12' },
};

function hasLivePreviewSupport(sectionType: BuilderSectionType, variantId: string): boolean {
  if (Boolean(getDefinition(sectionType, variantId))) return true;
  if (LEGACY_PLACEHOLDER_TYPES.has(sectionType)) return false;
  return Boolean(LEGACY_SECTION_REGISTRY[sectionType]);
}

function buildPreviewSettings(sectionType: BuilderSectionType, variantId: string): Record<string, unknown> {
  return {
    showTitle: true,
    ...(PREVIEW_FIXTURES_BY_TYPE[sectionType] ?? {}),
    ...(PREVIEW_FIXTURES_BY_VARIANT[`${sectionType}:${variantId}`] ?? {}),
  };
}

type PreviewPhotoSet = 'romantic' | 'editorial' | 'coastal';
type PreviewSectionFamily = Extract<BuilderSectionType, 'hero' | 'story' | 'gallery' | 'rsvp' | 'venue' | 'schedule' | 'travel' | 'registry' | 'contact' | 'footer-cta'>;

interface PreviewPhotoRecipe {
  hero: string;
  gallery: string[];
  moments: string[];
  story?: string;
}

const PREVIEW_PHOTO_SET_OPTIONS: Array<{ id: PreviewPhotoSet; label: string }> = [
  { id: 'romantic', label: 'Romantic' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'coastal', label: 'Coastal' },
];

const PREVIEW_FAMILY_PHOTO_LIBRARY: Record<PreviewPhotoSet, Partial<Record<PreviewSectionFamily, PreviewPhotoRecipe>>> = {
  romantic: {
    hero: {
      hero: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
      gallery: [
        'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
        'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
        'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
      ],
      moments: ['Champagne toast on the terrace', 'Golden-hour vows in the garden', 'First dance under candlelight'],
      story: 'From quiet coffee-shop mornings to a candlelit first dance, this weekend is curated as an intimate love story for everyone we cherish.',
    },
    story: {
      hero: 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
      gallery: [
        'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
        'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
        'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
      ],
      moments: ['Handwritten letters before the ceremony', 'Portraits on the grand staircase', 'Quiet moment before guests arrive'],
    },
    gallery: {
      hero: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
      gallery: [
        'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
        'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
        'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
      ],
      moments: ['Ceremony aisle reveal', 'Candid laughs at cocktail hour', 'Sparkler exit at midnight'],
    },
    rsvp: {
      hero: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
      gallery: [
        'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
        'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
        'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
      ],
      moments: ['Invitation suite details', 'Wax-sealed RSVP cards', 'Floral stationery flat lay'],
    },
  },
  editorial: {
    hero: {
      hero: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
      gallery: [
        'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
        'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
        'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
      ],
      moments: ['Black-tie entry on marble steps', 'Editorial portrait in window light', 'Night reception with champagne tower'],
      story: 'A modern black-tie weekend styled with intentional typography, cinematic framing, and polished pacing from first glance to farewell.',
    },
    venue: {
      hero: 'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg',
      gallery: [
        'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg',
        'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
        'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
      ],
      moments: ['Estate exterior and arrival drive', 'Ceremony lawn wide angle', 'Reception hall detail lighting'],
    },
    schedule: {
      hero: 'https://images.pexels.com/photos/2072163/pexels-photo-2072163.jpeg',
      gallery: [
        'https://images.pexels.com/photos/2072163/pexels-photo-2072163.jpeg',
        'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
        'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
      ],
      moments: ['Welcome drinks at sunset', 'Ceremony cue and processional', 'Late-night dance floor energy'],
    },
    travel: {
      hero: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg',
      gallery: [
        'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg',
        'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg',
        'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg',
      ],
      moments: ['Arrival at boutique hotel', 'Guest shuttle drop-off at venue', 'Airport transfer and welcome bags'],
    },
    registry: {
      hero: 'https://images.pexels.com/photos/264787/pexels-photo-264787.jpeg',
      gallery: [
        'https://images.pexels.com/photos/264787/pexels-photo-264787.jpeg',
        'https://images.pexels.com/photos/1666065/pexels-photo-1666065.jpeg',
        'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
      ],
      moments: ['Curated home essentials', 'Honeymoon experiences board', 'Handwritten thank-you note'],
    },
    contact: {
      hero: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg',
      gallery: [
        'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg',
        'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
        'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
      ],
      moments: ['Planner response desk', 'Weekend concierge board', 'Guest support contact card'],
    },
    'footer-cta': {
      hero: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
      gallery: [
        'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
        'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
        'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
      ],
      moments: ['Final portrait embrace', 'Sunset confetti sendoff', 'Closing RSVP reminder frame'],
    },
  },
  coastal: {
    hero: {
      hero: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
      gallery: [
        'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
        'https://images.pexels.com/photos/457716/pexels-photo-457716.jpeg',
        'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
      ],
      moments: ['Ocean bluff ceremony view', 'Barefoot beach portraits', 'Lantern send-off by the water'],
      story: 'Sea breeze vows, warm neutrals, and sun-washed photo direction keep every preview calm, luminous, and destination-ready.',
    },
    gallery: {
      hero: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
      gallery: [
        'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
        'https://images.pexels.com/photos/457716/pexels-photo-457716.jpeg',
        'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
      ],
      moments: ['Ceremony from the bluff edge', 'Reception tables with ocean horizon', 'Blue-hour shoreline walk'],
    },
    venue: {
      hero: 'https://images.pexels.com/photos/21014/pexels-photo.jpg',
      gallery: [
        'https://images.pexels.com/photos/21014/pexels-photo.jpg',
        'https://images.pexels.com/photos/457716/pexels-photo-457716.jpeg',
        'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg',
      ],
      moments: ['Clifftop venue approach', 'Ceremony arch against sea', 'Reception canopy by the shore'],
    },
    travel: {
      hero: 'https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg',
      gallery: [
        'https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg',
        'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg',
        'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg',
      ],
      moments: ['Scenic drive-in route', 'Shuttle and valet drop zone', 'Hotel check-in with welcome cards'],
    },
  },
};

function getPreviewPhotoRecipe(photoSet: PreviewPhotoSet, sectionType: string): PreviewPhotoRecipe {
  const typedSection = sectionType as PreviewSectionFamily;
  const bySet = PREVIEW_FAMILY_PHOTO_LIBRARY[photoSet];
  return bySet[typedSection] ?? bySet.hero ?? PREVIEW_FAMILY_PHOTO_LIBRARY.editorial.hero!;
}

const buildPreviewWeddingData = (photoSet: PreviewPhotoSet, sectionType: string = 'hero'): WeddingDataV1 => {
  const recipe = getPreviewPhotoRecipe(photoSet, sectionType);
  const data = createEmptyWeddingData();
  data.couple.partner1Name = 'Alex';
  data.couple.partner2Name = 'Sam';
  data.couple.displayName = 'Alex & Sam';
  data.couple.story = recipe.story ?? 'From quiet coffee-shop mornings to a candlelit first dance, this weekend is curated as an editorial love story for everyone we cherish.';
  data.event.weddingDateISO = new Date('2027-06-12T17:00:00.000Z').toISOString();
  data.venues = [{ id: 'venue-1', name: 'Rosewood Estate', address: 'Napa Valley, CA' }];
  data.schedule = [
    { id: 's1', label: 'Welcome Dinner', startTimeISO: '2027-06-11T18:00:00.000Z', venueId: 'venue-1', notes: 'Cocktails and sunset toasts' },
    { id: 's2', label: 'Ceremony', startTimeISO: '2027-06-12T17:00:00.000Z', venueId: 'venue-1', notes: 'Please arrive 20 minutes early' },
    { id: 's3', label: 'Reception', startTimeISO: '2027-06-12T19:00:00.000Z', venueId: 'venue-1', notes: 'Dinner, dancing, and late-night bites' },
  ];
  data.travel = {
    notes: 'We suggest arriving by Friday afternoon to enjoy the full weekend experience.',
    parkingInfo: 'Complimentary valet and shuttle service available from partner hotels.',
    hotelInfo: 'Room blocks are reserved at The Archer, Oak & Ivy, and Riverstone House.',
    flightInfo: 'Nearest airports: SFO (90 min) and OAK (75 min).',
  };
  data.rsvp.deadlineISO = new Date('2027-05-12T00:00:00.000Z').toISOString();
  data.registry.links = [
    { id: 'reg-1', label: 'Honeymoon Fund', url: 'https://example.com/registry/honeymoon' },
    { id: 'reg-2', label: 'Williams Sonoma', url: 'https://example.com/registry/home' },
  ];
  data.faq = [
    { id: 'faq-1', q: 'Can I bring a plus one?', a: 'Please follow your invite details.' },
    { id: 'faq-2', q: 'Will photos be shared?', a: 'Yes — preview galleries will be available the week after.' },
  ];
  data.media.heroImageUrl = recipe.hero;
  data.media.gallery = recipe.gallery.map((url, i) => ({ id: `g${i + 1}`, url, caption: recipe.moments[i] ?? `Moment ${i + 1}` }));
  return data;
};

const SECTION_PICKER_EDITORIAL_NOTES: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Set the opening mood and emotional first impression.',
  story: 'Shape your narrative arc with moments guests remember.',
  venue: 'Clarify location details while keeping a polished aesthetic.',
  schedule: 'Organize weekend flow into readable editorial beats.',
  travel: 'Guide guests through logistics without visual clutter.',
  registry: 'Present gifting options with warmth and intention.',
  faq: 'Answer common questions with calm, concise structure.',
  rsvp: 'Drive responses with elegant, high-clarity interaction.',
  gallery: 'Showcase celebration frames with cinematic rhythm.',
  custom: 'Compose a bespoke section from flexible blocks.',
};

const SECTION_PICKER_STORY_LABEL: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Opening Frame',
  story: 'Narrative',
  venue: 'Setting',
  schedule: 'Timeline',
  travel: 'Guest Guide',
  registry: 'Gifting',
  faq: 'Guest Support',
  rsvp: 'Response Flow',
  gallery: 'Photo Story',
  custom: 'Bespoke Layout',
};

const SECTION_PICKER_COMPOSITION_CUES: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Sequence: wide scene → close portrait → detail.',
  story: 'Sequence: chapter opener → narrative support → emotional close.',
  gallery: 'Sequence: hero frame → supporting candids → final celebration.',
  rsvp: 'Sequence: stationery detail → form context → submit confidence cue.',
  venue: 'Sequence: arrival exterior → ceremony ground → reception interior.',
  schedule: 'Sequence: welcome beat → ceremony cue → late-night energy.',
  travel: 'Sequence: transit touchpoint → hotel proof → venue proximity.',
  registry: 'Sequence: featured gift → lifestyle context → gratitude detail.',
  contact: 'Sequence: planner/couple cue → contact options → reassurance copy.',
  'footer-cta': 'Sequence: farewell portrait → action button → timeline reminder.',
};

interface BuilderSidebarLibraryProps {
  activePageId: string | null;
}

export const BuilderSidebarLibrary: React.FC<BuilderSidebarLibraryProps> = ({ activePageId }) => {
  const { state, dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');
  const [expandedType, setExpandedType] = useState<BuilderSectionType | null>(null);
  const [showSkeletonPicker, setShowSkeletonPicker] = useState(false);
  const [previewPhotoSet, setPreviewPhotoSet] = useState<PreviewPhotoSet>('romantic');
  const previewWeddingData = useMemo(() => buildPreviewWeddingData(previewPhotoSet), [previewPhotoSet]);
  const manifests = getAllSectionManifests();

  const expandedManifest = expandedType
    ? manifests.find(m => m.type === expandedType) ?? null
    : null;

  function handleSectionClick(manifest: BuilderSectionDefinitionWithMeta) {
    if (manifest.type === 'custom') {
      setShowSkeletonPicker(true);
      return;
    }
    if (manifest.variantMeta.length > 1) {
      setExpandedType(manifest.type);
    } else {
      addSection(manifest.type, manifest.defaultVariant);
    }
  }

  function addSection(type: BuilderSectionType, variant: string) {
    if (!activePageId) return;
    dispatch(builderActions.addSectionByType(activePageId, type, undefined, variant));
    setExpandedType(null);
    setActiveTab('layers');
  }

  function addCustomSection(skeleton: CustomSectionSkeleton) {
    if (!activePageId) return;
    const instance = createDefaultSectionInstance('custom', 'default', 0);
    (instance as { settings: Record<string, unknown> }).settings = {
      skeletonId: skeleton.id,
      backgroundColor: skeleton.backgroundColor,
      paddingSize: skeleton.paddingSize,
      blocks: skeleton.blocks,
    };
    dispatch(builderActions.addSection(activePageId, instance));
    setShowSkeletonPicker(false);
    setActiveTab('layers');
    setTimeout(() => {
      const sectionEls = document.querySelectorAll('[data-section-id]');
      const last = sectionEls[sectionEls.length - 1];
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  const sections = selectActivePageSections(state);
  const [layerDragId, setLayerDragId] = useState<string | null>(null);

  const layerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleLayerDragStart = useCallback((event: DragStartEvent) => {
    setLayerDragId(event.active.id as string);
  }, []);

  const handleLayerDragEnd = useCallback((event: DragEndEvent) => {
    setLayerDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !activePageId) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    dispatch(builderActions.reorderSections(activePageId, reordered.map(s => s.id)));
  }, [sections, activePageId, dispatch]);

  const dragActiveSection = layerDragId ? sections.find(s => s.id === layerDragId) : null;

  const sidebarExpanded = activeTab === 'sections';

  return (
    <>
    <aside
      className={`flex-shrink-0 h-full min-h-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarExpanded ? 'w-full lg:w-96' : 'w-full lg:w-64'}`}
    >
      <div className="sticky top-0 z-20 flex border-b border-gray-200 bg-white">
        {([
          { id: 'layers', icon: Layers, label: 'Sections' },
          { id: 'sections', icon: Plus, label: 'Add' },
          { id: 'templates', icon: Palette, label: 'Templates' },
          { id: 'media', icon: FolderOpen, label: 'Media' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'templates') dispatch(builderActions.openTemplateGallery());
              else if (tab.id === 'media') dispatch(builderActions.openMediaLibrary());
              else { setActiveTab(tab.id); setExpandedType(null); }
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeTab === 'layers' && (
          <div className="p-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </p>
              <button
                onClick={() => { setActiveTab('sections'); setExpandedType(null); }}
                className="flex items-center gap-1 text-xs text-rose-600 font-medium hover:text-rose-700 transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Layers size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-gray-500">No sections yet</p>
                <p className="text-xs mt-1 text-gray-300 mb-4">Start building your wedding site</p>
                <button
                  onClick={() => { setActiveTab('sections'); setExpandedType(null); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  <Plus size={12} />
                  Add your first section
                </button>
              </div>
            ) : (
              <DndContext
                sensors={layerSensors}
                collisionDetection={closestCenter}
                onDragStart={handleLayerDragStart}
                onDragEnd={handleLayerDragEnd}
              >
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {sections.map((section, index) => (
                      <SortableLayerItem
                        key={section.id}
                        section={section}
                        index={index}
                        pageId={activePageId}
                        isSelected={state.selectedSectionId === section.id}
                        isDragging={layerDragId === section.id}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {dragActiveSection && (
                    <LayerItemOverlay section={dragActiveSection} />
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'sections' && !expandedManifest && (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50/60 p-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700 mb-2">Quick presets</p>
              <button
                onClick={() => {
                  const starter: BuilderSectionType[] = ['hero', 'story', 'schedule', 'travel', 'rsvp', 'gallery', 'faq'];
                  starter.forEach((type) => {
                    const manifest = getSectionManifest(type);
                    if (manifest) addSection(manifest.type, manifest.defaultVariant);
                  });
                }}
                className="mb-2 w-full rounded border border-rose-300 bg-white px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Add starter pack
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'hero', label: 'Hero' },
                  { type: 'story', label: 'Story' },
                  { type: 'schedule', label: 'Itinerary' },
                  { type: 'travel', label: 'Travel' },
                  { type: 'faq', label: 'FAQ' },
                  { type: 'rsvp', label: 'RSVP' },
                  { type: 'registry', label: 'Registry' },
                  { type: 'gallery', label: 'Gallery' },
                ].map((preset) => {
                  const manifest = getSectionManifest(preset.type as BuilderSectionType);
                  if (!manifest) return null;
                  return (
                    <button
                      key={preset.type}
                      onClick={() => addSection(manifest.type, manifest.defaultVariant)}
                      className="rounded border border-rose-200 bg-white px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 px-1 mb-3">
              <button
                onClick={() => setActiveTab('layers')}
                className="p-1 -ml-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Back to sections"
              >
                <ArrowLeft size={13} />
              </button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Add Section
              </p>
              <span className="ml-auto text-[10px] text-gray-300">{manifests.length} types</span>
            </div>
            <div className="mb-2.5 flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Photo mood</span>
              <div className="ml-auto flex items-center gap-1">
                {PREVIEW_PHOTO_SET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreviewPhotoSet(opt.id)}
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-1 ${
                      previewPhotoSet === opt.id
                        ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-[0_6px_16px_-12px_rgba(190,24,93,0.55)]'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {manifests.map(manifest => {
                const isCustom = manifest.type === 'custom';
                return (
                  <button
                    key={manifest.type}
                    onClick={() => handleSectionClick(manifest)}
                    className={`w-full text-left rounded-xl border transition-all duration-300 ease-out overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/80 focus-visible:ring-offset-2 active:scale-[0.992] ${
                      isCustom
                        ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50 hover:shadow-[0_10px_20px_-16px_rgba(217,119,6,0.5)]'
                        : 'border-gray-200 bg-white hover:border-rose-300 hover:shadow-[0_14px_30px_-18px_rgba(190,24,93,0.45)]'
                    }`}
                  >
                    <div className="pointer-events-none relative">
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-tr from-white/0 via-white/30 to-white/0" />
                      <BuilderVariantCardPreview
                        sectionType={manifest.type}
                        variantId={manifest.defaultVariant}
                        isHovered={false}
                        weddingData={buildPreviewWeddingData(previewPhotoSet, manifest.type)}
                      />
                      <div className="absolute top-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/90">
                        {manifest.defaultVariant}
                      </div>
                      <div className="absolute top-1.5 left-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-gray-600 shadow-sm">
                        {SECTION_PICKER_STORY_LABEL[manifest.type] ?? 'Section'}
                      </div>
                    </div>
                    <div className={`px-2.5 py-2 border-t ${isCustom ? 'border-amber-100' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className={`text-[11px] font-semibold truncate ${isCustom ? 'text-amber-800' : 'text-gray-700'}`}>{manifest.label}</p>
                          <p className="text-[9px] text-gray-400 truncate">
                            {isCustom ? '8 skeletons' : `${manifest.variantMeta.length} ${manifest.variantMeta.length === 1 ? 'style' : 'styles'}`}
                          </p>
                        </div>
                        <ChevronRight size={12} className={`flex-shrink-0 transition-colors ${isCustom ? 'text-amber-300 group-hover:text-amber-500' : 'text-gray-300 group-hover:text-rose-400'}`} />
                      </div>
                      <p className="mt-1 text-[9px] leading-relaxed text-gray-500 line-clamp-2">
                        {SECTION_PICKER_EDITORIAL_NOTES[manifest.type] ?? 'Curated section foundation with premium spacing and hierarchy.'}
                      </p>
                      <p className="mt-1 text-[8px] leading-relaxed text-gray-400 line-clamp-2">
                        {SECTION_PICKER_COMPOSITION_CUES[manifest.type] ?? 'Sequence: establish context → reveal detail → reinforce CTA.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sections' && expandedManifest && (
          <VariantPicker
            manifest={expandedManifest}
            onBack={() => setExpandedType(null)}
            onSelect={(variant) => addSection(expandedManifest.type, variant)}
            previewPhotoSet={previewPhotoSet}
            onPreviewPhotoSetChange={setPreviewPhotoSet}
            previewWeddingData={previewWeddingData}
          />
        )}
      </div>
    </aside>

    {showSkeletonPicker && (
      <SkeletonPickerModal
        onSelect={addCustomSection}
        onClose={() => setShowSkeletonPicker(false)}
      />
    )}
  </>
  );
};

interface VariantPickerProps {
  manifest: BuilderSectionDefinitionWithMeta;
  onBack: () => void;
  onSelect: (variantId: string) => void;
  previewPhotoSet: PreviewPhotoSet;
  onPreviewPhotoSetChange: (photoSet: PreviewPhotoSet) => void;
  previewWeddingData: WeddingDataV1;
}

const VariantPicker: React.FC<VariantPickerProps> = ({
  manifest,
  onBack,
  onSelect,
  previewPhotoSet,
  onPreviewPhotoSetChange,
  previewWeddingData,
}) => {
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          aria-label="Back to sections"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-rose-50 rounded flex items-center justify-center flex-shrink-0">
            <IconComp size={13} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 truncate">{manifest.label}</p>
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.14em]">Choose a style</p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Each style has a different layout feel. Pick one to add this section.</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Photo mood</span>
          <div className="ml-auto flex items-center gap-1">
            {PREVIEW_PHOTO_SET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPreviewPhotoSetChange(opt.id)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-1 ${
                  previewPhotoSet === opt.id
                    ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-[0_6px_16px_-12px_rgba(190,24,93,0.55)]'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-3.5">
        <div className="grid grid-cols-1 gap-3">
          {manifest.variantMeta.map((variant: VariantMeta) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              sectionType={manifest.type}
              isDefault={variant.id === manifest.defaultVariant}
              isHovered={hoveredVariant === variant.id}
              onHover={setHoveredVariant}
              onSelect={onSelect}
              previewWeddingData={previewWeddingData}
              previewPhotoSet={previewPhotoSet}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface VariantCardProps {
  variant: VariantMeta;
  sectionType: string;
  isDefault: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  previewWeddingData: WeddingDataV1;
  previewPhotoSet: PreviewPhotoSet;
}

const VARIANT_STYLE_TONE: Record<string, { label: string; accent: string; chip: string }> = {
  minimal: { label: 'Minimal', accent: 'from-stone-300/45 via-white/0 to-white/0', chip: 'border-stone-300 text-stone-600 bg-stone-50' },
  formal: { label: 'Formal', accent: 'from-slate-600/30 via-slate-300/10 to-white/0', chip: 'border-slate-300 text-slate-700 bg-slate-50' },
  editorial: { label: 'Editorial', accent: 'from-zinc-700/30 via-zinc-300/10 to-white/0', chip: 'border-zinc-300 text-zinc-700 bg-zinc-50' },
  cinematic: { label: 'Cinematic', accent: 'from-indigo-600/35 via-violet-400/15 to-white/0', chip: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
  interactive: { label: 'Interactive', accent: 'from-emerald-500/35 via-teal-300/10 to-white/0', chip: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  romantic: { label: 'Romantic', accent: 'from-rose-500/35 via-pink-300/15 to-white/0', chip: 'border-rose-300 text-rose-700 bg-rose-50' },
  playful: { label: 'Playful', accent: 'from-amber-400/40 via-orange-200/15 to-white/0', chip: 'border-amber-300 text-amber-700 bg-amber-50' },
};

const VARIANT_TONE_BY_ID: Record<string, keyof typeof VARIANT_STYLE_TONE> = {
  default: 'editorial',
  card: 'editorial',
  full: 'cinematic',
  fullbleed: 'cinematic',
  background: 'cinematic',
  photo: 'cinematic',
  split: 'editorial',
  splitMap: 'editorial',
  detailsFirst: 'formal',
  invitation: 'formal',
  tabs: 'interactive',
  dayTabs: 'interactive',
  accordion: 'interactive',
  carousel: 'interactive',
  mapPins: 'interactive',
  multiVenue: 'interactive',
  requestForm: 'interactive',
  chat: 'playful',
  polaroid: 'playful',
  illustrated: 'playful',
  rings: 'playful',
  timeline: 'formal',
  minimal: 'minimal',
  compact: 'minimal',
  banner: 'formal',
  featured: 'romantic',
  honeymoon: 'romantic',
  monogram: 'formal',
  letter: 'romantic',
};

function getVariantTone(variantId: string): { label: string; accent: string; chip: string } {
  const key = VARIANT_TONE_BY_ID[variantId] ?? 'editorial';
  return VARIANT_STYLE_TONE[key];
}

interface VariantArtDirection {
  photoSet?: PreviewPhotoSet;
  narrative?: string;
  description?: string;
  sequenceCue?: string;
  compositionCue?: string;
  hero?: string;
  gallery?: string[];
  moments?: string[];
}

const VARIANT_ART_DIRECTION: Record<string, VariantArtDirection> = {
  'hero:default': {
    photoSet: 'editorial',
    narrative: 'A cinematic opening frame that sets the tone for the full weekend.',
    description: 'Names, date, and hero image arranged as a polished opening tableau.',
    sequenceCue: 'Wide estate scene → couple portrait → date lockup.',
    compositionCue: 'Keep names center-weighted with horizon line in upper third.',
  },
  'hero:split': {
    photoSet: 'coastal',
    narrative: 'Two-scene opener balancing setting and editorial typography in one glance.',
    description: 'Dual-panel opener pairing location context with elevated type.',
    sequenceCue: 'Landscape establishing frame → portrait crop for typography side.',
    compositionCue: 'Reserve negative space on text panel and keep faces eye-level.',
  },
  'hero:invitation': {
    photoSet: 'romantic',
    narrative: 'Stationery-led hero with formal cadence and invitation-first hierarchy.',
    description: 'Invitation card aesthetic with letterpress-inspired typographic rhythm.',
    sequenceCue: 'Paper texture detail → couple monogram → formal copy block.',
    compositionCue: 'Favor centered symmetry and subtle texture over high contrast.',
  },
  'story:default': {
    photoSet: 'romantic',
    narrative: 'An intimate narrative pane with soft pacing and warm portrait support.',
    description: 'Balanced text-and-photo story module with premium reading flow.',
    sequenceCue: 'Memory opener → connective detail → emotional portrait.',
    compositionCue: 'Use one calm portrait with clear negative space near copy.',
  },
  'story:timeline': {
    photoSet: 'editorial',
    narrative: 'A chapter-by-chapter narrative arc from first meeting to the aisle.',
    description: 'Milestone timeline with editorial pacing and chronological clarity.',
    sequenceCue: 'Early chapter → turning point → proposal / pre-ceremony beat.',
    compositionCue: 'Alternate wide and close crops to keep vertical rhythm.',
  },
  'story:milestones': {
    photoSet: 'coastal',
    narrative: 'Key moments distilled into visual beats with premium editorial pacing.',
    description: 'Icon-led milestone cards that spotlight the couple\'s defining moments.',
    sequenceCue: 'First date cue → travel memory → engagement detail.',
    compositionCue: 'Prefer clean subject isolation for card-level legibility.',
  },
  'gallery:masonry': {
    photoSet: 'editorial',
    description: 'Varied-height collage with confident hero/support cadence.',
    sequenceCue: 'Hero portrait → reaction candids → dance-floor energy.',
    compositionCue: 'Anchor tallest column with highest-contrast portrait.',
  },
  'gallery:grid': {
    photoSet: 'romantic',
    description: 'Uniform gallery rhythm built for clean scanning and soft color continuity.',
    sequenceCue: 'Ceremony moment → couple portrait → guest celebration.',
    compositionCue: 'Keep neighboring frames tonally aligned for luxury consistency.',
  },
  'gallery:filmStrip': {
    photoSet: 'coastal',
    narrative: 'A sequence-driven highlight reel designed for momentum and memory.',
    description: 'Large hero frame with cinematic thumbnails for quick browsing.',
    sequenceCue: 'Establishing vista → intimate close-up → twilight finale.',
    compositionCue: 'Select a hero frame with clear focal subject and directional light.',
  },
  'rsvp:default': {
    photoSet: 'romantic',
    description: 'High-clarity RSVP section with elevated form framing.',
    sequenceCue: 'Stationery detail → form context image → confirmation cue.',
    compositionCue: 'Keep backdrop quiet so form fields stay dominant.',
  },
  'rsvp:card': {
    photoSet: 'editorial',
    description: 'Stepped RSVP flow using card choreography and progress cues.',
    sequenceCue: 'Welcome step → guest details → final response state.',
    compositionCue: 'Use neutral background with one focused accent image.',
  },
  'rsvp:formal': {
    photoSet: 'romantic',
    narrative: 'Invitation-language RSVP with black-tie restraint and confidence.',
    description: 'Formal response card styled like a classic invitation suite.',
    sequenceCue: 'Monogram detail → response options → deadline reminder.',
    compositionCue: 'Preserve whitespace and avoid busy background textures.',
  },
  'venue:card': {
    photoSet: 'editorial',
    description: 'Photo-forward venue cards that prioritize setting and logistics together.',
    sequenceCue: 'Arrival exterior → ceremony view → reception hall.',
    compositionCue: 'Lead with a wide exterior shot, then supporting interiors.',
  },
  'venue:mapFirst': {
    photoSet: 'coastal',
    description: 'Map-led orientation for guests who want logistics first.',
    sequenceCue: 'Regional map cue → venue exterior → route context.',
    compositionCue: 'Use readable aerial-style images with clean contrast.',
  },
  'venue:splitMap': {
    photoSet: 'editorial',
    description: 'Balanced split view for equal emphasis on details and map.',
    sequenceCue: 'Venue portrait → map panel → parking detail.',
    compositionCue: 'Keep map side uncluttered; text side needs clear hierarchy.',
  },
  'schedule:timeline': {
    photoSet: 'editorial',
    description: 'Vertical timeline with editorial rhythm from welcome to farewell.',
    sequenceCue: 'Welcome drinks → ceremony cue → afterparty moment.',
    compositionCue: 'Alternating accents work best with one dominant photo tone.',
  },
  'schedule:agendaCards': {
    photoSet: 'romantic',
    description: 'Card-based itinerary for easy scanning across the weekend.',
    sequenceCue: 'Day opener → ceremony block → reception block.',
    compositionCue: 'Keep image crops simple to avoid competing with time labels.',
  },
  'travel:hotelBlock': {
    photoSet: 'editorial',
    description: 'Hotel-first layout with polished booking and shuttle context.',
    sequenceCue: 'Hotel exterior → room atmosphere → venue transit.',
    compositionCue: 'Use straight-on architecture shots for trust and clarity.',
  },
  'travel:mapPins': {
    photoSet: 'coastal',
    description: 'Map + list pairing optimized for destination weddings.',
    sequenceCue: 'Regional arrival map → hotel markers → venue pin close-up.',
    compositionCue: 'Prefer high-legibility maps with minimal decorative overlays.',
  },
  'registry:featured': {
    photoSet: 'editorial',
    description: 'Editorial gift spotlight with premium image-first merchandising.',
    sequenceCue: 'Hero gift → supporting gifts → gratitude note.',
    compositionCue: 'Lead with one high-quality lifestyle image before product grid.',
  },
  'registry:cards': {
    photoSet: 'romantic',
    description: 'Simple registry cards with warm copy and clear outbound actions.',
    sequenceCue: 'Primary registry card → secondary links → closing thanks.',
    compositionCue: 'Keep iconography subtle; image accents should feel soft.',
  },
  'contact:form': {
    photoSet: 'editorial',
    description: 'Concierge-style contact section with direct support pathways.',
    sequenceCue: 'Planner cue → contact cards → closing reassurance.',
    compositionCue: 'Use calm neutral imagery so action links remain clear.',
  },
  'footer-cta:photo': {
    photoSet: 'romantic',
    description: 'Final emotional frame that drives one confident RSVP action.',
    sequenceCue: 'Closing portrait → RSVP CTA → deadline prompt.',
    compositionCue: 'Choose a farewell portrait with clear center-safe framing.',
  },
};

function getVariantArtDirection(sectionType: string, variantId: string): VariantArtDirection {
  return VARIANT_ART_DIRECTION[`${sectionType}:${variantId}`] ?? {};
}

function buildVariantPreviewWeddingData(
  sectionType: string,
  variantId: string,
  fallbackPhotoSet: PreviewPhotoSet,
): WeddingDataV1 {
  const artDirection = getVariantArtDirection(sectionType, variantId);
  const photoSet = artDirection.photoSet ?? fallbackPhotoSet;
  const data = buildPreviewWeddingData(photoSet, sectionType);
  if (artDirection.narrative) data.couple.story = artDirection.narrative;

  if (artDirection.hero) {
    data.media.heroImageUrl = artDirection.hero;
  }

  const gallerySource = artDirection.gallery ?? data.media.gallery.map((item) => item.url);
  const moments = artDirection.moments ?? gallerySource.map((_, i) => data.media.gallery[i]?.caption ?? `Moment ${i + 1}`);
  data.media.gallery = gallerySource.map((url, index) => ({
    id: `g${index + 1}`,
    url,
    caption: `${moments[index] ?? `Moment ${index + 1}`} · Frame ${index + 1}`,
  }));

  return data;
}

const VariantCard: React.FC<VariantCardProps> = ({
  variant,
  sectionType,
  isDefault,
  isHovered,
  onHover,
  onSelect,
  previewWeddingData,
  previewPhotoSet,
}) => {
  const tone = getVariantTone(variant.id);
  const artDirection = getVariantArtDirection(sectionType, variant.id);
  const curatedWeddingData = useMemo(() => (
    buildVariantPreviewWeddingData(sectionType, variant.id, previewPhotoSet)
  ), [sectionType, variant.id, previewPhotoSet, previewWeddingData]);
  const description = artDirection.description ?? variant.description;

  return (
    <button
      onMouseEnter={() => onHover(variant.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(variant.id)}
      className={`group relative w-full overflow-hidden rounded-2xl border bg-white text-left will-change-transform transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/80 focus-visible:ring-offset-2 active:scale-[0.992] ${
        isHovered
          ? 'border-rose-300 shadow-[0_20px_40px_-22px_rgba(190,24,93,0.58)] -translate-y-[2px]'
          : 'border-gray-200 hover:border-rose-200 hover:-translate-y-[1px] hover:shadow-[0_16px_30px_-18px_rgba(15,23,42,0.38)]'
      } ${isDefault ? 'ring-1 ring-rose-100/70' : ''}`}
      title={variant.description}
      aria-label={`Add ${variant.label} variant`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-br ${tone.accent} opacity-85`} />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_80%_14%,rgba(255,255,255,0.7),transparent_38%)]" />
      <BuilderVariantCardPreview
        sectionType={sectionType}
        variantId={variant.id}
        isHovered={isHovered}
        weddingData={curatedWeddingData}
      />

      <div className="relative px-3.5 py-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="block truncate text-[13px] font-semibold tracking-tight text-gray-800">{variant.label}</span>
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone.chip}`}>
                {tone.label}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-500">{description}</p>
            {artDirection.sequenceCue && (
              <p className="mt-1 text-[9px] leading-relaxed text-gray-400 line-clamp-1">{artDirection.sequenceCue}</p>
            )}
            {artDirection.compositionCue && (
              <p className="mt-0.5 text-[9px] leading-relaxed text-gray-400 line-clamp-1">{artDirection.compositionCue}</p>
            )}
            {isDefault && (
              <span className="mt-1.5 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-700">Default</span>
            )}
          </div>
          <span className={`mt-0.5 flex-shrink-0 transform transition-all duration-200 ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0 group-focus-visible:translate-x-0 group-focus-visible:opacity-100'}`}>
            <Plus size={13} className="text-rose-500" />
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-gray-400">
          <span>{isHovered ? 'Tap to add' : 'Preview ready'}</span>
          <span className={`${isHovered ? 'text-rose-500' : 'text-gray-300'} transition-colors`}>{isHovered ? 'Selected style' : 'Curated'}</span>
        </div>
      </div>
    </button>
  );
};

class VariantPreviewErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const BuilderVariantCardPreview: React.FC<{
  sectionType: string;
  variantId: string;
  isHovered: boolean;
  weddingData: WeddingDataV1;
}> = React.memo(({
  sectionType,
  variantId,
  isHovered,
  weddingData,
}) => {
  const typedSectionType = sectionType as BuilderSectionType;
  const fallback = <VariantPreviewSwatch variantId={variantId} sectionType={sectionType} isHovered={isHovered} />;

  if (!hasLivePreviewSupport(typedSectionType, variantId)) {
    return fallback;
  }

  return (
    <VariantPreviewErrorBoundary fallback={fallback}>
      <div className="pointer-events-none relative overflow-hidden bg-white">
        <div className="border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/60 to-white">
          <SectionTypePreview sectionType={sectionType} compact />
        </div>
        <LiveVariantPreview sectionType={typedSectionType} variantId={variantId} weddingData={weddingData} />
        <div className="absolute right-1.5 top-1.5 rounded-md bg-black/48 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/95 shadow-sm">
          {variantId}
        </div>
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/15 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-70'
          }`}
        />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/8 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-90' : 'opacity-50'}`} />
      </div>
    </VariantPreviewErrorBoundary>
  );
});

const LiveVariantPreview: React.FC<{ sectionType: BuilderSectionType; variantId: string; weddingData: WeddingDataV1 }> = React.memo(({
  sectionType,
  variantId,
  weddingData,
}) => {
  const section = useMemo(() => {
    const instance = createDefaultSectionInstance(sectionType, variantId, 0);
    instance.settings = buildPreviewSettings(sectionType, variantId);
    return instance;
  }, [sectionType, variantId]);

  return (
    <div className="relative h-20 overflow-hidden bg-white" style={{ contain: 'layout paint size' }}>
      <div className="absolute inset-0 origin-top-left scale-[0.26] transition-transform duration-500 ease-out group-hover:scale-[0.268] group-focus-visible:scale-[0.268]" style={{ width: '384%', minHeight: '260px' }}>
        <div className="h-full w-full saturate-[1.02] contrast-[1.01] transition-[filter] duration-500 ease-out group-hover:saturate-[1.05] group-focus-visible:saturate-[1.05]">
          <SectionRenderer section={section} weddingData={weddingData} isPreview siteSlug="preview" />
        </div>
      </div>
      <div className="absolute inset-0 border-t border-gray-100/80" />
    </div>
  );
});

const SectionTypePreview: React.FC<{ sectionType: string; compact?: boolean }> = ({ sectionType, compact = false }) => {
  const previews: Record<string, React.ReactNode> = {
    hero: (
      <div className="w-full h-16 relative flex flex-col items-center justify-center bg-slate-700">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-1">
          <div className="text-[7px] text-white/50 uppercase tracking-widest font-medium">We are getting married</div>
          <div className="text-[13px] font-bold text-white">Sarah & James</div>
          <div className="text-[7px] text-white/60">June 14, 2025 · New York</div>
          <div className="mt-0.5 px-2.5 py-0.5 border border-white/40 rounded text-[7px] text-white/80 font-semibold">RSVP Now</div>
        </div>
      </div>
    ),
    story: (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="flex-1 flex flex-col justify-center gap-1 px-3">
          <div className="text-[7px] text-gray-400 uppercase tracking-widest">Our Story</div>
          <div className="h-1 rounded-sm bg-gray-700 w-20" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-4/5" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-3/5" />
        </div>
        <div className="w-2/5 bg-gray-300" />
      </div>
    ),
    venue: (
      <div className="w-full h-16 flex flex-col bg-white">
        <div className="h-8 w-full relative bg-slate-200">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px)' }} />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400" />
        </div>
        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="flex-1 h-1 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    schedule: (
      <div className="w-full h-16 flex flex-col justify-center px-3 gap-0 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest mb-1">Schedule</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-gray-700' : 'bg-gray-300'}`} />
              {i < 2 && <div className="w-px h-2 bg-gray-200" />}
            </div>
            <div className="flex-1 flex items-center gap-1 pt-0.5">
              <div className={`h-1 rounded-sm flex-1 ${i === 0 ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className="text-[6px] text-gray-400 font-mono">{['4pm','5pm','7pm'][i]}</div>
            </div>
          </div>
        ))}
      </div>
    ),
    travel: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Travel & Hotels</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">BOOK</div>
          </div>
        ))}
      </div>
    ),
    registry: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Registry</div>
        {[0,1].map(i => (
          <div key={i} className="h-5 rounded-lg flex items-center px-2 gap-2 bg-white border border-gray-200">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-700 text-white">View</div>
          </div>
        ))}
      </div>
    ),
    faq: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">FAQ</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center justify-between px-1.5 py-0.5 rounded border border-gray-100 bg-gray-50">
            <div className={`h-1.5 rounded-sm ${i === 0 ? 'w-20 bg-gray-600' : 'w-16 bg-gray-300'}`} />
            <div className="text-[9px] font-bold text-gray-400">{i === 0 ? '−' : '+'}</div>
          </div>
        ))}
      </div>
    ),
    rsvp: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="h-4 rounded-md border border-gray-200 bg-white flex items-center px-2">
          <div className="flex-1 h-0.5 rounded-sm bg-gray-200" />
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-500 font-medium">Yes</div>
          </div>
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-400 font-medium">No</div>
          </div>
        </div>
        <div className="h-4 rounded-md bg-gray-700 flex items-center justify-center">
          <div className="text-[7px] text-white font-semibold">SEND RSVP</div>
        </div>
      </div>
    ),
    gallery: (
      <div className="w-full h-16 flex items-start gap-0.5 px-1.5 pt-1.5 pb-1 bg-gray-50">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-7 rounded-sm bg-gray-300" />
          <div className="h-4 rounded-sm bg-gray-200" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-4 rounded-sm bg-gray-200" />
          <div className="h-6 rounded-sm bg-gray-300" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-5 rounded-sm bg-gray-300" />
          <div className="h-5 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    countdown: (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Counting down to</div>
        <div className="flex items-end gap-1.5">
          {[{n:'47',l:'Days'},{n:'12',l:'Hrs'},{n:'38',l:'Min'}].map(({n,l}) => (
            <div key={l} className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-gray-800 text-white">{n}</div>
              <div className="text-[5px] mt-0.5 text-gray-400 font-medium">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    'wedding-party': (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-2 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest text-center">Wedding Party</div>
        <div className="flex justify-center gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full ${i < 2 ? 'bg-gray-300' : 'bg-gray-200'}`} />
              <div className="w-5 h-0.5 rounded-sm bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    ),
    'dress-code': (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="w-1 h-full bg-gray-500" />
        <div className="flex-1 flex flex-col justify-center gap-0.5 px-2">
          <div className="text-[6px] text-gray-400 uppercase tracking-widest">What to wear</div>
          <div className="text-[10px] font-bold text-gray-800">Black Tie</div>
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
        </div>
        <div className="w-10 flex items-center justify-center pr-1">
          <div className="w-7 h-8 rounded-sm bg-gray-200 border border-gray-300 flex items-end justify-center pb-0.5">
            <div className="w-3.5 h-5 rounded-t-full bg-gray-300" />
          </div>
        </div>
      </div>
    ),
    accommodations: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Accommodations</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">Book</div>
          </div>
        ))}
      </div>
    ),
    contact: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Questions?</div>
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className="flex-1 h-8 rounded-lg p-1.5 flex flex-col gap-0.5 bg-gray-50 border border-gray-100">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
            </div>
          ))}
        </div>
      </div>
    ),
    'footer-cta': (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-800">
        <div className="text-[7px] text-white/50">We hope to see you there</div>
        <div className="text-[10px] font-bold text-white">Sarah & James</div>
        <div className="px-3 py-0.5 border border-white/30 rounded-full text-[7px] text-white/70 font-semibold">RSVP Now</div>
      </div>
    ),
    custom: (
      <div className="w-full h-16 bg-amber-50 flex flex-col px-2.5 pt-2 pb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 rounded-sm bg-amber-400 w-14" />
          <div className="h-1 rounded-sm bg-amber-200 flex-1" />
        </div>
        <div className="flex gap-1.5 flex-1">
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
            <div className="mt-auto h-2 rounded bg-amber-400 w-8" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-2.5 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-2/3" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="text-[9px] font-black text-amber-600 leading-none">42</div>
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
          </div>
        </div>
      </div>
    ),
    quotes: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Quotes & Wishes</div>
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-3/5" />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <div className="h-0.5 w-12 rounded-sm bg-gray-300" />
        </div>
      </div>
    ),
    menu: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Dining & Menu</div>
        <div className="flex gap-1">
          {['Starter','Main','Dessert'].map(c => (
            <div key={c} className="flex-1 h-3 rounded text-[5px] flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-200 font-medium">{c}</div>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-3/4" />
        </div>
      </div>
    ),
    music: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-900">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Music & Playlist</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1">
            <div className="text-[6px] text-gray-500 w-3 text-right">{i+1}</div>
            <div className={`flex-1 h-0.5 rounded-sm ${i === 0 ? 'bg-gray-300' : 'bg-gray-600'}`} />
            <div className="w-4 h-0.5 rounded-sm bg-gray-600" />
          </div>
        ))}
      </div>
    ),
    directions: (
      <div className="w-full h-16 flex bg-white">
        <div className="flex-1 flex flex-col justify-center gap-1 px-2">
          <div className="text-[7px] text-gray-400 uppercase tracking-widest">Directions</div>
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
          <div className="w-8 h-2.5 rounded text-[5px] flex items-center justify-center bg-gray-700 text-white font-semibold mt-0.5">Maps</div>
        </div>
        <div className="w-2/5 relative bg-slate-200">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400" />
        </div>
      </div>
    ),
    video: (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-900">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Video</div>
        <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center border border-gray-600">
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white/70 ml-0.5" />
        </div>
      </div>
    ),
  };

  const preview = previews[sectionType] ?? <div className="w-full h-16 bg-gray-100" />;
  if (compact) {
    return <div className="w-full h-10 overflow-hidden">{preview}</div>;
  }
  return <>{preview}</>;
};

const VariantPreviewSwatch: React.FC<{ variantId: string; sectionType?: string; isHovered: boolean }> = ({ variantId, sectionType, isHovered }) => {
  const h = isHovered;
  const c = h ? 'bg-rose-200' : 'bg-gray-200';
  const cd = h ? 'bg-rose-300' : 'bg-gray-300';
  const cl = h ? 'bg-rose-100' : 'bg-gray-100';

  const swatches: Record<string, React.ReactNode> = {

    /* ── HERO ── */
    hero_default: (
      <div className={`w-full h-20 relative flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-900' : 'bg-slate-700'}`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-1.5 w-full px-4">
          <div className="w-28 h-2.5 bg-white/90 rounded-sm" />
          <div className="w-20 h-1.5 bg-white/60 rounded-sm" />
          <div className="w-12 h-5 mt-1 bg-white/20 border border-white/40 rounded text-[8px] text-white/80 flex items-center justify-center font-medium">RSVP</div>
        </div>
      </div>
    ),
    hero_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className="w-4 h-4 rounded-full border-2 border-rose-300 flex items-center justify-center mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
        </div>
        <div className={`w-28 h-2.5 rounded-sm ${h ? 'bg-rose-400' : 'bg-gray-800'}`} />
        <div className={`w-20 h-1.5 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className={`w-16 h-1 rounded-sm ${h ? 'bg-rose-100' : 'bg-gray-200'}`} />
      </div>
    ),
    hero_fullbleed: (
      <div className={`w-full h-20 relative flex items-end transition-colors ${h ? 'bg-rose-900' : 'bg-gray-800'}`}>
        <div className={`absolute inset-0 ${h ? 'bg-rose-950/50' : 'bg-black/50'}`} />
        <div className="relative w-full px-3 pb-3">
          <div className="w-24 h-3 bg-white rounded-sm mb-1.5" />
          <div className="w-16 h-1.5 bg-white/60 rounded-sm" />
        </div>
      </div>
    ),

    /* ── STORY ── */
    story_default: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-3">
          <div className={`w-16 h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
          <div className={`h-1 rounded-sm w-3/5 ${c}`} />
        </div>
        <div className={`w-2/5 h-full ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
      </div>
    ),
    story_centered: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 px-4 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-10 h-10 rounded-full ${c}`} />
        <div className={`w-20 h-1.5 rounded-sm ${cd}`} />
        <div className={`w-full h-1 rounded-sm ${c}`} />
        <div className={`w-4/5 h-1 rounded-sm ${c}`} />
      </div>
    ),
    story_split: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-1/2 h-full ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className="w-1/2 flex flex-col justify-center gap-1.5 px-2.5">
          <div className={`w-3 h-3 rounded-full ${h ? 'bg-rose-300' : 'bg-gray-300'} mb-0.5`} />
          <div className={`h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
          <div className={`h-1 rounded-sm w-3/5 ${c}`} />
        </div>
      </div>
    ),

    /* ── VENUE ── */
    venue_card: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0, 1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white shadow-sm ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-7 w-full ${i === 0 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-100' : 'bg-gray-100')}`} />
            <div className="px-1.5 pt-1 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
              <div className="flex items-center gap-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
                <div className={`flex-1 h-1 rounded-sm ${cl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    venue_mapFirst: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`h-12 w-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-30 ${h ? 'bg-rose-300' : 'bg-slate-400'}`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px)' }} />
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${h ? 'border-rose-500 bg-rose-400' : 'border-red-500 bg-red-400'}`} />
        </div>
        <div className={`flex-1 flex items-center gap-2 px-2 ${h ? 'bg-rose-50' : 'bg-white'}`}>
          <div className={`h-1.5 rounded-sm flex-1 ${c}`} />
          <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        </div>
      </div>
    ),
    venue_splitMap: (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-2.5 bg-white">
          <div className={`w-3 h-3 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-400'} mb-0.5`} />
          <div className={`h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-3/4 ${c}`} />
        </div>
        <div className={`w-2/5 h-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-25`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px)' }} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 ${h ? 'border-rose-500 bg-rose-400' : 'border-red-400 bg-red-300'}`} />
        </div>
      </div>
    ),
    venue_detailsFirst: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-0.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── SCHEDULE ── */
    schedule_timeline: (
      <div className={`w-full h-20 flex flex-col justify-center px-3 gap-0 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-2 py-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? (h ? 'bg-rose-500' : 'bg-gray-600') : c}`} />
              {i < 2 && <div className={`w-0.5 h-3 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />}
            </div>
            <div className="flex-1 space-y-0.5 pt-0.5">
              <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
              <div className={`h-1 rounded-sm w-16 ${cl}`} />
            </div>
            <div className={`text-[8px] font-mono ${h ? 'text-rose-400' : 'text-gray-400'} pt-0.5 flex-shrink-0`}>4:00</div>
          </div>
        ))}
      </div>
    ),
    schedule_dayTabs: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex border-b border-gray-200 px-2 pt-1.5 gap-1">
          {['Fri','Sat','Sun'].map((d, i) => (
            <div key={d} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-t-sm ${i === 1 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'text-rose-400' : 'text-gray-400')}`}>{d}</div>
          ))}
        </div>
        <div className="flex-1 px-3 py-2 space-y-1">
          {[0,1].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
              <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>2pm</div>
            </div>
          ))}
        </div>
      </div>
    ),
    schedule_agendaCards: (
      <div className={`w-full h-20 flex items-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map(i => (
          <div key={i} className={`flex-1 h-14 rounded-lg flex flex-col justify-between p-1.5 ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div>
              <div className={`text-[7px] font-semibold mb-0.5 ${h ? 'text-rose-400' : 'text-gray-400'}`}>3:00 PM</div>
              <div className={`h-1.5 rounded-sm ${cd}`} />
            </div>
            <div className={`h-1 rounded-sm w-2/3 ${c}`} />
          </div>
        ))}
      </div>
    ),

    /* ── TRAVEL ── */
    travel_list: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`flex-1 h-1 rounded-sm ${c}`} />
            <div className={`w-8 h-1 rounded-sm ${cl}`} />
          </div>
        ))}
      </div>
    ),
    travel_hotelBlock: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-6 ${h ? 'bg-rose-100' : 'bg-slate-100'}`} />
            <div className="p-1.5 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className="flex items-center gap-0.5 mt-0.5">
                <div className={`w-7 h-3.5 rounded text-[6px] flex items-center justify-center font-bold ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>BOOK</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── REGISTRY ── */
    registry_cards: (
      <div className={`w-full h-20 flex flex-col justify-center px-3 gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-14 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className={`h-6 rounded-lg flex items-center px-2 gap-2 ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${c}`} />
            <div className={`flex-1 h-1 rounded-sm ${c}`} />
            <div className={`w-10 h-3 rounded text-[7px] flex items-center justify-center font-semibold ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>View</div>
          </div>
        ))}
      </div>
    ),
    registry_featured: (
      <div className={`w-full h-20 flex items-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map((i) => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'} ${i === 1 ? 'scale-105' : ''}`}>
            <div className={`h-8 ${h ? 'bg-rose-100' : 'bg-gray-100'} flex items-center justify-center`}>
              <div className={`w-3 h-3 rounded-sm ${c}`} />
            </div>
            <div className="p-1 flex flex-col gap-0.5">
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-2/3 ${cl}`} />
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── FAQ ── */
    faq_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-2 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-12 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className="space-y-0.5">
            <div className={`h-1.5 rounded-sm w-24 ${cd}`} />
            <div className={`h-1 rounded-sm w-full ${cl}`} />
            <div className={`h-1 rounded-sm w-4/5 ${cl}`} />
          </div>
        ))}
      </div>
    ),
    faq_accordion: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        {[0,1,2].map((i) => (
          <div key={i} className={`flex items-center justify-between px-2 py-1 rounded-md border transition-colors ${i === 0 ? (h ? 'border-rose-300 bg-rose-100' : 'border-gray-300 bg-white') : (h ? 'border-rose-100 bg-rose-50' : 'border-gray-100 bg-white')}`}>
            <div className={`h-1.5 w-20 rounded-sm ${i === 0 ? cd : c}`} />
            <div className={`text-[10px] font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>{i === 0 ? '−' : '+'}</div>
          </div>
        ))}
      </div>
    ),

    /* ── RSVP ── */
    rsvp_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        <div className={`h-5 rounded-md border ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'} flex items-center px-2`}>
          <div className={`flex-1 h-1 rounded-sm ${cl}`} />
        </div>
        <div className="flex gap-1">
          <div className={`flex-1 h-5 rounded-md border flex items-center px-1.5 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`text-[7px] ${h ? 'text-rose-500' : 'text-gray-500'} font-medium`}>Yes</div>
          </div>
          <div className={`flex-1 h-5 rounded-md border flex items-center px-1.5 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
            <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'} font-medium`}>No</div>
          </div>
        </div>
        <div className={`h-5 rounded-md flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
          <div className="text-[8px] text-white font-semibold tracking-wide">SEND RSVP</div>
        </div>
      </div>
    ),
    rsvp_inline: (
      <div className={`w-full h-20 flex items-center px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-full h-11 rounded-xl border flex items-center px-2.5 gap-2 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
            <div className={`h-4 rounded-md border w-full ${h ? 'border-rose-100' : 'border-gray-100'}`} />
          </div>
          <div className={`w-14 h-7 rounded-lg flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
            <div className="text-[7px] text-white font-bold">RSVP</div>
          </div>
        </div>
      </div>
    ),

    /* ── GALLERY ── */
    gallery_masonry: (
      <div className={`w-full h-20 flex items-start gap-0.5 px-1.5 pt-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-8 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-7 rounded-sm ${h ? 'bg-rose-100' : 'bg-gray-100'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
      </div>
    ),
    gallery_grid: (
      <div className={`w-full h-20 flex flex-col items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="grid grid-cols-3 gap-0.5 w-full px-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-sm ${i % 2 === 0 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-300' : 'bg-gray-300')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_filmStrip: (
      <div className={`w-full h-20 flex flex-col gap-0.5 p-1.5 transition-colors ${h ? 'bg-gray-900' : 'bg-gray-800'}`}>
        <div className={`flex-1 rounded-sm ${h ? 'bg-rose-300/70' : 'bg-gray-500'}`} />
        <div className="flex gap-0.5">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`flex-1 h-4 rounded-sm ${i === 2 ? (h ? 'bg-rose-300/80 ring-1 ring-rose-400' : 'bg-gray-400 ring-1 ring-white/20') : (h ? 'bg-gray-600' : 'bg-gray-600')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_polaroid: (
      <div className={`w-full h-20 flex items-center justify-center gap-1 transition-colors ${h ? 'bg-amber-50' : 'bg-stone-100'}`}>
        {[{r:-6,w:22},{r:3,w:26},{r:-3,w:22}].map(({r,w}, i) => (
          <div
            key={i}
            className="bg-white shadow-md flex-shrink-0"
            style={{ transform: `rotate(${r}deg)`, padding: '3px 3px 9px 3px', width: `${w}px` }}
          >
            <div className={`w-full aspect-square ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    ),

    /* ── COUNTDOWN ── */
    countdown_default: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`text-[8px] font-medium ${h ? 'text-rose-400' : 'text-gray-400'} tracking-widest uppercase`}>Counting down to</div>
        <div className="flex items-end gap-1.5">
          {[{n:'047',l:'Days'},{n:'12',l:'Hrs'},{n:'38',l:'Min'}].map(({n,l}) => (
            <div key={l} className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${h ? 'bg-rose-500 text-white' : 'bg-gray-800 text-white'}`}>{n.slice(-2)}</div>
              <div className={`text-[6px] mt-0.5 ${h ? 'text-rose-400' : 'text-gray-400'} font-medium`}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    countdown_banner: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-500' : 'bg-gray-800'}`}>
        <div className="flex items-center gap-3">
          <div className="text-[8px] text-white/70 font-medium">Until the big day</div>
          <div className="flex items-center gap-1">
            {['47d','12h','38m'].map(t => (
              <div key={t} className="bg-white/20 rounded px-1 py-0.5">
                <span className="text-[9px] text-white font-bold">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    /* ── WEDDING PARTY ── */
    'wedding-party_default': (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
        <div className="flex justify-center gap-1">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full ${i < 2 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-300' : 'bg-gray-300')}`} />
              <div className={`w-6 h-1 rounded-sm ${c}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'wedding-party_grid': (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
        <div className="grid grid-cols-5 gap-1 px-1">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-full aspect-square rounded-full ${i % 3 === 0 ? (h ? 'bg-rose-300' : 'bg-gray-300') : (h ? 'bg-rose-200' : 'bg-gray-200')}`} />
              <div className={`w-full h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── DRESS CODE ── */
    'dress-code_default': (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-stone-50' : 'bg-gray-50'}`}>
        <div className={`w-1.5 h-full ${h ? 'bg-rose-400' : 'bg-gray-400'}`} />
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-3">
          <div className={`text-[7px] font-semibold uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>What to wear</div>
          <div className={`text-[10px] font-bold ${h ? 'text-rose-700' : 'text-gray-700'}`}>Black Tie</div>
          <div className={`h-1 rounded-sm w-full ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
        </div>
        <div className="w-12 flex flex-col items-center justify-center gap-1 pr-2">
          <div className={`w-8 h-10 rounded-sm ${h ? 'bg-rose-100 border border-rose-200' : 'bg-gray-100 border border-gray-200'} flex items-end justify-center pb-1`}>
            <div className={`w-4 h-6 rounded-t-full border-b-0 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    ),
    'dress-code_banner': (
      <div className={`w-full h-20 flex items-center justify-between px-4 transition-colors ${h ? 'bg-rose-900' : 'bg-gray-900'}`}>
        <div className="flex flex-col gap-1">
          <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-300' : 'text-gray-400'}`}>Dress Code</div>
          <div className="text-[11px] font-bold text-white">Black Tie</div>
        </div>
        <div className={`w-px h-8 ${h ? 'bg-rose-700' : 'bg-gray-700'}`} />
        <div className={`text-[8px] text-right ${h ? 'text-rose-300' : 'text-gray-400'} max-w-16 leading-tight`}>Formal attire required</div>
      </div>
    ),

    /* ── ACCOMMODATIONS ── */
    accommodations_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className="flex items-start gap-1.5">
            <div className={`w-2 h-2 rounded-sm flex-shrink-0 mt-0.5 ${c}`} />
            <div className="flex-1 space-y-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
            </div>
            <div className={`w-10 h-4 rounded text-[7px] flex items-center justify-center font-semibold flex-shrink-0 ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>Book</div>
          </div>
        ))}
      </div>
    ),
    accommodations_cards: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-5 ${h ? 'bg-rose-100' : 'bg-slate-100'}`} />
            <div className="p-1.5 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-2/3 ${cl}`} />
              <div className={`mt-0.5 h-3 rounded text-[6px] flex items-center justify-center font-bold w-full ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>BOOK NOW</div>
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── CONTACT ── */
    contact_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-14 ${cd}`} />
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className={`flex-1 h-10 rounded-lg p-1.5 flex flex-col gap-0.5 ${h ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className={`w-4 h-4 rounded-full ${c}`} />
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    contact_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        <div className={`h-1 rounded-sm w-24 ${c}`} />
        <div className={`flex items-center gap-3 mt-1`}>
          {[0,1,2].map(i => (
            <div key={i} className={`flex items-center gap-0.5`}>
              <div className={`w-2 h-2 rounded-full ${c}`} />
              <div className={`h-1 rounded-sm w-8 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── FOOTER CTA ── */
    'footer-cta_default': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-600' : 'bg-gray-800'}`}>
        <div className="text-[8px] text-white/60 font-medium">We hope to see you there</div>
        <div className="text-[11px] text-white font-bold">Sarah & James</div>
        <div className={`mt-0.5 px-4 py-1 rounded-full border border-white/40 text-[8px] text-white font-semibold`}>RSVP Now</div>
      </div>
    ),
    'footer-cta_minimal': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'} mb-1`} />
        <div className={`text-[9px] font-semibold ${h ? 'text-rose-600' : 'text-gray-700'}`}>Join us on our big day</div>
        <div className={`px-4 py-1 rounded-full text-[8px] font-semibold ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>RSVP Now</div>
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'} mt-1`} />
      </div>
    ),

    /* ── CUSTOM ── */
    custom_default: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <div className="flex gap-1 mb-0.5">
          {['H','P','B'].map(t => (
            <div key={t} className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${h ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{t}</div>
          ))}
        </div>
        <div className={`h-1.5 rounded-sm w-20 ${h ? 'bg-amber-300' : 'bg-gray-300'}`} />
        <div className={`h-1 rounded-sm w-full mx-4 ${h ? 'bg-amber-200' : 'bg-gray-200'}`} />
        <div className={`h-5 rounded-md w-12 ${h ? 'bg-amber-400' : 'bg-gray-400'} mt-0.5`} />
      </div>
    ),

    /* ── HERO new variants ── */
    hero_split: (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className={`w-1/2 h-full ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className={`w-1/2 flex flex-col justify-center gap-1.5 px-3 ${h ? 'bg-rose-50' : 'bg-white'}`}>
          <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>We're Getting Married</div>
          <div className={`w-20 h-2.5 rounded-sm ${cd}`} />
          <div className={`w-14 h-1.5 rounded-sm ${c}`} />
          <div className={`mt-1 w-12 h-4 rounded border ${h ? 'border-rose-400 text-rose-500' : 'border-gray-400 text-gray-500'} text-[7px] flex items-center justify-center font-semibold`}>RSVP</div>
        </div>
      </div>
    ),
    hero_botanical: (
      <div className={`w-full h-20 relative flex flex-col items-center justify-center transition-colors ${h ? 'bg-rose-100' : 'bg-stone-100'}`}>
        <div className={`absolute top-0 left-0 w-8 h-8 rounded-br-full opacity-40 ${h ? 'bg-rose-300' : 'bg-green-200'}`} />
        <div className={`absolute bottom-0 right-0 w-10 h-10 rounded-tl-full opacity-40 ${h ? 'bg-rose-200' : 'bg-green-100'}`} />
        <div className="relative flex flex-col items-center gap-1">
          <div className={`text-[7px] italic ${h ? 'text-rose-400' : 'text-gray-400'}`}>with love</div>
          <div className={`w-22 h-2.5 rounded-sm ${h ? 'bg-rose-500' : 'bg-gray-700'}`} style={{ width: '5.5rem' }} />
          <div className={`w-16 h-1.5 rounded-sm ${c}`} />
        </div>
      </div>
    ),
    hero_video: (
      <div className={`w-full h-20 relative flex flex-col items-center justify-center ${h ? 'bg-rose-950' : 'bg-gray-900'}`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
        <div className="relative flex flex-col items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full border-2 ${h ? 'border-rose-400' : 'border-white/50'} flex items-center justify-center mb-0.5`}>
            <div className={`w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] ${h ? 'border-l-rose-400' : 'border-l-white/60'} ml-0.5`} />
          </div>
          <div className="w-24 h-2 bg-white/80 rounded-sm" />
          <div className="w-16 h-1.5 bg-white/50 rounded-sm" />
        </div>
      </div>
    ),
    hero_invitation: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-amber-50'}`}>
        <div className={`w-28 h-16 flex flex-col items-center justify-center gap-0.5 border-2 ${h ? 'border-rose-200' : 'border-amber-200'} rounded-sm`}>
          <div className={`text-[5px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-amber-600'}`}>Together with their families</div>
          <div className={`w-16 h-2 rounded-sm ${cd}`} />
          <div className={`w-px h-2 ${h ? 'bg-rose-200' : 'bg-amber-200'}`} />
          <div className={`text-[5px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-amber-600'}`}>request the honour of your</div>
          <div className={`w-10 h-1.5 rounded-sm ${c}`} />
        </div>
      </div>
    ),
    hero_countdown: (
      <div className={`w-full h-20 relative flex flex-col transition-colors ${h ? 'bg-rose-900' : 'bg-slate-700'}`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-1">
          <div className="text-[8px] font-bold text-white">Sarah & James</div>
          <div className="text-[6px] text-white/60">June 14 · New York</div>
        </div>
        <div className={`relative flex justify-center gap-1.5 pb-2`}>
          {['47d','12h','38m'].map(t => (
            <div key={t} className={`${h ? 'bg-rose-500/80' : 'bg-black/40'} border border-white/20 rounded px-1.5 py-0.5`}>
              <span className="text-[8px] text-white font-bold">{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── STORY new variants ── */
    story_timeline: (
      <div className={`w-full h-20 flex flex-col justify-center px-3 gap-0 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`text-[7px] uppercase tracking-widest mb-1 ${h ? 'text-rose-400' : 'text-gray-400'}`}>Our Journey</div>
        {['2019','2021','2023'].map((yr, i) => (
          <div key={yr} className="flex items-center gap-1.5 py-0.5">
            <div className={`text-[6px] font-bold w-6 flex-shrink-0 ${h ? 'text-rose-400' : 'text-gray-500'}`}>{yr}</div>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 2 ? (h ? 'bg-rose-500' : 'bg-gray-600') : (h ? 'bg-rose-200' : 'bg-gray-300')}`} />
            <div className={`flex-1 h-1 rounded-sm ${i === 2 ? cd : cl}`} />
          </div>
        ))}
      </div>
    ),
    story_chapters: (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className={`w-2/5 h-full ${h ? 'bg-rose-200' : 'bg-gray-200'} flex items-start p-1.5`}>
          <div className={`text-[9px] font-bold ${h ? 'text-rose-600' : 'text-gray-600'}`}>I.</div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 px-2.5 bg-white">
          <div className={`text-[6px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Chapter One</div>
          <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-3/4 ${c}`} />
          <div className={`h-1 rounded-sm w-2/3 ${c}`} />
        </div>
      </div>
    ),
    story_duoColumn: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1].map(i => (
          <div key={i} className={`flex-1 flex flex-col justify-center gap-1 px-2 ${i === 0 ? (h ? 'bg-rose-100/40' : 'bg-pink-50') : (h ? 'bg-sky-100/40' : 'bg-sky-50')}`}>
            <div className={`w-3 h-3 rounded-full mx-auto ${h ? (i === 0 ? 'bg-rose-300' : 'bg-sky-300') : 'bg-gray-300'}`} />
            <div className={`h-1.5 rounded-sm w-full mx-auto ${cd}`} />
            <div className={`h-1 rounded-sm ${c}`} />
            <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
          </div>
        ))}
      </div>
    ),
    story_milestones: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
        <div className="flex justify-between gap-1 mt-1">
          {['✈','♥','💍','🎉'].map((icon, i) => (
            <div key={i} className={`flex-1 flex flex-col items-center gap-0.5 rounded-md p-1 ${h ? 'bg-rose-100' : 'bg-white border border-gray-100'}`}>
              <div className={`text-[9px]`}>{icon}</div>
              <div className={`h-1 rounded-sm w-full ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── VENUE new variants ── */
    venue_banner: (
      <div className={`w-full h-20 relative flex items-end transition-colors ${h ? 'bg-rose-900' : 'bg-slate-600'}`}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative w-full px-3 pb-3 flex items-end justify-between">
          <div>
            <div className={`text-[6px] uppercase tracking-widest ${h ? 'text-rose-300' : 'text-white/50'}`}>Ceremony</div>
            <div className="text-[10px] font-bold text-white">The Grand Estate</div>
            <div className="text-[7px] text-white/60">123 Venue Lane</div>
          </div>
          <div className={`w-10 h-3 rounded text-[6px] flex items-center justify-center font-bold ${h ? 'bg-rose-500 text-white' : 'bg-white/20 text-white border border-white/30'}`}>Map</div>
        </div>
      </div>
    ),
    venue_stacked: (
      <div className={`w-full h-20 flex flex-col gap-0.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[{label:'Ceremony',color:h?'bg-rose-200':'bg-gray-200'},{label:'Reception',color:h?'bg-rose-300':'bg-gray-300'}].map(({label,color},i) => (
          <div key={i} className="flex-1 flex overflow-hidden rounded-sm">
            <div className={`w-2/5 h-full ${color}`} />
            <div className={`flex-1 flex flex-col justify-center gap-0.5 px-1.5 bg-white`}>
              <div className={`text-[5px] uppercase tracking-widest font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>{label}</div>
              <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
              <div className={`h-1 rounded-sm w-full ${cl}`} />
            </div>
          </div>
        ))}
      </div>
    ),
    venue_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className={`h-2 rounded-sm w-24 ${cd}`} />
        <div className={`h-1 rounded-sm w-20 ${c}`} />
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className="flex gap-1 items-center">
          <div className={`w-3 h-3 rounded ${h ? 'bg-rose-100' : 'bg-gray-100'} border ${h ? 'border-rose-200' : 'border-gray-200'}`} />
          <div className={`h-1 rounded-sm w-16 ${cl}`} />
        </div>
      </div>
    ),

    /* ── SCHEDULE new variants ── */
    schedule_bands: (
      <div className={`w-full h-20 flex flex-col justify-center transition-colors`}>
        {[{bg:h?'bg-rose-50':'bg-white',w:'w-16'},{bg:h?'bg-rose-100/50':'bg-gray-50',w:'w-20'},{bg:h?'bg-rose-50':'bg-white',w:'w-14'}].map(({bg,w},i) => (
          <div key={i} className={`flex-1 flex items-center px-3 gap-2 ${bg}`}>
            <div className={`text-[7px] font-mono ${h ? 'text-rose-400' : 'text-gray-400'} w-7 flex-shrink-0`}>{['4pm','5pm','7pm'][i]}</div>
            <div className={`h-1.5 rounded-sm flex-1 ${cd}`} />
          </div>
        ))}
      </div>
    ),
    schedule_horizontal: (
      <div className={`w-full h-20 flex flex-col justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-full h-px ${h ? 'bg-rose-200' : 'bg-gray-300'} relative mx-0`}>
          <div className="flex items-center justify-around absolute -top-2 left-0 right-0">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className={`w-3 h-3 rounded-full ${i === 0 ? (h ? 'bg-rose-500' : 'bg-gray-700') : (h ? 'bg-rose-200' : 'bg-gray-300')}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-start justify-around mt-2">
          {['Arr','Cer','Cock','Rec'].map((l,i) => (
            <div key={l} className="flex flex-col items-center gap-0.5">
              <div className={`text-[6px] ${h ? 'text-rose-400' : 'text-gray-400'} font-medium`}>{l}</div>
              <div className={`h-1 rounded-sm ${i === 0 ? (h ? 'w-6 bg-rose-300' : 'w-6 bg-gray-400') : (h ? 'w-4 bg-rose-200' : 'w-4 bg-gray-200')}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    schedule_program: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[{label:'Ceremony'},{label:'Reception'}].map(({label},i) => (
          <div key={i} className={`flex-1 flex flex-col px-2 pt-1.5 gap-1 ${i === 0 ? 'border-r border-gray-200' : ''}`}>
            <div className={`text-[5px] uppercase tracking-widest font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>{label}</div>
            {[0,1,2].map(j => (
              <div key={j} className="flex items-center gap-0.5">
                <div className={`w-3 h-0.5 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-300'} flex-shrink-0`} />
                <div className={`flex-1 h-0.5 rounded-sm ${cl}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    ),

    /* ── TRAVEL new variants ── */
    travel_tiers: (
      <div className={`w-full h-20 flex items-stretch gap-0.5 px-1.5 py-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {['Closest','Best Value','Budget'].map((tier, i) => (
          <div key={tier} className={`flex-1 flex flex-col rounded-md overflow-hidden border ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
            <div className={`h-3 flex items-center justify-center text-[5px] font-bold ${i === 0 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500')}`}>{tier}</div>
            <div className="p-1 flex flex-col gap-0.5">
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-0.5 rounded-sm ${cl}`} />
            </div>
          </div>
        ))}
      </div>
    ),
    travel_mapPins: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`h-10 w-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-20`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px)' }} />
          {[[30,40],[55,25],[70,50]].map(([x,y],i) => (
            <div key={i} className={`absolute w-2 h-2 rounded-full border ${h ? 'border-rose-500' : 'border-gray-600'} ${h ? ['bg-rose-500','bg-blue-400','bg-green-400'][i] : ['bg-red-500','bg-blue-400','bg-green-400'][i]}`} style={{left:`${x}%`,top:`${y}%`}} />
          ))}
        </div>
        <div className={`flex-1 flex items-center gap-2 px-2 ${h ? 'bg-white' : 'bg-white'}`}>
          {['Hotel A','Hotel B','Venue'].map((name,i) => (
            <div key={name} className="flex items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${h ? ['bg-rose-500','bg-blue-400','bg-green-400'][i] : ['bg-red-500','bg-blue-400','bg-green-400'][i]}`} />
              <div className={`text-[6px] ${h ? 'text-rose-600' : 'text-gray-600'}`}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    travel_splitAirHotel: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 flex flex-col justify-center gap-1 px-2 border-r ${h ? 'border-rose-200' : 'border-gray-200'}`}>
          <div className={`text-[6px] uppercase tracking-widest font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>By Air</div>
          <div className={`h-1 rounded-sm ${cd}`} />
          <div className={`text-[6px] ${h ? 'text-rose-300' : 'text-gray-300'}`}>✈ JFK · 45 min</div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 px-2">
          <div className={`text-[6px] uppercase tracking-widest font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>Hotels</div>
          {[0,1].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    travel_compact: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 bg-white transition-colors`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>·</div>
            <div className={`flex-1 h-1 rounded-sm ${c}`} />
            <div className={`h-1 rounded-sm w-6 ${cl}`} />
            <div className={`text-[7px] underline ${h ? 'text-rose-400' : 'text-blue-400'}`}>↗</div>
          </div>
        ))}
      </div>
    ),

    /* ── REGISTRY new variants ── */
    registry_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className={`text-[7px] italic ${h ? 'text-rose-400' : 'text-gray-400'} px-4 text-center leading-tight`}>Your presence is our greatest gift</div>
        <div className={`h-px w-16 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className="flex gap-2">
          {['Zola','Target'].map(s => (
            <div key={s} className={`text-[7px] underline ${h ? 'text-rose-500' : 'text-blue-500'}`}>{s}</div>
          ))}
        </div>
      </div>
    ),
    registry_honeymoon: (
      <div className={`w-full h-20 flex flex-col transition-colors overflow-hidden`}>
        <div className={`h-10 relative ${h ? 'bg-sky-200' : 'bg-blue-100'} flex items-center justify-center`}>
          <div className={`text-[8px] font-bold ${h ? 'text-sky-700' : 'text-blue-700'}`}>🌴 Honeymoon Fund</div>
        </div>
        <div className={`flex-1 flex flex-col justify-center px-3 gap-1 ${h ? 'bg-rose-50' : 'bg-white'}`}>
          <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full rounded-full ${h ? 'bg-rose-400' : 'bg-gray-500'}`} style={{ width: '62%' }} />
          </div>
          <div className="flex justify-between">
            <div className={`text-[6px] ${h ? 'text-rose-500' : 'text-gray-500'}`}>62% funded</div>
            <div className={`text-[6px] font-bold ${h ? 'text-rose-600' : 'text-gray-600'}`}>Contribute</div>
          </div>
        </div>
      </div>
    ),
    registry_tabs: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex border-b border-gray-200 px-2 pt-1.5 gap-1">
          {['Home','Exp.','Cash'].map((t,i) => (
            <div key={t} className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-t ${i === 0 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'text-rose-400' : 'text-gray-400')}`}>{t}</div>
          ))}
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[0,1].map(i => (
            <div key={i} className={`h-5 rounded-lg flex items-center px-2 gap-2 ${h ? 'bg-white ring-1 ring-rose-100' : 'bg-white border border-gray-100'}`}>
              <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${c}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    registry_illustrated: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-amber-50'}`}>
        <div className="flex justify-center gap-3 mb-0.5">
          {['🎁','🏠','✈️'].map(e => <span key={e} className="text-[11px]">{e}</span>)}
        </div>
        <div className={`h-1.5 rounded-sm w-20 mx-auto ${cd}`} />
        <div className="flex gap-2 justify-center">
          {['Shop','Fund'].map(l => (
            <div key={l} className={`px-2 py-0.5 rounded text-[7px] font-semibold border ${h ? 'border-rose-300 text-rose-500' : 'border-gray-300 text-gray-500'}`}>{l}</div>
          ))}
        </div>
      </div>
    ),

    /* ── FAQ new variants ── */
    faq_twoColumn: (
      <div className={`w-full h-20 flex gap-2 px-2 py-1.5 transition-colors bg-white`}>
        {[0,1].map(col => (
          <div key={col} className="flex-1 flex flex-col gap-1.5">
            {[0,1].map(i => (
              <div key={i} className="space-y-0.5">
                <div className={`h-1.5 rounded-sm w-full ${cd}`} />
                <div className={`h-1 rounded-sm w-full ${cl}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
    faq_tabbed: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex gap-0.5 px-2 pt-1.5">
          {['Logistics','Attire','Food'].map((t,i) => (
            <div key={t} className={`text-[6px] font-semibold px-1.5 py-0.5 rounded ${i === 0 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'text-rose-400 bg-rose-100' : 'text-gray-400 bg-white border border-gray-100')}`}>{t}</div>
          ))}
        </div>
        <div className="flex-1 px-2 py-1.5 space-y-1">
          {[0,1,2].map(i => (
            <div key={i} className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${h ? 'border-rose-100 bg-white' : 'border-gray-100 bg-white'}`}>
              <div className={`h-1.5 w-16 rounded-sm ${i === 0 ? cd : c}`} />
              <div className={`text-[8px] ${h ? 'text-rose-300' : 'text-gray-300'}`}>+</div>
            </div>
          ))}
        </div>
      </div>
    ),
    faq_chat: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex justify-start">
          <div className={`max-w-3/4 px-2 py-1 rounded-xl rounded-tl-none text-[6px] ${h ? 'bg-rose-200 text-rose-700' : 'bg-gray-200 text-gray-600'}`}>Is parking available?</div>
        </div>
        <div className="flex justify-end">
          <div className={`max-w-3/4 px-2 py-1 rounded-xl rounded-tr-none text-[6px] ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>Yes! Free valet for all guests.</div>
        </div>
        <div className="flex justify-start">
          <div className={`max-w-3/4 px-2 py-1 rounded-xl rounded-tl-none text-[6px] ${h ? 'bg-rose-200 text-rose-700' : 'bg-gray-200 text-gray-600'}`}>Kids welcome?</div>
        </div>
      </div>
    ),
    faq_numbered: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 bg-white transition-colors`}>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-1.5">
            <div className={`text-[8px] font-bold w-3 flex-shrink-0 ${h ? 'text-rose-400' : 'text-gray-400'}`}>{i+1}.</div>
            <div className="flex-1 space-y-0.5">
              <div className={`h-1.5 rounded-sm ${i === 0 ? cd : c}`} />
              <div className={`h-1 rounded-sm w-4/5 ${cl}`} />
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── RSVP new variants ── */
    rsvp_card: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-32 h-14 rounded-xl shadow-sm border flex flex-col overflow-hidden ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className={`flex gap-1 p-1 border-b ${h ? 'border-rose-100' : 'border-gray-100'}`}>
            {['1','2','3'].map((s,i) => (
              <div key={s} className={`w-4 h-1.5 rounded-full text-[5px] flex items-center justify-center ${i === 0 ? (h ? 'bg-rose-500' : 'bg-gray-700') : (h ? 'bg-rose-100' : 'bg-gray-200')}`} />
            ))}
          </div>
          <div className="flex-1 p-1.5 space-y-1">
            <div className={`h-1.5 rounded-sm ${cd}`} />
            <div className="flex gap-1">
              <div className={`flex-1 h-3 rounded border ${h ? 'border-rose-200' : 'border-gray-200'}`} />
              <div className={`flex-1 h-3 rounded border ${h ? 'border-rose-200' : 'border-gray-200'}`} />
            </div>
          </div>
        </div>
      </div>
    ),
    rsvp_illustrated: (
      <div className={`w-full h-20 relative flex items-center justify-center transition-colors`}>
        <div className={`absolute inset-0 ${h ? 'bg-rose-50' : 'bg-amber-50'}`} />
        <div className="absolute top-0 left-0 w-6 h-6 rounded-br-full opacity-30 bg-green-200" />
        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-tl-full opacity-30 bg-green-300" />
        <div className={`relative w-28 h-14 rounded-xl shadow-sm border flex flex-col gap-1 p-2 ${h ? 'border-rose-200 bg-white' : 'border-amber-200 bg-white'}`}>
          <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
          <div className={`h-3 rounded-md border w-full ${h ? 'border-rose-100' : 'border-gray-100'}`} />
          <div className={`h-3 rounded-md ${h ? 'bg-rose-500' : 'bg-gray-700'} flex items-center justify-center`}>
            <div className="text-[6px] text-white font-bold">SEND RSVP</div>
          </div>
        </div>
      </div>
    ),
    rsvp_formal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className={`text-[7px] italic ${h ? 'text-rose-500' : 'text-gray-600'}`}>kindly respond by June 1</div>
        <div className="flex gap-2 mt-1">
          <div className={`px-3 py-1 border rounded text-[7px] font-medium ${h ? 'border-rose-400 text-rose-500 bg-rose-50' : 'border-gray-400 text-gray-600'}`}>Joyfully Accepts</div>
          <div className={`px-3 py-1 border rounded text-[7px] font-medium ${h ? 'border-rose-200 text-rose-300' : 'border-gray-200 text-gray-400'}`}>Declines</div>
        </div>
      </div>
    ),
    rsvp_multiEvent: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        {['Rehearsal Dinner','Ceremony','Reception'].map((ev,i) => (
          <div key={ev} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${h ? 'bg-white' : 'bg-white border border-gray-100'}`}>
            <div className={`w-2 h-2 rounded-full border ${i === 0 ? (h ? 'border-rose-500 bg-rose-500' : 'border-gray-600 bg-gray-600') : (h ? 'border-rose-300' : 'border-gray-300')}`} />
            <div className={`text-[6px] flex-1 ${h ? 'text-rose-600' : 'text-gray-600'}`}>{ev}</div>
          </div>
        ))}
      </div>
    ),

    /* ── GALLERY new variants ── */
    gallery_spotlight: (
      <div className={`w-full h-20 flex gap-0.5 p-1 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 h-full rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className="w-8 flex flex-col gap-0.5">
          {[0,1,2,3].map(i => (
            <div key={i} className={`flex-1 rounded-sm ${i === 0 ? (h ? 'ring-1 ring-rose-400 bg-rose-300' : 'ring-1 ring-gray-500 bg-gray-400') : (h ? 'bg-rose-100' : 'bg-gray-200')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_carousel: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 relative ${h ? 'bg-rose-200' : 'bg-gray-300'} mx-1 mt-1 rounded-sm`}>
          <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-black/40'}`}>
            <div className="text-[7px] text-white">‹</div>
          </div>
          <div className={`absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-black/40'}`}>
            <div className="text-[7px] text-white">›</div>
          </div>
        </div>
        <div className="flex justify-center gap-0.5 py-1">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`w-1 h-1 rounded-full ${i === 2 ? (h ? 'bg-rose-500' : 'bg-gray-600') : (h ? 'bg-rose-200' : 'bg-gray-300')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_mosaic: (
      <div className={`w-full h-20 p-1 grid grid-cols-3 grid-rows-2 gap-0.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`col-span-2 row-span-2 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        <div className={`rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className={`rounded-sm ${h ? 'bg-rose-100' : 'bg-gray-100'}`} />
      </div>
    ),
    gallery_categorized: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex gap-0.5 px-1.5 pt-1.5">
          {['Ceremony','Rec.','Portraits'].map((t,i) => (
            <div key={t} className={`text-[6px] font-semibold px-1 py-0.5 rounded ${i === 0 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'text-rose-400 bg-rose-100' : 'text-gray-400 bg-white border border-gray-100')}`}>{t}</div>
          ))}
        </div>
        <div className="flex-1 p-1 grid grid-cols-3 gap-0.5">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className={`rounded-sm ${i % 3 === 0 ? (h ? 'bg-rose-200' : 'bg-gray-300') : (h ? 'bg-rose-100' : 'bg-gray-200')}`} />
          ))}
        </div>
      </div>
    ),

    /* ── COUNTDOWN new variants ── */
    countdown_rings: (
      <div className={`w-full h-20 flex items-center justify-center gap-2 transition-colors ${h ? 'bg-rose-50' : 'bg-white'}`}>
        {['47','12','38','52'].map((n,i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${h ? 'border-rose-400 text-rose-500' : 'border-gray-400 text-gray-600'}`}>{n}</div>
            <div className={`text-[5px] mt-0.5 ${h ? 'text-rose-400' : 'text-gray-400'}`}>{['D','H','M','S'][i]}</div>
          </div>
        ))}
      </div>
    ),
    countdown_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center transition-colors bg-white`}>
        <div className={`text-[28px] font-black leading-none ${h ? 'text-rose-500' : 'text-gray-800'}`}>47</div>
        <div className={`text-[8px] font-medium tracking-widest uppercase mt-0.5 ${h ? 'text-rose-400' : 'text-gray-400'}`}>days to go</div>
      </div>
    ),
    countdown_dark: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 ${h ? 'bg-rose-950' : 'bg-gray-900'}`}>
        <div className={`text-[7px] tracking-widest uppercase ${h ? 'text-rose-400' : 'text-gray-400'}`}>Until we say I do</div>
        <div className="flex items-end gap-2">
          {['47','12','38'].map((n,i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${h ? 'bg-rose-500 text-white' : 'bg-white/10 text-white border border-white/20'}`}>{n}</div>
              <div className={`text-[5px] mt-0.5 ${h ? 'text-rose-400' : 'text-gray-500'}`}>{['Days','Hrs','Min'][i]}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    countdown_photo: (
      <div className={`w-full h-20 relative flex items-end transition-colors ${h ? 'bg-rose-800' : 'bg-slate-600'}`}>
        <div className="absolute inset-0 bg-black/50" />
        <div className={`relative w-full mx-auto mb-1.5 flex justify-center gap-1.5`}>
          {['47d','12h','38m'].map(t => (
            <div key={t} className={`px-1.5 py-0.5 rounded backdrop-blur-sm ${h ? 'bg-rose-500/50 border border-rose-400/40' : 'bg-white/20 border border-white/20'}`}>
              <span className="text-[8px] text-white font-bold">{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── WEDDING PARTY new variants ── */
    'wedding-party_scroll': (
      <div className={`w-full h-20 flex items-center gap-1 px-1 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`flex-shrink-0 w-10 h-16 rounded-lg flex flex-col overflow-hidden ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`flex-1 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
            <div className="p-1">
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-0.5 rounded-sm mt-0.5 ${cl}`} />
            </div>
          </div>
        ))}
        <div className={`flex-shrink-0 text-[8px] ${h ? 'text-rose-300' : 'text-gray-300'}`}>›</div>
      </div>
    ),
    'wedding-party_storyBios': (
      <div className={`w-full h-20 flex gap-0 transition-colors`}>
        <div className={`w-2/5 h-full ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className="flex-1 flex flex-col justify-center gap-1 px-2 bg-white">
          <div className={`text-[6px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Maid of Honor</div>
          <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-3/4 ${c}`} />
          <div className={`h-1 rounded-sm w-1/2 ${cl}`} />
        </div>
      </div>
    ),
    'wedding-party_minimal': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1 transition-colors bg-white`}>
        <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Maid of Honor</div>
        <div className={`h-1.5 rounded-sm w-24 ${cd}`} />
        <div className={`h-px w-20 ${h ? 'bg-rose-100' : 'bg-gray-100'}`} />
        <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Bridesmaids</div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className={`h-1.5 w-10 rounded-sm ${c}`} />
          ))}
        </div>
      </div>
    ),
    'wedding-party_splitSides': (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className={`flex-1 flex flex-col justify-center gap-1 px-2 ${h ? 'bg-rose-100/40' : 'bg-pink-50'}`}>
          <div className={`text-[6px] uppercase tracking-widest font-bold text-center ${h ? 'text-rose-400' : 'text-pink-400'}`}>Her Side</div>
          <div className="flex justify-center gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full ${h ? 'bg-rose-300' : 'bg-pink-200'}`} />
            ))}
          </div>
        </div>
        <div className={`flex-1 flex flex-col justify-center gap-1 px-2 ${h ? 'bg-sky-100/40' : 'bg-sky-50'}`}>
          <div className={`text-[6px] uppercase tracking-widest font-bold text-center ${h ? 'text-sky-500' : 'text-sky-400'}`}>His Side</div>
          <div className="flex justify-center gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full ${h ? 'bg-sky-300' : 'bg-sky-200'}`} />
            ))}
          </div>
        </div>
      </div>
    ),

    /* ── DRESS CODE new variants ── */
    'dress-code_palette': (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 bg-white transition-colors`}>
        <div className={`text-[6px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Encouraged Colors</div>
        <div className="flex gap-1">
          {[h?'bg-rose-300':'bg-slate-300', h?'bg-rose-200':'bg-gray-200', h?'bg-amber-200':'bg-stone-300', h?'bg-green-200':'bg-gray-100'].map((color,i) => (
            <div key={i} className={`w-5 h-5 rounded-sm ${color} ring-1 ring-white shadow-sm`} />
          ))}
          <div className="flex-1" />
          <div className="w-5 h-5 rounded-sm bg-red-100 ring-1 ring-red-200 relative">
            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-red-500">×</div>
          </div>
        </div>
        <div className={`text-[5px] ${h ? 'text-rose-300' : 'text-gray-300'}`}>Avoid white & cream</div>
      </div>
    ),
    'dress-code_illustrated': (
      <div className={`w-full h-20 flex items-center justify-center gap-4 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[['👗','Women'],['🤵','Men']].map(([icon,label]) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <div className="text-[16px] leading-none">{icon}</div>
            <div className={`text-[6px] font-medium ${h ? 'text-rose-500' : 'text-gray-500'}`}>{label}</div>
            <div className={`h-0.5 rounded-sm w-10 ${c}`} />
            <div className={`h-0.5 rounded-sm w-8 ${cl}`} />
          </div>
        ))}
      </div>
    ),
    'dress-code_card': (
      <div className={`w-full h-20 flex items-center px-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-full h-14 rounded-xl border flex divide-x overflow-hidden ${h ? 'border-rose-200 divide-rose-200 bg-white' : 'border-gray-200 divide-gray-200 bg-white'}`}>
          {['✓ Wear','✗ Avoid','ℹ Note'].map((col,i) => (
            <div key={col} className="flex-1 flex flex-col px-1 pt-1 gap-0.5">
              <div className={`text-[6px] font-bold ${i === 0 ? 'text-green-500' : i === 1 ? 'text-red-400' : (h ? 'text-rose-400' : 'text-gray-400')}`}>{col}</div>
              {[0,1].map(j => (
                <div key={j} className={`h-0.5 rounded-sm ${i === 0 ? 'bg-green-100' : i === 1 ? 'bg-red-100' : cl}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    'dress-code_scale': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-2 transition-colors bg-white`}>
        <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>Dress Code</div>
        <div className="w-full px-4">
          <div className="flex justify-between text-[5px] text-gray-400 mb-0.5">
            <span>Casual</span><span>Black Tie</span>
          </div>
          <div className={`w-full h-1.5 rounded-full ${h ? 'bg-rose-100' : 'bg-gray-100'} relative`}>
            <div className={`absolute h-1.5 rounded-full left-0 ${h ? 'bg-rose-400' : 'bg-gray-500'}`} style={{ width: '62%' }} />
            <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white ${h ? 'border-rose-500' : 'border-gray-600'}`} style={{ left: 'calc(62% - 6px)' }} />
          </div>
          <div className={`text-[6px] font-bold mt-1 ${h ? 'text-rose-500' : 'text-gray-600'}`}>Cocktail Attire</div>
        </div>
      </div>
    ),

    /* ── ACCOMMODATIONS new variants ── */
    accommodations_featured: (
      <div className={`w-full h-20 flex flex-col transition-colors overflow-hidden ${h ? 'bg-rose-50' : 'bg-white'}`}>
        <div className={`h-7 w-full ${h ? 'bg-rose-100' : 'bg-slate-100'} flex items-center px-2 gap-2`}>
          <div className={`text-[8px] font-bold ${h ? 'text-rose-600' : 'text-gray-700'}`}>The Grand Hotel</div>
          <div className={`text-[6px] px-1 rounded ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>Block</div>
        </div>
        <div className="flex-1 px-2 pt-1 flex flex-col gap-0.5">
          <div className={`flex items-center gap-1`}>
            <div className={`text-[7px] font-mono px-1 rounded ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>SMITH2025</div>
            <div className={`text-[6px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>Room code</div>
          </div>
          <div className={`flex items-center gap-1`}>
            <div className={`text-[6px] ${h ? 'text-amber-500' : 'text-red-500'} font-semibold`}>⚠ Book by May 15</div>
          </div>
        </div>
      </div>
    ),
    accommodations_mapList: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`h-10 w-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-20`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px)' }} />
          {[[40,40],[60,30],[75,55]].map(([x,y],i) => (
            <div key={i} className={`absolute w-2 h-2 rounded-full ${h ? ['bg-rose-500','bg-blue-400','bg-green-400'][i] : ['bg-red-500','bg-blue-400','bg-green-400'][i]}`} style={{left:`${x}%`,top:`${y}%`}} />
          ))}
        </div>
        <div className={`flex-1 flex items-center gap-2 px-2 ${h ? 'bg-white' : 'bg-white'}`}>
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${h ? ['bg-rose-500','bg-blue-400','bg-green-400'][i] : ['bg-red-500','bg-blue-400','bg-green-400'][i]}`} />
              <div className={`h-1 rounded-sm w-8 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    accommodations_faqStyle: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-white'}`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        <div className={`h-1 rounded-sm w-full ${c}`} />
        {['Parking?','Shuttle?','Deadline?'].map((q,i) => (
          <div key={q} className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${h ? 'border-rose-100 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            <div className={`text-[6px] ${h ? 'text-rose-600' : 'text-gray-600'}`}>{q}</div>
            <div className={`text-[8px] ${h ? 'text-rose-300' : 'text-gray-400'}`}>+</div>
          </div>
        ))}
      </div>
    ),
    accommodations_onSite: (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className={`w-2/5 h-full ${h ? 'bg-rose-200' : 'bg-stone-200'}`} />
        <div className="flex-1 flex flex-col justify-center gap-1 px-2 bg-white">
          <div className={`text-[6px] uppercase tracking-widest ${h ? 'text-rose-400' : 'text-amber-600'}`}>On-Site Lodging</div>
          <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
          <div className={`mt-0.5 w-12 h-3 rounded text-[5px] flex items-center justify-center font-bold ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>Reserve</div>
        </div>
      </div>
    ),

    /* ── CONTACT new variants ── */
    contact_form: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        {['Name','Email','Message'].map((f,i) => (
          <div key={f} className={`h-3 rounded border ${h ? 'border-rose-200' : 'border-gray-200'} flex items-center px-1`}>
            <div className={`text-[6px] ${h ? 'text-rose-300' : 'text-gray-400'}`}>{f}</div>
          </div>
        ))}
        <div className={`h-3 rounded flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
          <div className="text-[6px] text-white font-bold">Send</div>
        </div>
      </div>
    ),
    contact_split: (
      <div className={`w-full h-20 flex transition-colors bg-white`}>
        <div className="flex-1 flex flex-col justify-center gap-1 px-2 border-r border-gray-100">
          <div className={`h-1 rounded-sm ${cd}`} />
          {[0,1,2].map(i => (
            <div key={i} className={`h-2.5 rounded border ${h ? 'border-rose-100' : 'border-gray-100'}`} />
          ))}
          <div className={`h-2.5 rounded ${h ? 'bg-rose-500' : 'bg-gray-700'}`} />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    contact_casual: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-6 h-6 rounded-full ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className={`h-1.5 rounded-sm w-24 ${cd}`} />
        <div className={`h-1 rounded-sm w-20 ${c}`} />
        <div className={`flex gap-1 items-center w-28 h-5 rounded-xl border ${h ? 'border-rose-200' : 'border-gray-200'} px-2`}>
          <div className={`flex-1 h-1 rounded-sm ${cl}`} />
          <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-blue-400'}`}>→</div>
        </div>
      </div>
    ),
    contact_coordinator: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        <div className="flex gap-1.5">
          {[0,1].map(i => (
            <div key={i} className={`flex-1 h-10 rounded-lg p-1 flex flex-col gap-0.5 ${h ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className={`w-3.5 h-3.5 rounded-full ${c}`} />
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`text-[5px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>{i === 0 ? 'Couple' : 'Coordinator'}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── FOOTER CTA new variants ── */
    'footer-cta_monogram': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1 transition-colors ${h ? 'bg-rose-50' : 'bg-stone-50'}`}>
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold ${h ? 'border-rose-300 text-rose-400' : 'border-gray-300 text-gray-500'}`}>SJ</div>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        <div className={`h-1 rounded-sm w-14 ${c}`} />
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'} mt-0.5`} />
      </div>
    ),
    'footer-cta_hashtag': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1 transition-colors ${h ? 'bg-rose-900' : 'bg-gray-900'}`}>
        <div className={`text-[18px] font-black ${h ? 'text-rose-400' : 'text-white/50'}`}>#</div>
        <div className={`h-2 rounded-sm w-20 ${h ? 'bg-rose-300' : 'bg-white/70'}`} />
        <div className={`text-[6px] mt-1 ${h ? 'text-rose-300' : 'text-white/40'}`}>Tag your photos</div>
      </div>
    ),
    'footer-cta_photo': (
      <div className={`w-full h-20 relative flex items-end transition-colors ${h ? 'bg-rose-800' : 'bg-gray-600'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative w-full px-3 pb-2 flex items-end justify-between">
          <div>
            <div className="text-[8px] font-bold text-white">Sarah & James</div>
            <div className="text-[6px] text-white/60">June 14, 2025</div>
          </div>
          <div className={`text-[6px] text-white/40`}>© 2025</div>
        </div>
      </div>
    ),
    'footer-cta_countdown': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-600' : 'bg-gray-800'}`}>
        <div className="text-[7px] text-white/70">RSVP deadline in</div>
        <div className="flex gap-1.5">
          {['14d','06h','22m'].map(t => (
            <div key={t} className="bg-white/20 rounded px-1 py-0.5">
              <span className="text-[8px] text-white font-bold">{t}</span>
            </div>
          ))}
        </div>
        <div className={`px-4 py-1 rounded-full text-[7px] font-bold text-white border border-white/40 mt-0.5`}>RSVP Now</div>
      </div>
    ),

    /* ── QUOTES new variants ── */
    quotes_pullQuote: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1 px-4 transition-colors bg-white`}>
        <div className={`text-[20px] font-black leading-none ${h ? 'text-rose-200' : 'text-gray-200'}`}>"</div>
        <div className={`h-1 rounded-sm w-full ${cd}`} />
        <div className={`h-1 rounded-sm w-4/5 ${c}`} />
        <div className={`h-1 rounded-sm w-3/5 ${c}`} />
        <div className={`h-px w-8 ${h ? 'bg-rose-200' : 'bg-gray-200'} mt-0.5`} />
        <div className={`h-1 rounded-sm w-12 ${cl}`} />
      </div>
    ),
    quotes_guestbook: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-6 rounded-xl border flex items-center px-2 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className={`flex-1 h-1 rounded-sm ${cl}`} />
          <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>Send ✨</div>
        </div>
        {[0,1].map(i => (
          <div key={i} className={`px-2 py-1 rounded-lg text-[6px] leading-tight ${h ? 'bg-white border border-rose-100 text-rose-700' : 'bg-white border border-gray-100 text-gray-600'}`}>
            <div className={`h-0.5 rounded-sm mb-0.5 ${cd}`} />
            <div className={`h-0.5 rounded-sm w-3/4 ${c}`} />
          </div>
        ))}
      </div>
    ),
    quotes_letter: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors ${h ? 'bg-amber-50' : 'bg-stone-50'}`}>
        <div className={`text-[7px] italic ${h ? 'text-amber-700' : 'text-stone-500'}`}>Dear Friends & Family,</div>
        <div className={`h-1 rounded-sm w-full ${c}`} />
        <div className={`h-1 rounded-sm w-4/5 ${cl}`} />
        <div className={`h-1 rounded-sm w-2/3 ${cl}`} />
        <div className={`text-[7px] italic mt-1 ${h ? 'text-amber-700' : 'text-stone-500'}`}>With love, Sarah & James</div>
      </div>
    ),

    /* ── MENU new variants ── */
    menu_printed: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-amber-50'}`}>
        <div className={`w-24 h-15 flex flex-col items-center py-1.5 px-2 border ${h ? 'border-rose-200' : 'border-amber-200'} rounded-sm`} style={{height:'3.75rem'}}>
          <div className={`text-[7px] font-bold uppercase tracking-widest ${h ? 'text-rose-600' : 'text-amber-700'}`}>Dinner</div>
          <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-amber-200'} my-0.5`} />
          {['Starter','— Main —','Dessert'].map((c2,i) => (
            <div key={c2} className={`text-[5px] text-center ${i === 1 ? (h ? 'text-rose-500 font-bold' : 'text-amber-600 font-bold') : (h ? 'text-rose-400' : 'text-amber-500')}`}>{c2}</div>
          ))}
        </div>
      </div>
    ),
    menu_cocktailDinner: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[{label:'Cocktail Hour',icon:'🥂'},{label:'Dinner',icon:'🍽'}].map(({label,icon},i) => (
          <div key={label} className={`flex-1 flex flex-col px-1.5 py-1 ${i === 0 ? (h ? 'bg-rose-100/60' : 'bg-amber-50 border-r border-amber-100') : 'bg-white'}`}>
            <div className="text-[9px] mb-0.5">{icon}</div>
            <div className={`text-[5px] font-bold uppercase tracking-widest mb-0.5 ${h ? 'text-rose-500' : 'text-gray-500'}`}>{label}</div>
            {[0,1,2].map(j => (
              <div key={j} className={`h-0.5 rounded-sm mb-0.5 ${j === 0 ? cd : cl}`} />
            ))}
          </div>
        ))}
      </div>
    ),
    menu_illustrated: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-stone-50'}`}>
        <div className="flex gap-2">
          {['🥗','🍗','🎂'].map((icon,i) => (
            <div key={icon} className={`flex-1 flex flex-col items-center rounded-lg p-1 ${h ? 'bg-white border border-rose-100' : 'bg-white border border-stone-100'}`}>
              <div className="text-[11px]">{icon}</div>
              <div className={`h-0.5 rounded-sm w-full mt-0.5 ${cd}`} />
              <div className={`h-0.5 rounded-sm w-3/4 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── MUSIC new variants ── */
    music_vinyl: (
      <div className={`w-full h-20 flex items-center gap-2 px-2 transition-colors ${h ? 'bg-rose-950' : 'bg-gray-900'}`}>
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full border-4 ${h ? 'border-rose-600' : 'border-gray-700'} flex items-center justify-center`}>
            <div className={`w-2.5 h-2.5 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-600'}`} />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-1.5 rounded-sm w-full ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-1 rounded-sm w-4/5 ${h ? 'bg-rose-500' : 'bg-gray-500'}`} />
          <div className={`h-1 rounded-sm w-3/5 ${h ? 'bg-rose-600' : 'bg-gray-600'}`} />
          <div className="flex items-center gap-1 mt-0.5">
            {['◀','⏸','▶'].map(icon => (
              <div key={icon} className={`text-[8px] ${h ? 'text-rose-300' : 'text-gray-400'}`}>{icon}</div>
            ))}
          </div>
        </div>
      </div>
    ),
    music_requestForm: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`text-[7px] font-bold ${h ? 'text-rose-600' : 'text-gray-700'}`}>What song gets you dancing?</div>
        <div className={`h-5 rounded-lg border flex items-center px-2 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className={`flex-1 h-1 rounded-sm ${cl}`} />
          <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>🎵</div>
        </div>
        <div className={`h-4 rounded-lg flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
          <div className="text-[7px] text-white font-bold">Request a Song</div>
        </div>
      </div>
    ),
    music_journey: (
      <div className={`w-full h-20 flex flex-col justify-center px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1 rounded-full w-full ${h ? 'bg-rose-100' : 'bg-gray-200'} relative overflow-hidden mb-1`}>
          <div className={`h-full rounded-full ${h ? 'bg-rose-400' : 'bg-gray-500'}`} style={{ width: '100%' }} />
        </div>
        {['🎻 Ceremony','🥂 Cocktail','🎶 Reception'].map((phase,i) => (
          <div key={phase} className="flex items-center gap-1.5 py-0.5">
            <div className={`text-[8px] w-3`}>{phase.split(' ')[0]}</div>
            <div className={`text-[6px] ${h ? 'text-rose-500' : 'text-gray-500'}`}>{phase.split(' ').slice(1).join(' ')}</div>
            <div className={`flex-1 h-0.5 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    ),

    /* ── DIRECTIONS new variants ── */
    directions_illustrated: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`flex-1 relative ${h ? 'bg-amber-50' : 'bg-stone-50'} flex items-center justify-center`}>
          <div className={`absolute inset-1 rounded border-2 border-dashed ${h ? 'border-amber-200' : 'border-stone-200'}`} />
          {[[30,50],[60,35],[70,65]].map(([x,y],i) => (
            <div key={i} className={`absolute w-2.5 h-2.5 rounded-full border-2 ${h ? ['border-rose-500 bg-rose-400','border-blue-400 bg-blue-300','border-green-400 bg-green-300'][i] : ['border-red-500 bg-red-400','border-blue-400 bg-blue-300','border-green-400 bg-green-300'][i]}`} style={{left:`${x}%`,top:`${y}%`}} />
          ))}
        </div>
        <div className={`h-5 flex items-center gap-2 px-2 bg-white border-t border-gray-100`}>
          {['Venue','Hotel','Airport'].map((name,i) => (
            <div key={name} className="flex items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${h ? ['bg-rose-400','bg-blue-300','bg-green-300'][i] : ['bg-red-400','bg-blue-300','bg-green-300'][i]}`} />
              <div className={`text-[5px] ${h ? 'text-rose-500' : 'text-gray-500'}`}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    directions_multiVenue: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`h-11 w-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-20`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px)' }} />
          <div className={`absolute w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-rose-400`} style={{left:'30%',top:'40%'}} />
          <div className={`absolute w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-amber-400`} style={{left:'60%',top:'30%'}} />
          <div className={`absolute w-2 h-2 rounded-full border-2 border-blue-500 bg-blue-400`} style={{left:'70%',top:'60%'}} />
        </div>
        <div className={`flex-1 flex items-center gap-2 px-2 bg-white`}>
          {[{c:'bg-rose-400',l:'Ceremony'},{c:'bg-amber-400',l:'Reception'},{c:'bg-blue-400',l:'Hotel'}].map(({c:bgc,l}) => (
            <div key={l} className="flex items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${bgc}`} />
              <div className={`text-[5px] text-gray-500`}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    directions_transport: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[{icon:'🚗',label:'Car'},{icon:'✈️',label:'Air'},{icon:'🚆',label:'Train'}].map(({icon,label},i) => (
          <div key={label} className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${i < 2 ? 'border-r border-gray-200' : ''}`}>
            <div className="text-[11px]">{icon}</div>
            <div className={`text-[6px] font-bold ${h ? 'text-rose-500' : 'text-gray-600'}`}>{label}</div>
            <div className={`h-0.5 rounded-sm w-6 ${cl}`} />
            <div className={`h-0.5 rounded-sm w-5 ${cl}`} />
          </div>
        ))}
      </div>
    ),
    directions_fromHotel: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1 px-3 transition-colors bg-white`}>
        <div className={`text-[6px] uppercase tracking-widest font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>From The Grand Hotel</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`text-[6px] font-bold ${h ? 'text-rose-400' : 'text-gray-400'} w-3`}>{i+1}.</div>
            <div className={`flex-1 h-1 rounded-sm ${i === 0 ? cd : cl}`} />
          </div>
        ))}
        <div className="flex gap-1 mt-0.5">
          <div className={`text-[6px] font-medium ${h ? 'text-rose-500' : 'text-blue-500'} underline`}>Google Maps</div>
          <div className={`text-[6px] font-medium ${h ? 'text-rose-400' : 'text-gray-400'} underline`}>Apple Maps</div>
        </div>
      </div>
    ),

    /* ── VIDEO new variants ── */
    video_background: (
      <div className={`w-full h-20 relative flex flex-col items-center justify-center transition-colors ${h ? 'bg-rose-900' : 'bg-gray-800'}`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)' }} />
        <div className="relative flex flex-col items-center gap-1.5">
          <div className="text-[8px] text-white font-bold">Our Venue</div>
          <div className="text-[6px] text-white/60">The Grand Estate • 2025</div>
          <div className={`mt-1 text-[7px] px-2 py-0.5 border border-white/30 rounded-full text-white/70`}>Explore</div>
        </div>
        <div className={`absolute bottom-1 right-1 text-[7px] ${h ? 'text-rose-400' : 'text-white/30'}`}>⏸</div>
      </div>
    ),
    video_lightbox: (
      <div className={`w-full h-20 relative flex items-center justify-center transition-colors ${h ? 'bg-rose-200' : 'bg-gray-300'}`}>
        <div className={`absolute inset-0 ${h ? 'bg-rose-900/20' : 'bg-black/20'}`} />
        <div className={`relative w-10 h-10 rounded-full border-4 border-white/80 flex items-center justify-center shadow-lg ${h ? 'bg-rose-500/80' : 'bg-black/50'}`}>
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white/90 ml-1" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <div className={`text-[6px] text-white/70`}>Click to watch our story</div>
        </div>
      </div>
    ),
    video_reel: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-950' : 'bg-gray-900'}`}>
        <div className={`w-9 h-16 rounded-xl border-4 ${h ? 'border-rose-500' : 'border-gray-600'} overflow-hidden relative flex items-center justify-center ${h ? 'bg-rose-800' : 'bg-gray-700'}`}>
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white/70" />
          <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-500'}`} />
          <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-500'}`} />
        </div>
      </div>
    ),

    /* ── LEGACY FALLBACKS (single-word ids without type prefix) ── */
    default: (
      <div className={`w-full h-20 flex items-center gap-2 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 h-2 rounded ${cd}`} />
        <div className={`w-10 h-2 rounded ${c}`} />
      </div>
    ),
  };

  const key = `${sectionType ?? ''}_${variantId}`;
  const swatch = swatches[key] ?? swatches[variantId];
  if (swatch) return <>{swatch}</>;
  return <div className={`w-full h-20 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-100'}`} />;
};

interface SortableLayerItemProps {
  section: BuilderSectionInstance;
  index: number;
  pageId: string | null;
  isSelected: boolean;
  isDragging: boolean;
}

function scrollToSection(sectionId: string) {
  const el = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ section, index, pageId, isSelected, isDragging }) => {
  const { dispatch } = useBuilderContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const manifest = getSectionManifest(section.type);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        dispatch(builderActions.selectSection(section.id));
        scrollToSection(section.id);
      }}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-rose-50 border border-rose-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
        isSelected ? 'bg-rose-100' : 'bg-gray-100 group-hover:bg-gray-200'
      }`}>
        <IconComp size={12} className={isSelected ? 'text-rose-500' : 'text-gray-500'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isSelected ? 'text-rose-700' : 'text-gray-700'}`}>
          {manifest.label}
        </p>
        <p className="text-[10px] text-gray-400">#{index + 1}</p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={e => {
            e.stopPropagation();
            if (pageId) dispatch(builderActions.toggleSectionVisibility(pageId, section.id));
          }}
          title={section.enabled ? 'Hide' : 'Show'}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {section.enabled ? <Eye size={12} /> : <EyeOff size={12} className="text-rose-400" />}
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            setShowDeleteModal(true);
          }}
          title="Delete section"
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {!section.enabled && (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" title="Hidden" />
      )}

      {showDeleteModal && (
        <DeleteSectionModal
          sectionLabel={manifest.label}
          onConfirm={() => {
            if (pageId) {
              dispatch(builderActions.removeSection(pageId, section.id));
              dispatch(builderActions.selectSection(null));
            }
            setShowDeleteModal(false);
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

const LayerItemOverlay: React.FC<{ section: BuilderSectionInstance }> = ({ section }) => {
  const manifest = getSectionManifest(section.type);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white border border-rose-300 shadow-lg w-56 opacity-95">
      <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
      <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center flex-shrink-0">
        <IconComp size={12} className="text-rose-500" />
      </div>
      <p className="text-xs font-medium text-gray-700 truncate">{manifest.label}</p>
    </div>
  );
};
