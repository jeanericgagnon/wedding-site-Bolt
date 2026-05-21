import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyWeddingData } from '../../types/weddingData';
import type { BuilderSectionInstance } from '../../types/builder/section';

const registryMocks = vi.hoisted(() => ({
  getSectionComponent: vi.fn(),
  resolveAndParse: vi.fn(),
}));

const bindingMocks = vi.hoisted(() => ({
  applyWeddingDataBindings: vi.fn(),
}));

vi.mock('../../sections/registry', () => ({
  resolveAndParse: registryMocks.resolveAndParse,
}));

vi.mock('../../sections/sectionRegistry', () => ({
  getSectionComponent: registryMocks.getSectionComponent,
}));

vi.mock('../../render/weddingDataBindings', () => ({
  applyWeddingDataBindings: bindingMocks.applyWeddingDataBindings,
}));

vi.mock('../utils/customCss', () => ({
  buildScopedSectionCss: vi.fn(() => ''),
  sanitizeCustomClassName: vi.fn((value) => value ?? ''),
}));

import { SectionRenderer } from './SectionRenderer';

function makeSection(overrides: Partial<BuilderSectionInstance> = {}): BuilderSectionInstance {
  return {
    id: 'section-1',
    type: 'registry',
    variant: 'unknown-provider-variant',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    ...overrides,
  } as BuilderSectionInstance;
}

