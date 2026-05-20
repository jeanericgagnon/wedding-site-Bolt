import type { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';

const DEFAULT_SECTION_ANCHOR_IDS: Partial<Record<BuilderSectionType, string>> = {
  schedule: 'schedule',
  travel: 'travel',
  accommodations: 'accommodations',
  directions: 'directions',
  rsvp: 'rsvp',
  registry: 'registry',
  faq: 'faq',
  contact: 'contact',
  menu: 'menu',
  music: 'music',
  'dress-code': 'attire',
};

export function getDefaultSectionAnchorId(type: BuilderSectionType): string | null {
  return DEFAULT_SECTION_ANCHOR_IDS[type] ?? null;
}

function decodeSlugInput(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeSectionAnchorId(value: unknown): string {
  const rawValue = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string'
      ? (value as { value: string }).value
      : '';

  return decodeSlugInput(rawValue)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function normalizePageAnchorSlug(value: unknown): string {
  const rawValue = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string'
      ? (value as { value: string }).value
      : '';

  return decodeSlugInput(rawValue)
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

export function isSectionAnchorRedundantWithPage(
  anchorValue: unknown,
  page: { id?: string | null; slug?: unknown; title?: unknown; meta?: { isHome?: boolean | null } | null },
): boolean {
  const anchorId = normalizeSectionAnchorId(anchorValue);
  if (!anchorId) return false;

  const anchorPageSlug = normalizePageAnchorSlug(anchorId);
  const pageSlug = normalizePageAnchorSlug(page.slug ?? '') || normalizePageAnchorSlug(page.id ?? '');
  if (page.meta?.isHome === true || pageSlug === 'home') return false;

  const titleSlug = normalizePageAnchorSlug(page.title ?? '');
  return anchorId === pageSlug || anchorPageSlug === pageSlug || anchorId === titleSlug || anchorPageSlug === titleSlug;
}

export function stripRedundantPageSectionAnchor<TSection extends Pick<BuilderSectionInstance, 'settings'>>(
  section: TSection,
  page: { id?: string | null; slug?: unknown; title?: unknown; meta?: { isHome?: boolean | null } | null },
): TSection {
  if (!isSectionAnchorRedundantWithPage(section.settings.anchorId, page)) return section;

  const { anchorId: _anchorId, ...settings } = section.settings;
  return {
    ...section,
    settings,
  } as TSection;
}

function hasAnchorId(section: Pick<BuilderSectionInstance, 'settings'>): boolean {
  return normalizeSectionAnchorId(section.settings?.anchorId).length > 0;
}

function hasExplicitAnchorSetting(section: Pick<BuilderSectionInstance, 'settings'>): boolean {
  return Object.prototype.hasOwnProperty.call(section.settings ?? {}, 'anchorId');
}

function makeUniqueAnchorId(anchorId: string, usedAnchorIds: Set<string>): string {
  if (!usedAnchorIds.has(anchorId)) return anchorId;
  let index = 2;
  while (usedAnchorIds.has(`${anchorId}-${index}`)) index += 1;
  return `${anchorId}-${index}`;
}

function collectUsedAnchorIds(sections: Array<Pick<BuilderSectionInstance, 'settings'>>): Set<string> {
  return new Set(
    sections
      .map((section) => normalizeSectionAnchorId(section.settings?.anchorId))
      .filter(Boolean)
  );
}

export function assignDefaultSectionAnchor(
  section: BuilderSectionInstance,
  siblingSections: BuilderSectionInstance[],
): BuilderSectionInstance {
  if (hasExplicitAnchorSetting(section)) {
    if (!hasAnchorId(section)) return section;
    return assignUniqueSectionAnchor(section, siblingSections);
  }

  const defaultAnchorId = getDefaultSectionAnchorId(section.type);
  if (!defaultAnchorId) return section;

  return {
    ...section,
    settings: {
      ...section.settings,
      anchorId: makeUniqueAnchorId(defaultAnchorId, collectUsedAnchorIds(siblingSections)),
    },
  };
}

export function assignUniqueSectionAnchor(
  section: BuilderSectionInstance,
  siblingSections: BuilderSectionInstance[],
): BuilderSectionInstance {
  const normalizedExistingAnchorId = normalizeSectionAnchorId(section.settings.anchorId);
  if (hasExplicitAnchorSetting(section) && !normalizedExistingAnchorId) return section;
  const baseAnchorId = normalizedExistingAnchorId || getDefaultSectionAnchorId(section.type);
  if (!baseAnchorId) return section;

  const anchorId = makeUniqueAnchorId(baseAnchorId, collectUsedAnchorIds(siblingSections));
  if (anchorId === normalizedExistingAnchorId) return section;

  return {
    ...section,
    settings: {
      ...section.settings,
      anchorId,
    },
  };
}

export function assignDefaultSectionAnchors(sections: BuilderSectionInstance[]): BuilderSectionInstance[] {
  const usedAnchorIds = new Set<string>();

  return sections.map((section) => {
    if (hasExplicitAnchorSetting(section)) {
      const normalizedAnchorId = normalizeSectionAnchorId(section.settings.anchorId);
      if (!normalizedAnchorId) return section;
      const anchorId = makeUniqueAnchorId(normalizedAnchorId, usedAnchorIds);
      usedAnchorIds.add(anchorId);

      if (anchorId === section.settings.anchorId) return section;
      return {
        ...section,
        settings: {
          ...section.settings,
          anchorId,
        },
      };
    }

    const defaultAnchorId = getDefaultSectionAnchorId(section.type);
    if (!defaultAnchorId) return section;
    const anchorId = makeUniqueAnchorId(defaultAnchorId, usedAnchorIds);
    usedAnchorIds.add(anchorId);

    return {
      ...section,
      settings: {
        ...section.settings,
        anchorId,
      },
    };
  });
}
