import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroCountdown, HeroFullbleed, HeroMinimal, HeroSection } from './HeroSection';
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

  it('uses the warm default wedding image when no hero media exists yet', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';

    render(
      <HeroSection
        data={data}
        instance={makeInstance({
          headline: 'Alex & Jordan',
        })}
      />
    );

    const image = screen.getByAltText('Hero') as HTMLImageElement;
    expect(image.src).toContain('/preview-photos/header-anchor.jpg');
  });

  it('treats fractional overlay opacity as a usable image opacity', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';

    render(
      <HeroSection
        data={data}
        instance={makeInstance({
          headline: 'Alex & Jordan',
          heroImageUrl: 'https://example.com/section-hero.jpg',
          overlayOpacity: 0.35,
        })}
      />
    );

    const image = screen.getByAltText('Hero') as HTMLImageElement;
    expect(image.style.opacity).toBe('0.35');
  });

  it('drops unsafe hero image values before legacy public render', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';

    const { container } = render(
      <HeroSection
        data={data}
        instance={makeInstance({
          headline: 'Alex & Jordan',
          heroImageUrl: 'javascript:alert(1)',
        })}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });

  it('falls back to a truthful hero display name when couple names are missing', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <HeroSection
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();
    expect(screen.queryByText(' & ')).not.toBeInTheDocument();

    rerender(
      <HeroMinimal
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();

    rerender(
      <HeroFullbleed
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();

    rerender(
      <HeroCountdown
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();
  });

  it('restores a meaningful public hero heading when the saved headline is blank whitespace', () => {
    const data = createEmptyWeddingData();
    data.couple.displayName = 'Alex & Jordan';

    const { rerender } = render(
      <HeroSection
        data={data}
        instance={makeInstance({ headline: '   ' })}
      />
    );

    expect(screen.getByRole('heading', { name: 'Alex & Jordan' })).toBeInTheDocument();

    rerender(
      <HeroFullbleed
        data={data}
        instance={makeInstance({ headline: '   ' })}
      />
    );

    expect(screen.getByRole('heading', { name: 'Alex & Jordan' })).toBeInTheDocument();

    rerender(
      <HeroCountdown
        data={data}
        instance={makeInstance({ headline: '   ' })}
      />
    );

    expect(screen.getByRole('heading', { name: 'Alex & Jordan' })).toBeInTheDocument();
  });

  it('keeps hero display names truthful when one persisted partner name is whitespace only', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    const { rerender } = render(
      <HeroSection
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText(/&/)).not.toBeInTheDocument();

    rerender(
      <HeroMinimal
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();

    rerender(
      <HeroFullbleed
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();

    rerender(
      <HeroCountdown
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
  });

  it('guards invalid persisted wedding dates across hero variants', () => {
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = 'not-a-date';

    const { rerender } = render(
      <HeroSection
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Date TBD')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();

    rerender(
      <HeroMinimal
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Date TBD')).toBeInTheDocument();

    rerender(
      <HeroFullbleed
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Date TBD')).toBeInTheDocument();

    rerender(
      <HeroCountdown
        data={data}
        instance={makeInstance({})}
      />
    );

    expect(screen.getByText('Date TBD')).toBeInTheDocument();
    expect(screen.queryByText('Days')).not.toBeInTheDocument();
  });
});
