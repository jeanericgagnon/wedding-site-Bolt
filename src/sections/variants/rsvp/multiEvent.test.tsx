import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { rsvpDefaultDefinition } from './multiEvent';

describe('RSVP multi-event variant', () => {
  it('keeps embedded-form helper copy guest-facing', () => {
    const Component = rsvpDefaultDefinition.Component;

    render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'embed',
          embedUrl: 'https://example.com/rsvp',
        }}
      />,
    );

    expect(screen.getByText('If the RSVP form does not appear, please refresh this page or reach out to the couple directly.')).toBeInTheDocument();
    expect(screen.queryByText(/embedded RSVP is enabled|section|provider|token|database/i)).not.toBeInTheDocument();
  });

  it('drops unsafe embed URLs and falls back to the native RSVP form', () => {
    const Component = rsvpDefaultDefinition.Component;
    const { container } = render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'embed',
          embedUrl: 'javascript:alert(1)',
        }}
      />,
    );

    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(screen.getByRole('button', { name: 'Send RSVP' })).toBeInTheDocument();
  });

  it('drops unsafe illustrated RSVP image URLs before render', () => {
    const Component = rsvpDefaultDefinition.Component;
    const { container } = render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          layoutStyle: 'illustrated',
          imageUrl: 'https://image.thum.io/get/https://example.com',
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('image.thum.io');
  });

  it('keeps safe same-origin illustrated RSVP images', () => {
    const Component = rsvpDefaultDefinition.Component;
    const { container } = render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          layoutStyle: 'illustrated',
          imageUrl: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});
