import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccommodationsCards, AccommodationsSection } from './AccommodationsSection';
import { accommodationsCardsDefinition } from '../variants/accommodations/cards';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createEmptyWeddingData(): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: '', partner2Name: '', displayName: '' },
    event: {},
    venues: [],
    schedule: [],
    travel: { hotelInfo: '' },
    faq: [],
    weddingParty: [],
    registry: { links: [] },
    rsvp: { enabled: true },
    theme: {},
    media: { gallery: [] },
    meta: { createdAtISO: '', updatedAtISO: '' },
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
    const { container } = render(
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

  it('does not duplicate the general note when showTitle is unset in the empty state', () => {
    const { container } = render(
      <AccommodationsSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          generalNote: { value: 'We reserved a small room block.' },
          hotels: [],
        })}
      />
    );

    expect(screen.getByText('Accommodations')).toBeInTheDocument();
    expect(screen.getAllByText('We reserved a small room block.')).toHaveLength(1);
  });

  it('shows the general note in the empty state when the title is explicitly hidden', () => {
    const { container } = render(
      <AccommodationsSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          showTitle: false,
          generalNote: { value: 'We reserved a small room block.' },
          hotels: [],
        })}
      />
    );

    expect(screen.queryByText('Accommodations')).not.toBeInTheDocument();
    expect(screen.getByText('We reserved a small room block.')).toBeInTheDocument();
  });

  it('drops unsafe hotel booking URLs before rendering public links', () => {
    const { container } = render(
      <AccommodationsSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          hotels: [
            { name: 'Unsafe Inn', url: 'javascript:alert(1)' },
            { name: 'Safe Hotel', url: 'https://example.com/book' },
          ],
        })}
      />
    );

    expect(screen.getByText('Unsafe Inn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /book now/i })).toHaveAttribute('href', 'https://example.com/book');
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('drops unsafe accommodation variant image URLs before render', () => {
    const VariantCards = accommodationsCardsDefinition.Component;

    render(
      <VariantCards
        data={{
          eyebrow: 'Stay',
          title: '',
          headline: 'Hotels',
          generalNote: '',
          blockNote: '',
          layoutStyle: 'cards',
          mapImage: '',
          shuttleNote: '',
          hotels: [
            {
              id: 'bad',
              name: 'Unsafe Hotel',
              stars: 4,
              distance: '',
              priceRange: '',
              bookingCode: '',
              phone: '',
              url: '',
              image: 'https://image.thum.io/get/width/900/https%3A%2F%2Fexample.com',
              notes: '',
              recommended: false,
            },
            {
              id: 'safe',
              name: 'Safe Hotel',
              stars: 4,
              distance: '',
              priceRange: '',
              bookingCode: '',
              phone: '',
              url: '',
              image: 'https://example.com/hotel.jpg',
              notes: '',
              recommended: false,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Unsafe Hotel')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Unsafe Hotel' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Safe Hotel' })).toHaveAttribute('src', 'https://example.com/hotel.jpg');
  });
});
