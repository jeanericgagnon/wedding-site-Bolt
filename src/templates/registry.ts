import { SectionInstance } from '../types/layoutConfig';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  defaultThemePreset: string;
  defaultLayout: {
    sections: Omit<SectionInstance, 'id'>[];
  };
}

const templateRegistry: TemplateDefinition[] = [] = [
  // 1. HERO-FOCUSED: Editorial Impact (Large, dramatic photography)
  {
    id: 'editorial-impact',
    name: 'Editorial Impact',
    description: 'Magazine-style design with stunning photography, dramatic black backgrounds, and bold typography',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'editorial', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'detailed', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'editorial', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'fullwidth', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 2. CINEMATIC IMMERSION (Full-screen hero with dramatic flow)
  {
    id: 'cinematic-immersion',
    name: 'Cinematic Immersion',
    description: 'Full-screen hero with moody cinematography and immersive storytelling for dramatic celebrations',
    defaultThemePreset: 'moody',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'fullscreen', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'flip', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cinematic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'extended', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 3. ROMANTIC DREAMY (Soft pastels and emotional storytelling)
  {
    id: 'romantic-dreamy',
    name: 'Romantic Dreamy',
    description: 'Soft, romantic aesthetic with gentle pastels and emotional storytelling perfect for traditional love stories',
    defaultThemePreset: 'romantic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'stacked', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 4. PLAYFUL CELEBRATION (Bright, joyful, animated)
  {
    id: 'playful-celebration',
    name: 'Playful Celebration',
    description: 'Vibrant, joyful design with bold colors and fun animations for modern, happy couples',
    defaultThemePreset: 'playful',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'polaroid', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'playful', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 5. TIMELESS CLASSIC (Refined elegance)
  {
    id: 'timeless-classic',
    name: 'Timeless Classic',
    description: 'Traditional elegance with refined details that never go out of style, perfect for formal occasions',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 6. COASTAL BREEZE (Ocean-inspired, breezy)
  {
    id: 'coastal-breeze',
    name: 'Coastal Breeze',
    description: 'Beach-inspired design with ocean blues and sandy neutrals, perfect for seaside celebrations',
    defaultThemePreset: 'coastal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'coastal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 7. GARDEN ESCAPE (Botanical and natural)
  {
    id: 'garden-escape',
    name: 'Garden Escape',
    description: 'Botanical-inspired design with lush greens and natural textures, perfect for outdoor celebrations',
    defaultThemePreset: 'garden',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'garden', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'garden', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 8. MODERN CLEAN (Contemporary and minimalist)
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Contemporary minimalist design with crisp typography and maximum whitespace',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'centered', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'modern', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 9. LUXURY OPULENT (High-end and formal)
  {
    id: 'luxury-opulent',
    name: 'Luxury Opulent',
    description: 'Opulent design with rich blacks, golds, and sophisticated elegance for formal black-tie affairs',
    defaultThemePreset: 'luxury',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 10. DESTINATION ADVENTURE (Travel-focused)
  {
    id: 'destination-adventure',
    name: 'Destination Adventure',
    description: 'Travel-forward design emphasizing journey and exotic location details for destination weddings',
    defaultThemePreset: 'destination',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'showcase', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'itinerary', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'categorized', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 11. PHOTO STORYTELLING (Gallery-focused)
  {
    id: 'photo-storytelling',
    name: 'Photo Storytelling',
    description: 'Image-driven narrative with large galleries showcasing your love story visually and minimally',
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
  // 12. MINIMAL ESSENTIALS (Ultra-clean)
  {
    id: 'minimal-essentials',
    name: 'Minimal Essentials',
    description: 'Ultra-clean minimal design focusing on essential information with maximum whitespace',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 13. MAGAZINE NARRATIVE (Editorial-style storytelling)
  {
    id: 'magazine-narrative',
    name: 'Magazine Narrative',
    description: 'Magazine-style layout with detailed storytelling, rich imagery, and editorial direction',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'magazine', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'detailed', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'magazine', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'magazine', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'magazine', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'program', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'tabbed', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 14. BOLD STATEMENT (Dramatic and modern)
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    description: 'Dramatic design with bold typography, striking imagery, and confident modern aesthetics',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'bold', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 15. ARTISTIC EXPRESSION (Creative and unique)
  {
    id: 'artistic-expression',
    name: 'Artistic Expression',
    description: 'Creative design celebrating artistic flair with unique layouts and bold visual statements',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'artistic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'editorial', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'fullwidth', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'artistic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'artistic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'creative', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 16. REFINED ELEGANCE (Sophisticated and subtle)
  {
    id: 'refined-elegance',
    name: 'Refined Elegance',
    description: 'Sophisticated design with subtle animations and refined details for elegant occasions',
    defaultThemePreset: 'luxury',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'refined', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'refined', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'elegant', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 17. RUSTIC CHARM (Warm and earthy)
  {
    id: 'rustic-charm',
    name: 'Rustic Charm',
    description: 'Warm, earthy design with vintage charm, perfect for barn and countryside venues',
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
  // 18. MOODY DRAMATIC (Dark and intimate)
  {
    id: 'moody-dramatic',
    name: 'Moody Dramatic',
    description: 'Dark, dramatic atmosphere with film-inspired aesthetics and rich, intimate tones',
    defaultThemePreset: 'moody',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'moody', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'immersive', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'spotlight', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 19. CONTEMPORARY FUSION (Mixed modern styles)
  {
    id: 'contemporary-fusion',
    name: 'Contemporary Fusion',
    description: 'Contemporary design blending modern and classic elements with dynamic interactions',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'centered', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'modern', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 20. FLOATING ELEMENTS (Dynamic, floating design)
  {
    id: 'floating-elements',
    name: 'Floating Elements',
    description: 'Dynamic design with floating elements and smooth animations for modern movement',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'floating', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'floating', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'modern', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 21-35: HYBRID & COMPREHENSIVE TEMPLATES
  // 21. FULL FEATURED CLASSIC
  {
    id: 'full-featured-classic',
    name: 'Full Featured Classic',
    description: 'Comprehensive traditional template with all sections in classic style',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 22. FULL FEATURED MODERN
  {
    id: 'full-featured-modern',
    name: 'Full Featured Modern',
    description: 'Comprehensive contemporary template with all modern styled sections',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'centered', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'modern', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'modern', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 23. FULL FEATURED LUXURY
  {
    id: 'full-featured-luxury',
    name: 'Full Featured Luxury',
    description: 'Comprehensive luxury template with opulent styling throughout',
    defaultThemePreset: 'luxury',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 24. FULL FEATURED PLAYFUL
  {
    id: 'full-featured-playful',
    name: 'Full Featured Playful',
    description: 'Comprehensive joyful template with vibrant playful styling throughout',
    defaultThemePreset: 'playful',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'polaroid', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'playful', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'playful', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 25. FULL FEATURED MINIMAL
  {
    id: 'full-featured-minimal',
    name: 'Full Featured Minimal',
    description: 'Comprehensive minimalist template keeping it simple yet complete',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 26. GUEST EXPERIENCE FOCUSED
  {
    id: 'guest-experience-first',
    name: 'Guest Experience First',
    description: 'Design prioritizing guest information and RSVP with prominent travel and accommodations',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'map', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'dress-code', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'categorized', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 27. WEDDING PARTY SHOWCASE
  {
    id: 'wedding-party-showcase',
    name: 'Wedding Party Showcase',
    description: 'Design featuring prominent wedding party profiles and bios with photo gallery',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 28. TIMELINE NARRATIVE
  {
    id: 'timeline-narrative',
    name: 'Timeline Narrative',
    description: 'Timeline-focused design showing journey progression from beginning to celebration',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'progress', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 29. REGISTRY & WISH FOCUSED
  {
    id: 'registry-wish-focused',
    name: 'Registry & Wish Focused',
    description: 'Template emphasizing registry options with multiple registry style choices',
    defaultThemePreset: 'classic',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'grid', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'classic', enabled: true, bindings: {}, settings: {} },
        { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'classic', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 30. ULTRA COMPACT MOBILE
  {
    id: 'ultra-compact-mobile',
    name: 'Ultra Compact Mobile',
    description: 'Optimized compact design perfect for mobile-first viewing and quick information scanning',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'compact', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'quick', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 31. IMMERSIVE EXPERIENCE
  {
    id: 'immersive-experience',
    name: 'Immersive Experience',
    description: 'Immersive design with layered imagery and sophisticated interactions for high engagement',
    defaultThemePreset: 'moody',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'layered', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'immersive', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'spotlight', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'filmstrip', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'immersive', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'extended', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'expanded', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 32. ELOPEMENT INTIMATE
  {
    id: 'elopement-intimate',
    name: 'Elopement Intimate',
    description: 'Intimate minimal design perfect for small ceremonies and elopements',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'carousel', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'minimal', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 33. BOLD TYPOGRAPHY DRIVEN
  {
    id: 'bold-typography-driven',
    name: 'Bold Typography Driven',
    description: 'Design driven by powerful typography and text hierarchy with minimalist imagery',
    defaultThemePreset: 'editorial',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'bold', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'bold', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 34. SPLIT SCREEN MODERN
  {
    id: 'split-screen-modern',
    name: 'Split Screen Modern',
    description: 'Modern design utilizing split-screen layouts for dynamic side-by-side content',
    defaultThemePreset: 'minimal',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'split', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'cards', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'modern', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
  // 35. EXPERIENCE COLLECTION
  {
    id: 'experience-collection',
    name: 'Experience Collection',
    description: 'Curated design highlighting experiences and registry with focus on activities and gifts',
    defaultThemePreset: 'luxury',
    defaultLayout: {
      sections: [
        { type: 'hero', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'story', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'registry', variant: 'experiences', enabled: true, bindings: {}, settings: {} },
        { type: 'accommodations', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'travel', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'venue', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'schedule', variant: 'itinerary', enabled: true, bindings: {}, settings: {} },
        { type: 'gallery', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'countdown', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'wedding-party', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
        { type: 'rsvp', variant: 'form', enabled: true, bindings: {}, settings: {} },
        { type: 'footer-cta', variant: 'luxury', enabled: true, bindings: {}, settings: {} },
      ],
    },
  },
];

const templateById: Record<string, TemplateDefinition> = Object.fromEntries(
  templateRegistry.map((template) => [template.id, template])
) as Record<string, TemplateDefinition>;

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  ...templateById,
  // Back-compat aliases used by older flows
  base: templateById['timeless-classic'] ?? templateRegistry[0],
  modern: templateById['modern-clean'] ?? templateRegistry[0],
  editorial: templateById['editorial-impact'] ?? templateRegistry[0],
  classic: templateById['timeless-classic'] ?? templateRegistry[0],
  rustic: templateById['rustic-barn'] ?? templateById['timeless-classic'] ?? templateRegistry[0],
};

export function getTemplate(templateId: string): TemplateDefinition {
  return TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.base || templateRegistry[0];
}

export function getAllTemplates(): TemplateDefinition[] {
  return templateRegistry;
}
