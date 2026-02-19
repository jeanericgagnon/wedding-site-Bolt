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
    supportedVariants: ['default', 'minimal', 'fullbleed', 'split', 'botanical', 'video', 'invitation', 'countdown'],
    variantMeta: [
      { id: 'default', label: 'Classic', description: 'Names, date, and photo with a soft overlay' },
      { id: 'minimal', label: 'Minimal', description: 'Clean typography only, no background image' },
      { id: 'fullbleed', label: 'Full Bleed', description: 'Edge-to-edge image with bold text overlay' },
      { id: 'split', label: 'Split Screen', description: 'Photo fills the left half, names and details on the right' },
      { id: 'botanical', label: 'Botanical', description: 'Floral frame overlay with soft romantic styling' },
      { id: 'video', label: 'Video Background', description: 'Looping video background with centered text overlay' },
      { id: 'invitation', label: 'Invitation Card', description: 'Stationery-style card with formal typography on a textured background' },
      { id: 'countdown', label: 'Countdown Hero', description: 'Hero with live countdown timer embedded in the lower third' },
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
    supportedVariants: ['default', 'centered', 'split', 'timeline', 'chapters', 'duoColumn', 'milestones'],
    variantMeta: [
      { id: 'default', label: 'Classic', description: 'Text on left, photo on right' },
      { id: 'centered', label: 'Centered', description: 'Story text centered with photo above' },
      { id: 'split', label: 'Split', description: 'Large image beside full-height text' },
      { id: 'timeline', label: 'Timeline', description: 'Milestone timeline with alternating text and photos' },
      { id: 'chapters', label: 'Chapters', description: 'Story in numbered chapters with large editorial photos' },
      { id: 'duoColumn', label: 'His & Hers', description: 'Side-by-side columns with each person\'s perspective' },
      { id: 'milestones', label: 'Milestones', description: 'Icon cards for key moments — first date, proposal, and more' },
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
    supportedVariants: ['card', 'mapFirst', 'splitMap', 'detailsFirst', 'banner', 'stacked', 'minimal'],
    variantMeta: [
      { id: 'card', label: 'Card', description: 'Each venue in a rich card with photo and details' },
      { id: 'mapFirst', label: 'Map First', description: 'Full-width map at the top, details below' },
      { id: 'splitMap', label: 'Split Map', description: 'Details and map/photo side by side' },
      { id: 'detailsFirst', label: 'Details First', description: 'Structured detail grid with icons' },
      { id: 'banner', label: 'Aerial Banner', description: 'Full-width cinematic venue photo with overlaid name and details' },
      { id: 'stacked', label: 'Stacked', description: 'Ceremony and reception venues stacked with photo headers' },
      { id: 'minimal', label: 'Minimal', description: 'Typography-first layout with small map thumbnail' },
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
    supportedVariants: ['timeline', 'dayTabs', 'agendaCards', 'bands', 'horizontal', 'program'],
    variantMeta: [
      { id: 'timeline', label: 'Timeline', description: 'Vertical timeline with times on the left' },
      { id: 'dayTabs', label: 'Day Tabs', description: 'Tab switcher for multi-day weekend events' },
      { id: 'agendaCards', label: 'Agenda Cards', description: 'Each event as a card in a grid layout' },
      { id: 'bands', label: 'Program Bands', description: 'Alternating full-width rows styled like a printed program' },
      { id: 'horizontal', label: 'Horizontal', description: 'Events along a horizontal scrolling timeline track' },
      { id: 'program', label: 'Split Two-Column', description: 'Ceremony events left, reception events right' },
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
    supportedVariants: ['list', 'hotelBlock', 'tiers', 'mapPins', 'splitAirHotel', 'compact'],
    variantMeta: [
      { id: 'list', label: 'List', description: 'Travel tips + compact hotel list' },
      { id: 'hotelBlock', label: 'Hotel Block', description: 'Hotel-first layout with booking codes, amenities, and shuttle info' },
      { id: 'tiers', label: 'Tiered Options', description: 'Hotels grouped by Closest, Best Value, and Budget tiers' },
      { id: 'mapPins', label: 'Map & Pins', description: 'Map with hotel and venue pins plus a list below' },
      { id: 'splitAirHotel', label: 'Air & Hotel Split', description: 'Airport info on the left, hotel recommendations on the right' },
      { id: 'compact', label: 'Compact List', description: 'Minimalist bullet list with names, distances, and links' },
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
    supportedVariants: ['cards', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated'],
    variantMeta: [
      { id: 'cards', label: 'Store Links', description: 'Registry links as clickable store cards' },
      { id: 'featured', label: 'Featured Gifts', description: 'Showcase specific gift items with photos, prices, and store links' },
      { id: 'minimal', label: 'Minimal', description: 'Heartfelt note with understated registry links' },
      { id: 'honeymoon', label: 'Honeymoon Fund', description: 'Large fund card with destination photo and contribute button' },
      { id: 'tabs', label: 'Tabbed', description: 'Tabbed layout to browse Home, Experiences, and Cash Fund registries' },
      { id: 'illustrated', label: 'Illustrated', description: 'Gift icons and watercolor illustrations with registry links' },
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
    supportedVariants: ['default', 'accordion', 'twoColumn', 'tabbed', 'chat', 'numbered'],
    variantMeta: [
      { id: 'default', label: 'Open List', description: 'All questions and answers visible at once' },
      { id: 'accordion', label: 'Accordion', description: 'Collapsible questions, one open at a time' },
      { id: 'twoColumn', label: 'Two Column', description: 'Q&A pairs in a two-column grid, all visible' },
      { id: 'tabbed', label: 'Tabbed', description: 'Questions grouped by category with tab navigation' },
      { id: 'chat', label: 'Chat Bubbles', description: 'Conversational Q&A styled as speech bubbles' },
      { id: 'numbered', label: 'Numbered', description: 'Clean numbered list with questions and answers' },
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
    supportedVariants: ['default', 'inline', 'card', 'illustrated', 'formal', 'multiEvent'],
    variantMeta: [
      { id: 'default', label: 'Full Form', description: 'Dedicated RSVP section with form fields' },
      { id: 'inline', label: 'Inline', description: 'Compact inline form embedded in the page' },
      { id: 'card', label: 'Card Steps', description: 'Multi-step card form with progress indicator' },
      { id: 'illustrated', label: 'Illustrated', description: 'Botanical background with a centered form card' },
      { id: 'formal', label: 'Formal', description: 'Invitation-style wording with Accepts / Declines toggle' },
      { id: 'multiEvent', label: 'Multi-Event', description: 'RSVP to each wedding event separately' },
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
    supportedVariants: ['masonry', 'grid', 'filmStrip', 'polaroid', 'spotlight', 'carousel', 'mosaic', 'categorized'],
    variantMeta: [
      { id: 'masonry', label: 'Masonry', description: 'Pinterest-style varied height layout with scroll animations' },
      { id: 'grid', label: 'Grid', description: 'Uniform grid with aspect ratio control and entrance animations' },
      { id: 'filmStrip', label: 'Film Strip', description: 'Large hero image with thumbnail filmstrip below' },
      { id: 'polaroid', label: 'Polaroid', description: 'Scattered photo prints with a warm, vintage feel' },
      { id: 'spotlight', label: 'Spotlight', description: 'Featured large photo with thumbnail strip for navigation' },
      { id: 'carousel', label: 'Carousel', description: 'Full-width slideshow with arrow navigation and captions' },
      { id: 'mosaic', label: 'Mosaic', description: 'Curated editorial collage with one hero photo and supporting images' },
      { id: 'categorized', label: 'Categorized', description: 'Tabbed gallery with photos grouped by Ceremony, Reception, etc.' },
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
    supportedVariants: ['default', 'banner', 'rings', 'minimal', 'dark', 'photo'],
    variantMeta: [
      { id: 'default', label: 'Centered', description: 'Large countdown numbers centered on the page' },
      { id: 'banner', label: 'Banner', description: 'Slim horizontal strip with countdown and label' },
      { id: 'rings', label: 'Rings', description: 'Circular progress rings for each time unit' },
      { id: 'minimal', label: 'Typographic', description: 'Ultra-large display numeral showing days remaining' },
      { id: 'dark', label: 'Dark & Bold', description: 'Dark background with glowing countdown numbers' },
      { id: 'photo', label: 'Photo Background', description: 'Countdown overlaid on a couple photo with frosted glass panel' },
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
    supportedVariants: ['default', 'grid', 'scroll', 'storyBios', 'minimal', 'splitSides'],
    variantMeta: [
      { id: 'default', label: 'Two Sides', description: 'Bridal and groom parties shown in separate rows' },
      { id: 'grid', label: 'Combined Grid', description: 'All party members in a single unified grid' },
      { id: 'scroll', label: 'Horizontal Scroll', description: 'Scrolling strip of tall portrait cards' },
      { id: 'storyBios', label: 'Story Bios', description: 'Full-width rows with large photo and longer personal bios' },
      { id: 'minimal', label: 'Name List', description: 'Elegant typographic name list grouped by role' },
      { id: 'splitSides', label: 'Split Panel', description: 'Contrasting left/right panels for each side of the wedding party' },
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
    supportedVariants: ['default', 'banner', 'palette', 'illustrated', 'card', 'scale'],
    variantMeta: [
      { id: 'default', label: 'Full', description: 'Dress code with description and style suggestions' },
      { id: 'banner', label: 'Banner', description: 'Compact horizontal banner with dress code name' },
      { id: 'palette', label: 'Color Palette', description: 'Color swatches showing encouraged and avoid colors' },
      { id: 'illustrated', label: 'Illustrated', description: 'Fashion silhouette illustrations showing example outfits' },
      { id: 'card', label: 'Do & Don\'t Card', description: 'Card with encouraged, avoid, and notes columns' },
      { id: 'scale', label: 'Formality Scale', description: 'Visual spectrum bar showing where the dress code falls' },
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
    supportedVariants: ['default', 'cards', 'featured', 'mapList', 'faqStyle', 'onSite'],
    variantMeta: [
      { id: 'default', label: 'List', description: 'Hotels listed with booking codes and details' },
      { id: 'cards', label: 'Cards', description: 'Each hotel in its own card with booking info' },
      { id: 'featured', label: 'Featured Block', description: 'Prominent hotel block card with deadline and booking code' },
      { id: 'mapList', label: 'Map & List', description: 'Interactive map with hotel pins and a list below' },
      { id: 'faqStyle', label: 'FAQ Style', description: 'Intro with accordion Q&A for parking, shuttle, and booking' },
      { id: 'onSite', label: 'On-Site Lodging', description: 'Estate or inn accommodation feature with photo and booking' },
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
    supportedVariants: ['default', 'minimal', 'form', 'split', 'casual', 'coordinator'],
    variantMeta: [
      { id: 'default', label: 'Full', description: 'Contact cards with name, role, and contact links' },
      { id: 'minimal', label: 'Minimal', description: 'Slim bar with contact links inline' },
      { id: 'form', label: 'Message Form', description: 'Contact form with name, email, and message fields' },
      { id: 'split', label: 'Form & Details', description: 'Form on the left, contact info and social links on the right' },
      { id: 'casual', label: 'Casual Ask', description: 'Warm heading, couple photo, and single-field email input' },
      { id: 'coordinator', label: 'Coordinator', description: 'Couple contact info plus wedding coordinator card' },
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
    supportedVariants: ['default', 'minimal', 'monogram', 'hashtag', 'photo', 'countdown'],
    variantMeta: [
      { id: 'default', label: 'Bold', description: 'Full-width colored section with names and RSVP button' },
      { id: 'minimal', label: 'Minimal', description: 'Clean footer section on white with centered RSVP button' },
      { id: 'monogram', label: 'Monogram', description: 'Large couple monogram or crest with names and date' },
      { id: 'hashtag', label: 'Hashtag CTA', description: 'Social hashtag in display type with Instagram share prompt' },
      { id: 'photo', label: 'Closing Photo', description: 'Romantic couple photo spanning full width with name overlay' },
      { id: 'countdown', label: 'Countdown Push', description: 'RSVP deadline reminder with countdown and action button' },
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
    supportedVariants: ['carousel', 'grid', 'featured', 'pullQuote', 'guestbook', 'letter'],
    variantMeta: [
      { id: 'carousel', label: 'Carousel', description: 'One quote at a time with auto-advance and dot navigation' },
      { id: 'grid', label: 'Grid', description: 'All quotes displayed in a beautiful card grid' },
      { id: 'featured', label: 'Featured', description: 'Spotlight one featured quote with supporting quotes below' },
      { id: 'pullQuote', label: 'Pull Quote', description: 'One large meaningful quote in italic serif with decorative marks' },
      { id: 'guestbook', label: 'Guestbook', description: 'Interactive wishing well where guests leave messages' },
      { id: 'letter', label: 'Love Letter', description: 'Letter styled with paper texture and handwriting font from the couple' },
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
    supportedVariants: ['tabs', 'card', 'simple', 'printed', 'cocktailDinner', 'illustrated'],
    variantMeta: [
      { id: 'tabs', label: 'Course Tabs', description: 'Tab switcher for each course with itemized dishes' },
      { id: 'card', label: 'Menu Cards', description: 'Each course in its own elegant card' },
      { id: 'simple', label: 'Simple List', description: 'Clean single-column menu list with numbered items' },
      { id: 'printed', label: 'Printed Menu', description: 'Formal centered layout styled like a printed dinner menu card' },
      { id: 'cocktailDinner', label: 'Cocktail & Dinner', description: 'Two-section layout: cocktail hour stations and plated dinner' },
      { id: 'illustrated', label: 'Illustrated', description: 'Menu items with hand-drawn food illustrations' },
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
    supportedVariants: ['playlist', 'setlist', 'compact', 'vinyl', 'requestForm', 'journey'],
    variantMeta: [
      { id: 'playlist', label: 'Playlist', description: 'Tabbed playlists per moment with Spotify / Apple Music links' },
      { id: 'setlist', label: 'Special Songs', description: 'Highlight key songs for each special moment' },
      { id: 'compact', label: 'Compact List', description: 'Clean numbered song list in a single card' },
      { id: 'vinyl', label: 'Vinyl Record', description: 'Music streaming-inspired layout with album art cards' },
      { id: 'requestForm', label: 'Song Request', description: 'Interactive form for guests to suggest dance floor songs' },
      { id: 'journey', label: 'Music Journey', description: 'Timeline of the day\'s music arc from ceremony to reception' },
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
    supportedVariants: ['pin', 'split', 'card', 'illustrated', 'multiVenue', 'transport', 'fromHotel'],
    variantMeta: [
      { id: 'pin', label: 'Pin & Details', description: 'Address and transport info alongside an embedded map' },
      { id: 'split', label: 'Split Screen', description: 'Full-height split layout with details and map side by side' },
      { id: 'card', label: 'Map Card', description: 'All-in-one card with map, address, and directions' },
      { id: 'illustrated', label: 'Illustrated Map', description: 'Hand-drawn area map with venue and hotel pins' },
      { id: 'multiVenue', label: 'Multi-Venue Pins', description: 'Map showing ceremony, reception, and hotel locations' },
      { id: 'transport', label: 'By Air / Car / Train', description: 'Transport columns for driving, flying, and transit guests' },
      { id: 'fromHotel', label: 'From Your Hotel', description: 'Step-by-step directions from each hotel block to the venue' },
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
    supportedVariants: ['full', 'card', 'inline', 'background', 'lightbox', 'reel'],
    variantMeta: [
      { id: 'full', label: 'Full Width', description: 'Large cinematic video player centered on the page' },
      { id: 'card', label: 'Video Cards', description: 'Multiple video cards for save-the-dates and highlight reels' },
      { id: 'inline', label: 'Inline', description: 'Side-by-side video and text content' },
      { id: 'background', label: 'Video Background', description: 'Muted looping video as section background with text overlay' },
      { id: 'lightbox', label: 'Lightbox Trigger', description: 'Static photo with play button that opens a full-screen video modal' },
      { id: 'reel', label: 'Short Reel', description: 'Portrait 9:16 video in a phone frame for save-the-date reels' },
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
