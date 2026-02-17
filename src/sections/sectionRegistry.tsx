import React from 'react';
import { SectionType } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { SectionInstance } from '../types/layoutConfig';

import { HeroSection, HeroMinimal, HeroFullbleed } from './components/HeroSection';
import { StorySection, StoryCentered, StorySplit } from './components/StorySection';
import { VenueSection, VenueCard } from './components/VenueSection';
import { ScheduleSection, ScheduleTimeline } from './components/ScheduleSection';
import { TravelSection, TravelCards } from './components/TravelSection';
import { RegistrySection, RegistryGrid } from './components/RegistrySection';
import { RsvpSection, RsvpInline } from './components/RsvpSection';
import { FaqSection, FaqAccordion } from './components/FaqSection';
import { GallerySection, GalleryMasonry } from './components/GallerySection';

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
