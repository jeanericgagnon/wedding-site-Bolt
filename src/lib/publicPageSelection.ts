import type { BuilderPage } from '../types/builder/project';

const normalizePublicPageSlug = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';
const hasRenderableSections = (page: BuilderPage) => page.sections.some((section) => section.enabled);

export const getVisiblePublicBuilderPages = (pages: BuilderPage[]): BuilderPage[] => (
  [...pages]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((page) => page.meta?.isHidden !== true)
);

export const getNavigablePublicBuilderPages = (pages: BuilderPage[]): BuilderPage[] => (
  getVisiblePublicBuilderPages(pages).filter(hasRenderableSections)
);

export const getFirstRenderablePublicBuilderPage = (pages: BuilderPage[]): BuilderPage | null => (
  pages.find(hasRenderableSections) ?? null
);

export const getPublicBuilderActivePage = (
  pages: BuilderPage[],
  requestedSlug?: string | null,
): BuilderPage | null => {
  if (pages.length === 0) return null;

  const normalizedRequestedSlug = normalizePublicPageSlug(requestedSlug);
  if (normalizedRequestedSlug) {
    const explicit = pages.find((page) => normalizePublicPageSlug(page.slug) === normalizedRequestedSlug);
    if (explicit && hasRenderableSections(explicit)) return explicit;
  }

  const homePage = pages.find((page) => page.meta?.isHome) ?? null;
  if (homePage && hasRenderableSections(homePage)) return homePage;

  return getFirstRenderablePublicBuilderPage(pages) ?? homePage ?? pages[0] ?? null;
};
