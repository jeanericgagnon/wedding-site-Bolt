import type { BuilderV2Block, BuilderV2Document } from '../builder-v2/contracts';
import { builderV2DocumentToBuilderProject } from '../builder-v2/adapter';
import { buildBuilderV2DocumentPages, type LabPage } from './builderV2PageState';
import type { SectionInstance } from '../types/layoutConfig';

type PreviewBlockData = BuilderV2Block['data'];

type PreviewBlock = {
  id: string;
  type: BuilderV2Block['type'];
  content: string;
  data?: PreviewBlockData;
};

const toPreviewDocument = (
  pages: LabPage[],
  sectionBlocks: Record<string, PreviewBlock[]>,
): BuilderV2Document => ({
  version: 'v2',
  updatedAtISO: 'preview',
  pages: buildBuilderV2DocumentPages(pages, (page) => page.sections.map((section) => ({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    title: section.title,
    subtitle: section.subtitle,
    blocks: (sectionBlocks[section.id] ?? []).map((block) => ({
      id: block.id,
      type: block.type,
      data: block.data ?? { text: block.content },
    })),
  }))),
});

export const buildBuilderV2PreviewInstances = ({
  pages,
  activePageId,
  sectionBlocks,
  fallbackTemplateId = 'modern-luxe',
}: {
  pages: LabPage[];
  activePageId: string;
  sectionBlocks: Record<string, PreviewBlock[]>;
  fallbackTemplateId?: string;
}): SectionInstance[] => {
  const project = builderV2DocumentToBuilderProject(
    toPreviewDocument(pages, sectionBlocks),
    { templateId: fallbackTemplateId },
  );
  const activePage = project.pages.find((page) => page.id === activePageId) ?? project.pages[0];

  return (activePage?.sections ?? []).map((section) => ({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    locked: section.locked,
    bindings: section.bindings,
    settings: { ...section.settings },
    overrides: { ...section.styleOverrides },
  }));
};
