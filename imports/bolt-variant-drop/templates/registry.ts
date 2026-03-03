import { Template } from '../types/layoutConfig';

export const templateRegistry: Template[] = [
  {
    id: 'romantic-blush',
    name: 'Romantic Blush',
    description: 'Soft, romantic design with rose and pink tones perfect for traditional love stories',
    defaultThemePreset: 'romantic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'stacked', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Ultra-clean minimalist aesthetic with crisp typography and maximum whitespace',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'editorial-bold',
    name: 'Editorial Bold',
    description: 'Magazine-inspired design with dramatic black backgrounds and bold typography',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'fullscreen', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'fullwidth', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'luxury-blacktie',
    name: 'Luxury Black Tie',
    description: 'Opulent design with rich blacks, golds, and sophisticated elegance for formal affairs',
    defaultThemePreset: 'luxury',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'garden-fresh',
    name: 'Garden Fresh',
    description: 'Botanical-inspired with lush greens and natural textures for outdoor celebrations',
    defaultThemePreset: 'garden',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'garden', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'coastal-breeze',
    name: 'Coastal Breeze',
    description: 'Beach-inspired with ocean blues and sandy neutrals for seaside weddings',
    defaultThemePreset: 'coastal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'coastal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'rustic-chic',
    name: 'Rustic Chic',
    description: 'Warm, earthy tones with vintage charm for barn and countryside venues',
    defaultThemePreset: 'rustic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'stacked', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'playful-colorful',
    name: 'Playful Colorful',
    description: 'Vibrant, joyful design with bold colors and fun animations for modern couples',
    defaultThemePreset: 'playful',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'classic-timeless',
    name: 'Classic Timeless',
    description: 'Traditional elegance that never goes out of style with refined details',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'moody-cinematic',
    name: 'Moody Cinematic',
    description: 'Dark, dramatic atmosphere with film-inspired aesthetics and rich tones',
    defaultThemePreset: 'moody',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'fullscreen', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'destination-travel',
    name: 'Destination Adventure',
    description: 'Travel-forward design emphasizing the journey and exotic location details',
    defaultThemePreset: 'destination',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  {
    id: 'photo-storytelling',
    name: 'Photo Storytelling',
    description: 'Image-driven narrative with large galleries showcasing your love story visually',
    defaultThemePreset: 'photography',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'editorial', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'fullwidth', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
];

export function getTemplateById(id: string): Template | undefined {
  return templateRegistry.find(template => template.id === id);
}

export function getAllTemplates(): Template[] {
  return templateRegistry;
}
