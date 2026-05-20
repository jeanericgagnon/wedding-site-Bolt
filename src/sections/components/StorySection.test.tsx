import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorySection, StoryCentered, StorySplit } from './StorySection';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { SectionInstance } from '../../types/layoutConfig';

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'story-1',
    type: 'story',
    variant: 'default',
    enabled: true,
    locked: false,
    settings,
    bindings: {},
    overrides: {},
  };
}

describe('StorySection media parity', () => {
  it('uses section photo before weddingData hero fallback', () => {
    const data = createEmptyWeddingData();
    data.couple.story = 'We met.';
    data.media.heroImageUrl = 'https://example.com/fallback-story.jpg';

    render(
      <StorySection
        data={data}
        instance={makeInstance({
          title: 'Our Story',
          photo: 'https://example.com/section-story.jpg',
        })}
      />
    );

    const image = screen.getByAltText('Couple') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/section-story.jpg');
    expect(image.src).not.toContain('https://example.com/fallback-story.jpg');
  });

  it('falls back to weddingData hero media when story image is unset', () => {
    const data = createEmptyWeddingData();
    data.couple.story = 'We met.';
    data.media.heroImageUrl = 'https://example.com/fallback-story.jpg';

    render(
      <StoryCentered
        data={data}
        instance={makeInstance({ title: 'Our Story' })}
      />
    );

    const image = screen.getByAltText('Couple') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/fallback-story.jpg');
  });

  it('supports builder value objects for story photo aliases', () => {
    const data = createEmptyWeddingData();
    data.couple.story = 'We met.';
    data.media.heroImageUrl = 'https://example.com/fallback-story.jpg';

    render(
      <StorySplit
        data={data}
        instance={makeInstance({
          photo: { value: 'https://example.com/object-story.jpg' },
        })}
      />
    );

    const image = screen.getByAltText('Couple') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/object-story.jpg');
  });

  it('drops unsafe story image values before legacy public render', () => {
    const data = createEmptyWeddingData();
    data.couple.story = 'We met.';

    const { container } = render(
      <StorySection
        data={data}
        instance={makeInstance({
          photo: 'javascript:alert(1)',
        })}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });
});
