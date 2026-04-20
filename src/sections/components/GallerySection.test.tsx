import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GallerySection } from './GallerySection';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { SectionInstance } from '../../types/layoutConfig';

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'gallery-1',
    type: 'gallery',
    variant: 'default',
    enabled: true,
    locked: false,
    settings,
    bindings: {},
    overrides: {},
  };
}

describe('GallerySection', () => {
  it('prefers builder section images over weddingData gallery photos', () => {
    const data = createEmptyWeddingData();
    data.media.gallery = [{ id: 'fallback-1', url: 'https://example.com/fallback.jpg', caption: 'Fallback photo' }];

    render(
      <GallerySection
        data={data}
        instance={makeInstance({
          showTitle: true,
          title: 'Photos',
          images: [
            { id: 'builder-1', url: 'https://example.com/builder.jpg', caption: 'Builder photo', alt: 'Builder alt' },
          ],
        })}
      />
    );

    const image = screen.getByAltText('Builder alt') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/builder.jpg');
    expect(screen.queryByAltText('Fallback photo')).not.toBeInTheDocument();
  });

  it('falls back to weddingData gallery when section settings are empty', () => {
    const data = createEmptyWeddingData();
    data.media.gallery = [{ id: 'fallback-1', url: 'https://example.com/fallback.jpg', caption: 'Fallback photo' }];

    render(
      <GallerySection
        data={data}
        instance={makeInstance({ showTitle: true, title: 'Photos' })}
      />
    );

    const image = screen.getByAltText('Fallback photo') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/fallback.jpg');
  });
});