describe('public builder SectionRenderer fallbacks', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    bindingMocks.applyWeddingDataBindings.mockReset();
    bindingMocks.applyWeddingDataBindings.mockImplementation((section) => section.data);
    registryMocks.resolveAndParse.mockReturnValue(null);
    registryMocks.getSectionComponent.mockReset();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('hides raw section type and variant details when a public section cannot be resolved', () => {
    registryMocks.getSectionComponent.mockImplementation(() => {
      throw new Error('missing registry unknown-provider-variant');
    });

    render(
      <SectionRenderer
        section={makeSection()}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(screen.getByText('This part of the wedding site is taking a moment to load.')).toBeInTheDocument();
    expect(screen.queryByText(/registry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/variant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/provider/i)).not.toBeInTheDocument();
  });

  it('prefers the rich section registry for builder-backed public pages', () => {
    const ResolvedSection = ({ data }: { data: { title?: string } }) => (
      <section>Resolved public section: {data.title}</section>
    );
    const LegacySection = () => <section>Legacy section</section>;
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: ResolvedSection },
      parsedData: { title: 'real template render' },
    });
    registryMocks.getSectionComponent.mockReturnValue(LegacySection);

    render(
      <SectionRenderer
        section={makeSection({
          type: 'hero',
          variant: 'fullbleed',
          settings: { title: 'real template render' },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(screen.getByText('Resolved public section: real template render')).toBeInTheDocument();
    expect(screen.queryByText('Legacy section')).not.toBeInTheDocument();
    expect(registryMocks.resolveAndParse).toHaveBeenCalledWith(
      'hero',
      'fullbleed',
      { title: 'real template render' },
      { strictVariant: undefined },
    );
    expect(registryMocks.getSectionComponent).not.toHaveBeenCalled();
  });

  it('adds stable section anchors on public builder sections', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    const { container } = render(
      <SectionRenderer
        section={makeSection({
          id: 'schedule-anchor',
          type: 'schedule',
          variant: 'dayTabs',
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    const wrapper = container.querySelector('[data-public-section-anchor="schedule-anchor"]');
    expect(wrapper).toHaveAttribute('id', 'schedule-anchor');
  });

  it('sanitizes fallback section ids before exposing public anchors', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    const { container } = render(
      <SectionRenderer
        section={makeSection({
          id: 'Registry Section!!',
          type: 'registry',
          variant: 'featured',
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    const wrapper = container.querySelector('[data-public-section-anchor="registry-section"]');
    expect(wrapper).toHaveAttribute('id', 'registry-section');
  });

  it('uses readable custom section anchors when configured', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    const { container } = render(
      <SectionRenderer
        section={makeSection({
          id: 'registry-section',
          type: 'registry',
          variant: 'featured',
          settings: { anchorId: 'Registry Gifts!' },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    const wrapper = container.querySelector('[data-public-section-anchor="registry-gifts"]');
    expect(wrapper).toHaveAttribute('id', 'registry-gifts');
  });

  it('keeps public render errors guest-safe when a legacy section throws', () => {
    const BrokenSection = () => {
      throw new Error('database provider bucket failure');
    };
    registryMocks.getSectionComponent.mockReturnValue(BrokenSection);

    render(
      <SectionRenderer
        section={makeSection({ variant: 'default' })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(screen.getByText('This part of the wedding site is taking a moment to load.')).toBeInTheDocument();
    expect(screen.queryByText(/database|provider|bucket|variant|registry/i)).not.toBeInTheDocument();
  });

  it('drops unsafe side-image overrides before public render', () => {
    const SafeSection = () => <section>Safe legacy section</section>;
    registryMocks.getSectionComponent.mockReturnValue(SafeSection);

    const { container, rerender } = render(
      <SectionRenderer
        section={makeSection({
          variant: 'default',
          styleOverrides: {
            sideImage: 'javascript:alert(1)',
          },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(screen.getByText('Safe legacy section')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();

    rerender(
      <SectionRenderer
        section={makeSection({
          variant: 'default',
          styleOverrides: {
            sideImage: '/preview-photos/header-anchor.jpg',
          },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });

  it('sanitizes bound settings before resolved preview render', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    render(
      <SectionRenderer
        section={makeSection({
          type: 'hero',
          variant: 'fullBleed',
          settings: {
            backgroundImage: 'javascript:alert(1)',
            ctaHref: '/site/kara-eric#rsvp',
            galleryImages: [{ url: 'https://image.thum.io/get/https://example.com/private', alt: 'Private preview' }],
            title: 'javascript:alert(1) stays visible as text',
          },
        })}
        weddingData={createEmptyWeddingData()}
        isPreview
        surface="public"
        strictVariantMatching
      />,
    );

    expect(screen.getByText('Resolved section')).toBeInTheDocument();
    expect(registryMocks.resolveAndParse).toHaveBeenCalledWith(
      'hero',
      'fullBleed',
      {
        backgroundImage: '',
        ctaHref: '/site/kara-eric#rsvp',
        galleryImages: [{ url: '', alt: 'Private preview' }],
        title: 'javascript:alert(1) stays visible as text',
      },
      { strictVariant: true },
    );
  });

  it('rewrites internal RSVP anchor links to dedicated public RSVP pages when available', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    render(
      <SectionRenderer
        section={makeSection({
          type: 'hero',
          variant: 'fullBleed',
          settings: {
            ctaHref: '#rsvp',
            nested: {
              rsvpUrl: { value: '#rsvp', source: 'builder' },
              untouched: '#travel',
            },
          },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
        publicRsvpHref="/site/kara-eric/rsvp"
      />,
    );

    expect(registryMocks.resolveAndParse).toHaveBeenCalledWith(
      'hero',
      'fullBleed',
      {
        ctaHref: '/site/kara-eric/rsvp',
        nested: {
          rsvpUrl: { value: '/site/kara-eric/rsvp', source: 'builder' },
          untouched: '#travel',
        },
      },
      { strictVariant: undefined },
    );
  });

  it('keeps one-page RSVP anchors when no dedicated public RSVP page is available', () => {
    registryMocks.resolveAndParse.mockReturnValue({
      def: { Component: () => <section>Resolved section</section> },
      parsedData: {},
    });

    render(
      <SectionRenderer
        section={makeSection({
          type: 'hero',
          variant: 'fullBleed',
          settings: { ctaHref: '#rsvp' },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(registryMocks.resolveAndParse).toHaveBeenCalledWith(
      'hero',
      'fullBleed',
      { ctaHref: '#rsvp' },
      { strictVariant: undefined },
    );
  });

  it('sanitizes bound settings before legacy public render', () => {
    const LegacySection = ({ instance }: { instance: { settings: Record<string, unknown> } }) => (
      <section>{JSON.stringify(instance.settings)}</section>
    );
    registryMocks.getSectionComponent.mockReturnValue(LegacySection);

    render(
      <SectionRenderer
        section={makeSection({
          type: 'gallery',
          variant: 'grid',
          settings: {
            photos: [{ url: 'javascript:alert(1)', alt: 'Unsafe photo' }],
            rsvpUrl: 'ftp://example.com/rsvp',
            title: 'javascript:alert(1) remains plain text',
          },
        })}
        weddingData={createEmptyWeddingData()}
        surface="public"
      />,
    );

    expect(screen.getByText(/Unsafe photo/)).toBeInTheDocument();
    expect(screen.getByText(/"url":""/)).toBeInTheDocument();
    expect(screen.getByText(/"rsvpUrl":""/)).toBeInTheDocument();
    expect(screen.getByText(/javascript:alert\(1\) remains plain text/)).toBeInTheDocument();
  });
});
