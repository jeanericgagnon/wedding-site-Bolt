import { LayoutConfigV1, SectionInstance } from '../../types/layoutConfig';
import { BuilderProject, BuilderPage, createEmptyBuilderProject, generateBuilderId } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';

export function fromExistingLayoutToBuilderProject(
  weddingId: string,
  layout: LayoutConfigV1
): BuilderProject {
  const project = createEmptyBuilderProject(weddingId, layout.templateId);

  project.pages = layout.pages.map((page, pageIndex) => {
    const builderPage: BuilderPage = {
      id: page.id,
      title: page.title,
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
    pages: project.pages.map(page => ({
      id: page.id,
      title: page.title,
      sections: page.sections
        .sort((a, b) => a.orderIndex - b.orderIndex)
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
      ? {
          backgroundColor: sec.overrides.backgroundColor as string | undefined,
          textColor: sec.overrides.textColor as string | undefined,
        }
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
