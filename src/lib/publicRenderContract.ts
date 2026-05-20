import type { BuilderPage } from '../types/builder/project.ts';
import type { BuilderSectionInstance, BuilderSectionStyleOverrides } from '../types/builder/section.ts';
import type { SectionType } from '../types/layoutConfig.ts';
import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests.ts';
import { manifestToCanonicalSectionDefinition } from './canonicalSectionRegistry.ts';
import { sanitizePublicSectionDataDeep } from '../render/publicSectionDataSanitizer.ts';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl.ts';

export interface PublicSectionDTO {
  id: string;
  type: SectionType;
  variant: string;
  enabled: boolean;
  orderIndex: number;
  settings: Record<string, unknown>;
  bindings?: PublicBindingDTO;
  styleOverrides?: PublicStyleOverrideDTO;
}

export interface PublicPageDTO {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
  sections: PublicSectionDTO[];
  meta: {
    isHome: boolean;
    isHidden?: boolean;
  };
}

export interface PublicBindingDTO {
  venueIds?: string[];
  scheduleItemIds?: string[];
  linkIds?: string[];
  faqIds?: string[];
}

export interface PublicStyleOverrideDTO {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  sideImage?: string;
  sideImagePosition?: string;
  sideImageSize?: string;
  sideImageFit?: string;
  animationPreset?: string;
}

export interface PublicContactPersonDTO {
  id: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  instagram?: string;
}

export const PUBLIC_SECTION_SETTINGS_ALLOWLIST: Record<SectionType, readonly string[]> = {
  hero: ['headline', 'eyebrow', 'subheadline', 'backgroundImage', 'overlayOpacity', 'ctaLabel', 'ctaHref', 'showDivider', 'textAlign', 'layoutStyle'],
  story: ['headline', 'body', 'image', 'showDivider'],
  venue: ['eyebrow', 'headline', 'subheadline', 'showMap', 'mapHeight', 'layout', 'imagePosition', 'venues'],
  schedule: ['eyebrow', 'headline', 'date', 'showDate', 'events', 'days', 'accentColor'],
  travel: ['eyebrow', 'headline', 'intro', 'flightInfo', 'drivingInfo', 'parkingInfo', 'shuttleInfo', 'generalNote', 'hotels', 'subheadline', 'deadlineNote', 'showAmenities', 'showShuttle', 'airport', 'venueAddress', 'coffee', 'food', 'sights', 'nightlife', 'pins', 'airportTips', 'activities', 'closest', 'value', 'budget'],
  registry: ['eyebrow', 'headline', 'message', 'links', 'cashFundEnabled', 'cashFundLabel', 'cashFundUrl', 'cashFundDescription', 'featuredGifts', 'storeLinks', 'showAllLabel', 'viewAllUrl', 'layout'],
  faq: ['eyebrow', 'headline', 'subheadline', 'items', 'expandFirstByDefault', 'layoutStyle'],
  rsvp: ['eyebrow', 'headline', 'deadlineText', 'deadline', 'events', 'confirmationMessage', 'declineMessage', 'guestNote', 'mode', 'embedUrl', 'embedHeight', 'layoutStyle', 'imageUrl'],
  gallery: ['eyebrow', 'headline', 'images', 'animation', 'showCaptions', 'enableLightbox', 'autoScroll', 'continuousGlide', 'glideSpeed', 'columns', 'aspectRatio', 'backgroundColor', 'autoplay'],
  countdown: ['eyebrow', 'headline', 'targetDate', 'message', 'messageAfter', 'showSeconds', 'background', 'layoutStyle', 'imageUrl'],
  'wedding-party': ['eyebrow', 'headline', 'subheadline', 'members', 'groupBySide', 'partner1Label', 'partner2Label'],
  'dress-code': ['eyebrow', 'headline', 'presetCode', 'dressCodeLabel', 'dressCode', 'description', 'colorPalette', 'moodImages', 'colorNote', 'additionalNote', 'avoidNote', 'layoutStyle', 'formalityLevel'],
  accommodations: ['showTitle', 'title', 'headline', 'eyebrow', 'generalNote', 'blockNote', 'shuttleNote', 'mapImage', 'layoutStyle', 'hotels'],
  contact: ['showTitle', 'title', 'headline', 'eyebrow', 'subtitle', 'subheadline', 'introText', 'contacts', 'emailSubject', 'closingNote', 'pollPrompt', 'pollOptions', 'quizPrompt', 'quizOptions', 'correctQuizOption', 'suggestionPrompt', 'allowPublicResults'],
  'footer-cta': ['headline', 'subtext', 'buttonLabel', 'rsvpUrl', 'footerNote'],
  custom: ['backgroundColor', 'paddingSize', 'skeletonId', 'blocks'],
  quotes: ['eyebrow', 'headline', 'background', 'autoplay', 'autoplayInterval', 'subtitle', 'showPhotos', 'columns', 'quotes', 'prompt', 'entries'],
  menu: ['eyebrow', 'headline', 'subtitle', 'note', 'backgroundImage', 'showDietaryIcons', 'showDietaryKey', 'sections', 'items', 'courses', 'footerNote', 'showPrices'],
  music: ['eyebrow', 'headline', 'subtitle', 'djBandName', 'djBandLabel', 'requestNote', 'showRequestNote', 'playlistUrl', 'promptLabel', 'placeholder', 'buttonLabel', 'showRecentRequests', 'showPlaylistLink', 'showMoments', 'note', 'songs', 'playlists', 'background'],
  directions: ['eyebrow', 'headline', 'venueName', 'address', 'city', 'phone', 'mapUrl', 'parkingNote', 'rideshareNote', 'shuttleNote', 'showTransport', 'transport', 'publicTransitNote', 'drivingTime', 'drivingTimeFrom', 'background'],
  video: ['eyebrow', 'headline', 'subtitle', 'videoUrl', 'thumbnailUrl', 'videoType', 'background', 'autoplay', 'layoutStyle', 'videos'],
};

