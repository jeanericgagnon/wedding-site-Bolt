import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ContactMinimal, ContactSection } from './ContactSection';
import { contactFormDefinition } from '../variants/contact/form';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createEmptyWeddingData(): WeddingDataV1 {
  return {
    couple: { partner1: '', partner2: '', displayName: '' },
    event: { date: '', venue: '', location: '' },
    venues: [],
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
    meta: { createdAtISO: '', updatedAtISO: '' },
  };
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'contact-1',
    type: 'contact',
    enabled: true,
    variant: 'default',
    settings,
  };
}

describe('ContactSection', () => {
  it('renders builder-wrapped contact copy and mailto subjects', () => {
    const { container } = render(
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

  it('restores the default public contact heading when the saved title is blank whitespace', () => {
    const data = createEmptyWeddingData();
    const ContactForm = contactFormDefinition.Component;

    const { rerender } = render(
      <ContactSection
        data={data}
        instance={makeInstance({
          showTitle: true,
          title: '   ',
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();

    rerender(
      <ContactMinimal
        data={data}
        instance={makeInstance({
          title: '   ',
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Get in touch' })).toBeInTheDocument();

    rerender(
      <ContactForm
        data={{
          eyebrow: '',
          headline: '   ',
          subheadline: '',
          introText: '',
          closingNote: '',
          emailSubject: '',
          contacts: [],
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Let us know' })).toBeInTheDocument();
  });

  it('drops unsafe contact hrefs before public render', () => {
    const { container } = render(
      <ContactSection
        data={createEmptyWeddingData()}
        instance={makeInstance({
          emailSubject: { value: 'Guest question' },
          contacts: [
            { name: 'Bad Email', email: 'bad@example.com?bcc=secret@example.com' },
            { name: 'Bad Phone', phone: 'javascript:alert(1)' },
            { name: 'Safe Phone', phone: '+1 (212) 555-0102' },
          ],
        })}
      />,
    );

    expect(screen.getByText('Bad Email')).toBeInTheDocument();
    expect(screen.getByText('Bad Phone')).toBeInTheDocument();
    expect(container.querySelector('a[href^="mailto:bad"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByRole('link', { name: '+1 (212) 555-0102' })).toHaveAttribute('href', 'tel:+12125550102');
  });

  it('drops unsafe contact variant email, phone, and Instagram hrefs', () => {
    const VariantContact = contactFormDefinition.Component;

    const { container } = render(
      <VariantContact
        data={{
          eyebrow: 'Help',
          headline: 'Questions',
          subheadline: '',
          introText: '',
          closingNote: '',
          emailSubject: 'Wedding question',
          contacts: [
            { id: 'bad', name: 'Bad Contact', role: '', email: 'bad@example.com?bcc=secret@example.com', phone: '555', instagram: '../bad' },
            { id: 'safe', name: 'Safe Contact', role: '', email: 'safe@example.com', phone: '+1 (212) 555-0102', instagram: '@dayof.love' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Bad Contact')).toBeInTheDocument();
    expect(container.querySelector('a[href^="mailto:bad"]')).toBeNull();
    expect(container.querySelector('a[href="tel:555"]')).toBeNull();
    expect(container.querySelector('a[href*="../bad"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'safe@example.com' })).toHaveAttribute('href', 'mailto:safe@example.com?subject=Wedding%20question');
    expect(screen.getByRole('link', { name: '+1 (212) 555-0102' })).toHaveAttribute('href', 'tel:+12125550102');
    expect(screen.getByRole('link', { name: '@dayof.love' })).toHaveAttribute('href', 'https://instagram.com/dayof.love');
  });
});
