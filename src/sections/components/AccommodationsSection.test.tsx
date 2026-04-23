import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccommodationsCards, AccommodationsSection } from './AccommodationsSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createEmptyWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '' },
    event: { date: '', venue: '', location: '' },
    story: { proposalStory: '', howWeMet: '' },
    schedule: [],
    travel: { accommodations: [], transportation: [], airports: [], hotelInfo: '' },
    faq: [],
    weddingParty: [],
    gallery: [],
    registry: [],
    rsvp: { enabled: true, deadline: '', maxGuests: 0 },
    contact: { email: '', phone: '', address: '' },
    theme: { primaryColor: '#000000', secondaryColor: '#ffffff', fontFamily: 'Inter' },
    navigation: { showGallery: true, showRegistry: true, showWeddingParty: true, showTravel: true, showFAQ: true },
    design: { template: 'classic-romance', colorScheme: 'soft-blush', fontPairing: 'elegant-serif' },
    customSections: [],
    media: { gallery: [] },
  };
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'accommodations-1',
    type: 'accommodations',
    enabled: true,
    variant: 'default',
    settings,
  };
}

describe('AccommodationsSection', () => {
  it('renders builder-wrapped title copy in the default variant', () => {
    render(
      <AccommodationsSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          showTitle: true,
          eyebrow: { value: 'Stay nearby' },
          title: { value: 'Sleep well' },
          generalNote: { value: 'We reserved a small room block.' },
          hotels: [],
        })}
      />
    );

    expect(screen.getByText('Stay nearby')).toBeInTheDocument();
    expect(screen.getByText('Sleep well')).toBeInTheDocument();
    expect(screen.getByText('We reserved a small room block.')).toBeInTheDocument();
  });

  it('renders builder-wrapped title copy in the cards variant', () => {
    render(
      <AccommodationsCards
        data={createEmptyWeddingData()}
        instance={makeInstance({
          showTitle: true,
          eyebrow: { value: 'Book early' },
          title: { value: 'Places to stay' },
          generalNote: { value: 'More hotel details coming soon.' },
          hotels: [],
        })}
      />
    );

    expect(screen.getByText('Book early')).toBeInTheDocument();
    expect(screen.getByText('Places to stay')).toBeInTheDocument();
    expect(screen.getByText('More hotel details coming soon.')).toBeInTheDocument();
  });
});
