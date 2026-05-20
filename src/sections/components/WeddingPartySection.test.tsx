import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WeddingPartyGrid, WeddingPartySection } from './WeddingPartySection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '', partner1Name: 'Alex', partner2Name: 'Jordan' },
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

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'wedding-party-1',
    type: 'wedding-party',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('WeddingPartySection', () => {
  it('renders builder-wrapped section copy in the split variant', () => {
    render(
      <WeddingPartySection
        data={createWeddingData()}
        instance={makeInstance({
          showTitle: true,
          eyebrow: { value: 'Meet the people' },
          title: { value: 'Our favorite humans' },
          subtitle: { value: 'They are making the day happen.' },
          bridalTitle: { value: 'Alex crew' },
          groomTitle: { value: 'Jordan crew' },
          bridalParty: [{ name: 'Sam', role: 'Maid of Honor' }],
          groomParty: [{ name: 'Taylor', role: 'Best Man' }],
        })}
      />,
    );

    expect(screen.getByText('Meet the people')).toBeInTheDocument();
    expect(screen.getByText('Our favorite humans')).toBeInTheDocument();
    expect(screen.getByText('They are making the day happen.')).toBeInTheDocument();
    expect(screen.getByText('Alex crew')).toBeInTheDocument();
    expect(screen.getByText('Jordan crew')).toBeInTheDocument();
  });

  it('renders builder-wrapped titles in the grid variant', () => {
    render(
      <WeddingPartyGrid
        data={createWeddingData()}
        instance={makeInstance({
          showTitle: true,
          title: { value: 'Party lineup' },
          bridalParty: [{ name: 'Sam', role: 'Maid of Honor' }],
          groomParty: [{ name: 'Taylor', role: 'Best Man' }],
        })}
      />,
    );

    expect(screen.getByText('Party lineup')).toBeInTheDocument();
  });
});