export const PUBLIC_BINDINGS_BY_SECTION_TYPE: Partial<Record<SectionType, readonly (keyof PublicBindingDTO)[]>> = {
  venue: ['venueIds'],
  schedule: ['scheduleItemIds'],
  registry: ['linkIds'],
  faq: ['faqIds'],
};

export const PUBLIC_STYLE_OVERRIDE_KEYS = [
  'backgroundColor',
  'textColor',
  'paddingTop',
  'paddingBottom',
  'sideImage',
  'sideImagePosition',
  'sideImageSize',
  'sideImageFit',
  'animationPreset',
] as const;

export const PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS: Partial<Record<SectionType, readonly string[]>> = {
  hero: ['eyebrow', 'subheadline', 'ctaLabel', 'ctaHref', 'showDivider', 'textAlign', 'layoutStyle'],
  story: ['headline', 'body', 'image', 'showDivider'],
  venue: ['eyebrow', 'headline', 'subheadline', 'venues', 'mapHeight', 'layout', 'imagePosition'],
  schedule: ['eyebrow', 'headline', 'date', 'events', 'days', 'showDate', 'accentColor'],
  travel: ['eyebrow', 'headline', 'intro', 'flightInfo', 'drivingInfo', 'parkingInfo', 'shuttleInfo', 'generalNote', 'hotels', 'subheadline', 'deadlineNote', 'showAmenities', 'showShuttle', 'airport', 'venueAddress', 'coffee', 'food', 'sights', 'nightlife', 'pins', 'airportTips', 'activities', 'closest', 'value', 'budget'],
  registry: ['eyebrow', 'headline', 'links', 'cashFundEnabled', 'cashFundLabel', 'cashFundUrl', 'cashFundDescription', 'featuredGifts', 'storeLinks', 'showAllLabel', 'viewAllUrl', 'layout'],
  faq: ['eyebrow', 'headline', 'subheadline', 'items', 'expandFirstByDefault', 'layoutStyle'],
  gallery: ['headline', 'images', 'columns', 'aspectRatio', 'backgroundColor', 'autoplay'],
  countdown: ['headline', 'messageAfter', 'background', 'layoutStyle'],
  contact: ['headline', 'subheadline', 'contacts'],
  'footer-cta': ['buttonLabel', 'rsvpUrl'],
  rsvp: ['eyebrow', 'headline', 'deadline', 'events', 'declineMessage', 'guestNote', 'layoutStyle', 'imageUrl'],
  'wedding-party': ['headline', 'subheadline', 'members', 'groupBySide', 'partner1Label', 'partner2Label'],
  'dress-code': ['headline', 'dressCode', 'colorPalette', 'moodImages', 'layoutStyle'],
  accommodations: ['headline', 'layoutStyle', 'hotels'],
  directions: ['phone', 'rideshareNote', 'showTransport', 'transport', 'background'],
  custom: ['skeletonId', 'blocks'],
  quotes: ['autoplayInterval', 'subtitle', 'showPhotos', 'columns', 'quotes', 'prompt', 'entries'],
  menu: ['headline', 'sections', 'items', 'courses', 'footerNote', 'showPrices'],
  music: ['showPlaylistLink', 'showMoments', 'note', 'songs', 'playlists', 'background'],
  video: ['autoplay', 'layoutStyle', 'videos', 'background'],
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBuilderString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return typeof record?.value === 'string' ? record.value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function unwrapTopLevelBuilderSettingValues(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const record = asRecord(value);
    out[key] = record && 'value' in record ? record.value : value;
  }
  return out;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const picked = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return picked.length > 0 ? picked : undefined;
}

function pickObjectArray<T>(value: unknown, mapper: (item: Record<string, unknown>, index: number) => T | null): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const picked = value.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) return [];
    const next = mapper(record, index);
    return next ? [next] : [];
  });
  return picked.length > 0 ? picked : undefined;
}

function pickOptionalString(source: Record<string, unknown>, key: string): string | undefined {
  return hasNonEmptyString(source[key]) ? source[key] : undefined;
}

