import React from 'react';
import { SectionType } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { SectionInstance } from '../types/layoutConfig';

import { HeroSection, HeroMinimal, HeroFullbleed, HeroCountdown } from './components/HeroSection';
import { StorySection, StoryCentered, StorySplit, StoryTimeline } from './components/StorySection';
import { VenueSection, VenueCard } from './components/VenueSection';
import { ScheduleSection, ScheduleTimeline, ScheduleDayTabs } from './components/ScheduleSection';
import { TravelSection, TravelCards, TravelLocalGuide } from './components/TravelSection';
import { RegistryGrid, RegistryFundHighlight } from './components/RegistrySection';
import { RsvpSection, RsvpInline } from './components/RsvpSection';
import { FaqSection, FaqAccordion, FaqIconGrid } from './components/FaqSection';
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
      dayTabs: ScheduleDayTabs,
    },
    supportedBindings: ['scheduleItemIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  travel: {
    component: TravelSection,
    variants: {
      default: TravelSection,
      cards: TravelCards,
      localGuide: TravelLocalGuide,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  registry: {
    component: RegistryGrid,
    variants: {
      cards: RegistryGrid,
      fundHighlight: RegistryFundHighlight,
      featured: RegistryFundHighlight,
      minimal: RegistryGrid,
      honeymoon: RegistryFundHighlight,
      tabs: RegistryGrid,
      illustrated: RegistryGrid,
      classic: RegistryGrid,
      luxury: RegistryFundHighlight,
      experiences: RegistryFundHighlight,
      modern: RegistryGrid,
      playful: RegistryGrid,
      default: RegistryGrid,
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
      iconGrid: FaqIconGrid,
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

function normalizeLegacySectionType(type: SectionType): SectionType {
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : type;
  const aliases: Record<string, SectionType> = {
    registrysection: 'registry',
    weddingparty: 'wedding-party',
    dresscode: 'dress-code',
    footercta: 'footer-cta',
  };
  return (aliases[String(normalizedType)] ?? normalizedType) as SectionType;
}

function normalizeLegacyRegistryVariant(variant: string): string {
  const normalizedVariant = variant.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    default: 'cards',
    grid: 'cards',
    fundhighlight: 'fundHighlight',
    featured: 'featured',
    honeymoon: 'honeymoon',
    luxury: 'luxury',
    experiences: 'experiences',
    classic: 'classic',
    minimal: 'minimal',
    tabs: 'tabs',
    illustrated: 'illustrated',
    modern: 'modern',
    playful: 'playful',
    cards: 'cards',
  };
  return aliases[normalizedVariant] ?? 'cards';
}

export function getSectionComponent(
  type: SectionType,
  variant: string = 'default'
): SectionComponent {
  const normalizedType = normalizeLegacySectionType(type);
  const definition = SECTION_REGISTRY[normalizedType];
  if (!definition) {
    throw new Error('Unknown section type: ' + type);
  }
  const normalizedVariant = normalizedType === 'registry' ? normalizeLegacyRegistryVariant(variant) : variant;
  return definition.variants[normalizedVariant] || definition.component;
}

export function getSectionVariants(type: SectionType): string[] {
  const definition = SECTION_REGISTRY[normalizeLegacySectionType(type)];
  return definition ? Object.keys(definition.variants) : ['default'];
}
