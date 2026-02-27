import { BuilderProject } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';

const normalizeSection = (section: BuilderSectionInstance, orderIndex: number): BuilderSectionInstance => ({
  ...section,
  orderIndex,
  settings: section.settings ?? {},
  bindings: section.bindings ?? {},
  styleOverrides: section.styleOverrides ?? {},
  meta: {
    createdAtISO: section.meta?.createdAtISO ?? new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
});

export const serializeBuilderProject = (project: BuilderProject): BuilderProject => {
  const now = new Date().toISOString();

  return {
    ...project,
    pages: project.pages.map((page, pageIndex) => ({
      ...page,
      title: page.title?.trim() || (pageIndex === 0 ? 'Home' : `Page ${pageIndex + 1}`),
      slug: page.slug?.trim() || (pageIndex === 0 ? 'home' : `page-${pageIndex + 1}`),
      orderIndex: pageIndex,
      sections: [...page.sections]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section, sectionIndex) => normalizeSection(section, sectionIndex)),
      meta: {
        isHome: pageIndex === 0 || page.meta?.isHome === true,
        isHidden: page.meta?.isHidden ?? false,
      },
    })),
    meta: {
      createdAtISO: project.meta?.createdAtISO ?? now,
      updatedAtISO: now,
    },
  };
};