function sanitizeTravelHotelList(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `hotel-${index + 1}`,
    };
    for (const key of ['name', 'distance', 'price', 'bookingCode', 'phone', 'url', 'notes'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelHotelBlockList(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `hotel-${index + 1}`,
    };
    for (const key of ['name', 'distance', 'priceRange', 'bookingCode', 'bookingDeadline', 'phone', 'url', 'image', 'shuttleInfo', 'notes'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    if (typeof hotel.stars === 'number' && Number.isFinite(hotel.stars)) out.stars = hotel.stars;
    if (typeof hotel.recommended === 'boolean') out.recommended = hotel.recommended;
    const amenities = pickStringArray(hotel.amenities);
    if (amenities) out.amenities = amenities;
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelGuideItems(value: unknown, prefix: string): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (item, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(item.id) ? item.id : `${prefix}-${index + 1}`,
    };
    for (const key of ['name', 'note', 'url'] as const) {
      const picked = pickOptionalString(item, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelPins(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (pin, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(pin.id) ? pin.id : `pin-${index + 1}`,
    };
    for (const key of ['name', 'type', 'address', 'note', 'url'] as const) {
      const picked = pickOptionalString(pin, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelSplitHotels(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `hotel-${index + 1}`,
    };
    for (const key of ['name', 'distance', 'note', 'url'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelActivities(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (activity, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(activity.id) ? activity.id : `activity-${index + 1}`,
    };
    for (const key of ['name', 'category', 'description', 'address', 'url'] as const) {
      const picked = pickOptionalString(activity, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeTravelTierHotels(value: unknown, prefix: string): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `${prefix}-${index + 1}`,
    };
    for (const key of ['name', 'distance', 'price', 'note', 'url'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeGalleryImages(value: unknown): Array<Record<string, unknown>> | undefined {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    const picked = value.flatMap((url, index) => {
      if (!hasNonEmptyString(url)) return [];
      return [{ id: `image-${index + 1}`, url }];
    });
    return picked.length > 0 ? picked : undefined;
  }

  return pickObjectArray(value, (image, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(image.id) ? image.id : `image-${index + 1}`,
    };
    for (const key of ['url', 'alt', 'caption', 'span'] as const) {
      const picked = pickOptionalString(image, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.url) ? out : null;
  });
}

function sanitizeRsvpEvents(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (event, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(event.id) ? event.id : `event-${index + 1}`,
    };
    for (const key of ['label', 'description', 'date', 'location'] as const) {
      const picked = pickOptionalString(event, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeWeddingPartyMembers(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (member, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(member.id) ? member.id : `member-${index + 1}`,
    };
    for (const key of ['name', 'role', 'photo', 'note', 'side'] as const) {
      const picked = pickOptionalString(member, key);
      if (picked) out[key] = picked;
    }
    return Object.keys(out).length > 1 ? out : null;
  });
}

function sanitizeDressCodeColorPalette(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (swatch, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(swatch.id) ? swatch.id : `swatch-${index + 1}`,
    };
    for (const key of ['color', 'label'] as const) {
      const picked = pickOptionalString(swatch, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.color) ? out : null;
  });
}

function sanitizeDressCodeMoodImages(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (image, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(image.id) ? image.id : `image-${index + 1}`,
    };
    for (const key of ['url', 'alt'] as const) {
      const picked = pickOptionalString(image, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.url) ? out : null;
  });
}

function sanitizePublicContactPeople(value: unknown): PublicContactPersonDTO[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const picked = value.flatMap((item, index) => {
    const contact = asRecord(item);
    if (!contact) return [];

    const id = hasNonEmptyString(contact.id) ? contact.id : `contact-${index + 1}`;
    const out: PublicContactPersonDTO = { id };

    if (hasNonEmptyString(contact.name)) out.name = contact.name;
    if (hasNonEmptyString(contact.role)) out.role = contact.role;
    if (hasNonEmptyString(contact.email)) out.email = contact.email;
    if (hasNonEmptyString(contact.phone)) out.phone = contact.phone;
    if (hasNonEmptyString(contact.instagram)) out.instagram = contact.instagram;

    return [out];
  });

  return picked.length > 0 ? picked : undefined;
}

function sanitizeVenueDetails(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (detail, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(detail.id) ? detail.id : `detail-${index + 1}`,
    };
    for (const key of ['icon', 'label', 'value'] as const) {
      const picked = pickOptionalString(detail, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.label) || hasNonEmptyString(out.value) ? out : null;
  });
}

function sanitizeVenueItems(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (venue, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(venue.id) ? venue.id : `venue-${index + 1}`,
    };
    for (const key of ['name', 'role', 'address', 'city', 'time', 'date', 'notes', 'description', 'image', 'mapUrl', 'mapEmbedUrl'] as const) {
      const picked = pickOptionalString(venue, key);
      if (picked) out[key] = picked;
    }
    const details = sanitizeVenueDetails(venue.details);
    if (details) out.details = details;
    return hasNonEmptyString(out.name) || Array.isArray(out.details) ? out : null;
  });
}

function sanitizeScheduleEvents(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (event, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(event.id) ? event.id : `event-${index + 1}`,
    };
    for (const key of ['time', 'endTime', 'label', 'description', 'location', 'icon', 'category', 'image'] as const) {
      const picked = pickOptionalString(event, key);
      if (picked) out[key] = picked;
    }
    if (typeof event.highlight === 'boolean') out.highlight = event.highlight;
    return hasNonEmptyString(out.label) ? out : null;
  });
}

function sanitizeScheduleDays(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (day, index) => {
    const events = sanitizeScheduleEvents(day.events);
    if (!events) return null;

    const out: Record<string, unknown> = {
      id: hasNonEmptyString(day.id) ? day.id : `day-${index + 1}`,
      events,
    };
    for (const key of ['label', 'date'] as const) {
      const picked = pickOptionalString(day, key);
      if (picked) out[key] = picked;
    }
    return out;
  });
}

function sanitizeFaqItems(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (item, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(item.id) ? item.id : `faq-${index + 1}`,
    };
    const question = pickOptionalString(item, 'question') ?? pickOptionalString(item, 'q');
    const answer = pickOptionalString(item, 'answer') ?? pickOptionalString(item, 'a');
    if (question) out.question = question;
    if (answer) out.answer = answer;
    return hasNonEmptyString(out.question) && hasNonEmptyString(out.answer) ? out : null;
  });
}

function sanitizeRegistryLinks(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (link, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(link.id) ? link.id : `registry-link-${index + 1}`,
    };
    const store = pickOptionalString(link, 'store') ?? pickOptionalString(link, 'label');
    const url = pickOptionalString(link, 'url');
    if (store) out.store = store;
    if (url) out.url = url;
    const description = pickOptionalString(link, 'description');
    if (description) out.description = description;
    const logo = pickOptionalString(link, 'logo');
    if (logo) out.logo = logo;
    return hasNonEmptyString(out.url) ? out : null;
  });
}

function sanitizeRegistryFeaturedGifts(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (gift, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(gift.id) ? gift.id : `featured-gift-${index + 1}`,
    };
    for (const key of ['name', 'store', 'price', 'description', 'image', 'url', 'category'] as const) {
      const picked = pickOptionalString(gift, key);
      if (picked) out[key] = picked;
    }
    for (const key of ['isPriority', 'isClaimed', 'isPartiallyClaimed'] as const) {
      if (typeof gift[key] === 'boolean') out[key] = gift[key];
    }
    return hasNonEmptyString(out.name) ? out : null;
  });
}

function sanitizeAccommodationsDefaultHotels(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `hotel-${index + 1}`,
    };
    for (const key of ['name', 'address', 'phone', 'url', 'priceRange', 'distance', 'notes'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    const blockCode = pickOptionalString(hotel, 'blockCode') ?? pickOptionalString(hotel, 'bookingCode');
    if (blockCode) out.blockCode = blockCode;
    const blockDeadline = pickOptionalString(hotel, 'blockDeadline') ?? pickOptionalString(hotel, 'bookingDeadline');
    if (blockDeadline) out.blockDeadline = blockDeadline;
    return hasNonEmptyString(out.name) ? out : null;
  });
}

