import type { CanonicalPageDocument, CanonicalSectionInstance } from './canonicalPageContract';
import type { LayoutConfigV1 } from '../types/layoutConfig';
import { getBuilderV2Pages, type BuilderV2Document, type BuilderV2Section } from '../builder-v2/contracts';

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

export const layoutConfigToCanonicalPageDocument = (layout: LayoutConfigV1): CanonicalPageDocument => ({
  version: 'canonical-page-v1',
  templateId: layout.templateId,
  pages: layout.pages.map((page) => ({
    id: page.id,
    title: page.title,
    sections: page.sections.map(layoutSectionToCanonical),
  })),
  meta: {
    createdAtISO: layout.meta.createdAtISO,
    updatedAtISO: layout.meta.updatedAtISO,
    source: 'layoutConfigV1',
  },
});

const builderV2SectionToCanonical = (section: BuilderV2Section): CanonicalSectionInstance => ({
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
  pages: getBuilderV2Pages(document).map((page) => ({
    id: page.id,
    title: page.title,
    sections: page.sections.map(builderV2SectionToCanonical),
  })),
  meta: {
    updatedAtISO: document.updatedAtISO,
    source: 'builderV2',
  },
});
