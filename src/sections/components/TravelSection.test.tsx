import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TravelCards, TravelLocalGuide, TravelSection } from './TravelSection';
import { travelCompactDefinition } from '../variants/travel/compact';
import { travelHotelBlockDefinition } from '../variants/travel/hotelBlock';
import { travelMapPinsDefinition } from '../variants/travel/mapPins';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '' },
    event: { date: '', venue: '', location: '', timezone: 'America/Los_Angeles' },
    story: { proposalStory: '', howWeMet: '' },
    schedule: [],
    travel: { accommodations: [], transportation: [], airports: [], notes: '' },
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
    venues: [],
    meta: { createdAtISO: '', updatedAtISO: '' },
  };
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'travel-1',
    type: 'travel',
    enabled: true,
    variant: 'default',
    settings,
  };
}

describe('TravelSection', () => {
  it('shows default titles when showTitle is unset across travel variants', () => {
    const data = createWeddingData();

    const { container, rerender } = render(
      <TravelSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Travel & Accommodations')).toBeInTheDocument();

    rerender(
      <TravelCards
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Travel & Accommodations')).toBeInTheDocument();

    rerender(
      <TravelLocalGuide
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Travel & Local Guide')).toBeInTheDocument();
  });

  it('renders builder-wrapped titles in the default variant', () => {
    render(
      <TravelSection
        data={createWeddingData()}
        instance={makeInstance({ showTitle: true, title: { value: 'Plan your trip' } })}
      />,
    );

    expect(screen.getByText('Plan your trip')).toBeInTheDocument();
  });

  it('renders builder-wrapped titles in cards and local guide variants', () => {
    const data = createWeddingData();

    const { unmount } = render(
      <TravelCards
        data={data}
        instance={makeInstance({ showTitle: true, title: { value: 'Getting around' } })}
      />,
    );

    expect(screen.getByText('Getting around')).toBeInTheDocument();

    unmount();

    render(
      <TravelLocalGuide
        data={data}
        instance={makeInstance({ showTitle: true, title: { value: 'Local weekend guide' } })}
      />,
    );

    expect(screen.getByText('Local weekend guide')).toBeInTheDocument();
  });

  it('restores the default public travel heading when the saved title is blank whitespace', () => {
    const data = createWeddingData();

    const { container, rerender } = render(
      <TravelSection
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Travel & Accommodations' })).toBeInTheDocument();

    rerender(
      <TravelCards
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Travel & Accommodations' })).toBeInTheDocument();

    rerender(
      <TravelLocalGuide
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Travel & Local Guide' })).toBeInTheDocument();
  });

  it('renders structured hotel, room-block, shuttle, and local-tip travel data on public travel variants', () => {
    const data = createWeddingData();
    data.travel = {
      hotels: [
        {
          name: 'Harbor Hotel',
          bookingCode: 'MAYALEO',
          bookingDeadline: 'May 20',
          url: 'https://example.com/stay',
        },
      ],
      roomBlocks: [
        {
          hotelName: 'Harbor Hotel',
          bookingCode: 'MAYALEO',
          detail: 'Two-night minimum on the waterfront block.',
        },
      ],
      shuttles: [
        {
          label: 'Ceremony shuttle',
          route: 'Harbor Hotel to Garden ceremony',
          departureTime: '4:30 PM',
        },
      ],
      visaTips: ['Bring the passport used for travel booking.'],
      culturalTips: ['Bring a light layer for the waterfront.'],
    };

    const { container, rerender } = render(
      <TravelSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Hotel options')).toBeInTheDocument();
    expect(screen.getAllByText('Harbor Hotel').length).toBeGreaterThan(0);
    expect(screen.getByText('Room blocks')).toBeInTheDocument();
    expect(screen.getByText('Ceremony shuttle')).toBeInTheDocument();
    expect(screen.getByText('Visa and arrival tips')).toBeInTheDocument();
    expect(screen.getByText('Bring a light layer for the waterfront.')).toBeInTheDocument();

    rerender(
      <TravelLocalGuide
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Shuttle timing')).toBeInTheDocument();
  });

  it('drops unsafe external links from public travel variants', () => {
    const Compact = travelCompactDefinition.Component;
    const MapPins = travelMapPinsDefinition.Component;

    const { container, rerender } = render(
      <Compact
        data={{
          eyebrow: 'Travel',
          headline: 'Stay nearby',
          intro: '',
          airport: '',
          venueAddress: '',
          hotels: [
            { id: 'bad', name: 'Bad Hotel', distance: '', url: 'javascript:alert(1)' },
            { id: 'good', name: 'Good Hotel', distance: '', url: 'https://example.com/stay' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Bad Hotel')).toBeInTheDocument();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/stay');

    rerender(
      <MapPins
        data={{
          eyebrow: 'Map',
          headline: 'Locations',
          intro: '',
          pins: [
            { id: 'bad', name: 'Bad Pin', type: 'Hotel', address: '', note: '', url: 'ftp://example.com/place' },
            { id: 'good', name: 'Good Pin', type: 'Venue', address: '', note: '', url: 'https://example.com/place' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Bad Pin')).toBeInTheDocument();
    expect(container.querySelector('a[href^="ftp:"]')).toBeNull();
    expect(screen.getByRole('link', { name: /open good pin location link/i })).toHaveAttribute('href', 'https://example.com/place');
  });

  it('drops unsafe public travel image URLs before render', () => {
    const HotelBlock = travelHotelBlockDefinition.Component;

    render(
      <HotelBlock
        data={{
          eyebrow: 'Stay',
          headline: 'Hotels',
          subheadline: '',
          deadlineNote: '',
          generalNote: '',
          showAmenities: true,
          showShuttle: true,
          hotels: [
            {
              id: 'bad',
              name: 'Unsafe Hotel',
              stars: 4,
              distance: '',
              priceRange: '',
              bookingCode: '',
              bookingDeadline: '',
              phone: '',
              url: '',
              image: 'javascript:alert(1)',
              amenities: [],
              shuttleInfo: '',
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
              bookingDeadline: '',
              phone: '',
              url: '',
              image: 'https://example.com/stay.jpg',
              amenities: [],
              shuttleInfo: '',
              notes: '',
              recommended: false,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Unsafe Hotel')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Unsafe Hotel' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Safe Hotel' })).toHaveAttribute('src', 'https://example.com/stay.jpg');
  });
});
