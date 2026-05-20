import { normalizePageAnchorSlug, normalizeSectionAnchorId } from '../builder/utils/sectionAnchors';

type SelectablePublicPage = {
  id?: string | null;
  slug?: string | null;
  title?: unknown;
  orderIndex?: number | null;
  meta?: {
    isHome?: boolean | null;
    isHidden?: boolean | null;
  } | null;
};

export type PublicSitePageNavItem = {
  id?: string | null;
  slug: string;
  title: string;
  orderIndex: number;
  isHome: boolean;
};

export type PublicSiteSectionAnchorNavItem = {
  id: string;
  anchorId: string;
  title: string;
  orderIndex: number;
};

export function normalizeSiteViewPageSlug(value: string | null | undefined): string {
  return normalizePageAnchorSlug(value ?? '');
}

export function normalizePublicSectionAnchorId(value: unknown): string {
  return normalizeSectionAnchorId(value);
}

function titleizeSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPublicPageTitle(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value.trim();
  }
  return '';
}

function makeUniqueNavPageSlug(baseSlug: string, usedSlugs: Set<string>, fallbackIndex: number): string {
  const fallback = normalizeSiteViewPageSlug(baseSlug) || `page-${fallbackIndex}`;
  if (!usedSlugs.has(fallback)) {
    usedSlugs.add(fallback);
    return fallback;
  }

  let suffix = 2;
  while (usedSlugs.has(`${fallback}-${suffix}`)) suffix += 1;
  const slug = `${fallback}-${suffix}`;
  usedSlugs.add(slug);
  return slug;
}

function getComparableNavOrderIndex(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isHomeLikeNavPage(page: SelectablePublicPage): boolean {
  return page.meta?.isHome === true
    || normalizeSiteViewPageSlug(page.id) === 'home'
    || normalizeSiteViewPageSlug(page.slug) === 'home';
}

export function selectPublicSitePage<TPage extends SelectablePublicPage>(
  pages: readonly TPage[],
  requestedPageSlug?: string | null,
): TPage | null {
  const normalizedRequestedSlug = normalizeSiteViewPageSlug(requestedPageSlug);

  if (normalizedRequestedSlug) {
    return pages.find((page) => (
      normalizeSiteViewPageSlug(page.slug) === normalizedRequestedSlug
      || normalizeSiteViewPageSlug(page.id) === normalizedRequestedSlug
    )) ?? null;
  }

  const visiblePages = pages.filter((page) => page.meta?.isHidden !== true);

  return visiblePages.find((page) => (
    isHomeLikeNavPage(page)
  )) ?? visiblePages[0] ?? null;
}

export function getPublicSitePageNavItems<TPage extends SelectablePublicPage>(
  pages: readonly TPage[],
): PublicSitePageNavItem[] {
  const usedSlugs = new Set<string>();
  const visiblePages = pages
    .filter((page) => page.meta?.isHidden !== true)
    .map((page, index) => ({
      page,
      originalIndex: index,
      orderIndex: getComparableNavOrderIndex(page.orderIndex, index),
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex || a.originalIndex - b.originalIndex);
  const homeIndex = visiblePages.findIndex(({ page }) => isHomeLikeNavPage(page));
  const orderedPages = homeIndex > 0
    ? [visiblePages[homeIndex], ...visiblePages.filter((_, index) => index !== homeIndex)]
    : visiblePages;

  return orderedPages
    .map(({ page }, index) => {
      const sourceSlug = normalizeSiteViewPageSlug(page.slug) || normalizeSiteViewPageSlug(page.id) || `page-${index + 1}`;
      const wantsHome = isHomeLikeNavPage(page);
      const isHome = wantsHome && !usedSlugs.has('home');
      const normalizedSlug = isHome
        ? makeUniqueNavPageSlug('home', usedSlugs, index + 1)
        : makeUniqueNavPageSlug(sourceSlug, usedSlugs, index + 1);
      return {
        id: page.id,
        slug: normalizedSlug,
        title: getPublicPageTitle(page.title) || (isHome ? 'Home' : titleizeSlug(normalizedSlug)),
        orderIndex: index,
        isHome,
      };
    });
}

export function buildPublicSitePageHref(siteSlug: string, page: Pick<PublicSitePageNavItem, 'slug' | 'isHome'>): string {
  const base = `/site/${encodeURIComponent(siteSlug.trim())}`;
  const normalizedSlug = normalizeSiteViewPageSlug(page.slug);
  return page.isHome || normalizedSlug === 'home' ? base : `${base}/${encodeURIComponent(normalizedSlug || 'page')}`;
}

export function buildPublicSiteSectionAnchorHref(siteSlug: string, anchor: Pick<PublicSiteSectionAnchorNavItem, 'anchorId'>): string {
  const base = `/site/${encodeURIComponent(siteSlug.trim())}`;
  const anchorId = normalizePublicSectionAnchorId(anchor.anchorId);
  if (!anchorId) return base;
  return `${base}#${encodeURIComponent(anchorId)}`;
}
