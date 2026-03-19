import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { SectionInstance } from '../sections/types';
import { getDefinition, resolveAndParse } from '../sections/registry';
import { PersistedSection } from '../sections/schemas';
import { WeddingDataV1 } from '../types/weddingData';
import { applyWeddingDataBindings } from './weddingDataBindings';
import { sanitizeSignedMediaUrlsDeep } from '../lib/mediaUrl';
import { logClientError } from '../lib/errorLogger';

interface PageRendererProps {
  sections: SectionInstance[] | PersistedSection[];
  weddingData?: WeddingDataV1 | null;
  siteSlug?: string;
  className?: string;
}

function isPersistedSection(s: SectionInstance | PersistedSection): s is PersistedSection {
  return 'site_id' in s && 'visible' in s;
}

function normalise(s: SectionInstance | PersistedSection): {
  id: string;
  type: string;
  variant: string;
  data: Record<string, unknown>;
  order: number;
  visible: boolean;
  styleOverrides?: Record<string, string | undefined>;
  bindings?: { venueIds?: string[]; scheduleItemIds?: string[]; linkIds?: string[]; faqIds?: string[] };
} {
  if (isPersistedSection(s)) {
    return {
      id: s.id,
      type: s.type,
      variant: s.variant,
      data: s.data,
      order: s.order,
      visible: s.visible,
      styleOverrides: s.style_overrides as Record<string, string | undefined> | undefined,
      bindings: s.bindings,
    };
  }
  const maybeBindings = (s as unknown as { bindings?: { venueIds?: string[]; scheduleItemIds?: string[]; linkIds?: string[]; faqIds?: string[] } }).bindings;
  return {
    id: s.id,
    type: s.type,
    variant: s.variant,
    data: s.data,
    order: s.order,
    visible: s.visible,
    bindings: maybeBindings,
  };
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionType: string;
  sectionVariant?: string;
  sectionId?: string;
  siteSlug?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const sectionMeta = {
      sectionType: this.props.sectionType,
      sectionVariant: this.props.sectionVariant,
      sectionId: this.props.sectionId,
      siteSlug: this.props.siteSlug,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      componentStack: info.componentStack?.slice(0, 2000),
    };

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__dayof_last_section_error = sectionMeta;
    }

    logClientError({
      source: 'react-section-error-boundary',
      severity: 'error',
      message: error.message || 'Section render failed',
      stack: error.stack,
      metadata: sectionMeta,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-8 px-4 flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 border-y border-amber-100">
          <AlertTriangle size={16} />
          <span>This section could not be displayed.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PageRenderer: React.FC<PageRendererProps> = ({ sections, weddingData, siteSlug, className = '' }) => {
  const sorted = [...sections]
    .map(normalise)
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className={`min-h-screen ${className}`}>
      {sorted.map(section => {
        const dataWithBindings = applyWeddingDataBindings(section, weddingData);
        const sanitizedData = sanitizeSignedMediaUrlsDeep(dataWithBindings);
        const resolved = resolveAndParse(section.type, section.variant, sanitizedData);

        if (!resolved) {
          const def = getDefinition(section.type, section.variant);
          if (!def) return null;
          return null;
        }

        const { def, parsedData } = resolved;
        const { Component } = def;

        const style: React.CSSProperties = {
          backgroundColor: section.styleOverrides?.backgroundColor ?? undefined,
          color: section.styleOverrides?.textColor ?? undefined,
        };

        return (
          <SectionErrorBoundary
            key={section.id}
            sectionType={section.type}
            sectionVariant={section.variant}
            sectionId={section.id}
            siteSlug={siteSlug}
          >
            <div style={style}>
              <Component data={parsedData as never} siteSlug={siteSlug} />
            </div>
          </SectionErrorBoundary>
        );
      })}
    </div>
  );
};

export default PageRenderer;
