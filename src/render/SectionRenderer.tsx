import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SectionInstance } from '../sections/types';
import { resolveAndParse } from '../sections/registry';
import { logClientError } from '../lib/errorLogger';
import { sanitizeSignedMediaUrlsDeep } from '../lib/mediaUrl';
import { sanitizePublicSectionDataDeep } from './publicSectionDataSanitizer';

interface SectionRendererProps {
  section: SectionInstance;
  siteSlug?: string;
  isPreview?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionType: string; sectionVariant?: string; sectionId?: string; isPreview?: boolean; onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; sectionType: string; sectionVariant?: string; sectionId?: string; isPreview?: boolean; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const sectionMeta = {
      sectionType: this.props.sectionType,
      sectionVariant: this.props.sectionVariant,
      sectionId: this.props.sectionId,
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

  componentDidUpdate(prevProps: Readonly<{ children: React.ReactNode; sectionType: string; sectionVariant?: string; sectionId?: string; isPreview?: boolean; onRetry?: () => void }>): void {
    if (!this.state.hasError) return;
    const changed =
      prevProps.sectionId !== this.props.sectionId ||
      prevProps.sectionType !== this.props.sectionType ||
      prevProps.sectionVariant !== this.props.sectionVariant;
    if (changed) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.isPreview) {
        return (
          <div className="py-12 px-6 flex flex-col items-center gap-3 text-center bg-gray-50 border-y border-gray-200">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-gray-500">Section preview unavailable</p>
          </div>
        );
      }
      return (
        <div className="py-8 px-6 bg-surface-subtle border-y border-border-subtle flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <p className="text-sm text-text-secondary">This part of the wedding site is taking a moment to load.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, siteSlug, isPreview }) => {
  const sanitizedData = sanitizePublicSectionDataDeep(sanitizeSignedMediaUrlsDeep(section.data ?? {}));
  const resolved = resolveAndParse(section.type, section.variant, sanitizedData);

  if (!resolved) {
    if (isPreview) return null;
    return (
      <div className="py-8 px-6 bg-surface-subtle border-y border-border-subtle text-center">
        <p className="text-sm text-text-secondary">This part of the wedding site is taking a moment to load.</p>
      </div>
    );
  }

  const { def, parsedData } = resolved;
  const { Component } = def;

  return (
    <SectionErrorBoundary sectionType={section.type} sectionVariant={section.variant} sectionId={section.id} isPreview={isPreview}>
      <Component data={parsedData as never} siteSlug={siteSlug} />
    </SectionErrorBoundary>
  );
};
