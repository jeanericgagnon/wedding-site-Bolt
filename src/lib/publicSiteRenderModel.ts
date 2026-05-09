import type { BuilderPage } from '../types/builder/project.ts';
import type { BuilderSectionInstance } from '../types/builder/section.ts';
import type { LayoutConfigV1, PageConfig, SectionInstance } from '../types/layoutConfig.ts';
import type { WeddingDataV1 } from '../types/weddingData.ts';
import { normalizeWeddingData } from '../types/weddingData.ts';
import { buildCoupleDisplayName } from './coupleDisplayName.ts';
import { safeJsonParse } from './jsonUtils.ts';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl.ts';
import { getIsPublishedFromSiteRow } from './publicSiteProject.ts';

export interface PublicSiteThemeModel {
  preset: string | null;
  tokens: Record<string, unknown> | null;
}

export interface PublicSiteRenderModel {
  pages: BuilderPage[];
  wedding: WeddingDataV1 | null;
  theme: PublicSiteThemeModel;
}

export interface PublicSiteRenderSite {
  id: string;
  site_slug: string | null;
  site_url: string | null;
  is_published: boolean;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  wedding_location: string | null;
  template_id: string | null;
  default_language: string | null;
  allow_search_indexing: boolean;
  render_model: PublicSiteRenderModel;
}

const PUBLIC_SENSITIVE_KEY_PATTERN =
  /(token|password|secret|api[_-]?key|service[_-]?role|private|internal|draft|billing|notification|owner|invite[_-]?hash|password[_-]?hash|provider|moderation|debug|queue)/i;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  return safeJsonParse<Record<string, unknown> | null>(value, null);
}

function sanitizeDeepPublicValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeepPublicValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) {
      if (PUBLIC_SENSITIVE_KEY_PATTERN.test(key)) continue;
      out[key] = sanitizeDeepPublicValue(child);
    }
    return out as T;
  }

  return value;
}

function sanitizeBuilderSection(section: BuilderSectionInstance): BuilderSectionInstance {
  return sanitizeDeepPublicValue({
    id: section.id,
    type: section.type,
    displayName: asString(section.displayName),
    variant: section.variant,
    enabled: section.enabled === true,
    locked: section.locked === true,
    orderIndex: typeof section.orderIndex === 'number' ? section.orderIndex : 0,
    settings: section.settings ?? {},
    bindings: section.bindings ?? {},
    styleOverrides: section.styleOverrides ?? {},
    meta: {
      createdAtISO: asString(section.meta?.createdAtISO) ?? new Date().toISOString(),
      updatedAtISO: asString(section.meta?.updatedAtISO) ?? new Date().toISOString(),
    },
  } satisfies BuilderSectionInstance);
}

function sanitizeBuilderPage(page: BuilderPage): BuilderPage {
  return sanitizeDeepPublicValue({
    id: page.id,
    title: page.title,
    slug: page.slug,
    orderIndex: typeof page.orderIndex === 'number' ? page.orderIndex : 0,
    sections: Array.isArray(page.sections) ? page.sections.map(sanitizeBuilderSection) : [],
    meta: {
      isHome: page.meta?.isHome === true,
      isHidden: page.meta?.isHidden === true,
    },
  } satisfies BuilderPage);
}

function toLegacyBuilderSection(section: SectionInstance, index: number): BuilderSectionInstance {
  return sanitizeDeepPublicValue({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled === true,
    locked: section.locked === true,
    orderIndex: index,
    settings: section.settings ?? {},
    bindings: section.bindings ?? {},
    styleOverrides: section.overrides ?? {},
    meta: {
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    },
  } satisfies BuilderSectionInstance);
}

