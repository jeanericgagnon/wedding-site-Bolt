import { ComponentType } from 'react';
import { Section } from '../types/layoutConfig';

import HeroClassic from './Hero/HeroClassic';
import HeroMinimal from './Hero/HeroMinimal';
import HeroEditorial from './Hero/HeroEditorial';
import HeroLuxury from './Hero/HeroLuxury';
import HeroGarden from './Hero/HeroGarden';
import HeroCoastal from './Hero/HeroCoastal';
import HeroPlayful from './Hero/HeroPlayful';
import HeroMoody from './Hero/HeroMoody';
import HeroSplit from './Hero/HeroSplit';
import HeroFullscreen from './Hero/HeroFullscreen';
import HeroStacked from './Hero/HeroStacked';

import StoryClassic from './Story/StoryClassic';
import StoryTimeline from './Story/StoryTimeline';
import StoryCards from './Story/StoryCards';
import StorySplit from './Story/StorySplit';

import VenueClassic from './Venue/VenueClassic';
import VenueMinimal from './Venue/VenueMinimal';
import VenueSplit from './Venue/VenueSplit';
import VenueCards from './Venue/VenueCards';

import ScheduleClassic from './Schedule/ScheduleClassic';
import ScheduleCards from './Schedule/ScheduleCards';
import ScheduleMinimal from './Schedule/ScheduleMinimal';

import TravelClassic from './Travel/TravelClassic';
import TravelMap from './Travel/TravelMap';
import TravelCompact from './Travel/TravelCompact';

import RegistryClassic from './Registry/RegistryClassic';
import RegistryCards from './Registry/RegistryCards';
import RegistryMinimal from './Registry/RegistryMinimal';

import FAQClassic from './FAQ/FAQClassic';
import FAQAccordion from './FAQ/FAQAccordion';
import FAQGrid from './FAQ/FAQGrid';

import RSVPClassic from './RSVP/RSVPClassic';
import RSVPForm from './RSVP/RSVPForm';
import RSVPMinimal from './RSVP/RSVPMinimal';

import GalleryClassic from './Gallery/GalleryClassic';
import GalleryMasonry from './Gallery/GalleryMasonry';
import GalleryFullwidth from './Gallery/GalleryFullwidth';
import GalleryCarousel from './Gallery/GalleryCarousel';

import CountdownClassic from './Countdown/CountdownClassic';
import FooterClassic from './Footer/FooterClassic';
import FooterExpanded from './Footer/FooterExpanded';
import FooterMinimal from './Footer/FooterMinimal';

export interface SectionComponent {
  component: ComponentType<{ section: Section }>;
  name: string;
  description: string;
}