function sanitizeAccommodationsVariantHotels(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (hotel, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(hotel.id) ? hotel.id : `hotel-${index + 1}`,
    };
    for (const key of ['name', 'distance', 'priceRange', 'bookingCode', 'bookingDeadline', 'phone', 'url', 'image', 'notes'] as const) {
      const picked = pickOptionalString(hotel, key);
      if (picked) out[key] = picked;
    }
    if (typeof hotel.stars === 'number' && Number.isFinite(hotel.stars)) out.stars = hotel.stars;
    if (typeof hotel.recommended === 'boolean') out.recommended = hotel.recommended;
    return hasNonEmptyString(out.name) ? out : null;
  });
}

function sanitizeDirectionsTransportOptions(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (option, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(option.id) ? option.id : `transport-${index + 1}`,
    };
    for (const key of ['icon', 'label', 'description'] as const) {
      const picked = pickOptionalString(option, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.label) ? out : null;
  });
}

function sanitizeMusicSongs(
  value: unknown,
  options: { includeNote?: boolean; includeIcon?: boolean } = {},
): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (song, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(song.id) ? song.id : `song-${index + 1}`,
    };
    for (const key of ['title', 'artist', 'moment'] as const) {
      const picked = pickOptionalString(song, key);
      if (picked) out[key] = picked;
    }
    if (options.includeNote) {
      const note = pickOptionalString(song, 'note');
      if (note) out.note = note;
    }
    if (options.includeIcon) {
      const icon = pickOptionalString(song, 'icon');
      if (icon) out.icon = icon;
    }
    return hasNonEmptyString(out.title) ? out : null;
  });
}

function sanitizeMusicPlaylists(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (playlist, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(playlist.id) ? playlist.id : `playlist-${index + 1}`,
    };
    for (const key of ['label', 'spotifyUrl', 'appleMusicUrl'] as const) {
      const picked = pickOptionalString(playlist, key);
      if (picked) out[key] = picked;
    }
    const tracks = sanitizeMusicSongs(playlist.tracks);
    if (tracks) out.tracks = tracks;
    return hasNonEmptyString(out.label) ? out : null;
  });
}

function sanitizeVideoItems(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (video, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(video.id) ? video.id : `video-${index + 1}`,
    };
    for (const key of ['title', 'description', 'videoUrl', 'thumbnailUrl', 'videoType'] as const) {
      const picked = pickOptionalString(video, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.title) || hasNonEmptyString(out.videoUrl) ? out : null;
  });
}

function sanitizeQuotesItems(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (quote, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(quote.id) ? quote.id : `quote-${index + 1}`,
    };
    for (const key of ['text', 'author', 'role', 'photo'] as const) {
      const picked = pickOptionalString(quote, key);
      if (picked) out[key] = picked;
    }
    if (typeof quote.featured === 'boolean') out.featured = quote.featured;
    return hasNonEmptyString(out.text) ? out : null;
  });
}

function sanitizeGuestbookEntries(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (entry, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(entry.id) ? entry.id : `entry-${index + 1}`,
    };
    for (const key of ['text', 'author'] as const) {
      const picked = pickOptionalString(entry, key);
      if (picked) out[key] = picked;
    }
    return hasNonEmptyString(out.text) ? out : null;
  });
}

function sanitizeCustomBlocks(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (block, index) => {
    const type = pickOptionalString(block, 'type');
    if (!type) return null;

    const out: Record<string, unknown> = {
      id: hasNonEmptyString(block.id) ? block.id : `block-${index + 1}`,
      type,
    };

    for (const key of ['content', 'imageUrl', 'imageAlt', 'buttonLabel', 'buttonUrl', 'align', 'size', 'variant'] as const) {
      const picked = pickOptionalString(block, key);
      if (picked) out[key] = picked;
    }

    if (type === 'columns' && Array.isArray(block.columns)) {
      const columns = block.columns
        .map((column) => sanitizeCustomBlocks(column))
        .filter((column): column is Array<Record<string, unknown>> => Array.isArray(column) && column.length > 0);
      if (columns.length > 0) out.columns = columns;
    }

    return out;
  });
}