function toLegacyBuilderPage(page: PageConfig, index: number): BuilderPage {
  return sanitizeDeepPublicValue({
    id: page.id,
    title: page.title,
    slug: page.id === 'home'
      ? 'home'
      : String(page.title || page.id || `page-${index}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    orderIndex: index,
    sections: Array.isArray(page.sections) ? page.sections.map(toLegacyBuilderSection) : [],
    meta: {
      isHome: page.id === 'home' || index === 0,
      isHidden: false,
    },
  } satisfies BuilderPage);
}

function sanitizeWeddingData(data: WeddingDataV1 | null): WeddingDataV1 | null {
  if (!data) return null;

  const normalized = normalizeWeddingData(data);
  const partner1Name = asString(normalized.couple?.partner1Name) ?? '';
  const partner2Name = asString(normalized.couple?.partner2Name) ?? '';
  const displayName = asString(normalized.couple?.displayName) || buildCoupleDisplayName(partner1Name, partner2Name);

  return sanitizeDeepPublicValue({
    version: normalized.version ?? '1',
    couple: {
      ...normalized.couple,
      partner1Name,
      partner2Name,
      displayName,
    },
    event: normalized.event ?? {},
    venues: Array.isArray(normalized.venues) ? normalized.venues.map((venue) => ({
      id: venue.id,
      ...(typeof venue.orderIndex === 'number' ? { orderIndex: venue.orderIndex } : {}),
      ...(asString(venue.name) ? { name: venue.name } : {}),
      ...(asString(venue.address) ? { address: venue.address } : {}),
      ...(asString(venue.placeId) ? { placeId: venue.placeId } : {}),
      ...(typeof venue.lat === 'number' ? { lat: venue.lat } : {}),
      ...(typeof venue.lng === 'number' ? { lng: venue.lng } : {}),
      ...(asString(venue.notes) ? { notes: venue.notes } : {}),
    })) : [],
    schedule: Array.isArray(normalized.schedule) ? normalized.schedule.map((item) => ({
      id: item.id,
      label: item.label,
      ...(asString(item.startTimeISO) ? { startTimeISO: item.startTimeISO } : {}),
      ...(asString(item.endTimeISO) ? { endTimeISO: item.endTimeISO } : {}),
      ...(asString(item.venueId) ? { venueId: item.venueId } : {}),
      ...(asString(item.notes) ? { notes: item.notes } : {}),
    })) : [],
    rsvp: normalized.rsvp ?? { enabled: true },
    travel: normalized.travel ?? {},
    registry: normalized.registry ?? { links: [] },
    faq: Array.isArray(normalized.faq) ? normalized.faq.map((item) => ({
      id: item.id,
      q: item.q,
      a: item.a,
    })) : [],
    theme: normalized.theme ?? {},
    media: normalized.media ?? { gallery: [] },
    ...(normalized.weddingParty ? { weddingParty: normalized.weddingParty } : {}),
    meta: {
      createdAtISO: asString(normalized.meta?.createdAtISO) ?? new Date().toISOString(),
      updatedAtISO: asString(normalized.meta?.updatedAtISO) ?? new Date().toISOString(),
      ...(Array.isArray(normalized.meta?.useCasePacks) ? { useCasePacks: [...normalized.meta.useCasePacks] } : {}),
    },
  } satisfies WeddingDataV1);
}

function getPublishedProjectPages(row: Record<string, unknown>, isPublished: boolean): BuilderPage[] {
  const preferredProject = safeJsonParse<Record<string, unknown> | null>(
    isPublished ? row.published_json : row.site_json,
    null,
  );
  const pages = Array.isArray(preferredProject?.pages) ? preferredProject.pages : [];
  if (pages.length === 0) return [];
  return pages.map((page) => sanitizeBuilderPage(page as BuilderPage));
}

function getLegacyLayoutPages(row: Record<string, unknown>): BuilderPage[] {
  const layoutConfig = rewriteSignedMediaUrlsToPublicDeep(
    safeJsonParse<LayoutConfigV1 | null>(row.layout_config, null),
  );
  if (!layoutConfig || !Array.isArray(layoutConfig.pages)) return [];
  return layoutConfig.pages.map(toLegacyBuilderPage);
}

function getPublicWeddingRenderData(row: Record<string, unknown>, isPublished: boolean): WeddingDataV1 | null {
  const publishedSource = asRecord(row.published_json);
  const draftSource = asRecord(row.site_json);

  const candidates = isPublished
    ? [
        row.wedding_data,
        publishedSource?.weddingDataSnapshot,
        publishedSource?.weddingData,
      ]
    : [
        draftSource?.weddingDataSnapshot,
        row.wedding_data,
        draftSource?.weddingData,
      ];

  for (const candidate of candidates) {
    const parsed = safeJsonParse<WeddingDataV1 | null>(candidate, null);
    if (parsed) {
      return sanitizeWeddingData(rewriteSignedMediaUrlsToPublicDeep(parsed));
    }
  }

  return null;
}

function getPublicThemeModel(
  row: Record<string, unknown>,
  pagesExist: boolean,
  wedding: WeddingDataV1 | null,
  isPublished: boolean,
): PublicSiteThemeModel {
  const preferredProject = safeJsonParse<Record<string, unknown> | null>(
    isPublished ? row.published_json : row.site_json,
    null,
  );

  const preset = pagesExist
    ? (asString(preferredProject?.themeId) ?? asString(wedding?.theme?.preset) ?? null)
    : (asString(wedding?.theme?.preset) ?? null);
  const rawTokens = preferredProject?.themeTokens;

  return {
    preset,
    tokens: rawTokens && typeof rawTokens === 'object' && !Array.isArray(rawTokens)
      ? sanitizeDeepPublicValue(rawTokens as Record<string, unknown>)
      : null,
  };
}

export function applyPublicSiteTranslation(
  row: Record<string, unknown>,
  translation: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!translation) return row;
  return {
    ...row,
    site_json: translation.translated_site_json ?? row.site_json,
    published_json: translation.translated_published_json ?? row.published_json,
    wedding_data: translation.translated_wedding_data ?? row.wedding_data,
    layout_config: translation.translated_layout_config ?? row.layout_config,
  };
}

export function buildPublicSiteRenderSite(row: Record<string, unknown>): PublicSiteRenderSite {
  const isPublished = getIsPublishedFromSiteRow(row);
  const builderPages = getPublishedProjectPages(row, isPublished);
  const pages = builderPages.length > 0 ? builderPages : getLegacyLayoutPages(row);
  const wedding = getPublicWeddingRenderData(row, isPublished);
  const theme = getPublicThemeModel(row, pages.length > 0, wedding, isPublished);

  return {
    id: String(row.id),
    site_slug: asString(row.site_slug) ?? null,
    site_url: asString(row.site_url) ?? null,
    is_published: isPublished,
    couple_name_1: asString(row.couple_name_1) ?? null,
    couple_name_2: asString(row.couple_name_2) ?? null,
    wedding_date: asString(row.wedding_date) ?? null,
    venue_name: asString(row.venue_name) ?? null,
    wedding_location: asString(row.wedding_location) ?? null,
    template_id: asString(row.template_id) ?? null,
    default_language: asString(row.default_language) ?? null,
    allow_search_indexing: row.hide_from_search !== true,
    render_model: {
      pages,
      wedding,
      theme,
    },
  };
}
