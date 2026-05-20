import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ContactMinimal, ContactSection } from './ContactSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createEmptyWeddingData(): WeddingDataV1 {
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

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'contact-1',
    type: 'contact',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('ContactSection', () => {
  it('renders builder-wrapped contact copy and mailto subjects', () => {
    render(
      <ContactSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          showTitle: true,
          eyebrow: { value: 'Reach out' },
          title: { value: 'Questions for us?' },
          subtitle: { value: 'We are happy to help.' },
          introText: { value: 'Text or email either of us anytime.' },
          closingNote: { value: 'We cannot wait to celebrate.' },
          emailSubject: { value: 'Wedding logistics' },
          contacts: [{ name: 'Alex', email: 'alex@example.com' }],
        })}
      />
    );

    expect(screen.getByText('Reach out')).toBeInTheDocument();
    expect(screen.getByText('Questions for us?')).toBeInTheDocument();
    expect(screen.getByText('We are happy to help.')).toBeInTheDocument();
    expect(screen.getByText('Text or email either of us anytime.')).toBeInTheDocument();
    expect(screen.getByText('We cannot wait to celebrate.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'alex@example.com' })).toHaveAttribute(
      'href',
      'mailto:alex@example.com?subject=Wedding%20logistics',
    );
  });

  it('renders builder-wrapped minimal contact copy', () => {
    render(
      <ContactMinimal
        data={createEmptyWeddingData()}
        instance={makeInstance({
          title: { value: 'Let us know' },
          subtitle: { value: 'Best way to reach us' },
          emailSubject: { value: 'Guest question' },
          contacts: [{ name: 'Jordan', email: 'jordan@example.com' }],
        })}
      />
    );

    expect(screen.getByText('Let us know')).toBeInTheDocument();
    expect(screen.getByText('Best way to reach us')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jordan' })).toHaveAttribute(
      'href',
      'mailto:jordan@example.com?subject=Guest%20question',
    );
  });
});