function sanitizeMenuItems(
  value: unknown,
  options: { includeDietary?: boolean; includePrice?: boolean } = {},
): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (item, index) => {
    const out: Record<string, unknown> = {
      id: hasNonEmptyString(item.id) ? item.id : `item-${index + 1}`,
    };
    for (const key of ['name', 'description'] as const) {
      const picked = pickOptionalString(item, key);
      if (picked) out[key] = picked;
    }
    if (options.includeDietary) {
      const dietary = pickStringArray(item.dietary);
      if (dietary) out.dietary = dietary;
    }
    if (options.includePrice) {
      const price = pickOptionalString(item, 'price');
      if (price) out.price = price;
    }
    return hasNonEmptyString(out.name) ? out : null;
  });
}

function sanitizeMenuSections(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (section, index) => {
    const items = sanitizeMenuItems(section.items, { includeDietary: true });
    if (!items) return null;

    const out: Record<string, unknown> = {
      id: hasNonEmptyString(section.id) ? section.id : `section-${index + 1}`,
      items,
    };
    for (const key of ['label', 'icon'] as const) {
      const picked = pickOptionalString(section, key);
      if (picked) out[key] = picked;
    }
    return out;
  });
}

function sanitizeMenuCourses(value: unknown): Array<Record<string, unknown>> | undefined {
  return pickObjectArray(value, (course, index) => {
    const items = sanitizeMenuItems(course.items, { includeDietary: true });
    if (!items) return null;

    const out: Record<string, unknown> = {
      id: hasNonEmptyString(course.id) ? course.id : `course-${index + 1}`,
      items,
    };
    const label = pickOptionalString(course, 'label');
    if (label) out.label = label;
    return out;
  });
}

