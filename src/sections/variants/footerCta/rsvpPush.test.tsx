import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  defaultFooterCtaRsvpPushData,
  footerCtaCountdownDefinition,
  footerCtaDefaultDefinition,
  footerCtaHashtagDefinition,
  footerCtaMinimalDefinition,
  footerCtaMonogramDefinition,
  footerCtaPhotoDefinition,
} from './rsvpPush';

const HashtagFooter = footerCtaHashtagDefinition.Component;

describe('FooterCta hashtag variant', () => {
  it('builds only safe Instagram hashtag links', () => {
    const { rerender } = render(
      <HashtagFooter data={{ ...defaultFooterCtaRsvpPushData, layoutStyle: 'hashtag', hashtag: '#AlexAndJordan' }} />,
    );

    expect(screen.getByRole('link', { name: /see hashtag/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/explore/tags/AlexAndJordan/',
    );

    rerender(
      <HashtagFooter data={{ ...defaultFooterCtaRsvpPushData, layoutStyle: 'hashtag', hashtag: '../bad' }} />,
    );

    expect(screen.queryByRole('link', { name: /see hashtag/i })).not.toBeInTheDocument();
  });
});

describe('FooterCta public CTA links', () => {
  it('sanitizes CTA hrefs across footer layouts before render', () => {
    const definitions = [
      footerCtaDefaultDefinition,
      footerCtaMinimalDefinition,
      footerCtaMonogramDefinition,
      footerCtaHashtagDefinition,
      footerCtaPhotoDefinition,
      footerCtaCountdownDefinition,
    ];

    for (const definition of definitions) {
      const { container, unmount } = render(
        <definition.Component
          data={{
            ...definition.defaultData,
            ctaLabel: 'Send RSVP',
            ctaHref: 'javascript:alert(1)',
            rsvpUrl: 'ftp://example.com/rsvp',
            photoUrl: 'https://image.thum.io/get/width/900/https%3A%2F%2Fexample.com',
          }}
        />,
      );

      expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', '#rsvp');
      expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
      expect(container.querySelector('a[href^="ftp:"]')).toBeNull();
      expect(container.querySelector('img[src*="image.thum.io"]')).toBeNull();
      unmount();
    }
  });

  it('preserves safe internal and public CTA hrefs', () => {
    const { rerender } = render(
      <footerCtaDefaultDefinition.Component
        data={{ ...defaultFooterCtaRsvpPushData, ctaHref: '/site/alex-jordan#rsvp' }}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', '/site/alex-jordan#rsvp');

    rerender(
      <footerCtaDefaultDefinition.Component
        data={{ ...defaultFooterCtaRsvpPushData, ctaHref: '', rsvpUrl: 'https://example.com/rsvp' }}
      />,
    );

    expect(screen.getByRole('link', { name: /send rsvp/i })).toHaveAttribute('href', 'https://example.com/rsvp');
  });
});
