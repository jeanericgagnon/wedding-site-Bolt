import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GalleryMasonry, GallerySection } from './GallerySection';
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

  it('renders galleryImages objects from section settings', () => {
    const data = createEmptyWeddingData();
    data.media.gallery = [{ id: 'fallback-1', url: 'https://example.com/fallback.jpg', caption: 'Fallback photo' }];

    render(
      <GallerySection
        data={data}
        instance={makeInstance({
          showTitle: true,
          title: 'Photos',
          galleryImages: [
            { id: 'gallery-1', url: 'https://example.com/gallery.jpg', caption: 'Gallery photo' },
          ],
        })}
      />
    );

    const image = screen.getByAltText('Gallery photo') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/gallery.jpg');
    expect(screen.queryByAltText('Fallback photo')).not.toBeInTheDocument();
  });

  it('renders photos string arrays from section settings', () => {
    const data = createEmptyWeddingData();
    data.media.gallery = [{ id: 'fallback-1', url: 'https://example.com/fallback.jpg', caption: 'Fallback photo' }];

    render(
      <GallerySection
        data={data}
        instance={makeInstance({
          showTitle: true,
          title: 'Photos',
          photos: ['https://example.com/photos-array.jpg'],
        })}
      />
    );

    const image = screen.getByAltText('Gallery photo') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/photos-array.jpg');
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

  it('shows default titles when showTitle is unset across gallery variants', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <GallerySection
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Photos')).toBeInTheDocument();

    rerender(
      <GalleryMasonry
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Photos')).toBeInTheDocument();
  });
});
