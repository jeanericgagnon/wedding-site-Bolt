import { LayoutConfigV1, SectionInstance } from '../../types/layoutConfig';
import { BuilderProject, BuilderPage, createEmptyBuilderProject, generateBuilderId } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';

function getComparableOrderIndex(orderIndex: unknown, fallback: number): number {
  const numericOrderIndex = typeof orderIndex === 'number'
    ? orderIndex
    : typeof orderIndex === 'string' && orderIndex.trim()
      ? Number(orderIndex)
      : NaN;
  return Number.isFinite(numericOrderIndex) ? numericOrderIndex : fallback;
}

function sortByOrderIndex<T extends { orderIndex?: unknown }>(items: T[]): T[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const aOrder = getComparableOrderIndex(a.item.orderIndex, a.originalIndex);
      const bOrder = getComparableOrderIndex(b.item.orderIndex, b.originalIndex);
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item);
}

function getBuilderString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
}

export function fromExistingLayoutToBuilderProject(
  weddingId: string,
  layout: LayoutConfigV1
): BuilderProject {
  const project = createEmptyBuilderProject(weddingId, layout.templateId);

  project.pages = layout.pages.map((page, pageIndex) => {
    const builderPage: BuilderPage = {
      id: page.id,
      title: getBuilderString(page.title).trim() || (pageIndex === 0 ? 'Home' : `Page ${pageIndex + 1}`),
      slug: page.id,
      orderIndex: pageIndex,
      sections: page.sections.map((sec, idx) => fromSectionInstanceToBuilderSection(sec, idx)),
      meta: {
        isHome: pageIndex === 0,
        isHidden: false,
      },
    };
    return builderPage;
  });

  const now = new Date().toISOString();
  project.meta = {
    createdAtISO: layout.meta?.createdAtISO ?? now,
    updatedAtISO: layout.meta?.updatedAtISO ?? now,
  };

  return project;
}

export function fromBuilderProjectToExistingLayout(project: BuilderProject): LayoutConfigV1 {
  return {
    version: '1',
    templateId: project.templateId,
    pages: sortByOrderIndex([...project.pages]).map(page => ({
      id: page.id,
      title: getBuilderString(page.title).trim() || 'Untitled page',
      sections: sortByOrderIndex([...page.sections])
        .map(fromBuilderSectionToSectionInstance),
    })),
    meta: {
      createdAtISO: project.meta?.createdAtISO ?? new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    },
  };
}

function fromSectionInstanceToBuilderSection(
  sec: SectionInstance,
  orderIndex: number
): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id: sec.id,
    type: sec.type,
    variant: sec.variant,
    enabled: sec.enabled,
    locked: sec.locked ?? false,
    orderIndex,
    settings: { ...sec.settings },
    bindings: { ...sec.bindings },
    styleOverrides: sec.overrides
      ? { ...sec.overrides } as BuilderSectionInstance['styleOverrides']
      : {},
    meta: { createdAtISO: now, updatedAtISO: now },
  };
}

function fromBuilderSectionToSectionInstance(sec: BuilderSectionInstance): SectionInstance {
  return {
    id: sec.id,
    type: sec.type,
    variant: sec.variant,
    enabled: sec.enabled,
    locked: sec.locked,
    bindings: { ...sec.bindings },
    settings: { ...sec.settings },
    overrides: { ...sec.styleOverrides } as Record<string, string | boolean | number | undefined>,
  };
}

export function mergeBuilderProjectIntoLayout(
  project: BuilderProject,
  existingLayout: LayoutConfigV1
): LayoutConfigV1 {
  const newLayout = fromBuilderProjectToExistingLayout(project);

  const existingPageMap = new Map(existingLayout.pages.map(p => [p.id, p]));

  return {
    ...newLayout,
    pages: newLayout.pages.map(page => {
      const existing = existingPageMap.get(page.id);
      if (!existing) return page;
      return {
        ...page,
        sections: page.sections.map(sec => {
          const existingSec = existing.sections.find(s => s.id === sec.id);
          if (!existingSec) return sec;
          return {
            ...sec,
            bindings: { ...existingSec.bindings, ...sec.bindings },
            settings: { ...existingSec.settings, ...sec.settings },
          };
        }),
      };
    }),
  };
}

export function createBuilderSectionFromLibrary(
  type: BuilderSectionInstance['type'],
  variant = 'default',
  orderIndex = 0
): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id: generateBuilderId(),
    type,
    variant,
    enabled: true,
    locked: false,
    orderIndex,
    settings: { showTitle: true },
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: now, updatedAtISO: now },
  };
}
