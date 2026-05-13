import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rendererMocks = vi.hoisted(() => ({
  resolveAndParse: vi.fn(),
  getDefinition: vi.fn(),
  applyWeddingDataBindings: vi.fn(),
}));

vi.mock('../sections/registry', () => ({
  resolveAndParse: rendererMocks.resolveAndParse,
  getDefinition: rendererMocks.getDefinition,
}));

vi.mock('./weddingDataBindings', () => ({
  applyWeddingDataBindings: rendererMocks.applyWeddingDataBindings,
}));

vi.mock('../lib/errorLogger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('../lib/mediaUrl', () => ({
  sanitizeSignedMediaUrlsDeep: vi.fn((value) => value),
}));

import { PageRenderer } from './PageRenderer';

describe('public PageRenderer data guard', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rendererMocks.resolveAndParse.mockReset();
    rendererMocks.getDefinition.mockReset();
    rendererMocks.applyWeddingDataBindings.mockReset();
    rendererMocks.applyWeddingDataBindings.mockImplementation((section) => section.data);
    rendererMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => null },
      parsedData: {},
    });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('sanitizes bound public section URLs before schema resolution', () => {
    render(
      <PageRenderer
        sections={[
          {
            id: 'section-1',
            type: 'hero',
            variant: 'fullBleed',
            data: {
              heroImageUrl: 'https://image.thum.io/get/https://example.com/private',
              ctaHref: 'javascript:alert(1)',
              galleryImages: [{ url: '/preview-photos/header-anchor.jpg', alt: 'Safe photo' }],
              title: 'javascript:alert(1) stays plain text',
            },
            order: 0,
            visible: true,
          },
        ]}
      />
    );

    expect(rendererMocks.resolveAndParse).toHaveBeenCalledWith('hero', 'fullBleed', {
      heroImageUrl: '',
      ctaHref: '',
      galleryImages: [{ url: '/preview-photos/header-anchor.jpg', alt: 'Safe photo' }],
      title: 'javascript:alert(1) stays plain text',
    });
  });

  it('uses calm guest-facing copy when a resolved public page section throws', () => {
    const BrokenSection = () => {
      throw new Error('database provider bucket failure');
    };
    rendererMocks.resolveAndParse.mockReturnValue({
      def: { Component: BrokenSection },
      parsedData: {},
    });

    const { queryByText, getByText } = render(
      <PageRenderer
        sections={[
          {
            id: 'section-1',
            type: 'gallery',
            variant: 'grid',
            data: {},
            order: 0,
            visible: true,
          },
        ]}
      />
    );

    expect(getByText('This part of the wedding site is taking a moment to load.')).toBeInTheDocument();
    expect(queryByText(/database|provider|bucket|section could not be displayed|gallery|grid/i)).not.toBeInTheDocument();
  });
});
