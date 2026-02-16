import React from 'react';
import { SectionType } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { SectionInstance } from '../types/layoutConfig';

import { HeroSection } from './components/HeroSection';
import { StorySection } from './components/StorySection';
import { VenueSection } from './components/VenueSection';
import { ScheduleSection } from './components/ScheduleSection';
import { TravelSection } from './components/TravelSection';
import { RegistrySection } from './components/RegistrySection';
import { RsvpSection } from './components/RsvpSection';
import { FaqSection } from './components/FaqSection';
import { GallerySection } from './components/GallerySection';

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
    },
    supportedBindings: [],
    supportedSettings: ['showTitle'],
  },
  story: {
    component: StorySection,
    variants: {
      default: StorySection,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  venue: {
    component: VenueSection,
    variants: {
      default: VenueSection,
    },
    supportedBindings: ['venueIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  schedule: {
    component: ScheduleSection,
    variants: {
      default: ScheduleSection,
    },
    supportedBindings: ['scheduleItemIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  travel: {
    component: TravelSection,
    variants: {
      default: TravelSection,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  registry: {
    component: RegistrySection,
    variants: {
      default: RegistrySection,
    },
    supportedBindings: ['linkIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  rsvp: {
    component: RsvpSection,
    variants: {
      default: RsvpSection,
    },
    supportedBindings: [],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  faq: {
    component: FaqSection,
    variants: {
      default: FaqSection,
    },
    supportedBindings: ['faqIds'],
    supportedSettings: ['showTitle', 'title', 'subtitle'],
  },
  gallery: {
    component: GallerySection,
    variants: {
      default: GallerySection,
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
    throw new Error(`Unknown section type: ${type}`);
  }

  return definition.variants[variant] || definition.component;
}

export function getSectionVariants(type: SectionType): string[] {
  const definition = SECTION_REGISTRY[type];
  return definition ? Object.keys(definition.variants) : ['default'];
}
