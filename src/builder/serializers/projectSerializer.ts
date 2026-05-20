import { BuilderPage, BuilderProject } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';
import { normalizePageAnchorSlug, stripRedundantPageSectionAnchor } from '../utils/sectionAnchors';

const getComparableOrderIndex = (orderIndex: unknown, fallback: number): number => {
  const numericOrderIndex = typeof orderIndex === 'number'
    ? orderIndex
    : typeof orderIndex === 'string' && orderIndex.trim()
      ? Number(orderIndex)
      : NaN;
  return Number.isFinite(numericOrderIndex) ? numericOrderIndex : fallback;
};

const sortByOrderIndex = <T extends { orderIndex?: unknown }>(items: T[]): T[] => (
  items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const aOrder = getComparableOrderIndex(a.item.orderIndex, a.originalIndex);
      const bOrder = getComparableOrderIndex(b.item.orderIndex, b.originalIndex);
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item)
);

const getBuilderString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
};

type SerializeBuilderProjectOptions = {
  touchTimestamps?: boolean;
};

const normalizeSection = (
  section: BuilderSectionInstance,
  orderIndex: number,
  now: string,
  options: Required<SerializeBuilderProjectOptions>,
): BuilderSectionInstance => ({
  ...section,
  orderIndex,
  settings: section.settings ?? {},
  bindings: section.bindings ?? {},
  styleOverrides: section.styleOverrides ?? {},
  meta: {
    createdAtISO: section.meta?.createdAtISO ?? now,
    updatedAtISO: options.touchTimestamps ? now : section.meta?.updatedAtISO ?? now,
  },
});

export const serializeBuilderProject = (
  project: BuilderProject,
  serializeOptions: SerializeBuilderProjectOptions = {},
): BuilderProject => {
  const now = new Date().toISOString();
  const options = { touchTimestamps: true, ...serializeOptions };
  let orderedPages = sortByOrderIndex([...project.pages]);
  const explicitHomeIndex = orderedPages.findIndex(isHomeLikePage);
  if (explicitHomeIndex > 0) {
    orderedPages = [orderedPages[explicitHomeIndex], ...orderedPages.filter((_, index) => index !== explicitHomeIndex)];
  }
  const homeIndex = 0;
  const usedSlugs = new Set<string>();

  return {
    ...project,
    pages: orderedPages.map((page, pageIndex) => {
      const isHome = pageIndex === homeIndex && !usedSlugs.has('home');
      const title = getBuilderString(page.title).trim() || (isHome ? 'Home' : `Page ${pageIndex + 1}`);
      const slug = isHome
        ? 'home'
        : makeUniqueSlug(
          normalizePageAnchorSlug(page.slug)
            || normalizePageAnchorSlug(page.id)
            || normalizePageAnchorSlug(title)
            || `page-${pageIndex + 1}`,
          usedSlugs
        );
      if (isHome) usedSlugs.add('home');
      const meta = {
        isHome,
        isHidden: isHome ? false : page.meta?.isHidden ?? false,
      };
      const pageContext = {
        id: page.id,
        slug,
        title,
        meta,
      };

      return {
        ...page,
        title,
        slug,
        orderIndex: pageIndex,
        sections: sortByOrderIndex([...page.sections])
          .map((section) => stripRedundantPageSectionAnchor(section, pageContext))
          .map((section, sectionIndex) => normalizeSection(section, sectionIndex, now, options)),
        meta,
      };
    }),
    meta: {
      createdAtISO: project.meta?.createdAtISO ?? now,
      updatedAtISO: options.touchTimestamps ? now : project.meta?.updatedAtISO ?? now,
    },
  };
};

const isHomeLikePage = (page: BuilderPage): boolean => (
  page.meta?.isHome === true
    || normalizePageAnchorSlug(page.slug) === 'home'
    || normalizePageAnchorSlug(page.id) === 'home'
);

const makeUniqueSlug = (baseSlug: string, usedSlugs: Set<string>): string => {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let suffix = 2;
  while (usedSlugs.has(`${baseSlug}-${suffix}`)) suffix += 1;
  const slug = `${baseSlug}-${suffix}`;
  usedSlugs.add(slug);
  return slug;
};
