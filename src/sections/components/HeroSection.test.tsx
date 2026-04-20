import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { SectionInstance } from '../../types/layoutConfig';

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'hero-1',
    type: 'hero',
    variant: 'default',
    enabled: true,
    locked: false,
    settings,
    bindings: {},
    overrides: {},
  };
}

describe('HeroSection', () => {
  it('prefers explicit section image aliases over weddingData hero media', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';
    data.media.heroImageUrl = 'https://example.com/fallback-hero.jpg';

    render(
      <HeroSection
        data={data}
        instance={makeInstance({
          headline: 'Alex & Jordan',
          heroImageUrl: 'https://example.com/section-hero.jpg',
        })}
      />
    );

    const image = screen.getByAltText('Hero') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/section-hero.jpg');
    expect(image.src).not.toContain('https://example.com/fallback-hero.jpg');
  });

  it('falls back to weddingData hero media when no section image is set', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';
    data.media.heroImageUrl = 'https://example.com/fallback-hero.jpg';

    render(
      <HeroSection
        data={data}
        instance={makeInstance({
          headline: 'Alex & Jordan',
        })}
      />
    );

    const image = screen.getByAltText('Hero') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/fallback-hero.jpg');
  });
});