export function sanitizePublicSectionSettings(
  type: unknown,
  variant: unknown,
  value: unknown,
): Record<string, unknown> {
  if (typeof type !== 'string' || typeof variant !== 'string') return {};
  const manifest = SECTION_MANIFESTS[type as SectionType];
  if (!manifest) return {};

  const canonicalDefinition = manifestToCanonicalSectionDefinition(manifest);
  const canonicalVariant = canonicalDefinition.variants[variant]
    ? variant
    : canonicalDefinition.defaultVariant;
  const variantDefaults = canonicalDefinition.variants[canonicalVariant]?.defaults ?? {};
  const rawSource = asRecord(
    rewriteSignedMediaUrlsToPublicDeep(value ?? {}),
  ) ?? {};
  const unwrappedSource = unwrapTopLevelBuilderSettingValues(rawSource);
  const source = asRecord(
    sanitizePublicSectionDataDeep(
      unwrappedSource,
    ),
  ) ?? {};
  const allowedKeys = new Set(PUBLIC_SECTION_SETTINGS_ALLOWLIST[type as SectionType] ?? []);
  const out: Record<string, unknown> = {};
  const normalizedSource = { ...source };

  if (type === 'footer-cta') {
    if (!hasNonEmptyString(normalizedSource.buttonLabel) && hasNonEmptyString(unwrappedSource.ctaLabel)) {
      normalizedSource.buttonLabel = unwrappedSource.ctaLabel;
    }
    if (!hasNonEmptyString(normalizedSource.rsvpUrl) && hasNonEmptyString(unwrappedSource.ctaHref)) {
      normalizedSource.rsvpUrl = normalizedSource.ctaHref;
    }
  }

  if (type === 'hero') {
    if (!hasNonEmptyString(normalizedSource.eyebrow) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.eyebrow = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(unwrappedSource.subtitle)) {
      normalizedSource.subheadline = unwrappedSource.subtitle;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
    delete normalizedSource.showTitle;
  }

  if (type === 'story') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.body) && hasNonEmptyString(unwrappedSource.storyText)) {
      normalizedSource.body = unwrappedSource.storyText;
    }
    if (!hasNonEmptyString(normalizedSource.image) && hasNonEmptyString(unwrappedSource.photo)) {
      normalizedSource.image = unwrappedSource.photo;
    }
    if (typeof normalizedSource.showDivider !== 'boolean' && unwrappedSource.showTitle === false) {
      normalizedSource.showDivider = false;
    }
    delete normalizedSource.title;
    delete normalizedSource.storyText;
    delete normalizedSource.photo;
    delete normalizedSource.showTitle;
  }

  if (type === 'venue') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(unwrappedSource.subtitle)) {
      normalizedSource.subheadline = unwrappedSource.subtitle;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
    delete normalizedSource.showTitle;
  }

  if (type === 'schedule') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  if (type === 'contact' && variant !== 'interactiveHub') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(unwrappedSource.subtitle)) {
      normalizedSource.subheadline = unwrappedSource.subtitle;
    }
    const contacts = sanitizePublicContactPeople(unwrappedSource.contacts);
    if (contacts) {
      normalizedSource.contacts = contacts;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
  }

  if (type === 'travel') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
    delete normalizedSource.showTimezoneBadge;
    delete normalizedSource.showIcsButton;
    delete normalizedSource.showParking;
  }

  if (type === 'registry') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  if (type === 'faq') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(unwrappedSource.subtitle)) {
      normalizedSource.subheadline = unwrappedSource.subtitle;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
    delete normalizedSource.showTitle;
  }

  if (type === 'gallery') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!Array.isArray(normalizedSource.images) && Array.isArray(unwrappedSource.galleryImages)) {
      normalizedSource.images = unwrappedSource.galleryImages;
    }
    if (!Array.isArray(normalizedSource.images) && Array.isArray(unwrappedSource.photos)) {
      normalizedSource.images = unwrappedSource.photos;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
    delete normalizedSource.galleryImages;
    delete normalizedSource.photos;
  }

  if (type === 'countdown') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  if (type === 'rsvp') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  if (type === 'wedding-party') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(unwrappedSource.subtitle)) {
      normalizedSource.subheadline = unwrappedSource.subtitle;
    }
    if (!hasNonEmptyString(normalizedSource.partner1Label) && hasNonEmptyString(unwrappedSource.bridalTitle)) {
      normalizedSource.partner1Label = unwrappedSource.bridalTitle;
    }
    if (!hasNonEmptyString(normalizedSource.partner2Label) && hasNonEmptyString(unwrappedSource.groomTitle)) {
      normalizedSource.partner2Label = unwrappedSource.groomTitle;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
    delete normalizedSource.bridalTitle;
    delete normalizedSource.groomTitle;
    delete normalizedSource.showTitle;
  }

  if (type === 'dress-code') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  if (type === 'menu') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(unwrappedSource.title)) {
      normalizedSource.headline = unwrappedSource.title;
    }
    delete normalizedSource.title;
    delete normalizedSource.showTitle;
  }

  for (const [key, settingValue] of Object.entries(variantDefaults)) {
    if (allowedKeys.has(key)) out[key] = settingValue;
  }
  for (const [key, settingValue] of Object.entries(normalizedSource)) {
    if (allowedKeys.has(key)) out[key] = settingValue;
  }
  if (hasNonEmptyString(normalizedSource.anchorId)) {
    out.anchorId = normalizedSource.anchorId;
  }

  if (type === 'contact') {
    if (variant === 'interactiveHub') {
      delete out.headline;
      delete out.subheadline;
      delete out.contacts;
      delete out.emailSubject;
      delete out.closingNote;
    } else {
      delete out.title;
      delete out.subtitle;
      delete out.pollPrompt;
      delete out.pollOptions;
      delete out.quizPrompt;
      delete out.quizOptions;
      delete out.correctQuizOption;
      delete out.suggestionPrompt;
      delete out.allowPublicResults;
    }
  }

  if (type === 'travel') {
    delete out.title;
    delete out.showTitle;
    delete out.showTimezoneBadge;
    delete out.showIcsButton;
    delete out.showParking;

    if (canonicalVariant === 'list') {
      const hotels = sanitizeTravelHotelList(normalizedSource.hotels);
      if (hotels) out.hotels = hotels;
    } else if (canonicalVariant === 'hotelBlock') {
      const hotels = sanitizeTravelHotelBlockList(normalizedSource.hotels);
      if (hotels) out.hotels = hotels;
    } else if (canonicalVariant === 'compact') {
      const hotels = sanitizeTravelSplitHotels(normalizedSource.hotels);
      if (hotels) out.hotels = hotels;
    } else if (canonicalVariant === 'localGuide') {
      const coffee = sanitizeTravelGuideItems(normalizedSource.coffee, 'coffee');
      const food = sanitizeTravelGuideItems(normalizedSource.food, 'food');
      const sights = sanitizeTravelGuideItems(normalizedSource.sights, 'sight');
      const nightlife = sanitizeTravelGuideItems(normalizedSource.nightlife, 'nightlife');
      if (coffee) out.coffee = coffee;
      if (food) out.food = food;
      if (sights) out.sights = sights;
      if (nightlife) out.nightlife = nightlife;
    } else if (canonicalVariant === 'mapPins') {
      const pins = sanitizeTravelPins(normalizedSource.pins);
      if (pins) out.pins = pins;
    } else if (canonicalVariant === 'splitAirHotel') {
      const hotels = sanitizeTravelSplitHotels(normalizedSource.hotels);
      if (hotels) out.hotels = hotels;
    } else if (canonicalVariant === 'thingsToDo') {
      const activities = sanitizeTravelActivities(normalizedSource.activities);
      if (activities) out.activities = activities;
    } else if (canonicalVariant === 'tiers') {
      const closest = sanitizeTravelTierHotels(normalizedSource.closest, 'closest');
      const value = sanitizeTravelTierHotels(normalizedSource.value, 'value');
      const budget = sanitizeTravelTierHotels(normalizedSource.budget, 'budget');
      if (closest) out.closest = closest;
      if (value) out.value = value;
      if (budget) out.budget = budget;
    }
  }

  if (type === 'venue') {
    delete out.title;
    delete out.subtitle;
    delete out.showTitle;
    const venues = sanitizeVenueItems(normalizedSource.venues);
    if (venues) out.venues = venues;
  }

  if (type === 'schedule') {
    delete out.title;
    delete out.showTitle;
    const events = sanitizeScheduleEvents(normalizedSource.events);
    if (events) out.events = events;
    const days = sanitizeScheduleDays(normalizedSource.days);
    if (days) out.days = days;
  }

  if (type === 'gallery') {
    delete out.title;
    delete out.showTitle;
    delete out.galleryImages;
    delete out.photos;
    const images = sanitizeGalleryImages(normalizedSource.images);
    if (images) out.images = images;
  }

  if (type === 'countdown') {
    delete out.title;
    delete out.showTitle;
  }

  if (type === 'rsvp') {
    delete out.title;
    delete out.showTitle;
    const events = sanitizeRsvpEvents(normalizedSource.events);
    if (events) out.events = events;
  }

  if (type === 'wedding-party') {
    delete out.title;
    delete out.subtitle;
    delete out.bridalTitle;
    delete out.groomTitle;
    delete out.showTitle;
    const members = sanitizeWeddingPartyMembers(normalizedSource.members);
    if (members) out.members = members;
  }

  if (type === 'dress-code') {
    delete out.title;
    delete out.showTitle;
    const colorPalette = sanitizeDressCodeColorPalette(normalizedSource.colorPalette);
    if (colorPalette) out.colorPalette = colorPalette;
    const moodImages = sanitizeDressCodeMoodImages(normalizedSource.moodImages);
    if (moodImages) out.moodImages = moodImages;
  }

  if (type === 'accommodations') {
    const hotels = canonicalVariant === 'default'
      ? sanitizeAccommodationsDefaultHotels(normalizedSource.hotels)
      : sanitizeAccommodationsVariantHotels(normalizedSource.hotels);
    if (hotels) out.hotels = hotels;
  }

  if (type === 'directions') {
    const transport = sanitizeDirectionsTransportOptions(normalizedSource.transport);
    if (transport) out.transport = transport;
  }

  if (type === 'registry') {
    delete out.title;
    delete out.showTitle;
    const links = sanitizeRegistryLinks(normalizedSource.links);
    if (links) out.links = links;
    const storeLinks = sanitizeRegistryLinks(normalizedSource.storeLinks);
    if (storeLinks) out.storeLinks = storeLinks;
    const featuredGifts = sanitizeRegistryFeaturedGifts(normalizedSource.featuredGifts);
    if (featuredGifts) out.featuredGifts = featuredGifts;

    const cashFundUrl = pickOptionalString(normalizedSource, 'cashFundUrl');
    if (cashFundUrl) out.cashFundUrl = cashFundUrl;
    if (typeof normalizedSource.cashFundEnabled === 'boolean') out.cashFundEnabled = normalizedSource.cashFundEnabled;
    const viewAllUrl = pickOptionalString(normalizedSource, 'viewAllUrl');
    if (viewAllUrl) out.viewAllUrl = viewAllUrl;
  }

  if (type === 'faq') {
    delete out.title;
    delete out.subtitle;
    delete out.showTitle;
    const items = sanitizeFaqItems(normalizedSource.items);
    if (items) out.items = items;
  }

  if (type === 'music') {
    if (canonicalVariant === 'playlist') {
      delete out.djBandName;
      delete out.djBandLabel;
      delete out.playlistUrl;
      delete out.promptLabel;
      delete out.placeholder;
      delete out.buttonLabel;
      delete out.showRecentRequests;
      delete out.showPlaylistLink;
      delete out.showMoments;
      delete out.note;
      delete out.background;
      delete out.songs;
      const playlists = sanitizeMusicPlaylists(normalizedSource.playlists);
      if (playlists) out.playlists = playlists;
    } else if (canonicalVariant === 'setlist') {
      delete out.playlistUrl;
      delete out.promptLabel;
      delete out.placeholder;
      delete out.buttonLabel;
      delete out.showRecentRequests;
      delete out.showPlaylistLink;
      delete out.showMoments;
      delete out.note;
      delete out.playlists;
      const songs = sanitizeMusicSongs(normalizedSource.songs, { includeNote: true, includeIcon: true });
      if (songs) out.songs = songs;
    } else if (canonicalVariant === 'compact') {
      delete out.djBandName;
      delete out.djBandLabel;
      delete out.requestNote;
      delete out.showRequestNote;
      delete out.playlistUrl;
      delete out.promptLabel;
      delete out.placeholder;
      delete out.buttonLabel;
      delete out.showRecentRequests;
      delete out.showPlaylistLink;
      delete out.background;
      delete out.playlists;
      const songs = sanitizeMusicSongs(normalizedSource.songs);
      if (songs) out.songs = songs;
    } else if (canonicalVariant === 'requestForm') {
      delete out.djBandName;
      delete out.djBandLabel;
      delete out.showMoments;
      delete out.note;
      delete out.songs;
      delete out.playlists;
    }
  }

  if (type === 'video') {
    if (canonicalVariant === 'card') {
      delete out.videoUrl;
      delete out.thumbnailUrl;
      delete out.videoType;
      delete out.autoplay;
      delete out.layoutStyle;
    } else {
      delete out.videos;
    }
    const videos = sanitizeVideoItems(normalizedSource.videos);
    if (videos) out.videos = videos;
  }

  if (type === 'quotes') {
    if (canonicalVariant === 'guestbook') {
      delete out.background;
      delete out.autoplay;
      delete out.autoplayInterval;
      delete out.subtitle;
      delete out.showPhotos;
      delete out.columns;
      delete out.quotes;
      const entries = sanitizeGuestbookEntries(normalizedSource.entries);
      if (entries) out.entries = entries;
    } else {
      delete out.prompt;
      delete out.entries;
      const quotes = sanitizeQuotesItems(normalizedSource.quotes);
      if (quotes) out.quotes = quotes;

      if (canonicalVariant === 'carousel') {
        delete out.subtitle;
        delete out.showPhotos;
        delete out.columns;
      } else if (canonicalVariant === 'grid') {
        delete out.autoplay;
        delete out.autoplayInterval;
        delete out.subtitle;
        delete out.showPhotos;
      } else if (canonicalVariant === 'featured') {
        delete out.background;
        delete out.autoplay;
        delete out.autoplayInterval;
        delete out.columns;
      }
    }
  }

  if (type === 'custom') {
    const blocks = sanitizeCustomBlocks(normalizedSource.blocks);
    if (blocks) out.blocks = blocks;
  }

  if (type === 'menu') {
    delete out.title;
    delete out.showTitle;

    if (canonicalVariant === 'tabs') {
      delete out.backgroundImage;
      delete out.showDietaryKey;
      delete out.sections;
      delete out.items;
      delete out.footerNote;
      delete out.showPrices;
      const courses = sanitizeMenuCourses(normalizedSource.courses);
      if (courses) out.courses = courses;
    } else if (canonicalVariant === 'card' || canonicalVariant === 'cocktailDinner') {
      delete out.items;
      delete out.courses;
      delete out.footerNote;
      delete out.showPrices;
      const sections = sanitizeMenuSections(normalizedSource.sections);
      if (sections) out.sections = sections;
    } else if (canonicalVariant === 'simple') {
      delete out.note;
      delete out.backgroundImage;
      delete out.showDietaryIcons;
      delete out.showDietaryKey;
      delete out.sections;
      delete out.courses;
      const items = sanitizeMenuItems(normalizedSource.items, { includePrice: true });
      if (items) out.items = items;
    } else if (canonicalVariant === 'printed') {
      delete out.note;
      delete out.backgroundImage;
      delete out.showDietaryIcons;
      delete out.showDietaryKey;
      delete out.sections;
      delete out.courses;
      delete out.showPrices;
      const items = sanitizeMenuItems(normalizedSource.items, { includePrice: false });
      if (items) out.items = items;
    } else if (canonicalVariant === 'illustrated') {
      delete out.note;
      delete out.backgroundImage;
      delete out.showDietaryIcons;
      delete out.showDietaryKey;
      delete out.sections;
      delete out.courses;
      delete out.footerNote;
      delete out.showPrices;
      const items = sanitizeMenuItems(normalizedSource.items, { includePrice: false });
      if (items) out.items = items;
    }
  }

  if (type === 'hero') {
    delete out.title;
    delete out.subtitle;
    delete out.showTitle;
  }

  if (type === 'story') {
    delete out.title;
    delete out.storyText;
    delete out.photo;
    delete out.showTitle;
  }

  return out;
}

