import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SectionInstance } from '../sections/types';

const registryMocks = vi.hoisted(() => ({
  resolveAndParse: vi.fn(),
}));

vi.mock('../sections/registry', () => ({
  resolveAndParse: registryMocks.resolveAndParse,
}));

vi.mock('../lib/errorLogger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('../lib/mediaUrl', () => ({
  sanitizeSignedMediaUrlsDeep: vi.fn((value) => value),
}));

import { SectionRenderer } from './SectionRenderer';

function makeSection(overrides: Partial<SectionInstance> = {}): SectionInstance {
  return {
    id: 'section-1',
    type: 'rsvp',
    variant: 'missing-provider-variant',
    data: {},
    order: 0,
    visible: true,
    ...overrides,
  } as SectionInstance;
}

describe('public SectionRenderer fallbacks', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registryMocks.resolveAndParse.mockReset();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('does not expose raw type or variant labels for unknown public sections', () => {
    registryMocks.resolveAndParse.mockReturnValue(null);

    render(<SectionRenderer section={makeSection()} />);

    expect(screen.getByText('This part of the wedding site is taking a moment to load.')).toBeInTheDocument();
    expect(screen.queryByText(/unknown section|rsvp|variant|provider/i)).not.toBeInTheDocument();
  });

  it('does not expose raw type or error context when a resolved public section throws', () => {
    const BrokenSection = () => {
      throw new Error('storage provider token failure');
    };
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: BrokenSection },
      parsedData: {},
    });

    render(<SectionRenderer section={makeSection({ variant: 'default' })} />);

    expect(screen.getByText('This part of the wedding site is taking a moment to load.')).toBeInTheDocument();
    expect(screen.queryByText(/storage|provider|token|rsvp|failed/i)).not.toBeInTheDocument();
  });

  it('sanitizes persisted public section URLs before schema resolution', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => null },
      parsedData: {},
    });

    render(
      <SectionRenderer
        section={makeSection({
          variant: 'default',
          data: {
            backgroundImage: 'javascript:alert(1)',
            photos: [{ url: 'https://image.thum.io/get/https://example.com/private', alt: 'Private preview' }],
            ctaHref: '/site/alex-jordan#rsvp',
            cashFundUrl: 'ftp://example.com/fund',
            title: 'javascript:alert(1) stays plain text',
          },
        })}
      />
    );

    expect(registryMocks.resolveAndParse).toHaveBeenCalledWith('rsvp', 'default', {
      backgroundImage: '',
      photos: [{ url: '', alt: 'Private preview' }],
      ctaHref: '/site/alex-jordan#rsvp',
      cashFundUrl: '',
      title: 'javascript:alert(1) stays plain text',
    });
  });
});
