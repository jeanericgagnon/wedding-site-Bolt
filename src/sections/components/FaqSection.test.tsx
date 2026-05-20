import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FaqAccordion, FaqIconGrid, FaqSection } from './FaqSection';
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
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: Record<string, unknown>, bindings?: SectionInstance['bindings']): SectionInstance {
  return {
    id: 'faq-1',
    type: 'faq',
    enabled: true,
    variant: 'default',
    settings,
    bindings,
  } as unknown as SectionInstance;
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
});
