import type { BuilderPage } from '../types/builder/project.ts';
import type { BuilderSectionInstance } from '../types/builder/section.ts';
import type { WeddingDataV1 } from '../types/weddingData.ts';
import { normalizeWeddingData } from '../types/weddingData.ts';
import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests.ts';
import { manifestToCanonicalSectionDefinition } from './canonicalSectionRegistry.ts';
import { getSafePublicWebUrl } from '../sections/publicLinks.ts';
import { sanitizePublicSectionDataDeep } from '../render/publicSectionDataSanitizer.ts';
import type { ThemeTokens } from './themePresets.ts';
import { buildCoupleDisplayName } from './coupleDisplayName.ts';
import { safeJsonParse } from './jsonUtils.ts';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl.ts';
import { getIsPublishedFromSiteRow } from './publicSiteProject.ts';
import { toPublicPageDTO, toPublicSectionDTO, type PublicPageDTO } from './publicRenderContract.ts';

export interface PublicSiteThemeModel {
  preset: string | null;
  tokens: Record<string, unknown> | null;
}

export type PublicWeddingRenderModel = Omit<WeddingDataV1, 'meta'> & {
  meta?: WeddingDataV1['meta'];
};

export interface PublicSiteRenderModel {
  pages: PublicPageDTO[];
  wedding: PublicWeddingRenderModel | null;
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

export interface PersistedPublicSectionRow {
  id: string;
  type: string;
  variant?: string | null;
  data?: Record<string, unknown> | null;
  order?: number | null;
  visible?: boolean | null;
  style_overrides?: Record<string, unknown> | null;
  bindings?: Record<string, unknown> | null;
}

const ALLOWED_THEME_TOKEN_KEYS: Array<keyof ThemeTokens> = [
  'colorPrimary',
  'colorPrimaryHover',
  'colorPrimaryLight',
  'colorAccent',
  'colorAccentHover',
  'colorAccentLight',
  'colorSecondary',
  'colorBackground',
  'colorSurface',
  'colorSurfaceSubtle',
  'colorBorder',
  'colorTextPrimary',
  'colorTextSecondary',
];

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toCanonicalWeddingDateISO(value: unknown): string {
  const raw = asString(value)?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10) === raw ? date.toISOString() : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  return safeJsonParse<Record<string, unknown> | null>(value, null);
}

function pickPublicSectionSettings(section: { type: string; variant: string; settings?: Record<string, unknown> }) {
  const rawSettings = sanitizePublicSectionDataDeep(
    rewriteSignedMediaUrlsToPublicDeep(section.settings ?? {}),
  ) as Record<string, unknown>;
  const manifest = SECTION_MANIFESTS[section.type as keyof typeof SECTION_MANIFESTS];
  if (!manifest) {
    return {
      type: section.type,
      variant: section.variant,
      settings: {},
    };
  }

  const canonicalDefinition = manifestToCanonicalSectionDefinition(manifest);
  const canonicalVariant = canonicalDefinition.variants[section.variant]
    ? section.variant
    : canonicalDefinition.defaultVariant;
  const variantDefaults = canonicalDefinition.variants[canonicalVariant]?.defaults ?? {};
  const allowedKeys = new Set(manifest.settingsSchema.fields.map((field) => field.key));
  const pickedSettings = Object.fromEntries(
    Object.entries(rawSettings).filter(([key]) => allowedKeys.has(key)),
  );

  return {
    type: canonicalDefinition.type,
    variant: canonicalVariant,
    settings: {
      ...variantDefaults,
      ...pickedSettings,
    },
  };
}

function sanitizeBuilderSection(section: BuilderSectionInstance): BuilderSectionInstance {
  return toPublicSectionDTO({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    orderIndex: section.orderIndex,
    settings: section.settings,
    bindings: section.bindings as Record<string, unknown> | undefined,
    styleOverrides: section.styleOverrides as Record<string, unknown> | undefined,
  }) as unknown as BuilderSectionInstance;
}

