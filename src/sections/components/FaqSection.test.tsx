import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FaqAccordion, FaqIconGrid, FaqSection } from './FaqSection';
import {
  faqIconGridDefinition,
  faqNumberedDefinition,
  faqTabbedDefinition,
} from '../variants/faq/accordion';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(faq: WeddingDataV1['faq'] = [{ id: 'faq-1', q: 'Where do we park?', a: 'Use the lot across the street.' }]): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: '', partner2Name: '', displayName: '' },
    event: {},
    venues: [],
    schedule: [],
    travel: {},
    faq,
    weddingParty: [],
    registry: [],
    rsvp: { enabled: true },
    theme: {},
    media: { gallery: [] },
    meta: { createdAtISO: '', updatedAtISO: '' },
  };
}

function makeInstance(settings: SectionInstance['settings'], bindings?: SectionInstance['bindings']): SectionInstance {
  return {
    id: 'faq-1',
    type: 'faq',
    enabled: true,
    variant: 'default',
    settings,
    bindings,
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

  it('keeps default titles visible and does not crash when bindings are missing', () => {
    const emptyData = createWeddingData([]);

    const { rerender } = render(
      <FaqSection
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('FAQ')).toBeInTheDocument();

    rerender(
      <FaqAccordion
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('FAQ')).toBeInTheDocument();

    rerender(
      <FaqIconGrid
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  it('restores a meaningful FAQ heading when the saved title is blank whitespace', () => {
    const data = createWeddingData();

    const { rerender } = render(
      <FaqSection
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();

    rerender(
      <FaqAccordion
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();

    rerender(
      <FaqIconGrid
        data={data}
        instance={makeInstance({ showTitle: true, title: '   ' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();
  });

  it('renders distinct registry FAQ layouts for tabs, icon cards, and numbered rows', () => {
    const faqData = {
      eyebrow: 'Guest guide',
      headline: 'Everything to know',
      subheadline: 'A polished set of answers.',
      expandFirstByDefault: false,
      layoutStyle: 'tabbed' as const,
      items: [
        { id: 'attire', question: 'What should we wear?', answer: 'Cocktail attire.' },
        { id: 'travel', question: 'Where should we park?', answer: 'Use valet or rideshare.' },
        { id: 'dining', question: 'Can you handle dietary restrictions?', answer: 'Yes, note them in the RSVP.' },
      ],
    };

    const { container, rerender } = render(<faqTabbedDefinition.Component data={faqData} />);

    expect(screen.getByRole('button', { name: 'Attire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Travel' })).toBeInTheDocument();
    expect(container.querySelector('.lg\\:sticky')).toBeInTheDocument();

    rerender(<faqIconGridDefinition.Component data={{ ...faqData, layoutStyle: 'iconGrid' }} />);

    expect(container.querySelector('.bg-stone-950')).toBeInTheDocument();

    rerender(<faqNumberedDefinition.Component data={{ ...faqData, layoutStyle: 'numbered' }} />);

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
  });
});
