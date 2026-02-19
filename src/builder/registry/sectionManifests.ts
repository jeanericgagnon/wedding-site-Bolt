import {
  BuilderSectionDefinition,
  BuilderSectionType,
  BuilderSectionCapabilities,
  createDefaultSectionInstance,
  BuilderSectionInstance,
} from '../../types/builder/section';

const defaultCapabilities: BuilderSectionCapabilities = {
  draggable: true,
  duplicable: true,
  deletable: true,
  mediaAware: false,
  hasSettings: true,
  hasBindings: false,
  locked: false,
};

export interface VariantMeta {
  id: string;
  label: string;
  description: string;
}

export type BuilderSectionDefinitionWithMeta = BuilderSectionDefinition & {
  variantMeta: VariantMeta[];
};

export const SECTION_MANIFESTS: Record<BuilderSectionType, BuilderSectionDefinitionWithMeta> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    icon: 'Image',
    defaultVariant: 'default',
    supportedVariants: ['default', 'minimal', 'fullbleed'],
    variantMeta: [
      { id: 'default', label: 'Classic', description: 'Names, date, and photo with a soft overlay' },
      { id: 'minimal', label: 'Minimal', description: 'Clean typography only, no background image' },
      { id: 'fullbleed', label: 'Full Bleed', description: 'Edge-to-edge image with bold text overlay' },
    ],
    capabilities: { ...defaultCapabilities, mediaAware: true, deletable: false },
    settingsSchema: {
      fields: [
        { key: 'title', label: 'Headline', type: 'text', placeholder: 'Your names' },
        { key: 'subtitle', label: 'Subheadline', type: 'text', placeholder: 'Wedding date & location' },
        { key: 'backgroundImage', label: 'Background Image', type: 'image' },
        { key: 'overlayOpacity', label: 'Overlay Opacity', type: 'number', defaultValue: 40 },
        { key: 'showCountdown', label: 'Show Countdown', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/hero.jpg',
  },
  story: {
    type: 'story',
    label: 'Our Story',
    icon: 'Heart',
    defaultVariant: 'default',
    supportedVariants: ['default', 'centered', 'split'],
    variantMeta: [
      { id: 'default', label: 'Classic', description: 'Text on left, photo on right' },
      { id: 'centered', label: 'Centered', description: 'Story text centered with photo above' },
      { id: 'split', label: 'Split', description: 'Large image beside full-height text' },
    ],
    capabilities: { ...defaultCapabilities, mediaAware: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Our Story' },
        { key: 'storyText', label: 'Story Text', type: 'textarea' },
        { key: 'photo', label: 'Couple Photo', type: 'image' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/story.jpg',
  },
  venue: {
    type: 'venue',
    label: 'Venue',
    icon: 'MapPin',
    defaultVariant: 'default',
    supportedVariants: ['default', 'card'],
    variantMeta: [
      { id: 'default', label: 'Standard', description: 'List view with map and address details' },
      { id: 'card', label: 'Card', description: 'Each venue in its own visual card with photo' },
    ],
    capabilities: { ...defaultCapabilities, hasBindings: true, mediaAware: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Venue' },
        { key: 'showMap', label: 'Show Map', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'venueIds', label: 'Venues', dataSource: 'venues', multiple: true },
      ],
    },
    previewImagePath: '/previews/venue.jpg',
  },
  schedule: {
    type: 'schedule',
    label: 'Schedule',
    icon: 'Clock',
    defaultVariant: 'default',
    supportedVariants: ['default', 'timeline'],
    variantMeta: [
      { id: 'default', label: 'List', description: 'Simple stacked list of events with times' },
      { id: 'timeline', label: 'Timeline', description: 'Visual vertical timeline with icons' },
    ],
    capabilities: { ...defaultCapabilities, hasBindings: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Schedule' },
        { key: 'showIcons', label: 'Show Icons', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'scheduleItemIds', label: 'Schedule Items', dataSource: 'schedule', multiple: true },
      ],
    },
    previewImagePath: '/previews/schedule.jpg',
  },
  travel: {
    type: 'travel',
    label: 'Travel & Hotels',
    icon: 'Plane',
    defaultVariant: 'default',
    supportedVariants: ['default', 'cards'],
    variantMeta: [
      { id: 'default', label: 'Compact', description: 'Clean list of hotels and travel tips' },
      { id: 'cards', label: 'Cards', description: 'Each hotel recommendation in a rich card' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Travel' },
        { key: 'showParking', label: 'Show Parking Info', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/travel.jpg',
  },
  registry: {
    type: 'registry',
    label: 'Registry',
    icon: 'Gift',
    defaultVariant: 'default',
    supportedVariants: ['default', 'grid'],
    variantMeta: [
      { id: 'default', label: 'List', description: 'Registry links stacked with descriptions' },
      { id: 'grid', label: 'Grid', description: 'Logo grid layout for each registry store' },
    ],
    capabilities: { ...defaultCapabilities, hasBindings: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Registry' },
        { key: 'message', label: 'Custom Message', type: 'textarea' },
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'linkIds', label: 'Registry Links', dataSource: 'registry', multiple: true },
      ],
    },
    previewImagePath: '/previews/registry.jpg',
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    defaultVariant: 'default',
    supportedVariants: ['default', 'accordion'],
    variantMeta: [
      { id: 'default', label: 'Open List', description: 'All questions and answers visible at once' },
      { id: 'accordion', label: 'Accordion', description: 'Collapsible questions, one open at a time' },
    ],
    capabilities: { ...defaultCapabilities, hasBindings: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'FAQ' },
        { key: 'expandAll', label: 'Expand All by Default', type: 'toggle', defaultValue: false },
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'faqIds', label: 'FAQ Items', dataSource: 'faq', multiple: true },
      ],
    },
    previewImagePath: '/previews/faq.jpg',
  },
  rsvp: {
    type: 'rsvp',
    label: 'RSVP',
    icon: 'Mail',
    defaultVariant: 'default',
    supportedVariants: ['default', 'inline'],
    variantMeta: [
      { id: 'default', label: 'Full Form', description: 'Dedicated RSVP section with form fields' },
      { id: 'inline', label: 'Inline', description: 'Compact inline form embedded in the page' },
    ],
    capabilities: { ...defaultCapabilities, deletable: false },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'RSVP' },
        { key: 'deadlineText', label: 'Deadline Text', type: 'text' },
        { key: 'confirmationMessage', label: 'Confirmation Message', type: 'textarea' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/rsvp.jpg',
  },
  gallery: {
    type: 'gallery',
    label: 'Photo Gallery',
    icon: 'Images',
    defaultVariant: 'default',
    supportedVariants: ['default', 'masonry'],
    variantMeta: [
      { id: 'default', label: 'Grid', description: 'Uniform grid of equal-sized photos' },
      { id: 'masonry', label: 'Masonry', description: 'Pinterest-style varied height layout' },
    ],
    capabilities: { ...defaultCapabilities, mediaAware: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Gallery' },
        { key: 'columns', label: 'Columns', type: 'select', defaultValue: '3', options: [
          { label: '2 Columns', value: '2' },
          { label: '3 Columns', value: '3' },
          { label: '4 Columns', value: '4' },
        ]},
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'mediaAssetIds', label: 'Gallery Photos', dataSource: 'media', multiple: true },
      ],
    },
    previewImagePath: '/previews/gallery.jpg',
  },
};

export function getSectionManifest(type: BuilderSectionType): BuilderSectionDefinitionWithMeta {
  const manifest = SECTION_MANIFESTS[type];
  if (!manifest) throw new Error(`Unknown section type: ${type}`);
  return manifest;
}

export function getAllSectionManifests(): BuilderSectionDefinitionWithMeta[] {
  return Object.values(SECTION_MANIFESTS);
}

export function getDefaultSectionInstance(
  type: BuilderSectionType,
  variant?: string,
  orderIndex = 0
): BuilderSectionInstance {
  const manifest = getSectionManifest(type);
  return createDefaultSectionInstance(type, variant ?? manifest.defaultVariant, orderIndex);
}
