import type { PublicSiteRenderModel } from './publicSiteRenderModel';
import { customerSafeErrorMessage } from "./customerSafeError";
import { supabase } from './supabase';
import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests';
import { manifestToCanonicalSectionDefinition } from './canonicalSectionRegistry';

export type PublicSiteGateStatus =
  | "unavailable"
  | "coming_soon"
  | "password_required"
  | "invite_required"
  | "open";

export interface PublicSiteSafeRow {
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

export interface PublicSiteAccessResponse {
  status: PublicSiteGateStatus;
  site: PublicSiteSafeRow | null;
  passwordSession?: string | null;
}

const PUBLIC_SITE_ACCESS_ERROR_COPY = "Could not check this wedding site right now. Please try again.";

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nullableFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sanitizePublicRenderSectionSettings(
  type: unknown,
  variant: unknown,
  value: unknown,
): Record<string, unknown> {
  if (typeof type !== 'string' || typeof variant !== 'string') return {};
  const settings = asRecord(value) ?? {};
  const manifest = SECTION_MANIFESTS[type as keyof typeof SECTION_MANIFESTS];
  if (!manifest) return {};

  const canonicalDefinition = manifestToCanonicalSectionDefinition(manifest);
  const canonicalVariant = canonicalDefinition.variants[variant]
    ? variant
    : canonicalDefinition.defaultVariant;
  const variantDefaults = canonicalDefinition.variants[canonicalVariant]?.defaults ?? {};
  const allowedKeys = new Set(manifest.settingsSchema.fields.map((field) => field.key));
  const pickedSettings = Object.fromEntries(
    Object.entries(settings).filter(([key]) => allowedKeys.has(key)),
  );

  return {
    ...variantDefaults,
    ...pickedSettings,
  };
}

function sanitizePublicRenderSection(value: unknown) {
  const section = asRecord(value);
  const bindings = asRecord(section?.bindings);
  const styleOverrides = asRecord(section?.styleOverrides);
  return {
    id: typeof section?.id === 'string' ? section.id : '',
    type: typeof section?.type === 'string' ? section.type : '',
    variant: typeof section?.variant === 'string' ? section.variant : 'default',
    enabled: section?.enabled === true,
    orderIndex: typeof section?.orderIndex === 'number' ? section.orderIndex : 0,
    settings: sanitizePublicRenderSectionSettings(section?.type, section?.variant, section?.settings),
    bindings: {
      ...(Array.isArray(bindings?.venueIds) ? { venueIds: bindings.venueIds.filter((item): item is string => typeof item === 'string') } : {}),
      ...(Array.isArray(bindings?.scheduleItemIds) ? { scheduleItemIds: bindings.scheduleItemIds.filter((item): item is string => typeof item === 'string') } : {}),
      ...(Array.isArray(bindings?.linkIds) ? { linkIds: bindings.linkIds.filter((item): item is string => typeof item === 'string') } : {}),
      ...(Array.isArray(bindings?.faqIds) ? { faqIds: bindings.faqIds.filter((item): item is string => typeof item === 'string') } : {}),
    },
    styleOverrides: {
      ...(typeof styleOverrides?.backgroundColor === 'string' ? { backgroundColor: styleOverrides.backgroundColor } : {}),
      ...(typeof styleOverrides?.textColor === 'string' ? { textColor: styleOverrides.textColor } : {}),
      ...(typeof styleOverrides?.paddingTop === 'string' ? { paddingTop: styleOverrides.paddingTop } : {}),
      ...(typeof styleOverrides?.paddingBottom === 'string' ? { paddingBottom: styleOverrides.paddingBottom } : {}),
      ...(typeof styleOverrides?.sideImage === 'string' ? { sideImage: styleOverrides.sideImage } : {}),
      ...(typeof styleOverrides?.sideImagePosition === 'string' ? { sideImagePosition: styleOverrides.sideImagePosition } : {}),
      ...(typeof styleOverrides?.sideImageSize === 'string' ? { sideImageSize: styleOverrides.sideImageSize } : {}),
      ...(typeof styleOverrides?.sideImageFit === 'string' ? { sideImageFit: styleOverrides.sideImageFit } : {}),
      ...(typeof styleOverrides?.animationPreset === 'string' ? { animationPreset: styleOverrides.animationPreset } : {}),
    },
  };
}

function sanitizePublicRenderPage(value: unknown) {
  const page = asRecord(value);
  return {
    id: typeof page?.id === 'string' ? page.id : '',
    title: typeof page?.title === 'string' ? page.title : '',
    slug: typeof page?.slug === 'string' ? page.slug : '',
    orderIndex: typeof page?.orderIndex === 'number' ? page.orderIndex : 0,
    sections: Array.isArray(page?.sections) ? page.sections.map(sanitizePublicRenderSection) : [],
    meta: {
      isHome: asRecord(page?.meta)?.isHome === true,
    },
  };
}

function sanitizePublicWeddingModel(value: unknown): PublicSiteRenderModel['wedding'] {
  const wedding = asRecord(value);
  if (!wedding) return null;

  const couple = asRecord(wedding.couple);
  const event = asRecord(wedding.event);
  const rsvp = asRecord(wedding.rsvp);
  const travel = asRecord(wedding.travel);
  const registry = asRecord(wedding.registry);
  const theme = asRecord(wedding.theme);
  const media = asRecord(wedding.media);
  const version = wedding.version === '1' ? '1' : undefined;

  return {
    ...(version ? { version } : {}),
    couple: {
      ...(typeof couple?.partner1Name === 'string' ? { partner1Name: couple.partner1Name } : {}),
      ...(typeof couple?.partner2Name === 'string' ? { partner2Name: couple.partner2Name } : {}),
      ...(typeof couple?.displayName === 'string' ? { displayName: couple.displayName } : {}),
      ...(typeof couple?.story === 'string' ? { story: couple.story } : {}),
    },
    event: {
      ...(typeof event?.weddingDateISO === 'string' ? { weddingDateISO: event.weddingDateISO } : {}),
      ...(typeof event?.date === 'string' ? { date: event.date } : {}),
      ...(typeof event?.timezone === 'string' ? { timezone: event.timezone } : {}),
      ...(typeof event?.headline === 'string' ? { headline: event.headline } : {}),
      ...(typeof event?.rsvpCallToAction === 'string' ? { rsvpCallToAction: event.rsvpCallToAction } : {}),
    },
    venues: Array.isArray(wedding.venues)
      ? wedding.venues.flatMap((item, index) => {
          const venue = asRecord(item);
          if (!venue) return [];
          const id = typeof venue?.id === 'string' ? venue.id : `venue-${index}`;
          return [{
            id,
            ...(nullableFiniteNumber(venue.orderIndex) !== null ? { orderIndex: venue.orderIndex as number } : {}),
            ...(typeof venue?.name === 'string' ? { name: venue.name } : {}),
            ...(typeof venue?.address === 'string' ? { address: venue.address } : {}),
            ...(typeof venue?.notes === 'string' ? { notes: venue.notes } : {}),
          }];
        })
      : [],
    schedule: Array.isArray(wedding.schedule)
      ? wedding.schedule.flatMap((item, index) => {
          const scheduleItem = asRecord(item);
          if (typeof scheduleItem?.label !== 'string') return [];
          return [{
            id: typeof scheduleItem.id === 'string' ? scheduleItem.id : `schedule-${index}`,
            label: scheduleItem.label,
            ...(typeof scheduleItem.startTimeISO === 'string' ? { startTimeISO: scheduleItem.startTimeISO } : {}),
            ...(typeof scheduleItem.endTimeISO === 'string' ? { endTimeISO: scheduleItem.endTimeISO } : {}),
            ...(typeof scheduleItem.venueId === 'string' ? { venueId: scheduleItem.venueId } : {}),
            ...(typeof scheduleItem.notes === 'string' ? { notes: scheduleItem.notes } : {}),
          }];
        })
      : [],
    rsvp: {
      enabled: rsvp?.enabled !== false,
      ...(typeof rsvp?.deadlineISO === 'string' ? { deadlineISO: rsvp.deadlineISO } : {}),
    },
    travel: {
      ...(typeof travel?.notes === 'string' ? { notes: travel.notes } : {}),
      ...(typeof travel?.parkingInfo === 'string' ? { parkingInfo: travel.parkingInfo } : {}),
      ...(typeof travel?.hotelInfo === 'string' ? { hotelInfo: travel.hotelInfo } : {}),
      ...(typeof travel?.flightInfo === 'string' ? { flightInfo: travel.flightInfo } : {}),
      ...(typeof travel?.accommodations === 'string'
        ? { accommodations: travel.accommodations }
        : Array.isArray(travel?.accommodations)
          ? { accommodations: travel.accommodations.filter((item): item is string => typeof item === 'string') }
          : {}),
    },
    registry: {
      links: Array.isArray(registry?.links)
        ? registry.links.flatMap((item, index) => {
            const link = asRecord(item);
            if (typeof link?.url !== 'string') return [];
            return [{
              id: typeof link.id === 'string' ? link.id : `registry-${index}`,
              ...(typeof link.label === 'string' ? { label: link.label } : {}),
              url: link.url,
            }];
          })
        : [],
    },
    faq: Array.isArray(wedding.faq)
      ? wedding.faq.flatMap((item, index) => {
          const faq = asRecord(item);
          if (typeof faq?.q !== 'string' || typeof faq?.a !== 'string') return [];
          return [{
            id: typeof faq.id === 'string' ? faq.id : `faq-${index}`,
            q: faq.q,
            a: faq.a,
          }];
        })
      : [],
    theme: {
      ...(typeof theme?.preset === 'string' ? { preset: theme.preset } : {}),
    },
    media: {
      ...(typeof media?.heroImageUrl === 'string' ? { heroImageUrl: media.heroImageUrl } : {}),
      gallery: Array.isArray(media?.gallery)
        ? media.gallery.flatMap((item, index) => {
            const galleryItem = asRecord(item);
            if (typeof galleryItem?.url !== 'string') return [];
            return [{
              id: typeof galleryItem.id === 'string' ? galleryItem.id : `gallery-${index}`,
              url: galleryItem.url,
              ...(typeof galleryItem.caption === 'string' ? { caption: galleryItem.caption } : {}),
            }];
          })
        : [],
    },
  };
}

function sanitizePublicThemeModel(value: unknown): PublicSiteRenderModel['theme'] {
  const theme = asRecord(value);
  const tokens = asRecord(theme?.tokens);
  const pickedTokens = tokens
    ? {
        ...(typeof tokens.colorPrimary === 'string' ? { colorPrimary: tokens.colorPrimary } : {}),
        ...(typeof tokens.colorPrimaryHover === 'string' ? { colorPrimaryHover: tokens.colorPrimaryHover } : {}),
        ...(typeof tokens.colorPrimaryLight === 'string' ? { colorPrimaryLight: tokens.colorPrimaryLight } : {}),
        ...(typeof tokens.colorAccent === 'string' ? { colorAccent: tokens.colorAccent } : {}),
        ...(typeof tokens.colorAccentHover === 'string' ? { colorAccentHover: tokens.colorAccentHover } : {}),
        ...(typeof tokens.colorAccentLight === 'string' ? { colorAccentLight: tokens.colorAccentLight } : {}),
        ...(typeof tokens.colorSecondary === 'string' ? { colorSecondary: tokens.colorSecondary } : {}),
        ...(typeof tokens.colorBackground === 'string' ? { colorBackground: tokens.colorBackground } : {}),
        ...(typeof tokens.colorSurface === 'string' ? { colorSurface: tokens.colorSurface } : {}),
        ...(typeof tokens.colorSurfaceSubtle === 'string' ? { colorSurfaceSubtle: tokens.colorSurfaceSubtle } : {}),
        ...(typeof tokens.colorBorder === 'string' ? { colorBorder: tokens.colorBorder } : {}),
        ...(typeof tokens.colorTextPrimary === 'string' ? { colorTextPrimary: tokens.colorTextPrimary } : {}),
        ...(typeof tokens.colorTextSecondary === 'string' ? { colorTextSecondary: tokens.colorTextSecondary } : {}),
      }
    : null;
  return {
    preset: typeof theme?.preset === 'string' ? theme.preset : null,
    tokens: pickedTokens as PublicSiteRenderModel['theme']['tokens'],
  };
}

function sanitizePublicRenderModel(value: unknown): PublicSiteRenderModel {
  const renderModel = asRecord(value);
  return {
    pages: Array.isArray(renderModel?.pages) ? renderModel.pages.map(sanitizePublicRenderPage) as PublicSiteRenderModel['pages'] : [],
    wedding: sanitizePublicWeddingModel(renderModel?.wedding),
    theme: sanitizePublicThemeModel(renderModel?.theme),
  };
}

export function sanitizePublicSiteSafeRow(site: unknown): PublicSiteSafeRow | null {
  if (!site || typeof site !== "object" || Array.isArray(site)) return null;
  const row = site as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    site_slug: nullableString(row.site_slug),
    site_url: nullableString(row.site_url),
    is_published: row.is_published === true,
    couple_name_1: nullableString(row.couple_name_1),
    couple_name_2: nullableString(row.couple_name_2),
    wedding_date: nullableString(row.wedding_date),
    venue_name: nullableString(row.venue_name),
    wedding_location: nullableString(row.wedding_location),
    template_id: nullableString(row.template_id),
    default_language: nullableString(row.default_language),
    allow_search_indexing: row.allow_search_indexing !== false,
    render_model: sanitizePublicRenderModel(row.render_model),
  };
}

