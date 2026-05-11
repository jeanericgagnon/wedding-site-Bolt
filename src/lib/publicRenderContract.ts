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

export const PUBLIC_SECTION_SETTINGS_ALLOWLIST: Record<SectionType, readonly string[]> = {
  hero: ['headline', 'subtitle', 'title', 'showTitle', 'backgroundImage', 'overlayOpacity'],
  story: ['showTitle', 'title', 'storyText', 'photo'],
  venue: ['showTitle', 'title', 'showMap'],
  schedule: ['showTitle', 'title'],
  travel: ['showTitle', 'title', 'showTimezoneBadge', 'showIcsButton'],
  registry: ['showTitle', 'title', 'message'],
  faq: ['showTitle', 'title'],
  rsvp: ['showTitle', 'title', 'deadlineText', 'confirmationMessage', 'mode', 'embedUrl', 'embedHeight'],
  gallery: ['eyebrow', 'headline', 'animation', 'showCaptions', 'enableLightbox', 'autoScroll', 'continuousGlide', 'glideSpeed'],
  countdown: ['showTitle', 'title', 'eyebrow', 'targetDate', 'message', 'showSeconds', 'imageUrl'],
  'wedding-party': ['showTitle', 'title', 'eyebrow', 'subtitle', 'bridalTitle', 'groomTitle'],
  'dress-code': ['showTitle', 'eyebrow', 'presetCode', 'dressCodeLabel', 'description', 'colorNote', 'additionalNote', 'avoidNote', 'formalityLevel'],
  accommodations: ['showTitle', 'title', 'eyebrow', 'generalNote', 'blockNote', 'shuttleNote', 'mapImage'],
  contact: ['showTitle', 'title', 'headline', 'eyebrow', 'subtitle', 'subheadline', 'introText', 'emailSubject', 'closingNote', 'pollPrompt', 'pollOptions', 'quizPrompt', 'quizOptions', 'correctQuizOption', 'suggestionPrompt', 'allowPublicResults'],
  'footer-cta': ['headline', 'subtext', 'buttonLabel', 'rsvpUrl', 'footerNote'],
  custom: ['backgroundColor', 'paddingSize'],
  quotes: ['eyebrow', 'headline', 'background', 'autoplay'],
  menu: ['eyebrow', 'headline', 'subtitle', 'note', 'backgroundImage', 'showDietaryIcons', 'showDietaryKey'],
  music: ['eyebrow', 'headline', 'subtitle', 'djBandName', 'djBandLabel', 'requestNote', 'showRequestNote', 'playlistUrl', 'promptLabel', 'placeholder', 'buttonLabel', 'showRecentRequests', 'background'],
  directions: ['eyebrow', 'headline', 'venueName', 'address', 'city', 'mapUrl', 'parkingNote', 'shuttleNote', 'publicTransitNote', 'drivingTime', 'drivingTimeFrom'],
  video: ['eyebrow', 'headline', 'subtitle', 'videoUrl', 'thumbnailUrl', 'videoType', 'background'],
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
  contact: ['headline', 'subheadline'],
  'footer-cta': ['buttonLabel', 'rsvpUrl'],
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const picked = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return picked.length > 0 ? picked : undefined;
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
  const source = asRecord(
    sanitizePublicSectionDataDeep(
      rawSource,
    ),
  ) ?? {};
  const allowedKeys = new Set(PUBLIC_SECTION_SETTINGS_ALLOWLIST[type as SectionType] ?? []);
  const out: Record<string, unknown> = {};
  const normalizedSource = { ...source };

  if (type === 'footer-cta') {
    if (!hasNonEmptyString(normalizedSource.buttonLabel) && hasNonEmptyString(rawSource.ctaLabel)) {
      normalizedSource.buttonLabel = rawSource.ctaLabel;
    }
    if (!hasNonEmptyString(normalizedSource.rsvpUrl) && hasNonEmptyString(normalizedSource.ctaHref)) {
      normalizedSource.rsvpUrl = normalizedSource.ctaHref;
    }
  }

  if (type === 'contact' && variant !== 'interactiveHub') {
    if (!hasNonEmptyString(normalizedSource.headline) && hasNonEmptyString(rawSource.title)) {
      normalizedSource.headline = rawSource.title;
    }
    if (!hasNonEmptyString(normalizedSource.subheadline) && hasNonEmptyString(rawSource.subtitle)) {
      normalizedSource.subheadline = rawSource.subtitle;
    }
    delete normalizedSource.title;
    delete normalizedSource.subtitle;
  }

  for (const [key, settingValue] of Object.entries(variantDefaults)) {
    if (allowedKeys.has(key)) out[key] = settingValue;
  }
  for (const [key, settingValue] of Object.entries(normalizedSource)) {
    if (allowedKeys.has(key)) out[key] = settingValue;
  }

  if (type === 'contact') {
    if (variant === 'interactiveHub') {
      delete out.headline;
      delete out.subheadline;
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
    orderIndex: typeof section.orderIndex === 'number' ? section.orderIndex : 0,
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
    title: typeof page.title === 'string' ? page.title : '',
    slug: typeof page.slug === 'string' ? page.slug : '',
    orderIndex: typeof page.orderIndex === 'number' ? page.orderIndex : 0,
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
      isHidden: false,
    },
  };
}
