import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultDirectionsCardData, directionsCardDefinition } from './card';
import { defaultDirectionsPinData, directionsPinDefinition } from './pin';
import { defaultDirectionsSplitData, directionsSplitDefinition } from './split';

describe('public directions map embeds', () => {
  it('keeps card map iframe sources pinned to Google Maps for hostile map data', () => {
    const { container } = render(
      <directionsCardDefinition.Component
        data={{
          ...defaultDirectionsCardData,
          venueName: '"><script>alert(1)</script>',
          address: 'javascript:alert(1)',
          city: 'San Francisco',
          mapUrl: 'https://evil.example.com/embed',
        }}
      />,
    );

    const src = container.querySelector('iframe')?.getAttribute('src');
    expect(src).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(src).toContain('output=embed');
    expect(container.innerHTML).not.toContain('evil.example.com');
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('uses safe Google Maps iframe sources across pin and split variants', () => {
    const pin = render(
      <directionsPinDefinition.Component
        data={{
          ...defaultDirectionsPinData,
          mapUrl: 'javascript:alert(1)',
        }}
      />,
    );
    const split = render(
      <directionsSplitDefinition.Component
        data={{
          ...defaultDirectionsSplitData,
          mapUrl: 'ftp://example.com/map',
        }}
      />,
    );

    expect(pin.container.querySelector('iframe')?.getAttribute('src')).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(split.container.querySelector('iframe')?.getAttribute('src')).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(pin.container.innerHTML).not.toContain('javascript:alert');
    expect(split.container.innerHTML).not.toContain('ftp://example.com/map');
  });
});
