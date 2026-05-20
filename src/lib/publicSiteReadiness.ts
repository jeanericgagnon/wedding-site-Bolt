import { normalizeWeddingData, type WeddingDataV1 } from '../types/weddingData';
import { buildPublicSiteRenderSite, type PublicSiteRenderModel } from './publicSiteRenderModel';
import { hasGuestReadySection, hasGuestReadyVenue, hasMeaningfulText } from './publicGuestSectionReadiness';
import { resolvePublicSiteSlugFromRow } from './publicSiteSlug';

const GUEST_FACING_READINESS_KEYS = [
  'id',
  'site_slug',
  'site_url',
  'is_published',
  'privacy_mode',
  'site_json',
  'published_json',
  'wedding_data',
  'hide_from_search',
] as const;

function toIsoDateOrUndefined(value: string | undefined): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}-${month}-${day}T12:00:00.000Z`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function normalizeReadinessSlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  return decoded
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isPublicWeddingDataSparse(data: WeddingDataV1): boolean {
  const hasCoupleNames = hasMeaningfulText(data.couple.partner1Name)
    || hasMeaningfulText(data.couple.partner2Name)
    || hasMeaningfulText(data.couple.displayName);
  const hasDate = !!toIsoDateOrUndefined(data.event.weddingDateISO ?? data.event.date);
  const hasImage = hasMeaningfulText(data.media.heroImageUrl, 10) || data.media.gallery.length > 0;
  const hasStory = hasMeaningfulText(data.couple.story, 24);
  const hasSchedule = data.schedule.length > 0;
  const score = [hasCoupleNames, hasDate, hasGuestReadyVenue(data), hasImage, hasStory, hasSchedule].filter(Boolean).length;
  return score <= 2;
}

export function isPublicRenderModelGuestReady(renderModel: PublicSiteRenderModel | null | undefined): boolean {
  if (!renderModel?.wedding) return false;

  const weddingData = normalizeWeddingData(renderModel.wedding);
  if (isPublicWeddingDataSparse(weddingData)) return false;

  if ((renderModel.pages ?? []).length === 0) return true;

  const visiblePages = renderModel.pages.filter((page) => page.meta?.isHidden !== true);
  if (visiblePages.length === 0) return false;

  const homePage = visiblePages.find((page) => (
    page.meta?.isHome
    || normalizeReadinessSlug(page.id) === 'home'
    || normalizeReadinessSlug(page.slug) === 'home'
  ))
    ?? visiblePages[0];

  return Array.isArray(homePage?.sections)
    && homePage.sections.some((section) => hasGuestReadySection({
      enabled: section.enabled,
      settings: section.settings as Record<string, unknown> | null | undefined,
      type: section.type,
      variant: section.variant,
    }, weddingData));
}

export function isGuestFacingSiteRowReady(row: Record<string, unknown> | null | undefined): boolean {
  const readinessRow = pickGuestFacingReadinessRow(row);
  if (!readinessRow) return false;
  if (!resolvePublicSiteSlugFromRow(readinessRow)) return false;
  return isPublicRenderModelGuestReady(buildPublicSiteRenderSite(readinessRow).render_model);
}

export function pickGuestFacingReadinessRow(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!row) return null;

  const projected = GUEST_FACING_READINESS_KEYS.reduce<Record<string, unknown>>((acc, key) => {
    if (key in row) acc[key] = row[key];
    return acc;
  }, {});

  return Object.keys(projected).length > 0 ? projected : null;
}
