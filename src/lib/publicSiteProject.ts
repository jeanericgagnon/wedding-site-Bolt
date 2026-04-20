import type { BuilderProject } from '../types/builder/project';
import type { WeddingDataV1 } from '../types/weddingData';
import { safeJsonParse } from './jsonUtils';

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
);

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
  return safeJsonParse<BuilderProject | null>(preferredSource, null);
};

export const getPublicWeddingData = (row: Record<string, unknown>): WeddingDataV1 | null => {
  const isPublished = getIsPublishedFromSiteRow(row);
  const preferredSource = asRecord(isPublished ? (row.published_json ?? row.site_json) : row.site_json);
  const snapshot = preferredSource?.weddingDataSnapshot ?? preferredSource?.weddingData ?? row.wedding_data;
  return safeJsonParse<WeddingDataV1 | null>(snapshot, null);
};
