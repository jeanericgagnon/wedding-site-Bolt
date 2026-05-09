import type { BuilderProject, BuilderPage } from '../types/builder/project.ts';
import type { BuilderSectionInstance } from '../types/builder/section.ts';
import type { LayoutConfigV1, PageConfig, SectionInstance } from '../types/layoutConfig.ts';
import type { WeddingDataV1 } from '../types/weddingData.ts';
import { normalizeWeddingData } from '../types/weddingData.ts';
import { buildCoupleDisplayName } from './coupleDisplayName.ts';
import { safeJsonParse } from './jsonUtils.ts';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl.ts';
import { getIsPublishedFromSiteRow, getPublicBuilderProject, getPublicWeddingData } from './publicSiteProject.ts';

export interface PublicSiteRenderModel {
  builderProject: BuilderProject | null;
  weddingData: WeddingDataV1 | null;
  layoutConfig: LayoutConfigV1 | null;
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
  /(token|password|secret|api[_-]?key|service[_-]?role|private|internal|draft|billing|notification|owner|invite[_-]?hash|password[_-]?hash)/i;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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

function sanitizeBuilderSectionInstance(section: BuilderSectionInstance): BuilderSectionInstance {
  return {
    id: section.id,
    type: section.type,
    displayName: asString(section.displayName),
    variant: section.variant,
    enabled: section.enabled === true,
    locked: section.locked === true,
    orderIndex: typeof section.orderIndex === 'number' ? section.orderIndex : 0,
    settings: sanitizeDeepPublicValue(section.settings ?? {}) as Record<string, unknown>,
    bindings: sanitizeDeepPublicValue(section.bindings ?? {}) as BuilderSectionInstance['bindings'],
    styleOverrides: sanitizeDeepPublicValue(section.styleOverrides ?? {}) as BuilderSectionInstance['styleOverrides'],
    meta: {
      createdAtISO: asString(section.meta?.createdAtISO) ?? new Date().toISOString(),
      updatedAtISO: asString(section.meta?.updatedAtISO) ?? new Date().toISOString(),
    },
  };
}

function sanitizeBuilderPage(page: BuilderPage): BuilderPage {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    orderIndex: typeof page.orderIndex === 'number' ? page.orderIndex : 0,
    sections: Array.isArray(page.sections) ? page.sections.map(sanitizeBuilderSectionInstance) : [],
    meta: {
      isHome: page.meta?.isHome === true,
      isHidden: page.meta?.isHidden === true,
    },
  };
}

function sanitizeBuilderProject(project: BuilderProject | null): BuilderProject | null {
  if (!project) return null;
  return sanitizeDeepPublicValue({
    id: project.id,
    weddingId: project.weddingId,
    templateId: project.templateId,
    themeId: project.themeId,
    ...(project.themeTokens ? { themeTokens: project.themeTokens } : {}),
    ...(project.globalAnimationPreset ? { globalAnimationPreset: project.globalAnimationPreset } : {}),
    pages: Array.isArray(project.pages) ? project.pages.map(sanitizeBuilderPage) : [],
    draftVersion: typeof project.draftVersion === 'number' ? project.draftVersion : 1,
    publishedVersion: typeof project.publishedVersion === 'number' ? project.publishedVersion : null,
    publishStatus: project.publishStatus,
    lastPublishedAt: project.lastPublishedAt ?? null,
    meta: {
      createdAtISO: asString(project.meta?.createdAtISO) ?? new Date().toISOString(),
      updatedAtISO: asString(project.meta?.updatedAtISO) ?? new Date().toISOString(),
    },
  } satisfies BuilderProject);
}

function sanitizeLegacySection(section: SectionInstance): SectionInstance {
  return sanitizeDeepPublicValue({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled === true,
    ...(section.bindings ? { bindings: section.bindings } : {}),
    settings: section.settings ?? {},
    ...(section.overrides ? { overrides: section.overrides } : {}),
    ...(typeof section.locked === 'boolean' ? { locked: section.locked } : {}),
  } satisfies SectionInstance);
}

function sanitizeLayoutPage(page: PageConfig): PageConfig {
  return {
    id: page.id,
    title: page.title,
    sections: Array.isArray(page.sections) ? page.sections.map(sanitizeLegacySection) : [],
  };
}

function sanitizeLayoutConfig(layoutConfig: LayoutConfigV1 | null): LayoutConfigV1 | null {
  if (!layoutConfig) return null;
  return sanitizeDeepPublicValue({
    version: layoutConfig.version,
    templateId: layoutConfig.templateId,
    pages: Array.isArray(layoutConfig.pages) ? layoutConfig.pages.map(sanitizeLayoutPage) : [],
    meta: {
      createdAtISO: asString(layoutConfig.meta?.createdAtISO) ?? new Date().toISOString(),
      updatedAtISO: asString(layoutConfig.meta?.updatedAtISO) ?? new Date().toISOString(),
    },
  } satisfies LayoutConfigV1);
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
  const builderProject = (() => {
    try {
      return sanitizeBuilderProject(
        rewriteSignedMediaUrlsToPublicDeep(getPublicBuilderProject(row)),
      );
    } catch {
      return null;
    }
  })();
  const weddingData = (() => {
    try {
      return sanitizeWeddingData(
        rewriteSignedMediaUrlsToPublicDeep(getPublicWeddingData(row)),
      );
    } catch {
      return null;
    }
  })();
  const layoutConfig = sanitizeLayoutConfig(
    rewriteSignedMediaUrlsToPublicDeep(
      safeJsonParse<LayoutConfigV1 | null>(row.layout_config, null),
    ),
  );

  return {
    id: String(row.id),
    site_slug: asString(row.site_slug) ?? null,
    site_url: asString(row.site_url) ?? null,
    is_published: getIsPublishedFromSiteRow(row),
    couple_name_1: asString(row.couple_name_1) ?? null,
    couple_name_2: asString(row.couple_name_2) ?? null,
    wedding_date: asString(row.wedding_date) ?? null,
    venue_name: asString(row.venue_name) ?? null,
    wedding_location: asString(row.wedding_location) ?? null,
    template_id: asString(row.template_id) ?? null,
    default_language: asString(row.default_language) ?? null,
    allow_search_indexing: row.hide_from_search !== true,
    render_model: {
      builderProject,
      weddingData,
      layoutConfig,
    },
  };
}
