import type { WeddingDataV1 } from '../types/weddingData';

type GuestReadySectionInput = {
  enabled?: boolean | null;
  settings?: Record<string, unknown> | null;
  type: string;
  variant?: string | null;
};

export function hasMeaningfulText(value: unknown, minLength = 2): boolean {
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

export function hasGuestReadyVenue(data: WeddingDataV1): boolean {
  return data.venues.some((venue) => hasMeaningfulText(venue.name) || hasMeaningfulText(venue.address, 6));
}

function hasGuestReadyTravel(data: WeddingDataV1): boolean {
  const travel = data.travel ?? {};
  return [
    travel.notes,
    travel.parkingInfo,
    travel.hotelInfo,
    travel.flightInfo,
    typeof travel.accommodations === 'string' ? travel.accommodations : '',
  ].some((value) => hasMeaningfulText(value, 12))
    || (Array.isArray(travel.accommodations) && travel.accommodations.length > 0)
    || (Array.isArray(travel.hotels) && travel.hotels.length > 0)
    || (Array.isArray(travel.roomBlocks) && travel.roomBlocks.length > 0)
    || (Array.isArray(travel.shuttles) && travel.shuttles.length > 0)
    || (Array.isArray(travel.visaTips) && travel.visaTips.length > 0)
    || (Array.isArray(travel.culturalTips) && travel.culturalTips.length > 0);
}

function hasGuestReadyRegistry(data: WeddingDataV1): boolean {
  return Array.isArray(data.registry?.links) && data.registry.links.length > 0;
}

function settingArray(settings: Record<string, unknown> | null | undefined, key: string): unknown[] {
  const value = settings?.[key];
  return Array.isArray(value) ? value : [];
}

function hasSettingText(settings: Record<string, unknown> | null | undefined, keys: string[], minLength = 2): boolean {
  return keys.some((key) => {
    const value = settings?.[key];
    if (typeof value === 'string') return hasMeaningfulText(value, minLength);
    if (value && typeof value === 'object' && 'value' in value) {
      return hasMeaningfulText((value as { value?: unknown }).value, minLength);
    }
    return false;
  });
}

export function hasGuestReadyContentForSection(
  sectionType: string,
  data: WeddingDataV1,
  settings?: Record<string, unknown> | null,
  variant?: string | null,
): boolean {
  const type = sectionType.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const normalizedVariant = variant?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') ?? '';
  switch (type) {
    case 'venue':
      return hasGuestReadyVenue(data);
    case 'schedule':
    case 'timeline':
      return data.schedule.length > 0;
    case 'registry':
      return hasGuestReadyRegistry(data);
    case 'story':
      return hasMeaningfulText(data.couple.story, 24);
    case 'gallery':
      return data.media.gallery.length > 0 || hasMeaningfulText(data.media.heroImageUrl, 10);
    case 'travel':
      return hasGuestReadyTravel(data);
    case 'accommodations':
      return hasGuestReadyTravel(data)
        || settingArray(settings, 'hotels').length > 0
        || hasSettingText(settings, ['generalNote'], 12);
    case 'faq':
      return data.faq.length > 0;
    case 'contact':
      return normalizedVariant === 'interactivehub'
        || settingArray(settings, 'contacts').length > 0
        || hasSettingText(settings, ['introText', 'closingNote', 'subtitle'], 12);
    case 'dress-code':
    case 'dresscode':
      return hasSettingText(settings, ['presetCode', 'description', 'colorNote', 'additionalNote', 'dressCodeLabel'], 2)
        || settingArray(settings, 'suggestions').length > 0;
    case 'wedding-party':
    case 'weddingparty':
      return settingArray(settings, 'bridalParty').length > 0 || settingArray(settings, 'groomParty').length > 0;
    case 'countdown':
      return !!toIsoDateOrUndefined(data.event.weddingDateISO ?? data.event.date)
        || hasSettingText(settings, ['targetDate'], 8);
    default:
      return true;
  }
}

export function hasGuestReadySection(
  section: GuestReadySectionInput,
  data: WeddingDataV1,
): boolean {
  if (section.enabled === false) return false;
  return hasGuestReadyContentForSection(section.type, data, section.settings, section.variant);
}

export function filterGuestReadySections<T extends GuestReadySectionInput>(
  sections: T[],
  data: WeddingDataV1,
): T[] {
  return sections.filter((section) => hasGuestReadySection(section, data));
}
