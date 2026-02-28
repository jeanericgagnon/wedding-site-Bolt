import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { BuilderSectionInstance, BuilderSectionStyleOverrides } from '../../types/builder/section';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { resolveAndParse } from '../../sections/registry';
import { getSectionComponent } from '../../sections/sectionRegistry';

interface SectionRendererProps {
  section: BuilderSectionInstance;
  weddingData: WeddingDataV1;
  isPreview?: boolean;
  siteSlug?: string;
}

function toSectionInstance(section: BuilderSectionInstance): SectionInstance {
  return {
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    locked: section.locked,
    settings: { ...section.settings },
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

function getAnimationClass(overrides: BuilderSectionStyleOverrides): string {
  switch (overrides.animationPreset ?? 'none') {
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
    default:
      return '';
  }
}

const SIZE_TO_CLASS: Record<string, string> = {
  sm: '25%',
  md: '40%',
  lg: '50%',
};

interface SideImageWrapperProps {
  overrides: BuilderSectionStyleOverrides;
  children: React.ReactNode;
}

const SideImageWrapper: React.FC<SideImageWrapperProps> = ({ overrides, children }) => {
  const { sideImage, sideImagePosition = 'right', sideImageSize = 'md', sideImageFit = 'cover' } = overrides;
  if (!sideImage) return <>{children}</>;

  const imgWidth = SIZE_TO_CLASS[sideImageSize] ?? '40%';
  const isLeft = sideImagePosition === 'left';

  const imageEl = (
    <div
      style={{ width: imgWidth, flexShrink: 0 }}
      className="relative overflow-hidden"
    >
      <img
        src={sideImage}
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
  errorMessage: string | null;
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionType: string; isPreview?: boolean },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; sectionType: string; isPreview?: boolean }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.isPreview) {
        return (
          <div className="py-12 px-6 flex flex-col items-center gap-3 text-center bg-gray-50 border-y border-gray-200">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <p className="text-sm text-gray-500">
              This section couldn't be displayed. It may still appear correctly on the published site.
            </p>
          </div>
        );
      }
      return (
        <div className="py-8 px-6 bg-amber-50 border border-amber-200 rounded-lg m-3 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              The <span className="font-semibold capitalize">{this.props.sectionType}</span> section failed to render
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Your content is safe. Try editing the section settings or switch to a different variant.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-lg transition-colors"
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

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, weddingData, isPreview, siteSlug }) => {
  const resolved = resolveAndParse(
    section.type,
    section.variant,
    section.settings as Record<string, unknown>
  );

  if (resolved) {
    const { def, parsedData } = resolved;
    const { Component } = def;

    const overrideStyle = buildOverrideStyle(section.styleOverrides);
    const animationClass = getAnimationClass(section.styleOverrides);
    const mergedStyle = {
      ...overrideStyle,
      animationDelay: section.styleOverrides.animationPreset === 'stagger' ? `${Math.min(section.orderIndex * 70, 420)}ms` : undefined,
    } as React.CSSProperties;

    return (
      <SectionErrorBoundary sectionType={section.type} isPreview={isPreview}>
        <SideImageWrapper overrides={section.styleOverrides}>
          <div className={animationClass} style={mergedStyle}>
            <Component data={parsedData as never} siteSlug={siteSlug} />
          </div>
        </SideImageWrapper>
      </SectionErrorBoundary>
    );
  }

  let LegacyComponent;
  try {
    LegacyComponent = getSectionComponent(section.type, section.variant);
  } catch {
    if (isPreview) return null;
    return (
      <div className="py-6 px-4 bg-gray-50 border-2 border-dashed border-gray-200 text-center rounded-lg m-3">
        <p className="text-sm text-gray-400">Unknown section type: <code className="font-mono">{section.type}</code></p>
        <p className="text-xs text-gray-400 mt-1">Remove this section or choose a different type from the sidebar.</p>
      </div>
    );
  }

  const instance = toSectionInstance(section);
  const legacyOverrideStyle = buildOverrideStyle(section.styleOverrides);
  const animationClass = getAnimationClass(section.styleOverrides);
  const legacyMergedStyle = {
    ...legacyOverrideStyle,
    animationDelay: section.styleOverrides.animationPreset === 'stagger' ? `${Math.min(section.orderIndex * 70, 420)}ms` : undefined,
  } as React.CSSProperties;

  return (
    <SectionErrorBoundary sectionType={section.type} isPreview={isPreview}>
      <SideImageWrapper overrides={section.styleOverrides}>
        <div className={animationClass} style={legacyMergedStyle}>
          <LegacyComponent data={weddingData} instance={instance} />
        </div>
      </SideImageWrapper>
    </SectionErrorBoundary>
  );
};
