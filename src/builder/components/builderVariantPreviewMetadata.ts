import type { WeddingDataV1 } from '../../types/weddingData';
import {
  buildPreviewWeddingData,
  type PreviewPhotoSet,
} from './builderSidebarPreviewData';

const VARIANT_STYLE_TONE: Record<string, { label: string; accent: string; chip: string }> = {
  minimal: { label: 'Minimal', accent: 'from-stone-300/45 via-white/0 to-white/0', chip: 'border-stone-300 text-stone-600 bg-stone-50' },
  formal: { label: 'Formal', accent: 'from-slate-600/30 via-slate-300/10 to-white/0', chip: 'border-slate-300 text-slate-700 bg-slate-50' },
  editorial: { label: 'Editorial', accent: 'from-zinc-700/30 via-zinc-300/10 to-white/0', chip: 'border-zinc-300 text-zinc-700 bg-zinc-50' },
  cinematic: { label: 'Cinematic', accent: 'from-stone-700/25 via-stone-300/10 to-white/0', chip: 'border-stone-300 text-stone-700 bg-stone-50' },
  interactive: { label: 'Interactive', accent: 'from-[var(--color-primary)]/25 via-[var(--color-primary)]/10 to-white/0', chip: 'border-[var(--color-border-subtle)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]' },
  romantic: { label: 'Romantic', accent: 'from-[var(--color-accent)]/25 via-[var(--color-accent)]/10 to-white/0', chip: 'border-[var(--color-border-subtle)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]' },
  playful: { label: 'Playful', accent: 'from-stone-400/35 via-stone-200/15 to-white/0', chip: 'border-stone-300 text-stone-700 bg-stone-50' },
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

export function getVariantToneKey(variantId: string): keyof typeof VARIANT_STYLE_TONE {
  return VARIANT_TONE_BY_ID[variantId] ?? 'editorial';
}

export function getVariantTone(variantId: string): { label: string; accent: string; chip: string } {
  return VARIANT_STYLE_TONE[getVariantToneKey(variantId)];
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

export function getVariantArtDirection(sectionType: string, variantId: string): VariantArtDirection {
  return VARIANT_ART_DIRECTION[`${sectionType}:${variantId}`] ?? {};
}

export function buildVariantPreviewWeddingData(
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
