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

export const getPublicBuilderProject = (row: Record<string, unknown>): BuilderProject | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = isPublished ? (row.published_json ?? row.site_json) : row.site_json;
  const parsed = safeJsonParse<BuilderProject | null>(preferredSource, null);
  return parsed ? rewriteSignedMediaUrlsToPublicDeep(parsed) : null;
};

export const getPublicWeddingData = (row: Record<string, unknown>): WeddingDataV1 | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = asRecord(isPublished ? (row.published_json ?? row.site_json) : row.site_json);
  const snapshot = preferredSource?.weddingDataSnapshot ?? preferredSource?.weddingData ?? row.wedding_data;
  const parsed = safeJsonParse<WeddingDataV1 | null>(snapshot, null);
  return parsed ? rewriteSignedMediaUrlsToPublicDeep(parsed) : null;
};
