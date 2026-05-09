import type { BuilderProject } from '../types/builder/project.ts';
import type { BuilderSectionInstance } from '../types/builder/section.ts';
import type { WeddingDataV1 } from '../types/weddingData.ts';
import { normalizeWeddingData } from '../types/weddingData.ts';
import { buildCoupleDisplayName } from './coupleDisplayName.ts';
import { safeJsonParse } from './jsonUtils.ts';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl.ts';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    const parsed = safeJsonParse<Record<string, unknown> | null>(value, null);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }
  return null;
};

const withTruthfulCoupleDisplayName = (data: WeddingDataV1): WeddingDataV1 => {
  const displayName = data.couple.displayName
    || buildCoupleDisplayName(data.couple.partner1Name, data.couple.partner2Name);

  if (displayName === data.couple.displayName) return data;

  return {
    ...data,
    couple: {
      ...data.couple,
      displayName,
    },
  };
};

const asTrimmedString = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const toCanonicalRowWeddingDateISO = (value: unknown): string => {
  const raw = asTrimmedString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10) === raw ? date.toISOString() : '';
};

const getIsoDatePart = (value: unknown): string => {
  const raw = asTrimmedString(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
};

const rebaseIsoDatePart = (value: unknown, nextDatePart: string): string | undefined => {
  const raw = asTrimmedString(value);
  if (!raw || !nextDatePart || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return typeof value === 'string' ? value : undefined;
  return `${nextDatePart}${raw.slice(10)}`;
};

const withCanonicalRowCoupleNames = (data: WeddingDataV1, row: Record<string, unknown>): WeddingDataV1 => {
  const partner1Name = asTrimmedString(row.couple_name_1);
  const partner2Name = asTrimmedString(row.couple_name_2);
  if (!partner1Name && !partner2Name) return data;

  const displayName = buildCoupleDisplayName(partner1Name, partner2Name);
  const currentPartner1 = asTrimmedString(data.couple.partner1Name);
  const currentPartner2 = asTrimmedString(data.couple.partner2Name);
  const currentDisplay = asTrimmedString(data.couple.displayName);

  if (
    currentPartner1 === partner1Name
    && currentPartner2 === partner2Name
    && currentDisplay === displayName
  ) {
    return data;
  }

  return {
    ...data,
    couple: {
      ...data.couple,
      partner1Name,
      partner2Name,
      displayName,
    },
  };
};

const withCanonicalRowEventData = (data: WeddingDataV1, row: Record<string, unknown>): WeddingDataV1 => {
  const rowWeddingData = safeJsonParse<WeddingDataV1 | null>(row.wedding_data, null);
  const canonical = rowWeddingData ? normalizeWeddingData(rowWeddingData) : null;
  const canonicalDate = toCanonicalRowWeddingDateISO(row.wedding_date)
    || asTrimmedString(canonical?.event.weddingDateISO);
  const canonicalHeadline = asTrimmedString(canonical?.event.headline);
  const canonicalRsvpCallToAction = asTrimmedString(canonical?.event.rsvpCallToAction);
  const canonicalVenueName = asTrimmedString(row.venue_name);
  const canonicalVenueAddress = asTrimmedString(row.wedding_location);
  const hasCanonicalVenue = Boolean(canonicalVenueName || canonicalVenueAddress);
  const sourceDatePart = getIsoDatePart(data.event.weddingDateISO ?? data.event.date);
  const canonicalDatePart = getIsoDatePart(canonicalDate);
  const scheduleSharesSourceDate = Boolean(sourceDatePart)
    && data.schedule.length > 0
    && data.schedule.every((item) => {
      const startDate = getIsoDatePart(item.startTimeISO);
      const endDate = getIsoDatePart(item.endTimeISO);
      return (!startDate || startDate === sourceDatePart) && (!endDate || endDate === sourceDatePart);
    });
  const shouldRebaseSchedule = Boolean(canonicalDatePart && sourceDatePart && canonicalDatePart !== sourceDatePart && scheduleSharesSourceDate);
  const hasCanonicalEvent = Boolean(canonicalDate || canonicalHeadline || canonicalRsvpCallToAction || hasCanonicalVenue || shouldRebaseSchedule);
  if (!hasCanonicalEvent) return data;

  const venues = hasCanonicalVenue
    ? data.venues.length > 0
      ? data.venues.map((venue, index) => index === 0
        ? {
            ...venue,
            ...(canonicalVenueName ? { name: canonicalVenueName } : {}),
            ...(canonicalVenueAddress ? { address: canonicalVenueAddress } : {}),
          }
        : venue)
      : [{
          id: 'primary',
          ...(canonicalVenueName ? { name: canonicalVenueName } : {}),
          ...(canonicalVenueAddress ? { address: canonicalVenueAddress } : {}),
        }]
    : data.venues;

  const schedule = shouldRebaseSchedule
    ? data.schedule.map((item) => ({
        ...item,
        startTimeISO: rebaseIsoDatePart(item.startTimeISO, canonicalDatePart),
        endTimeISO: rebaseIsoDatePart(item.endTimeISO, canonicalDatePart),
      }))
    : data.schedule;

  return {
    ...data,
    event: {
      ...data.event,
      ...(canonicalHeadline ? { headline: canonicalHeadline } : {}),
      ...(canonicalDate ? { weddingDateISO: canonicalDate } : {}),
      ...(canonicalRsvpCallToAction ? { rsvpCallToAction: canonicalRsvpCallToAction } : {}),
    },
    venues,
    schedule,
  };
};

export const getIsPublishedFromSiteRow = (row: Record<string, unknown>): boolean => {
  const siteJsonMeta = asRecord(row.site_json);
  const publishedJsonMeta = asRecord(row.published_json);
  const publishMeta = publishedJsonMeta ?? siteJsonMeta;
  const lastPublishedAt = typeof publishMeta?.lastPublishedAt === 'string'
    ? (publishMeta.lastPublishedAt as string).trim()
    : '';

  return Boolean(
    row.is_published === true ||
    publishMeta?.publishStatus === 'published' ||
    (typeof publishMeta?.publishedVersion === 'number' && (publishMeta.publishedVersion as number) > 0) ||
    lastPublishedAt.length > 0
  );
};

const getProjectPages = (project: unknown): unknown[] => {
  const parsed = safeJsonParse<Record<string, unknown> | null>(project, null);
  return Array.isArray(parsed?.pages) ? parsed.pages : [];
};

const mergePublishedSection = (
  publishedSection: BuilderSectionInstance,
  fallbackSection: BuilderSectionInstance | undefined,
): BuilderSectionInstance => {
  if (!fallbackSection) return publishedSection;

  return {
    ...fallbackSection,
    ...publishedSection,
    settings: {
      ...(fallbackSection.settings ?? {}),
      ...(publishedSection.settings ?? {}),
    },
    bindings: {
      ...(fallbackSection.bindings ?? {}),
      ...(publishedSection.bindings ?? {}),
    },
    styleOverrides: {
      ...(fallbackSection.styleOverrides ?? {}),
      ...(publishedSection.styleOverrides ?? {}),
    },
    meta: {
      ...(fallbackSection.meta ?? {}),
      ...(publishedSection.meta ?? {}),
    },
  };
};

const mergePublishedProjectWithFallback = (
  publishedProject: BuilderProject | null,
  fallbackProject: BuilderProject | null,
): BuilderProject | null => {
  if (!publishedProject) return fallbackProject;
  if (!fallbackProject) return publishedProject;

  if (!Array.isArray(publishedProject.pages) || publishedProject.pages.length === 0) {
    return {
      ...fallbackProject,
      ...publishedProject,
      pages: fallbackProject.pages,
      meta: {
        ...(fallbackProject.meta ?? {}),
        ...(publishedProject.meta ?? {}),
      },
    };
  }

  const fallbackPagesById = new Map(fallbackProject.pages.map((page) => [page.id, page]));
  const mergedPages = publishedProject.pages.map((page) => {
    const fallbackPage = fallbackPagesById.get(page.id);

    if (!fallbackPage) return page;
    if (!Array.isArray(page.sections) || page.sections.length === 0) {
      return {
        ...fallbackPage,
        ...page,
        sections: fallbackPage.sections,
        meta: {
          ...(fallbackPage.meta ?? {}),
          ...(page.meta ?? {}),
        },
      };
    }

    const fallbackSectionsById = new Map(fallbackPage.sections.map((section) => [section.id, section]));

    return {
      ...fallbackPage,
      ...page,
      sections: page.sections.map((section) => mergePublishedSection(section, fallbackSectionsById.get(section.id))),
      meta: {
        ...(fallbackPage.meta ?? {}),
        ...(page.meta ?? {}),
      },
    };
  });

  if (mergedPages.length === 0) return fallbackProject;

  return {
    ...fallbackProject,
    ...publishedProject,
    pages: mergedPages,
    meta: {
      ...(fallbackProject.meta ?? {}),
      ...(publishedProject.meta ?? {}),
    },
  };
};

export const getPublicBuilderProject = (row: Record<string, unknown>): BuilderProject | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = isPublished ? (row.published_json ?? row.site_json) : row.site_json;
  const preferredProject = safeJsonParse<BuilderProject | null>(preferredSource, null);
  const fallbackProject = preferredSource === row.site_json
    ? null
    : safeJsonParse<BuilderProject | null>(row.site_json, null);
  const mergedProject = mergePublishedProjectWithFallback(preferredProject, fallbackProject);

  if (mergedProject && getProjectPages(mergedProject).length > 0) {
    return rewriteSignedMediaUrlsToPublicDeep(mergedProject);
  }

  if (preferredSource !== row.site_json) {
    if (fallbackProject && getProjectPages(fallbackProject).length > 0) {
      return rewriteSignedMediaUrlsToPublicDeep(fallbackProject);
    }
  }

  return preferredProject ? rewriteSignedMediaUrlsToPublicDeep(preferredProject) : null;
};

export const getPublicWeddingData = (row: Record<string, unknown>): WeddingDataV1 | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const siteSource = asRecord(row.site_json);
  const preferredSource = asRecord(isPublished ? (row.published_json ?? row.site_json) : row.site_json);
  const fallbackSource = preferredSource === siteSource ? null : siteSource;

  const candidates = [
    preferredSource?.weddingDataSnapshot,
    fallbackSource?.weddingDataSnapshot,
    row.wedding_data,
    preferredSource?.weddingData,
    fallbackSource?.weddingData,
  ];

  for (const candidate of candidates) {
    const parsed = safeJsonParse<WeddingDataV1 | null>(candidate, null);
    if (parsed) {
      return rewriteSignedMediaUrlsToPublicDeep(withCanonicalRowCoupleNames(
        withCanonicalRowEventData(withTruthfulCoupleDisplayName(normalizeWeddingData(parsed)), row),
        row,
      ));
    }
  }

  return null;
};
