import type { CanonicalPageDocument, CanonicalSectionInstance } from './canonicalPageContract';
import type { LayoutConfigV1 } from '../types/layoutConfig';
import type { BuilderV2Document } from '../builder-v2/contracts';

const layoutSectionToCanonical = (section: LayoutConfigV1['pages'][number]['sections'][number]): CanonicalSectionInstance => ({
  id: section.id,
  type: section.type,
  variant: section.variant,
  props: { ...section.settings, ...(section.overrides ?? {}) },
  bindings: section.bindings,
  visible: section.enabled,
  locked: section.locked,
  meta: { source: 'layoutConfigV1' },
});

const getCanonicalTitle = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') return value.trim() || fallback;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value.trim() || fallback;
  }
  return fallback;
};

export const layoutConfigToCanonicalPageDocument = (layout: LayoutConfigV1): CanonicalPageDocument => ({
  version: 'canonical-page-v1',
  templateId: layout.templateId,
  pages: layout.pages.map((page, index) => ({
    id: page.id,
    title: getCanonicalTitle(page.title, `Page ${index + 1}`),
    sections: page.sections.map(layoutSectionToCanonical),
  })),
  meta: {
    createdAtISO: layout.meta.createdAtISO,
    updatedAtISO: layout.meta.updatedAtISO,
    source: 'layoutConfigV1',
  },
});

const builderV2SectionToCanonical = (section: BuilderV2Document['sections'][number]): CanonicalSectionInstance => ({
  id: section.id,
  type: section.type,
  variant: section.variant,
  props: {
    title: section.title,
    subtitle: section.subtitle,
    blocks: section.blocks,
  },
  visible: section.enabled,
  meta: { source: 'builderV2' },
});

export const builderV2ToCanonicalPageDocument = (document: BuilderV2Document): CanonicalPageDocument => ({
  version: 'canonical-page-v1',
  pages: [
    {
      id: 'home',
      title: 'Home',
      sections: document.sections.map(builderV2SectionToCanonical),
    },
  ],
  meta: {
    updatedAtISO: document.updatedAtISO,
    source: 'builderV2',
  },
});