export function sanitizePublicBindings(type: unknown, bindings: unknown): PublicBindingDTO | undefined {
  if (typeof type !== 'string') return undefined;
  const source = asRecord(bindings);
  if (!source) return undefined;
  const allowedKeys = PUBLIC_BINDINGS_BY_SECTION_TYPE[type as SectionType];
  if (!allowedKeys || allowedKeys.length === 0) return undefined;

  const out: PublicBindingDTO = {};
  for (const key of allowedKeys) {
    const picked = pickStringArray(source[key]);
    if (picked) out[key] = picked;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizePublicStyleOverrides(overrides: unknown): PublicStyleOverrideDTO | undefined {
  const source = asRecord(overrides);
  if (!source) return undefined;

  const out: PublicStyleOverrideDTO = {};
  for (const key of PUBLIC_STYLE_OVERRIDE_KEYS) {
    const value = asString(source[key]);
    if (!value) continue;
    out[key] = key === 'sideImage'
      ? sanitizePublicSectionDataDeep(rewriteSignedMediaUrlsToPublicDeep(value)) as string
      : value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function toPublicSectionDTO(
  section: Partial<BuilderSectionInstance> & {
    id: string;
    type: SectionType;
    variant?: string | null;
    enabled?: boolean | null;
    orderIndex?: number | null;
    settings?: Record<string, unknown> | null;
    bindings?: Record<string, unknown> | null;
    styleOverrides?: BuilderSectionStyleOverrides | Record<string, unknown> | null;
  },
): PublicSectionDTO {
  const publicBindings = sanitizePublicBindings(section.type, section.bindings);
  const publicStyleOverrides = sanitizePublicStyleOverrides(section.styleOverrides);
  return {
    id: section.id,
    type: section.type,
    variant: typeof section.variant === 'string' ? section.variant : 'default',
    enabled: section.enabled === true,
    orderIndex: asFiniteNumber(section.orderIndex) ?? 0,
    settings: sanitizePublicSectionSettings(section.type, section.variant ?? 'default', section.settings ?? {}),
    ...(publicBindings ? { bindings: publicBindings } : {}),
    ...(publicStyleOverrides ? { styleOverrides: publicStyleOverrides } : {}),
  };
}

export function toPublicPageDTO(
  page: Partial<BuilderPage> & {
    id: string;
    title?: string | null;
    slug?: string | null;
    orderIndex?: number | null;
    sections?: Array<Partial<BuilderSectionInstance> & { id: string; type: SectionType }> | null;
    meta?: Record<string, unknown> | null;
  },
): PublicPageDTO {
  return {
    id: page.id,
    title: asBuilderString(page.title) ?? '',
    slug: asBuilderString(page.slug) ?? '',
    orderIndex: asFiniteNumber(page.orderIndex) ?? 0,
    sections: Array.isArray(page.sections) ? page.sections.map((section) => toPublicSectionDTO({
      id: section.id,
      type: section.type,
      variant: section.variant,
      enabled: section.enabled,
      orderIndex: section.orderIndex,
      settings: (section.settings as Record<string, unknown> | null | undefined) ?? undefined,
      bindings: (section.bindings as Record<string, unknown> | null | undefined) ?? undefined,
      styleOverrides: (section.styleOverrides as Record<string, unknown> | null | undefined) ?? undefined,
    })) : [],
    meta: {
      isHome: asRecord(page.meta)?.isHome === true,
      isHidden: asRecord(page.meta)?.isHidden === true,
    },
  };
}
