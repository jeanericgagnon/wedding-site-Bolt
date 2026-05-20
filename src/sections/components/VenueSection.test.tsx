import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VenueCard, VenueSection } from './VenueSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(venues: WeddingDataV1['venues'] = []): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: '', partner2Name: '', displayName: '' },
    event: {},
    venues,
    schedule: [],
    rsvp: { enabled: true },
    travel: {},
    faq: [],
    weddingParty: [],
    registry: [],
    theme: {},
    media: { gallery: [] },
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'venue-1',
    type: 'venue',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('VenueSection', () => {
  it('shows default titles when showTitle is unset across venue variants', () => {
    const emptyData = createWeddingData();

    const { rerender } = render(
      <VenueSection
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Venue')).toBeInTheDocument();

    rerender(
      <VenueCard
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Venue')).toBeInTheDocument();
  });

  it('renders venue content without bindings present', () => {
    const data = createWeddingData([
      { id: 'venue-1', name: 'Ocean View Estate', address: '123 Coast Hwy' },
    ]);

    const { rerender } = render(
      <VenueSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Ocean View Estate')).toBeInTheDocument();

    rerender(
      <VenueCard
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Open in Google Maps')).toBeInTheDocument();
  });
});
