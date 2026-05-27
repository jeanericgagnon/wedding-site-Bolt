import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TravelCards, TravelLocalGuide, TravelSection } from './TravelSection';
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
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'travel-1',
    type: 'travel',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('TravelSection', () => {
  it('shows default titles when showTitle is unset across travel variants', () => {
    const data = createWeddingData();

    const { rerender } = render(
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

  it('only shows the calendar download when schedule items have real timestamps', () => {
    const invalidTimeData = createWeddingData();
    invalidTimeData.schedule = [
      { id: 'event-1', label: 'Ceremony', startTimeISO: '4:00 PM' },
    ] as WeddingDataV1['schedule'];

    const { rerender } = render(
      <TravelSection
        data={invalidTimeData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Add weekend plans to your calendar (.ics)')).not.toBeInTheDocument();

    const validTimeData = createWeddingData();
    validTimeData.schedule = [
      { id: 'event-1', label: 'Ceremony', startTimeISO: '2026-06-20T21:00:00.000Z' },
    ] as WeddingDataV1['schedule'];

    rerender(
      <TravelSection
        data={validTimeData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Add weekend plans to your calendar (.ics)')).toBeInTheDocument();
  });
});