function sanitizeBuilderPage(page: BuilderPage): BuilderPage {
  return toPublicPageDTO({
    id: page.id,
    title: page.title,
    slug: page.slug,
    orderIndex: page.orderIndex,
    sections: Array.isArray(page.sections) ? page.sections.map(sanitizeBuilderSection) : [],
    meta: {
      isHome: page.meta?.isHome === true,
      isHidden: false,
    },
  }) as unknown as BuilderPage;
}

function toPersistedPublicBuilderSection(section: PersistedPublicSectionRow, index: number): BuilderSectionInstance {
  return toPublicSectionDTO({
    id: section.id,
    type: section.type as BuilderSectionInstance['type'],
    variant: section.variant ?? 'default',
    enabled: section.visible !== false,
    orderIndex: typeof section.order === 'number' ? section.order : index,
    settings: asRecord(section.data) ?? {},
    bindings: section.bindings as Record<string, unknown> | undefined,
    styleOverrides: section.style_overrides as Record<string, unknown> | undefined,
  }) as unknown as BuilderSectionInstance;
}

function pickPublicThemeTokens(value: unknown): ThemeTokens | null {
  const source = asRecord(value);
  if (!source) return null;
  const out: Partial<ThemeTokens> = {};
  for (const key of ALLOWED_THEME_TOKEN_KEYS) {
    const picked = asString(source[key]);
    if (picked) out[key] = picked;
  }
  return ALLOWED_THEME_TOKEN_KEYS.every((key) => typeof out[key] === 'string')
    ? out as ThemeTokens
    : null;
}

function pickPublicWeddingMedia(value: unknown): WeddingDataV1['media'] {
  const source = asRecord(value);
  const gallerySource = Array.isArray(source?.gallery) ? source.gallery : [];
  return {
    ...(asString(source?.heroImageUrl)
      ? { heroImageUrl: sanitizePublicSectionDataDeep(rewriteSignedMediaUrlsToPublicDeep(source?.heroImageUrl)) as string }
      : {}),
    gallery: gallerySource
      .map((item, index) => {
        const row = asRecord(item);
        const url = sanitizePublicSectionDataDeep(
          rewriteSignedMediaUrlsToPublicDeep(asString(row?.url) ?? ''),
        ) as string;
        if (!url) return null;
        return {
          id: asString(row?.id) ?? `gallery-${index}`,
          url,
          ...(asString(row?.caption) ? { caption: asString(row?.caption) } : {}),
        };
      })
      .filter((item): item is WeddingDataV1['media']['gallery'][number] => Boolean(item)),
  };
}

function pickPublicTravel(value: unknown): WeddingDataV1['travel'] {
  const source = asRecord(value);
  const accommodations = source?.accommodations;
  return {
    ...(asString(source?.notes) ? { notes: asString(source?.notes) } : {}),
    ...(asString(source?.parkingInfo) ? { parkingInfo: asString(source?.parkingInfo) } : {}),
    ...(asString(source?.hotelInfo) ? { hotelInfo: asString(source?.hotelInfo) } : {}),
    ...(asString(source?.flightInfo) ? { flightInfo: asString(source?.flightInfo) } : {}),
    ...(typeof accommodations === 'string'
      ? { accommodations }
      : Array.isArray(accommodations)
        ? {
            accommodations: accommodations
              .map((item) => (typeof item === 'string' ? item : null))
              .filter((item): item is string => Boolean(item && item.trim())),
          }
        : {}),
  };
}

