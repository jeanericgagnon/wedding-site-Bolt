import { normalizeWeddingData, type WeddingDataV1 } from '../types/weddingData';
import { buildPublicSiteRenderSite, type PublicSiteRenderModel } from './publicSiteRenderModel';
import { resolvePublicSiteSlugFromRow } from './publicSiteSlug';

function hasMeaningfulText(value: unknown, minLength = 2): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < minLength) return false;
  return !['tbd', 'date tbd', 'venue tbd', 'the couple', 'our wedding'].includes(normalized);
}

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

function hasGuestReadyVenue(data: WeddingDataV1): boolean {
  return data.venues.some((venue) => hasMeaningfulText(venue.name) || hasMeaningfulText(venue.address, 6));
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

  return renderModel.pages.some((page) =>
    Array.isArray(page.sections) && page.sections.some((section) => section.enabled !== false)
  );
}

export function isGuestFacingSiteRowReady(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  if (!resolvePublicSiteSlugFromRow(row)) return false;
  return isPublicRenderModelGuestReady(buildPublicSiteRenderSite(row).render_model);
}
