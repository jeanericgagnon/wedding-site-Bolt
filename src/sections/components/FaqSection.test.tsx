import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FaqAccordion, FaqIconGrid, FaqSection } from './FaqSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '' },
    event: { date: '', venue: '', location: '' },
    story: { proposalStory: '', howWeMet: '' },
    schedule: [],
    travel: { accommodations: [], transportation: [], airports: [] },
    faq: [{ id: 'faq-1', q: 'Where do we park?', a: 'Use the lot across the street.' }],
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
    id: 'faq-1',
    type: 'faq',
    enabled: true,
    variant: 'default',
    settings,
    bindings: {},
  };
}

describe('FaqSection', () => {
  it('renders builder-wrapped title values in the default variant', () => {
    render(
      <FaqSection
        data={createWeddingData()}
        instance={makeInstance({ showTitle: true, title: { value: 'Guest questions' } })}
      />,
    );

    expect(screen.getByText('Guest questions')).toBeInTheDocument();
  });

  it('renders builder-wrapped title values in the accordion and icon grid variants', () => {
    const data = createWeddingData();

    const { unmount } = render(
      <FaqAccordion
        data={data}
        instance={makeInstance({ showTitle: true, title: { value: 'Things guests ask' } })}
      />,
    );

    expect(screen.getByText('Things guests ask')).toBeInTheDocument();

    unmount();

    render(
      <FaqIconGrid
        data={data}
        instance={makeInstance({ showTitle: true, title: { value: 'Before you arrive' } })}
      />,
    );

    expect(screen.getByText('Before you arrive')).toBeInTheDocument();
  });
});
