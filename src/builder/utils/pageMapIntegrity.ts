import { BuilderPage } from '../../types/builder/project';

export type BuilderPageIntegrityFlagKind = 'hidden-home' | 'duplicate-slug' | 'hidden-empty';

export interface BuilderPageIntegrityFlag {
  kind: BuilderPageIntegrityFlagKind;
  label: string;
  detail: string;
}

export interface BuilderPageIntegritySummary {
  totalFlags: number;
  duplicateSlugCount: number;
  hiddenHomePageId: string | null;
  flagsByPageId: Map<string, BuilderPageIntegrityFlag[]>;
}

function trimTrailingHyphens(value: string): string {
  return value.replace(/-+$/g, '');
}

export function sanitizePageTitle(input: string, fallback = 'Page'): string {
  const trimmed = input.trim();
  return trimmed || fallback;
}

export function sanitizePageSlug(input: string, fallback = 'page'): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

  if (normalized) return normalized;

  const fallbackNormalized = fallback
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

  return fallbackNormalized || 'page';
}

function withUniqueSuffix(baseSlug: string, suffix: number): string {
  const suffixText = `-${suffix}`;
  const stem = trimTrailingHyphens(baseSlug.slice(0, Math.max(1, 64 - suffixText.length)));
  return `${stem || 'page'}${suffixText}`;
}

export function ensureUniquePageSlug(
  slug: string,
  pages: BuilderPage[],
  excludePageId?: string,
): string {
  const baseSlug = sanitizePageSlug(slug);
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
}

export function normalizeBuilderPages(projectPages: BuilderPage[]): BuilderPage[] {
  const explicitHomeIndex = projectPages.findIndex((page) => page.meta.isHome);
  const homeIndex = explicitHomeIndex >= 0 ? explicitHomeIndex : 0;
  const normalizedPages: BuilderPage[] = [];

  for (const [index, page] of projectPages.entries()) {
    const isHome = index === homeIndex;
    const title = sanitizePageTitle(page.title, index === 0 ? 'Home' : `Page ${index + 1}`);
    const proposedSlug = sanitizePageSlug(page.slug || title, title);
    const slug = ensureUniquePageSlug(proposedSlug, normalizedPages);

    normalizedPages.push({
      ...page,
      title,
      slug,
      orderIndex: index,
      meta: {
        ...page.meta,
        isHome,
        isHidden: isHome ? false : page.meta.isHidden,
      },
    });
  }

  return normalizedPages;
}

export function getBuilderPageIntegritySummary(projectPages: BuilderPage[]): BuilderPageIntegritySummary {
  const flagsByPageId = new Map<string, BuilderPageIntegrityFlag[]>();
  const slugOwners = new Map<string, BuilderPage[]>();
  let hiddenHomePageId: string | null = null;
  let totalFlags = 0;
  let duplicateSlugCount = 0;

  const addFlag = (pageId: string, flag: BuilderPageIntegrityFlag) => {
    const existing = flagsByPageId.get(pageId) ?? [];
    existing.push(flag);
    flagsByPageId.set(pageId, existing);
    totalFlags += 1;
  };

  for (const page of projectPages) {
    const slugOwnersForPage = slugOwners.get(page.slug) ?? [];
    slugOwnersForPage.push(page);
    slugOwners.set(page.slug, slugOwnersForPage);

    if (page.meta.isHome && page.meta.isHidden) {
      hiddenHomePageId = page.id;
      addFlag(page.id, {
        kind: 'hidden-home',
        label: 'Home hidden from nav',
        detail: 'The home page should stay visible so the guest journey always has a clear front door.',
      });
    }

    if (page.meta.isHidden && page.sections.length === 0) {
      addFlag(page.id, {
        kind: 'hidden-empty',
        label: 'Hidden empty draft',
        detail: 'This page is offstage and still empty, which usually means the map is carrying draft clutter instead of a real guest need.',
      });
    }
  }

  for (const [slug, pages] of slugOwners.entries()) {
    if (pages.length < 2) continue;
    duplicateSlugCount += 1;
    for (const page of pages) {
      addFlag(page.id, {
        kind: 'duplicate-slug',
        label: 'Slug collision',
        detail: `Another page is also using /${slug}, so the guest-facing path is no longer trustworthy.`,
      });
    }
  }

  return {
    totalFlags,
    duplicateSlugCount,
    hiddenHomePageId,
    flagsByPageId,
  };
}
