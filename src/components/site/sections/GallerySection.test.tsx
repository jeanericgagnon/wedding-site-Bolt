import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GallerySection } from './GallerySection';

describe('simple site GallerySection public media', () => {
  it('drops unsafe gallery photo URLs before render', () => {
    const { container } = render(
      <GallerySection
        content={{
          photos: [
            { id: 'bad-script', url: 'javascript:alert(1)', caption: 'Unsafe script' },
            { id: 'bad-preview', url: 'https://image.thum.io/get/width/900/https%3A%2F%2Fexample.com', caption: 'Preview proxy' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Photos will appear after the celebration')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src*="image.thum.io"]')).toBeNull();
  });

  it('preserves safe simple-site gallery photos', () => {
    render(
      <GallerySection
        content={{
          photos: [
            { id: 'safe', url: '/preview-photos/header-anchor.jpg', caption: 'Ceremony moment' },
          ],
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Ceremony moment' })).toHaveAttribute(
      'src',
      '/preview-photos/header-anchor.jpg',
    );
  });
});
