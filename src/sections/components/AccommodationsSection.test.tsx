import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccommodationsCards, AccommodationsSection } from './AccommodationsSection';
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
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'accommodations-1',
    type: 'accommodations',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
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

  it('does not duplicate the general note when showTitle is unset in the empty state', () => {
    render(
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
    render(
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
});
