import type { BuilderProject } from '../types/builder/project';
import type { BuilderSectionInstance } from '../types/builder/section';
import type { WeddingDataV1 } from '../types/weddingData';
import { buildCoupleDisplayName } from './coupleDisplayName';
import { safeJsonParse } from './jsonUtils';
import { rewriteSignedMediaUrlsToPublicDeep } from './mediaUrl';

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
    preferredSource?.weddingData,
    fallbackSource?.weddingDataSnapshot,
    fallbackSource?.weddingData,
    row.wedding_data,
  ];

  for (const candidate of candidates) {
    const parsed = safeJsonParse<WeddingDataV1 | null>(candidate, null);
    if (parsed) {
      return rewriteSignedMediaUrlsToPublicDeep(withTruthfulCoupleDisplayName(parsed));
    }
  }

  return null;
};
