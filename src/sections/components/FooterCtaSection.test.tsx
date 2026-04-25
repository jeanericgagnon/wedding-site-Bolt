import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FooterCtaMinimal, FooterCtaSection } from './FooterCtaSection';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { SectionInstance } from '../../types/layoutConfig';

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'footer-cta-1',
    type: 'footer-cta',
    variant: 'default',
    enabled: true,
    locked: false,
    settings,
    bindings: {},
    overrides: {},
  };
}

describe('FooterCtaSection', () => {
  it('falls back to a truthful couple name when names are missing', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();
    expect(screen.queryByText(' & ')).not.toBeInTheDocument();

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();
  });

  it('uses available partner names when displayName is blank', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';

    render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Alex & Jordan')).toBeInTheDocument();
  });

  it('keeps footer couple names truthful when one persisted partner name is whitespace only', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    const { rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText(/&/)).not.toBeInTheDocument();

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
  });
});
