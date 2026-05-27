import type { BuilderV2Document, BuilderV2Page, BuilderV2Section } from '../builder-v2/contracts';
import { getBuilderV2Pages } from '../builder-v2/contracts';

export type LabSection = {
  id: string;
  type: string;
  title: string;
  variant: string;
  enabled: boolean;
  subtitle?: string;
  density?: 'compact' | 'comfortable';
};

export type LabPage = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  hidden: boolean;
  sections: LabSection[];
};

const trimTrailingHyphens = (value: string) => value.replace(/-+$/g, '');

export const sanitizeBuilderV2PageTitle = (input: string, fallback = 'Page') => {
  const trimmed = input.trim();
  return trimmed || fallback;
};

export const sanitizeBuilderV2PageSlug = (input: string, fallback = 'page') => {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

  if (normalized) return normalized;

  return fallback
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'page';
};

const withUniqueSuffix = (baseSlug: string, suffix: number) => {
  const suffixText = `-${suffix}`;
  const stem = trimTrailingHyphens(baseSlug.slice(0, Math.max(1, 64 - suffixText.length)));
  return `${stem || 'page'}${suffixText}`;
};

const claimUniqueSlug = (slug: string, usedSlugs: Set<string>) => {
  const baseSlug = sanitizeBuilderV2PageSlug(slug);
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let suffix = 2;
  let candidate = withUniqueSuffix(baseSlug, suffix);
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = withUniqueSuffix(baseSlug, suffix);
  }
  usedSlugs.add(candidate);
  return candidate;
};

export const ensureUniqueBuilderV2PageSlug = (
  slug: string,
  pages: Array<Pick<LabPage, 'id' | 'slug'>>,
  excludePageId?: string,
) => {
  const baseSlug = sanitizeBuilderV2PageSlug(slug);
  const usedSlugs = new Set(
    pages
      .filter((page) => page.id !== excludePageId)
      .map((page) => page.slug.toLowerCase()),
  );

  if (!usedSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  let candidate = withUniqueSuffix(baseSlug, suffix);
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = withUniqueSuffix(baseSlug, suffix);
  }

  return candidate;
};

export const normalizeBuilderV2Pages = (pages: LabPage[]) => {
  const explicitHomeIndex = pages.findIndex((page) => page.isHome);
  const homeIndex = explicitHomeIndex >= 0 ? explicitHomeIndex : 0;
  const usedSlugs = new Set<string>();
  const normalizedPages: LabPage[] = [];
  const homePage = pages[homeIndex];
  const homeTitle = sanitizeBuilderV2PageTitle(homePage?.title ?? '', 'Home');
  const reservedHomeSlug = claimUniqueSlug(homePage?.slug || homeTitle || 'home', usedSlugs);

  for (const [index, page] of pages.entries()) {
    const isHome = index === homeIndex;
    const title = sanitizeBuilderV2PageTitle(page.title, isHome ? 'Home' : `Page ${index + 1}`);
    const slug = isHome
      ? reservedHomeSlug
      : claimUniqueSlug(page.slug || title, usedSlugs);

    normalizedPages.push({
      ...page,
      title,
      slug,
      isHome,
      hidden: isHome ? false : page.hidden,
    });
  }

  return normalizedPages;
};

export const createInitialBuilderV2Pages = (sections: LabSection[]): LabPage[] => ([
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    isHome: true,
    hidden: false,
    sections,
  },
]);

const toLabSection = (section: BuilderV2Section): LabSection => ({
  id: section.id,
  type: section.type,
  title: section.title || section.type,
  subtitle: section.subtitle || '',
  variant: section.variant || 'default',
  enabled: section.enabled !== false,
  density: 'comfortable',
});

export const getLabPagesFromBuilderV2Document = (document: BuilderV2Document): LabPage[] => normalizeBuilderV2Pages(
  getBuilderV2Pages(document).map((page, index) => ({
    id: page.id || `page-${index + 1}`,
    title: page.title || (page.isHome ? 'Home' : `Page ${index + 1}`),
    slug: page.slug || (page.isHome ? 'home' : `page-${index + 1}`),
    isHome: page.isHome,
    hidden: page.hidden === true,
    sections: page.sections.map(toLabSection),
  })),
);

export const buildBuilderV2DocumentPages = (
  pages: LabPage[],
  buildSections: (page: LabPage) => BuilderV2Section[],
): BuilderV2Page[] => normalizeBuilderV2Pages(pages).map((page) => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  isHome: page.isHome,
  hidden: page.hidden,
  sections: buildSections(page),
}));
