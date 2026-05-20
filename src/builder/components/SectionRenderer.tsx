import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { BuilderSectionInstance, BuilderSectionStyleOverrides } from '../../types/builder/section';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { resolveAndParse } from '../../sections/registry';
import { getSectionComponent } from '../../sections/sectionRegistry';
import { applyWeddingDataBindings } from '../../render/weddingDataBindings';
import { sanitizePublicSectionDataDeep } from '../../render/publicSectionDataSanitizer';
import { buildScopedSectionCss, sanitizeCustomClassName } from '../utils/customCss';
import { getSafePublicImageUrl } from '../../sections/publicLinks';
import { normalizeSectionAnchorId } from '../utils/sectionAnchors';

interface SectionRendererProps {
  section: BuilderSectionInstance;
  weddingData: WeddingDataV1;
  isPreview?: boolean;
  siteSlug?: string;
  publicRsvpHref?: string | null;
  globalAnimationPreset?: BuilderSectionStyleOverrides['animationPreset'];
  strictVariantMatching?: boolean;
  surface?: 'builder' | 'public';
}

function toSectionInstance(section: BuilderSectionInstance, settingsOverride?: Record<string, unknown>): SectionInstance {
  return {
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    locked: section.locked,
    settings: { ...(settingsOverride ?? section.settings) },
    bindings: { ...section.bindings },
    overrides: { ...section.styleOverrides } as Record<string, string | boolean | number | undefined>,
  };
}

function buildOverrideStyle(overrides: BuilderSectionStyleOverrides): React.CSSProperties {
  return {
    backgroundColor: overrides.backgroundColor ?? undefined,
    color: overrides.textColor ?? undefined,
    paddingTop: overrides.paddingTop ?? undefined,
    paddingBottom: overrides.paddingBottom ?? undefined,
  };
}

function getAnimationClass(overrides: BuilderSectionStyleOverrides, globalAnimationPreset?: BuilderSectionStyleOverrides['animationPreset']): string {
  const preset = overrides.animationPreset ?? globalAnimationPreset ?? 'none';
  switch (preset) {
    case 'fade-in':
      return 'section-anim section-anim-fade-in';
    case 'fade-up':
      return 'section-anim section-anim-fade-up';
    case 'slide-up':
      return 'section-anim section-anim-slide-up';
    case 'zoom-in':
      return 'section-anim section-anim-zoom-in';
    case 'stagger':
      return 'section-anim section-anim-stagger';
    case 'reveal-left':
      return 'section-anim section-anim-reveal-left';
    case 'reveal-right':
      return 'section-anim section-anim-reveal-right';
    case 'blur-in':
      return 'section-anim section-anim-blur-in';
    case 'float-in':
      return 'section-anim section-anim-float-in';
    case 'scale-up':
      return 'section-anim section-anim-scale-up';
    default:
      return '';
  }
}

const SIZE_TO_CLASS: Record<string, string> = {
  sm: '25%',
  md: '40%',
  lg: '50%',
};

function sanitizePublicAnchorId(value: unknown, fallback: string): string {
  return normalizeSectionAnchorId(value) || normalizeSectionAnchorId(fallback) || 'section';
}

function rewritePublicRsvpAnchorLinks(value: unknown, publicRsvpHref?: string | null): unknown {
  if (!publicRsvpHref) return value;
  if (typeof value === 'string') return value.trim() === '#rsvp' ? publicRsvpHref : value;
  if (Array.isArray(value)) return value.map((item) => rewritePublicRsvpAnchorLinks(item, publicRsvpHref));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      rewritePublicRsvpAnchorLinks(nestedValue, publicRsvpHref),
    ])
  );
}

interface SideImageWrapperProps {
  overrides: BuilderSectionStyleOverrides;
  children: React.ReactNode;
}

