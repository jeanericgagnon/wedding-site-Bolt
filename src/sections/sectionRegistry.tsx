import React from 'react';
import { SectionType } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { SectionInstance } from '../types/layoutConfig';

import { HeroSection, HeroMinimal, HeroFullbleed, HeroCountdown } from './components/HeroSection';
import { StorySection, StoryCentered, StorySplit, StoryTimeline } from './components/StorySection';
import { VenueSection, VenueCard } from './components/VenueSection';
import { ScheduleSection, ScheduleTimeline } from './components/ScheduleSection';
import { TravelSection, TravelCards } from './components/TravelSection';
import { RegistrySection, RegistryGrid } from './components/RegistrySection';
import { RsvpSection, RsvpInline } from './components/RsvpSection';
import { FaqSection, FaqAccordion } from './components/FaqSection';
import { GallerySection, GalleryMasonry } from './components/GallerySection';
import { CountdownSection, CountdownBanner } from './components/CountdownSection';
import { WeddingPartySection, WeddingPartyGrid } from './components/WeddingPartySection';
import { DressCodeSection, DressCodeBanner } from './components/DressCodeSection';
import { AccommodationsSection, AccommodationsCards } from './components/AccommodationsSection';
import { ContactSection, ContactMinimal } from './components/ContactSection';
import { FooterCtaSection, FooterCtaMinimal } from './components/FooterCtaSection';

export interface SectionComponentProps {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export type SectionComponent = React.FC<SectionComponentProps>;

interface SectionDefinition {
  component: SectionComponent;
  variants: {
    [variantName: string]: SectionComponent;
  };
  supportedBindings: string[];
  supportedSettings: string[];
}

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  hero: {
    component: HeroSection,
    variants: {
      default: HeroSection,
      minimal: HeroMinimal,
      fullbleed: HeroFullbleed,
      countdown: HeroCountdown,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle'],
  },
  story: {
    component: StorySection,
    variants: {
      default: StorySection,
      centered: StoryCentered,
      split: StorySplit,
      timeline: StoryTimeline,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  venue: {
    component: VenueSection,
    variants: {
      default: VenueSection,
      card: VenueCard,
    },
    supportedBindings: ['venueIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  schedule: {
    component: ScheduleSection,
    variants: {
      default: ScheduleSection,
      timeline: ScheduleTimeline,
    },
    supportedBindings: ['scheduleItemIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  travel: {
    component: TravelSection,
    variants: {
      default: TravelSection,
      cards: TravelCards,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  registry: {
    component: RegistrySection,
    variants: {
      default: RegistrySection,
      grid: RegistryGrid,
    },
    supportedBindings: ['linkIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  rsvp: {
    component: RsvpSection,
    variants: {
      default: RsvpSection,
      inline: RsvpInline,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  faq: {
    component: FaqSection,
    variants: {
      default: FaqSection,
      accordion: FaqAccordion,
    },
    supportedBindings: ['faqIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  gallery: {
    component: GallerySection,
    variants: {
      default: GallerySection,
      masonry: GalleryMasonry,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  countdown: {
    component: CountdownSection,
    variants: {
      default: CountdownSection,
      banner: CountdownBanner,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'eyebrow', 'message'],
  },
  'wedding-party': {
    component: WeddingPartySection,
    variants: {
      default: WeddingPartySection,
      grid: WeddingPartyGrid,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle', 'eyebrow', 'bridalTitle', 'groomTitle'],
  },
  'dress-code': {
    component: DressCodeSection,
    variants: {
      default: DressCodeSection,
      banner: DressCodeBanner,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'eyebrow', 'presetCode', 'dressCodeLabel', 'description', 'colorNote', 'additionalNote'],
  },
  accommodations: {
    component: AccommodationsSection,
    variants: {
      default: AccommodationsSection,
      cards: AccommodationsCards,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'eyebrow', 'generalNote', 'hotels'],
  },
  contact: {
    component: ContactSection,
    variants: {
      default: ContactSection,
      minimal: ContactMinimal,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle', 'eyebrow', 'introText', 'contacts', 'emailSubject', 'closingNote'],
  },
  'footer-cta': {
    component: FooterCtaSection,
    variants: {
      default: FooterCtaSection,
      minimal: FooterCtaMinimal,
    },
    supportedBindings: [],
    supportedSettings: ['headline', 'subtext', 'buttonLabel', 'rsvpUrl', 'footerNote'],
  },
  custom: {
    component: () => null,
    variants: { default: () => null },
    supportedBindings: [],
    supportedSettings: ['skeletonId', 'backgroundColor', 'paddingSize', 'blocks'],
  },
  quotes: {
    component: () => null,
    variants: { default: () => null, carousel: () => null, grid: () => null, featured: () => null },
    supportedBindings: [],
    supportedSettings: ['eyebrow', 'headline'],
  },
  menu: {
    component: () => null,
    variants: { default: () => null, tabs: () => null, card: () => null, simple: () => null },
    supportedBindings: [],
    supportedSettings: ['eyebrow', 'headline'],
  },
  music: {
    component: () => null,
    variants: { default: () => null, playlist: () => null, setlist: () => null, compact: () => null },
    supportedBindings: [],
    supportedSettings: ['eyebrow', 'headline'],
  },
  directions: {
    component: () => null,
    variants: { default: () => null, pin: () => null, split: () => null, card: () => null },
    supportedBindings: [],
    supportedSettings: ['eyebrow', 'headline'],
  },
  video: {
    component: () => null,
    variants: { default: () => null, full: () => null, card: () => null, inline: () => null },
    supportedBindings: [],
    supportedSettings: ['eyebrow', 'headline'],
  },
};

export function getSectionComponent(
  type: SectionType,
  variant: string = 'default'
): SectionComponent {
  const definition = SECTION_REGISTRY[type];
  if (!definition) {
    throw new Error('Unknown section type: ' + type);
  }
  return definition.variants[variant] || definition.component;
}

export function getSectionVariants(type: SectionType): string[] {
  const definition = SECTION_REGISTRY[type];
  return definition ? Object.keys(definition.variants) : ['default'];
}
