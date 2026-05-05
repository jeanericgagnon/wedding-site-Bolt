import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultVideoCardData, videoCardDefinition } from './card';
import { defaultVideoFullData, videoFullDefinition } from './full';
import { defaultVideoInlineData, videoInlineDefinition } from './inline';

const VideoCard = videoCardDefinition.Component;
const VideoFull = videoFullDefinition.Component;
const VideoInline = videoInlineDefinition.Component;

describe('public video sections', () => {
  it('sanitizes card thumbnails and does not create embeds from spoofed video URLs', () => {
    render(
      <VideoCard
        data={{
          ...defaultVideoCardData,
          videos: [{
            id: 'unsafe',
            title: 'Unsafe video',
            description: '',
            videoUrl: 'https://example.com/watch?v=abcDEF123_4',
            thumbnailUrl: 'javascript:alert(1)',
            videoType: 'youtube',
          }],
        }}
      />,
    );

    expect(screen.queryByRole('img', { name: 'Unsafe video' })).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
    expect(document.querySelector('img[src^="javascript:"]')).not.toBeInTheDocument();
  });

  it('uses only safe direct video and thumbnail URLs in full layouts', () => {
    const { rerender } = render(
      <VideoFull
        data={{
          ...defaultVideoFullData,
          videoType: 'direct',
          videoUrl: 'javascript:alert(1)',
          thumbnailUrl: 'ftp://example.com/poster.jpg',
          autoplay: true,
        }}
      />,
    );

    expect(document.querySelector('video')).not.toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();

    rerender(
      <VideoFull
        data={{
          ...defaultVideoFullData,
          videoType: 'direct',
          videoUrl: 'https://cdn.example.com/wedding.mp4',
          thumbnailUrl: 'https://example.com/poster.jpg',
          autoplay: false,
        }}
      />,
    );

    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('uses host-aware embed URLs in inline layouts', () => {
    render(
      <VideoInline
        data={{
          ...defaultVideoInlineData,
          videoUrl: 'https://vimeo.com/123456789',
          thumbnailUrl: '',
          videoType: 'vimeo',
        }}
      />,
    );

    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://player.vimeo.com/video/123456789?autoplay=0',
    );
  });
});
