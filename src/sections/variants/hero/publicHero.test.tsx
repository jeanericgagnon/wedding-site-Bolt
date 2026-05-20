import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultHeroFullBleedData, heroFullBleedDefinition, heroSplitDefinition } from './fullBleed';

describe('public hero variants', () => {
  it('drops unsafe background images before rendering the public hero', () => {
    const { container } = render(
      <heroFullBleedDefinition.Component
        data={{
          ...defaultHeroFullBleedData,
          backgroundImage: 'javascript:alert(1)',
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });

  it('preserves safe hero images and same-page CTA anchors', () => {
    render(
      <heroSplitDefinition.Component
        data={{
          ...defaultHeroFullBleedData,
          layoutStyle: 'split',
          backgroundImage: '/preview-photos/header-anchor.jpg',
          ctaLabel: 'RSVP',
          ctaHref: '#rsvp',
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
    expect(screen.getByRole('link', { name: 'RSVP' })).toHaveAttribute('href', '#rsvp');
  });

  it('falls back unsafe CTA values to an inert public anchor', () => {
    render(
      <heroFullBleedDefinition.Component
        data={{
          ...defaultHeroFullBleedData,
          ctaLabel: 'Open details',
          ctaHref: 'javascript:alert(1)',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Open details' })).toHaveAttribute('href', '#');
  });
});
