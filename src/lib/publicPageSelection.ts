import type { BuilderPage } from '../types/builder/project';

const normalizePublicPageSlug = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export const getVisiblePublicBuilderPages = (pages: BuilderPage[]): BuilderPage[] => (
  [...pages]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((page) => page.meta?.isHidden !== true)
);

export const getPublicBuilderActivePage = (
  pages: BuilderPage[],
  requestedSlug?: string | null,
): BuilderPage | null => {
  if (pages.length === 0) return null;

  const normalizedRequestedSlug = normalizePublicPageSlug(requestedSlug);
  if (normalizedRequestedSlug) {
    const explicit = pages.find((page) => normalizePublicPageSlug(page.slug) === normalizedRequestedSlug);
    if (explicit) return explicit;
  }

  return pages.find((page) => page.meta?.isHome) ?? pages[0] ?? null;
};
