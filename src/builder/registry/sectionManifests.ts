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
        { key: 'headline', label: 'Headline (overrides couple names)', type: 'text', placeholder: 'Leave blank to use couple names' },
        { key: 'subtitle', label: 'Subheadline', type: 'text', placeholder: 'Leave blank to use wedding date' },
        { key: 'title', label: 'Eyebrow Text', type: 'text', placeholder: 'e.g. We are getting married' },
        { key: 'showTitle', label: 'Show Eyebrow Text', type: 'toggle', defaultValue: true },
        { key: 'backgroundImage', label: 'Background Image', type: 'image' },
        { key: 'overlayOpacity', label: 'Image Opacity (%)', type: 'number', defaultValue: 40 },
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
    defaultVariant: 'card',
    supportedVariants: ['card', 'mapFirst', 'splitMap', 'detailsFirst'],
    variantMeta: [
      { id: 'card', label: 'Card', description: 'Each venue in a rich card with photo and details' },
      { id: 'mapFirst', label: 'Map First', description: 'Full-width map at the top, details below' },
      { id: 'splitMap', label: 'Split Map', description: 'Details and map/photo side by side' },
      { id: 'detailsFirst', label: 'Details First', description: 'Structured detail grid with icons' },
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
    defaultVariant: 'timeline',
    supportedVariants: ['timeline', 'dayTabs', 'agendaCards'],
    variantMeta: [
      { id: 'timeline', label: 'Timeline', description: 'Vertical timeline with times on the left' },
      { id: 'dayTabs', label: 'Day Tabs', description: 'Tab switcher for multi-day weekend events' },
      { id: 'agendaCards', label: 'Agenda Cards', description: 'Each event as a card in a grid layout' },
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
    defaultVariant: 'list',
    supportedVariants: ['list', 'hotelBlock'],
    variantMeta: [
      { id: 'list', label: 'List', description: 'Travel tips + compact hotel list' },
      { id: 'hotelBlock', label: 'Hotel Block', description: 'Hotel-first layout with booking codes, amenities, and shuttle info' },
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
    defaultVariant: 'cards',
    supportedVariants: ['cards', 'featured'],
    variantMeta: [
      { id: 'cards', label: 'Store Links', description: 'Registry links as clickable store cards' },
      { id: 'featured', label: 'Featured Gifts', description: 'Showcase specific gift items with photos, prices, and store links' },
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
    defaultVariant: 'masonry',
    supportedVariants: ['masonry', 'grid', 'filmStrip', 'polaroid'],
    variantMeta: [
      { id: 'masonry', label: 'Masonry', description: 'Pinterest-style varied height layout with scroll animations' },
      { id: 'grid', label: 'Grid', description: 'Uniform grid with aspect ratio control and entrance animations' },
      { id: 'filmStrip', label: 'Film Strip', description: 'Large hero image with thumbnail filmstrip below' },
      { id: 'polaroid', label: 'Polaroid', description: 'Scattered photo prints with a warm, vintage feel' },
    ],
    capabilities: { ...defaultCapabilities, mediaAware: true },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Our moments' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'Photos' },
        { key: 'animation', label: 'Entrance Animation', type: 'select', defaultValue: 'fade', options: [
          { label: 'None', value: 'none' },
          { label: 'Fade In', value: 'fade' },
          { label: 'Slide Up', value: 'slide-up' },
          { label: 'Zoom', value: 'zoom' },
        ]},
        { key: 'showCaptions', label: 'Show Captions', type: 'toggle', defaultValue: true },
        { key: 'enableLightbox', label: 'Enable Lightbox', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: {
      slots: [
        { key: 'mediaAssetIds', label: 'Gallery Photos', dataSource: 'media', multiple: true },
      ],
    },
    previewImagePath: '/previews/gallery.jpg',
  },
  countdown: {
    type: 'countdown',
    label: 'Countdown',
    icon: 'Clock',
    defaultVariant: 'default',
    supportedVariants: ['default', 'banner'],
    variantMeta: [
      { id: 'default', label: 'Centered', description: 'Large countdown numbers centered on the page' },
      { id: 'banner', label: 'Banner', description: 'Slim horizontal strip with countdown and label' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', placeholder: 'Couple names or custom headline' },
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Counting down to' },
        { key: 'message', label: 'Message Below Countdown', type: 'textarea' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/countdown.jpg',
  },
  'wedding-party': {
    type: 'wedding-party',
    label: 'Wedding Party',
    icon: 'Users',
    defaultVariant: 'default',
    supportedVariants: ['default', 'grid'],
    variantMeta: [
      { id: 'default', label: 'Two Sides', description: 'Bridal and groom parties shown in separate rows' },
      { id: 'grid', label: 'Combined Grid', description: 'All party members in a single unified grid' },
    ],
    capabilities: { ...defaultCapabilities, mediaAware: true },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Wedding Party' },
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'The crew' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
        { key: 'bridalTitle', label: "Bridal Side Label", type: 'text', placeholder: "Partner 1's side" },
        { key: 'groomTitle', label: "Groom Side Label", type: 'text', placeholder: "Partner 2's side" },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/wedding-party.jpg',
  },
  'dress-code': {
    type: 'dress-code',
    label: 'Dress Code',
    icon: 'Shirt',
    defaultVariant: 'default',
    supportedVariants: ['default', 'banner'],
    variantMeta: [
      { id: 'default', label: 'Full', description: 'Dress code with description and style suggestions' },
      { id: 'banner', label: 'Banner', description: 'Compact horizontal banner with dress code name' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'What to wear' },
        { key: 'presetCode', label: 'Dress Code Preset', type: 'select', options: [
          { label: 'Black Tie', value: 'black-tie' },
          { label: 'Black Tie Optional', value: 'black-tie-optional' },
          { label: 'Cocktail', value: 'cocktail' },
          { label: 'Garden Party', value: 'garden-party' },
          { label: 'Semi-Formal', value: 'semi-formal' },
          { label: 'Casual', value: 'casual' },
          { label: 'Custom', value: '' },
        ]},
        { key: 'dressCodeLabel', label: 'Custom Label', type: 'text', placeholder: 'e.g. Festive Attire' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'colorNote', label: 'Color Note', type: 'text', placeholder: 'e.g. Please avoid white' },
        { key: 'additionalNote', label: 'Additional Note', type: 'text' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/dress-code.jpg',
  },
  accommodations: {
    type: 'accommodations',
    label: 'Accommodations',
    icon: 'Hotel',
    defaultVariant: 'default',
    supportedVariants: ['default', 'cards'],
    variantMeta: [
      { id: 'default', label: 'List', description: 'Hotels listed with booking codes and details' },
      { id: 'cards', label: 'Cards', description: 'Each hotel in its own card with booking info' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Accommodations' },
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Where to stay' },
        { key: 'generalNote', label: 'General Note', type: 'textarea' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/accommodations.jpg',
  },
  contact: {
    type: 'contact',
    label: 'Contact / Questions',
    icon: 'MessageCircle',
    defaultVariant: 'default',
    supportedVariants: ['default', 'minimal'],
    variantMeta: [
      { id: 'default', label: 'Full', description: 'Contact cards with name, role, and contact links' },
      { id: 'minimal', label: 'Minimal', description: 'Slim bar with contact links inline' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'showTitle', label: 'Show Title', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Questions?' },
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Need help?' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
        { key: 'introText', label: 'Intro Text', type: 'textarea' },
        { key: 'emailSubject', label: 'Email Subject', type: 'text', defaultValue: 'Wedding Question' },
        { key: 'closingNote', label: 'Closing Note', type: 'text' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/contact.jpg',
  },
  'footer-cta': {
    type: 'footer-cta',
    label: 'Footer / RSVP Push',
    icon: 'ArrowRight',
    defaultVariant: 'default',
    supportedVariants: ['default', 'minimal'],
    variantMeta: [
      { id: 'default', label: 'Bold', description: 'Full-width colored section with names and RSVP button' },
      { id: 'minimal', label: 'Minimal', description: 'Clean footer section on white with centered RSVP button' },
    ],
    capabilities: { ...defaultCapabilities, deletable: false },
    settingsSchema: {
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', defaultValue: 'We hope to see you there' },
        { key: 'subtext', label: 'Subtext', type: 'text' },
        { key: 'buttonLabel', label: 'Button Label', type: 'text', defaultValue: 'RSVP Now' },
        { key: 'rsvpUrl', label: 'RSVP Link', type: 'text', defaultValue: '#rsvp' },
        { key: 'footerNote', label: 'Fine Print', type: 'text' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/footer-cta.jpg',
  },
  custom: {
    type: 'custom',
    label: 'Custom Section',
    icon: 'Layout',
    defaultVariant: 'default',
    supportedVariants: ['default'],
    variantMeta: [
      { id: 'default', label: 'Custom', description: 'Build your own section from a pre-made skeleton' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '#ffffff' },
        { key: 'paddingSize', label: 'Section Spacing', type: 'select', defaultValue: 'md', options: [
          { label: 'Compact', value: 'sm' },
          { label: 'Normal', value: 'md' },
          { label: 'Spacious', value: 'lg' },
        ]},
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/custom.jpg',
  },
  quotes: {
    type: 'quotes',
    label: 'Quotes & Wishes',
    icon: 'Quote',
    defaultVariant: 'carousel',
    supportedVariants: ['carousel', 'grid'],
    variantMeta: [
      { id: 'carousel', label: 'Carousel', description: 'One quote at a time with auto-advance and dot navigation' },
      { id: 'grid', label: 'Grid', description: 'All quotes displayed in a beautiful card grid' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Wishes & Words' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'What everyone is saying' },
        { key: 'background', label: 'Background', type: 'select', defaultValue: 'soft', options: [
          { label: 'White', value: 'white' },
          { label: 'Soft', value: 'soft' },
          { label: 'Dark', value: 'dark' },
        ]},
        { key: 'autoplay', label: 'Auto-advance (carousel only)', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/quotes.jpg',
  },
  menu: {
    type: 'menu',
    label: 'Dining & Menu',
    icon: 'UtensilsCrossed',
    defaultVariant: 'tabs',
    supportedVariants: ['tabs', 'card'],
    variantMeta: [
      { id: 'tabs', label: 'Course Tabs', description: 'Tab switcher for each course with itemized dishes' },
      { id: 'card', label: 'Menu Cards', description: 'Each course in its own elegant card' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Dining' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'The Menu' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'note', label: 'Dietary Note', type: 'textarea' },
        { key: 'showDietaryIcons', label: 'Show Dietary Icons', type: 'toggle', defaultValue: true },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/menu.jpg',
  },
  music: {
    type: 'music',
    label: 'Music & Playlist',
    icon: 'Music',
    defaultVariant: 'playlist',
    supportedVariants: ['playlist', 'setlist'],
    variantMeta: [
      { id: 'playlist', label: 'Playlist', description: 'Tabbed playlists per moment with Spotify / Apple Music links' },
      { id: 'setlist', label: 'Special Songs', description: 'Highlight key songs for each special moment' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'The Soundtrack' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'Music for Our Day' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'djBandName', label: 'DJ / Band Name', type: 'text' },
        { key: 'djBandLabel', label: 'Entertainment Label', type: 'text', defaultValue: 'Entertainment by' },
        { key: 'requestNote', label: 'Song Request Note', type: 'text' },
        { key: 'showRequestNote', label: 'Show Song Request', type: 'toggle', defaultValue: true },
        { key: 'background', label: 'Background Style', type: 'select', defaultValue: 'gradient', options: [
          { label: 'White', value: 'white' },
          { label: 'Dark', value: 'dark' },
          { label: 'Gradient', value: 'gradient' },
        ]},
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/music.jpg',
  },
  directions: {
    type: 'directions',
    label: 'Directions & Map',
    icon: 'MapPin',
    defaultVariant: 'pin',
    supportedVariants: ['pin', 'split'],
    variantMeta: [
      { id: 'pin', label: 'Pin & Details', description: 'Address and transport info alongside an embedded map' },
      { id: 'split', label: 'Split Screen', description: 'Full-height split layout with details and map side by side' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', defaultValue: 'Getting Here' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'Directions & Parking' },
        { key: 'venueName', label: 'Venue Name', type: 'text' },
        { key: 'address', label: 'Street Address', type: 'text' },
        { key: 'city', label: 'City, State, ZIP', type: 'text' },
        { key: 'mapUrl', label: 'Custom Map URL (optional)', type: 'text', placeholder: 'Leave blank to auto-generate from address' },
        { key: 'parkingNote', label: 'Parking Info', type: 'textarea' },
        { key: 'shuttleNote', label: 'Shuttle Info', type: 'textarea' },
        { key: 'publicTransitNote', label: 'Public Transit', type: 'textarea' },
        { key: 'drivingTime', label: 'Driving Time (e.g. 25 min)', type: 'text' },
        { key: 'drivingTimeFrom', label: 'Driving From', type: 'text', defaultValue: 'city center' },
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/directions.jpg',
  },
  video: {
    type: 'video',
    label: 'Video',
    icon: 'Play',
    defaultVariant: 'full',
    supportedVariants: ['full', 'card'],
    variantMeta: [
      { id: 'full', label: 'Full Width', description: 'Large cinematic video player centered on the page' },
      { id: 'card', label: 'Video Cards', description: 'Multiple video cards for save-the-dates and highlight reels' },
    ],
    capabilities: { ...defaultCapabilities },
    settingsSchema: {
      fields: [
        { key: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
        { key: 'headline', label: 'Section Title', type: 'text', defaultValue: 'Our Save the Date' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'videoUrl', label: 'Video URL (YouTube or Vimeo)', type: 'text', placeholder: 'https://youtube.com/watch?v=...' },
        { key: 'thumbnailUrl', label: 'Thumbnail Image URL', type: 'text' },
        { key: 'videoType', label: 'Video Platform', type: 'select', defaultValue: 'youtube', options: [
          { label: 'YouTube', value: 'youtube' },
          { label: 'Vimeo', value: 'vimeo' },
          { label: 'Direct URL', value: 'direct' },
        ]},
        { key: 'background', label: 'Background', type: 'select', defaultValue: 'dark', options: [
          { label: 'Dark', value: 'dark' },
          { label: 'White', value: 'white' },
          { label: 'Soft', value: 'soft' },
        ]},
      ],
    },
    bindingsSchema: { slots: [] },
    previewImagePath: '/previews/video.jpg',
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
