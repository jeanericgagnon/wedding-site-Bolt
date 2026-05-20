import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DressCodeBanner, DressCodeSection } from './DressCodeSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '' },
    event: { date: '', venue: '', location: '' },
    story: { proposalStory: '', howWeMet: '' },
    schedule: [],
    travel: { accommodations: [], transportation: [], airports: [] },
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
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'dress-code-1',
    type: 'dress-code',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('DressCodeSection', () => {
  it('renders builder-wrapped dress code copy in the full variant', () => {
    render(
      <DressCodeSection
        data={createWeddingData()}
        instance={makeInstance({
          showTitle: true,
          eyebrow: { value: 'Style notes' },
          dressCodeLabel: { value: 'Colorful formal' },
          description: { value: 'Wear bold colors and polished evening looks.' },
          colorNote: { value: 'Please avoid white and ivory.' },
          additionalNote: { value: 'Bring a layer for the evening breeze.' },
          suggestions: ['Suits', 'Cocktail dresses'],
        })}
      />,
    );

    expect(screen.getByText('Style notes')).toBeInTheDocument();
    expect(screen.getByText('Colorful formal')).toBeInTheDocument();
    expect(screen.getByText('Wear bold colors and polished evening looks.')).toBeInTheDocument();
    expect(screen.getByText('Please avoid white and ivory.')).toBeInTheDocument();
    expect(screen.getByText('Bring a layer for the evening breeze.')).toBeInTheDocument();
  });

  it('renders builder-wrapped label, description, and color note in the banner variant', () => {
    render(
      <DressCodeBanner
        data={createWeddingData()}
        instance={makeInstance({
          dressCodeLabel: { value: 'Beach formal' },
          description: { value: 'Dress for the sand, then stay polished for dinner.' },
          colorNote: { value: 'Light fabrics recommended.' },
        })}
      />,
    );

    expect(screen.getByText('Beach formal')).toBeInTheDocument();
    expect(screen.getByText('Dress for the sand, then stay polished for dinner.')).toBeInTheDocument();
    expect(screen.getByText('Light fabrics recommended.')).toBeInTheDocument();
  });
});
