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

  it('restores the default footer headline when the saved call-to-action heading is blank whitespace', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({ headline: '   ' })}
      />,
    );

    expect(screen.getByText('We hope to see you there')).toBeInTheDocument();

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({ headline: '   ' })}
      />,
    );

    expect(screen.getByText("We can't wait to celebrate with you")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '' })).not.toBeInTheDocument();
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

  it('guards invalid persisted footer dates and deadlines', () => {
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = 'not-a-date';
    data.rsvp.deadlineISO = 'still-not-a-date';

    const { rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.getByText('Please reply by')).toBeInTheDocument();

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.getByText('Please reply by')).toBeInTheDocument();
  });

  it('sanitizes legacy footer RSVP links before render', () => {
    const data = createEmptyWeddingData();

    const { container, rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({ rsvpUrl: 'javascript:alert(1)' })}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', '#rsvp');
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({ rsvpUrl: 'ftp://example.com/rsvp' })}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', '#rsvp');
    expect(container.querySelector('a[href^="ftp:"]')).toBeNull();
  });

  it('keeps safe legacy footer RSVP links', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <FooterCtaSection
        data={data}
        instance={makeInstance({ rsvpUrl: '/site/alex-jordan#rsvp' })}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', '/site/alex-jordan#rsvp');

    rerender(
      <FooterCtaMinimal
        data={data}
        instance={makeInstance({ rsvpUrl: 'https://example.com/rsvp' })}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', 'https://example.com/rsvp');
  });
});
