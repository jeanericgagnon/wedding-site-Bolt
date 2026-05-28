import type { BuilderProject } from '../types/builder/project';
import type { BuilderSectionInstance } from '../types/builder/section';
import type { WeddingDataV1 } from '../types/weddingData';
import type { BuilderV2Document } from '../builder-v2/contracts';
import { builderV2DocumentToBuilderProject, looksLikeBuilderProject, looksLikeBuilderV2Document } from '../builder-v2/adapter';
import { validateBuilderV2Document } from '../builder-v2/validate';
import { buildCoupleDisplayName } from './coupleDisplayName';
import { safeJsonParse } from './jsonUtils';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl';
import { stripPublicInternalFieldsDeep } from './publicSiteBoundary';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    const parsed = safeJsonParse<Record<string, unknown> | null>(value, null);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }
  return null;
};

const withTruthfulCoupleDisplayName = (data: WeddingDataV1): WeddingDataV1 => {
  if (!data.couple) return data;

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

const hasMeaningfulString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const hasMeaningfulWeddingData = (value: unknown): value is WeddingDataV1 => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<WeddingDataV1>;
  const couple = data.couple;
  if (
    couple
    && (
      hasMeaningfulString(couple.displayName)
      || hasMeaningfulString(couple.partner1Name)
      || hasMeaningfulString(couple.partner2Name)
      || hasMeaningfulString(couple.story)
    )
  ) {
    return true;
  }

  if (hasMeaningfulString(data.event?.weddingDateISO) || hasMeaningfulString(data.event?.timezone)) {
    return true;
  }

  if (Array.isArray(data.venues) && data.venues.some((venue) => (
    hasMeaningfulString(venue?.name)
    || hasMeaningfulString(venue?.address)
    || hasMeaningfulString(venue?.notes)
  ))) {
    return true;
  }

  if (Array.isArray(data.schedule) && data.schedule.some((item) => (
    hasMeaningfulString(item?.label)
    || hasMeaningfulString(item?.startTimeISO)
    || hasMeaningfulString(item?.endTimeISO)
    || hasMeaningfulString(item?.notes)
  ))) {
    return true;
  }

  if (
    hasMeaningfulString(data.travel?.notes)
    || hasMeaningfulString(data.travel?.hotelInfo)
    || hasMeaningfulString(data.travel?.flightInfo)
    || hasMeaningfulString(data.travel?.parkingInfo)
  ) {
    return true;
  }

  if (
    Array.isArray(data.registry?.links) && data.registry.links.some((link) => (
      hasMeaningfulString(link?.url) || hasMeaningfulString(link?.label)
    ))
  ) {
    return true;
  }

  if (hasMeaningfulString(data.registry?.notes)) {
    return true;
  }

  if (Array.isArray(data.faq) && data.faq.some((item) => (
    hasMeaningfulString(item?.q) || hasMeaningfulString(item?.a)
  ))) {
    return true;
  }

  if (
    hasMeaningfulString(data.media?.heroImageUrl)
    || (Array.isArray(data.media?.gallery) && data.media.gallery.some((item) => hasMeaningfulString(item?.url)))
  ) {
    return true;
  }

  return false;
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

const toPublicBuilderProject = (
  source: unknown,
  fallbackProject?: BuilderProject | null,
): BuilderProject | null => {
  const parsed = safeJsonParse<unknown>(source, null);
  if (!parsed) return null;
  if (looksLikeBuilderProject(parsed)) return parsed;
  if (looksLikeBuilderV2Document(parsed)) {
    const validated = validateBuilderV2Document(parsed);
    return validated.ok ? builderV2DocumentToBuilderProject(validated.doc, fallbackProject) : null;
  }
  return null;
};

const toPublicBuilderV2Document = (source: unknown): BuilderV2Document | null => {
  const parsed = safeJsonParse<unknown>(source, null);
  if (!parsed || !looksLikeBuilderV2Document(parsed)) return null;
  const validated = validateBuilderV2Document(parsed);
  return validated.ok ? validated.doc : null;
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
  const fallbackProject = toPublicBuilderProject(row.site_json, null);
  const preferredProject = toPublicBuilderProject(
    preferredSource,
    preferredSource === row.site_json ? fallbackProject : fallbackProject,
  );
  const mergedProject = mergePublishedProjectWithFallback(preferredProject, fallbackProject);

  if (mergedProject && getProjectPages(mergedProject).length > 0) {
    return stripPublicInternalFieldsDeep(rewriteSignedMediaUrlsToPublicDeep(mergedProject));
  }

  if (preferredSource !== row.site_json) {
    if (fallbackProject && getProjectPages(fallbackProject).length > 0) {
      return stripPublicInternalFieldsDeep(rewriteSignedMediaUrlsToPublicDeep(fallbackProject));
    }
  }

  return preferredProject ? stripPublicInternalFieldsDeep(rewriteSignedMediaUrlsToPublicDeep(preferredProject)) : null;
};

export const getPublicBuilderV2Document = (row: Record<string, unknown>): BuilderV2Document | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = isPublished ? (row.published_json ?? row.site_json) : row.site_json;
  const preferredDoc = toPublicBuilderV2Document(preferredSource);

  if (preferredDoc) return stripPublicInternalFieldsDeep(rewriteSignedMediaUrlsToPublicDeep(preferredDoc));
  if (preferredSource !== row.site_json) {
    const fallbackDoc = toPublicBuilderV2Document(row.site_json);
    if (fallbackDoc) return stripPublicInternalFieldsDeep(rewriteSignedMediaUrlsToPublicDeep(fallbackDoc));
  }

  return null;
};

export const getPublicWeddingData = (row: Record<string, unknown>): WeddingDataV1 | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const siteSource = asRecord(row.site_json);
  const preferredSource = asRecord(isPublished ? (row.published_json ?? row.site_json) : row.site_json);
  const fallbackSource = preferredSource === siteSource ? null : siteSource;

  const candidates = [
    preferredSource?.weddingDataSnapshot,
    preferredSource?.weddingData,
    fallbackSource?.weddingDataSnapshot,
    fallbackSource?.weddingData,
    row.wedding_data,
  ];

  let fallbackParsed: WeddingDataV1 | null = null;

  for (const candidate of candidates) {
    const parsed = safeJsonParse<WeddingDataV1 | null>(candidate, null);
    if (!parsed) continue;

    const normalized = stripPublicInternalFieldsDeep(
      rewriteSignedMediaUrlsToPublicDeep(withTruthfulCoupleDisplayName(parsed))
    );

    if (hasMeaningfulWeddingData(normalized)) {
      return normalized;
    }

    fallbackParsed = fallbackParsed ?? normalized;
  }

  return fallbackParsed;
};
