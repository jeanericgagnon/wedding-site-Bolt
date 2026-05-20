import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultDirectionsCardData, directionsCardDefinition } from './card';
import { defaultDirectionsPinData, directionsPinDefinition } from './pin';
import { defaultDirectionsSplitData, directionsSplitDefinition } from './split';

function getIframeSrc(container: HTMLElement) {
  const frame = container.querySelector('iframe');
  expect(frame).not.toBeNull();
  const src = frame?.getAttribute('src');
  expect(src).toBeTruthy();
  return src as string;
}

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

    const src = getIframeSrc(container);
    expect(src).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(src).toContain('output=embed');
    expect(src).not.toContain('evil.example.com');
    expect(container.querySelector('script')).toBeNull();
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

    expect(getIframeSrc(pin.container)).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(getIframeSrc(split.container)).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    expect(getIframeSrc(pin.container)).not.toContain('javascript:alert');
    expect(getIframeSrc(split.container)).not.toContain('ftp://example.com/map');
  });
});
