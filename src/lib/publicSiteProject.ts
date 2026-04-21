import type { BuilderProject } from '../types/builder/project';
import type { WeddingDataV1 } from '../types/weddingData';
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

export const getIsPublishedFromSiteRow = (row: Record<string, unknown>): boolean => {
  const siteJsonMeta = asRecord(row.site_json);
  const publishedJsonMeta = asRecord(row.published_json);
  const publishMeta = publishedJsonMeta ?? siteJsonMeta;

  return Boolean(
    row.is_published === true ||
    publishMeta?.publishStatus === 'published' ||
    (typeof publishMeta?.publishedVersion === 'number' && (publishMeta.publishedVersion as number) > 0) ||
    (typeof publishMeta?.lastPublishedAt === 'string' && (publishMeta.lastPublishedAt as string).length > 0)
  );
};

const getProjectPages = (project: unknown): unknown[] => {
  const parsed = safeJsonParse<Record<string, unknown> | null>(project, null);
  return Array.isArray(parsed?.pages) ? parsed.pages : [];
};

export const getPublicBuilderProject = (row: Record<string, unknown>): BuilderProject | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = isPublished ? (row.published_json ?? row.site_json) : row.site_json;
  const preferredProject = safeJsonParse<BuilderProject | null>(preferredSource, null);

  if (preferredProject && getProjectPages(preferredProject).length > 0) {
    return rewriteSignedMediaUrlsToPublicDeep(preferredProject);
  }

  if (preferredSource !== row.site_json) {
    const fallbackProject = safeJsonParse<BuilderProject | null>(row.site_json, null);
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
  const snapshot = preferredSource?.weddingDataSnapshot
    ?? preferredSource?.weddingData
    ?? fallbackSource?.weddingDataSnapshot
    ?? fallbackSource?.weddingData
    ?? row.wedding_data;
  const parsed = safeJsonParse<WeddingDataV1 | null>(snapshot, null);
  return parsed ? rewriteSignedMediaUrlsToPublicDeep(parsed) : null;
};