const SideImageWrapper: React.FC<SideImageWrapperProps> = ({ overrides, children }) => {
  const { sideImage, sideImagePosition = 'right', sideImageSize = 'md', sideImageFit = 'cover' } = overrides;
  const safeSideImage = getSafePublicImageUrl(sideImage);
  if (!safeSideImage) return <>{children}</>;

  const imgWidth = SIZE_TO_CLASS[sideImageSize] ?? '40%';
  const isLeft = sideImagePosition === 'left';

  const imageEl = (
    <div
      style={{ width: imgWidth, flexShrink: 0 }}
      className="relative overflow-hidden"
    >
      <img
        src={safeSideImage}
        alt=""
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: sideImageFit }}
      />
    </div>
  );

  return (
    <div className="flex" style={{ minHeight: '200px' }}>
      {isLeft && imageEl}
      <div className="flex-1 min-w-0">{children}</div>
      {!isLeft && imageEl}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionType: string; isPreview?: boolean; surface?: 'builder' | 'public'; onError?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; sectionType: string; isPreview?: boolean; surface?: 'builder' | 'public'; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.isPreview) {
        return (
          <div className="py-12 px-6 flex flex-col items-center gap-3 text-center bg-surface-subtle border-y border-border-subtle">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <p className="text-sm text-text-secondary">
              This section couldn't be displayed. It may still appear correctly on the published site.
            </p>
          </div>
        );
      }
      if (this.props.surface === 'public') {
        return (
          <div className="py-8 px-6 bg-surface-subtle border-y border-border-subtle flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <p className="text-sm text-text-secondary">
              This part of the wedding site is taking a moment to load.
            </p>
          </div>
        );
      }
      return (
        <div className="py-8 px-6 bg-surface-subtle border border-border-subtle rounded-xl m-3 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              This <span className="font-semibold capitalize">{this.props.sectionType}</span> section needs a refresh
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Your content is safe. Try editing the section settings or switch to a different variant.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-subtle hover:bg-surface text-text-primary text-xs font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, weddingData, isPreview, siteSlug, publicRsvpHref, globalAnimationPreset, strictVariantMatching, surface = 'builder' }) => {
  const [preferLegacyRenderer, setPreferLegacyRenderer] = React.useState(false);

  const styleOverrides = section.styleOverrides ?? {};
  const overrideStyle = buildOverrideStyle(styleOverrides);
  const effectivePreset = styleOverrides.animationPreset ?? globalAnimationPreset;
  const animationClass = getAnimationClass(styleOverrides, globalAnimationPreset);
  const customClassName = sanitizeCustomClassName(styleOverrides.customClassName);
  const customCss = buildScopedSectionCss(section.id, [styleOverrides.styleRecipeCss, styleOverrides.customCss].filter(Boolean).join('\n\n'));
  const sectionClassName = [animationClass, customClassName].filter(Boolean).join(' ');
  const publicAnchorId = surface === 'public' ? sanitizePublicAnchorId(section.settings?.anchorId, section.id) : undefined;
  const mergedStyle = {
    ...overrideStyle,
    animationDelay: effectivePreset === 'stagger' ? `${Math.min(section.orderIndex * 70, 420)}ms` : undefined,
  } as React.CSSProperties;

  const boundSettings = sanitizePublicSectionDataDeep(rewritePublicRsvpAnchorLinks(applyWeddingDataBindings({
    type: section.type,
    variant: section.variant,
    data: section.settings as Record<string, unknown>,
    bindings: section.bindings,
  }, weddingData), surface === 'public' ? publicRsvpHref : null)) as Record<string, unknown>;

  const shouldUseResolvedRenderer = surface === 'public' || isPreview || strictVariantMatching;

  const resolved = !preferLegacyRenderer && shouldUseResolvedRenderer
    ? resolveAndParse(
      section.type,
      section.variant,
      boundSettings,
      { strictVariant: strictVariantMatching }
    )
    : null;

  if (resolved) {
    const { def, parsedData } = resolved;
    const { Component } = def;

    return (
      <SectionErrorBoundary
        sectionType={section.type}
        isPreview={isPreview}
        surface={surface}
        onError={isPreview ? () => setPreferLegacyRenderer(true) : undefined}
      >
        <SideImageWrapper overrides={styleOverrides}>
          {customCss ? <style data-builder-section-style={section.id}>{customCss}</style> : null}
          <div
            className={sectionClassName}
            style={mergedStyle}
            id={publicAnchorId}
            data-builder-section-id={section.id}
            data-public-section-anchor={publicAnchorId}
            data-section-type={section.type}
            data-section-variant={section.variant}
          >
            <Component data={parsedData as never} siteSlug={siteSlug} />
          </div>
        </SideImageWrapper>
      </SectionErrorBoundary>
    );
  }

  if (strictVariantMatching) {
    if (isPreview) {
      return (
        <div className="m-3 rounded-xl border border-border-subtle bg-surface-subtle px-4 py-6 text-center">
          <p className="text-sm text-text-secondary">This design needs a quick refresh before it can preview.</p>
        </div>
      );
    }
    return null;
  }

  let LegacyComponent;
  try {
    LegacyComponent = getSectionComponent(section.type, section.variant);
  } catch {
    if (isPreview) return null;
    if (surface === 'public') {
      return (
        <div className="py-8 px-6 bg-surface-subtle border-y border-border-subtle text-center">
          <p className="text-sm text-text-secondary">This part of the wedding site is taking a moment to load.</p>
        </div>
      );
    }
    return (
      <div className="m-3 rounded-xl border border-dashed border-border-subtle bg-surface-subtle px-4 py-6 text-center">
        <p className="text-sm text-text-secondary">This section needs a quick refresh before it can preview.</p>
        <p className="mt-1 text-xs text-text-tertiary">Remove it or choose a different section from the sidebar.</p>
      </div>
    );
  }

  const instance = toSectionInstance(section, boundSettings);

  return (
    <SectionErrorBoundary sectionType={section.type} isPreview={isPreview} surface={surface}>
      <SideImageWrapper overrides={styleOverrides}>
        {customCss ? <style data-builder-section-style={section.id}>{customCss}</style> : null}
        <div
          className={sectionClassName}
          style={mergedStyle}
          id={publicAnchorId}
          data-builder-section-id={section.id}
          data-public-section-anchor={publicAnchorId}
          data-section-type={section.type}
          data-section-variant={section.variant}
        >
          <LegacyComponent data={weddingData} instance={instance} />
        </div>
      </SideImageWrapper>
    </SectionErrorBoundary>
  );
};