export const sectionRegistry: Record<string, Record<string, SectionComponent>> = {
  hero: {
    classic: {
      component: HeroClassic,
      name: 'Classic Hero',
      description: 'Traditional romantic hero with gradient background',
    },
    minimal: {
      component: HeroMinimal,
      name: 'Minimal Hero',
      description: 'Clean, minimalist design with typography focus',
    },
    editorial: {
      component: HeroEditorial,
      name: 'Editorial Hero',
      description: 'Bold, magazine-style hero with dark background',
    },
    luxury: {
      component: HeroLuxury,
      name: 'Luxury Hero',
      description: 'Elegant black-tie feel with gold accents',
    },
    garden: {
      component: HeroGarden,
      name: 'Garden Hero',
      description: 'Fresh garden-inspired design with botanical elements',
    },
    coastal: {
      component: HeroCoastal,
      name: 'Coastal Hero',
      description: 'Beach-inspired design with ocean colors',
    },
    playful: {
      component: HeroPlayful,
      name: 'Playful Hero',
      description: 'Fun, colorful design with animated elements',
    },
    moody: {
      component: HeroMoody,
      name: 'Moody Hero',
      description: 'Dark, cinematic hero with dramatic lighting',
    },
    split: {
      component: HeroSplit,
      name: 'Split Hero',
      description: 'Two-column split layout with image and text',
    },
    fullscreen: {
      component: HeroFullscreen,
      name: 'Fullscreen Hero',
      description: 'Full viewport hero with large background image',
    },
    stacked: {
      component: HeroStacked,
      name: 'Stacked Hero',
      description: 'Vertical stacked layout with image on top',
    },
  },
  story: {
    classic: {
      component: StoryClassic,
      name: 'Classic Story',
      description: 'Traditional story section with meeting and proposal',
    },
    timeline: {
      component: StoryTimeline,
      name: 'Timeline Story',
      description: 'Interactive timeline of relationship milestones',
    },
    cards: {
      component: StoryCards,
      name: 'Cards Story',
      description: 'Three-card layout for journey milestones',
    },
    split: {
      component: StorySplit,
      name: 'Split Story',
      description: 'Alternating image and text chapters',
    },
  },
  venue: {
    classic: {
      component: VenueClassic,
      name: 'Classic Venue',
      description: 'Venue details with image and information',
    },
    minimal: {
      component: VenueMinimal,
      name: 'Minimal Venue',
      description: 'Simple, text-focused venue section',
    },
    split: {
      component: VenueSplit,
      name: 'Split Venue',
      description: 'Dark split layout with image and details',
    },
    cards: {
      component: VenueCards,
      name: 'Cards Venue',
      description: 'Separate cards for ceremony and reception',
    },
  },
  schedule: {
    classic: {
      component: ScheduleClassic,
      name: 'Classic Schedule',
      description: 'Timeline of wedding day events',
    },
    cards: {
      component: ScheduleCards,
      name: 'Cards Schedule',
      description: 'Colorful card-based timeline',
    },
    minimal: {
      component: ScheduleMinimal,
      name: 'Minimal Schedule',
      description: 'Clean list with times and events',
    },
  },
  travel: {
    classic: {
      component: TravelClassic,
      name: 'Classic Travel',
      description: 'Travel and accommodation information',
    },
    map: {
      component: TravelMap,
      name: 'Map Travel',
      description: 'Map-focused layout with travel details',
    },
    compact: {
      component: TravelCompact,
      name: 'Compact Travel',
      description: 'Condensed dark layout for essential info',
    },
  },
  registry: {
    classic: {
      component: RegistryClassic,
      name: 'Classic Registry',
      description: 'Gift registry information and links',
    },
    cards: {
      component: RegistryCards,
      name: 'Cards Registry',
      description: 'Three-card layout with different registry options',
    },
    minimal: {
      component: RegistryMinimal,
      name: 'Minimal Registry',
      description: 'Simple list of registry links',
    },
  },
  faq: {
    classic: {
      component: FAQClassic,
      name: 'Classic FAQ',
      description: 'Frequently asked questions',
    },
    accordion: {
      component: FAQAccordion,
      name: 'Accordion FAQ',
      description: 'Collapsible accordion-style questions',
    },
    grid: {
      component: FAQGrid,
      name: 'Grid FAQ',
      description: 'Icon-based grid layout',
    },
  },
  rsvp: {
    classic: {
      component: RSVPClassic,
      name: 'Classic RSVP',
      description: 'RSVP form for guests',
    },
    form: {
      component: RSVPForm,
      name: 'Form RSVP',
      description: 'Detailed form with multiple fields',
    },
    minimal: {
      component: RSVPMinimal,
      name: 'Minimal RSVP',
      description: 'Simple centered form layout',
    },
  },
  gallery: {
    classic: {
      component: GalleryClassic,
      name: 'Classic Gallery',
      description: 'Grid-based photo gallery',
    },
    masonry: {
      component: GalleryMasonry,
      name: 'Masonry Gallery',
      description: 'Pinterest-style masonry layout',
    },
    fullwidth: {
      component: GalleryFullwidth,
      name: 'Fullwidth Gallery',
      description: 'Full viewport scrolling images',
    },
    carousel: {
      component: GalleryCarousel,
      name: 'Carousel Gallery',
      description: 'Interactive carousel with thumbnails',
    },
  },
  countdown: {
    classic: {
      component: CountdownClassic,
      name: 'Classic Countdown',
      description: 'Wedding day countdown timer',
    },
  },
  'footer-cta': {
    classic: {
      component: FooterClassic,
      name: 'Classic Footer',
      description: 'Simple footer with thank you message',
    },
    expanded: {
      component: FooterExpanded,
      name: 'Expanded Footer',
      description: 'Comprehensive footer with social links and contact',
    },
    minimal: {
      component: FooterMinimal,
      name: 'Minimal Footer',
      description: 'Ultra-minimal single line footer',
    },
  },
};

export function getSectionComponent(type: string, variant: string): ComponentType<{ section: Section }> | null {
  return sectionRegistry[type]?.[variant]?.component || null;
}
