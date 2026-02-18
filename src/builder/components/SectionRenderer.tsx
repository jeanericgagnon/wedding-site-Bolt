import React from 'react';
import { BuilderSectionInstance } from '../../types/builder/section';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { getSectionComponent } from '../../sections/sectionRegistry';

interface SectionRendererProps {
  section: BuilderSectionInstance;
  weddingData: WeddingDataV1;
  isPreview?: boolean;
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

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionType: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; sectionType: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-8 px-4 bg-red-50 border border-red-200 text-red-600 text-sm text-center rounded">
          Unable to render {this.props.sectionType} section
        </div>
      );
    }
    return this.props.children;
  }
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, weddingData, isPreview }) => {
  let Component;
  try {
    Component = getSectionComponent(section.type, section.variant);
  } catch {
    return (
      <div className={`py-6 px-4 bg-gray-50 border-2 border-dashed border-gray-200 text-center ${isPreview ? '' : 'min-h-[80px]'}`}>
        <span className="text-sm text-gray-400">Unknown section type: {section.type}</span>
      </div>
    );
  }

  const instance = toSectionInstance(section);

  return (
    <SectionErrorBoundary sectionType={section.type}>
      <div
        style={{
          backgroundColor: section.styleOverrides.backgroundColor ?? undefined,
          color: section.styleOverrides.textColor ?? undefined,
        }}
      >
        <Component data={weddingData} instance={instance} />
      </div>
    </SectionErrorBoundary>
  );
};
