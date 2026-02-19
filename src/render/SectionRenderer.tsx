import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SectionInstance } from '../sections/types';
import { resolveAndParse } from '../sections/registry';

interface SectionRendererProps {
  section: SectionInstance;
  siteSlug?: string;
  isPreview?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionType: string; isPreview?: boolean; onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; sectionType: string; isPreview?: boolean; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
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
        <div className="py-8 px-6 bg-amber-50 border border-amber-200 rounded-xl m-3 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <p className="text-sm font-medium text-amber-800 capitalize">{this.props.sectionType} section failed to render</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-lg"
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
  const resolved = resolveAndParse(section.type, section.variant, section.data);

  if (!resolved) {
    if (isPreview) return null;
    return (
      <div className="py-6 px-4 bg-gray-50 border-2 border-dashed border-gray-200 text-center rounded-xl m-3">
        <p className="text-sm text-gray-400">Unknown section: <code className="font-mono">{section.type}::{section.variant}</code></p>
      </div>
    );
  }

  const { def, parsedData } = resolved;
  const { Component } = def;

  return (
    <SectionErrorBoundary sectionType={section.type} isPreview={isPreview}>
      <Component data={parsedData as never} siteSlug={siteSlug} />
    </SectionErrorBoundary>
  );
};