function sanitizeWeddingData(data: WeddingDataV1 | null): PublicWeddingRenderModel | null {
  if (!data) return null;

  const normalized = normalizeWeddingData(data);
  const partner1Name = asString(normalized.couple?.partner1Name) ?? '';
  const partner2Name = asString(normalized.couple?.partner2Name) ?? '';
  const displayName = asString(normalized.couple?.displayName) || buildCoupleDisplayName(partner1Name, partner2Name);

  return {
    version: normalized.version ?? '1',
    couple: {
      ...(partner1Name ? { partner1Name } : {}),
      ...(partner2Name ? { partner2Name } : {}),
      ...(displayName ? { displayName } : {}),
      ...(asString(normalized.couple?.story) ? { story: asString(normalized.couple?.story) } : {}),
    },
    event: {
      ...(asString(normalized.event?.weddingDateISO) ? { weddingDateISO: normalized.event.weddingDateISO } : {}),
      ...(asString(normalized.event?.date) ? { date: normalized.event.date } : {}),
      ...(asString(normalized.event?.timezone) ? { timezone: normalized.event.timezone } : {}),
      ...(asString(normalized.event?.headline) ? { headline: normalized.event.headline } : {}),
      ...(asString(normalized.event?.rsvpCallToAction) ? { rsvpCallToAction: normalized.event.rsvpCallToAction } : {}),
    },
    venues: Array.isArray(normalized.venues) ? normalized.venues.map((venue, index) => ({
      id: asString(venue.id) ?? `venue-${index}`,
      ...(asNumber(venue.orderIndex) !== undefined ? { orderIndex: venue.orderIndex } : {}),
      ...(asString(venue.name) ? { name: venue.name } : {}),
      ...(asString(venue.address) ? { address: venue.address } : {}),
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
    rsvp: {
      enabled: normalized.rsvp?.enabled !== false,
      ...(asString(normalized.rsvp?.deadlineISO) ? { deadlineISO: normalized.rsvp.deadlineISO } : {}),
    },
    travel: pickPublicTravel(normalized.travel),
    registry: {
      links: Array.isArray(normalized.registry?.links)
        ? normalized.registry.links
            .map((item, index) => {
              const row = asRecord(item);
              if (!row) return null;
              const url = getSafePublicWebUrl(asString(row?.url) ?? '');
              if (!url) return null;
              return {
                id: asString(row?.id) ?? `registry-${index}`,
                ...(asString(row?.label) ? { label: row.label } : {}),
                url,
              };
            })
            .filter((item): item is { id: string; label?: string; url: string } => Boolean(item))
        : [],
    },
    faq: Array.isArray(normalized.faq) ? normalized.faq.map((item) => ({
      id: item.id,
      q: item.q,
      a: item.a,
    })) : [],
    theme: {
      ...(asString(normalized.theme?.preset) ? { preset: normalized.theme.preset } : {}),
    },
    media: pickPublicWeddingMedia(normalized.media),
  };
}

function buildCanonicalRowWeddingFallback(row: Record<string, unknown>): PublicWeddingRenderModel | null {
  const partner1Name = asString(row.couple_name_1)?.trim() ?? '';
  const partner2Name = asString(row.couple_name_2)?.trim() ?? '';
  const weddingDateISO = toCanonicalWeddingDateISO(row.wedding_date);
  const venueName = asString(row.venue_name)?.trim() ?? '';
  const venueAddress = asString(row.wedding_location)?.trim() ?? '';

  if (!partner1Name && !partner2Name && !weddingDateISO && !venueName && !venueAddress) return null;

  return {
    version: '1',
    couple: {
      ...(partner1Name ? { partner1Name } : {}),
      ...(partner2Name ? { partner2Name } : {}),
      ...(partner1Name || partner2Name
        ? { displayName: buildCoupleDisplayName(partner1Name, partner2Name, 'The couple') }
        : {}),
    },
    event: {
      ...(weddingDateISO ? { weddingDateISO } : {}),
    },
    venues: venueName || venueAddress
      ? [{
          id: 'primary',
          ...(venueName ? { name: venueName } : {}),
          ...(venueAddress ? { address: venueAddress } : {}),
        }]
      : [],
    schedule: [],
    rsvp: {
      enabled: true,
    },
    travel: {},
    registry: {
      links: [],
    },
    faq: [],
    theme: {},
    media: {
      gallery: [],
    },
  };
}

function withCanonicalRowCoupleIdentity(
  data: PublicWeddingRenderModel,
  row: Record<string, unknown>,
): PublicWeddingRenderModel {
  const partner1Name = asString(row.couple_name_1)?.trim() ?? '';
  const partner2Name = asString(row.couple_name_2)?.trim() ?? '';
  if (!partner1Name && !partner2Name) return data;

  return {
    ...data,
    couple: {
      ...data.couple,
      partner1Name: partner1Name || data.couple.partner1Name,
      partner2Name: partner2Name || data.couple.partner2Name,
      displayName: buildCoupleDisplayName(
        partner1Name || data.couple.partner1Name,
        partner2Name || data.couple.partner2Name,
        data.couple.displayName || 'The couple',
      ),
    },
  };
}

function withCanonicalRowEventIdentity(
  data: PublicWeddingRenderModel,
  row: Record<string, unknown>,
): PublicWeddingRenderModel {
  const weddingDateISO = toCanonicalWeddingDateISO(row.wedding_date);
  const venueName = asString(row.venue_name)?.trim() ?? '';
  const venueAddress = asString(row.wedding_location)?.trim() ?? '';

  const venues = venueName || venueAddress
    ? data.venues.length > 0
      ? data.venues.map((venue, index) => index === 0
        ? {
            ...venue,
            ...(venueName ? { name: venueName } : {}),
            ...(venueAddress ? { address: venueAddress } : {}),
          }
        : venue)
      : [{
          id: 'primary',
          ...(venueName ? { name: venueName } : {}),
          ...(venueAddress ? { address: venueAddress } : {}),
        }]
    : data.venues;

  return {
    ...data,
    event: {
      ...data.event,
      ...(weddingDateISO ? { weddingDateISO } : {}),
    },
    venues,
  };
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

function getPublicWeddingRenderData(row: Record<string, unknown>, isPublished: boolean): PublicWeddingRenderModel | null {
  const publishedSource = asRecord(row.published_json);
  const draftSource = asRecord(row.site_json);

  const candidates = isPublished
    ? [
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
      return withCanonicalRowEventIdentity(
        withCanonicalRowCoupleIdentity(
          sanitizeWeddingData(rewriteSignedMediaUrlsToPublicDeep(parsed)) ?? parsed,
          row,
        ),
        row,
      );
    }
  }

  return isPublished ? buildCanonicalRowWeddingFallback(row) : null;
}

function getPublicThemeModel(
  row: Record<string, unknown>,
  pagesExist: boolean,
  wedding: PublicWeddingRenderModel | null,
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
    tokens: pickPublicThemeTokens(rawTokens) as Record<string, unknown> | null,
  };
}

export function buildPersistedPublicFallbackPages(
  sections: PersistedPublicSectionRow[],
): BuilderPage[] {
  const publicSections = sections
    .filter((section) => section.visible !== false)
    .sort((a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0))
    .map(toPersistedPublicBuilderSection);

  if (publicSections.length === 0) return [];

  return [{
    id: 'home',
    title: 'Home',
    slug: 'home',
    orderIndex: 0,
    sections: publicSections,
    meta: {
      isHome: true,
      isHidden: false,
    },
  }] as BuilderPage[];
}

export function applyPublicSiteTranslation(
  row: Record<string, unknown>,
  translation: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!translation) return row;
  const translatedPublished = asRecord(translation.translated_published_json);
  const existingPublished = asRecord(row.published_json) ?? {};
  const translatedWeddingData = translation.translated_wedding_data ?? row.wedding_data;
  const nextPublishedJson = translatedPublished
    ? {
        ...existingPublished,
        ...translatedPublished,
        ...(translatedWeddingData && !translatedPublished.weddingDataSnapshot && !translatedPublished.weddingData
          ? { weddingDataSnapshot: translatedWeddingData }
          : {}),
      }
    : translatedWeddingData
      ? {
          ...existingPublished,
          ...(existingPublished.weddingDataSnapshot || existingPublished.weddingData
            ? {}
            : { weddingDataSnapshot: translatedWeddingData }),
        }
      : row.published_json;

  return {
    ...row,
    site_json: translation.translated_site_json ?? row.site_json,
    published_json: nextPublishedJson,
    wedding_data: translatedWeddingData,
    layout_config: translation.translated_layout_config ?? row.layout_config,
  };
}

export function buildPublicSiteRenderSite(row: Record<string, unknown>): PublicSiteRenderSite {
  const isPublished = getIsPublishedFromSiteRow(row);
  const pages = getPublishedProjectPages(row, isPublished);
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