export function safePublicSiteAccessError(err: unknown): string {
  return customerSafeErrorMessage(err, PUBLIC_SITE_ACCESS_ERROR_COPY, {
    allow: [/^Too many password attempts\. Please wait a minute and try again\.$/i],
  });
}

async function callPublicSiteAccess(
  body: Record<string, unknown>,
): Promise<PublicSiteAccessResponse> {
  const { data: json, error } = await supabase.functions.invoke('public-site-access', {
    body,
  });

  if (error) {
    const message = typeof error.message === 'string' ? error.message : '';
    throw new Error(safePublicSiteAccessError(message || 'Error invoking public-site-access'));
  }

  const status = (json as { status?: string } | null | undefined)?.status;
  if (
    status !== "unavailable" &&
    status !== "coming_soon" &&
    status !== "password_required" &&
    status !== "invite_required" &&
    status !== "open"
  ) {
    throw new Error("Invalid public site response");
  }

  return {
    status,
    site: sanitizePublicSiteSafeRow((json as { site?: unknown }).site ?? null),
    passwordSession: ((json as { passwordSession?: unknown }).passwordSession ?? null) as string | null,
  };
}

export async function fetchPublicSiteAccess(input: {
  slug: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
  language?: string | null;
}): Promise<PublicSiteAccessResponse> {
  return callPublicSiteAccess({
    action: "resolve",
    slug: input.slug,
    inviteToken: input.inviteToken ?? null,
    passwordSession: input.passwordSession ?? null,
    language: input.language ?? null,
  });
}

export async function requestPublicSitePasswordUnlock(input: {
  slug: string;
  password: string;
}): Promise<{ ok: boolean; passwordSession?: string | null }> {
  const result = await callPublicSiteAccess({
    action: "password_unlock",
    slug: input.slug,
    password: input.password,
  });

  return {
    ok: result.status === "open",
    passwordSession: result.passwordSession ?? null,
  };
}
