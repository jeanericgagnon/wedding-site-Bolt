import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { safeOptionalPhotoAnalysisText, safePhotoAnalysisList, safePhotoAnalysisText } from '../../lib/photoAnalysisCustomerCopy';
import { formatGuestPhotoDate, getGuestPhotoSortTime, toGuestPhotoCsvTimestamp } from './guestPhotoUploadTime';

export type ItineraryEvent = {
  id: string;
  event_name: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type PhotoBucketRow = {
  id: string;
  name: string;
  slug: string;
  parent_album_id: string | null;
  hierarchy_label: string | null;
  drive_folder_url: string | null;
  is_active: boolean;
  created_at: string;
  itinerary_event_id: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

export type PhotoUploadRow = {
  id: string;
  photo_album_id: string;
  original_filename: string;
  guest_name: string | null;
  guest_email: string | null;
  note: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  drive_web_view_link: string | null;
  is_hidden: boolean;
  is_flagged: boolean;
  recap_hidden: boolean;
  recap_featured: boolean;
  recap_story: boolean;
  uploaded_at: string;
};

export type PhotoUploadAiAnalysisRow = {
  id: string;
  upload_id: string;
  wedding_site_id: string;
  photo_album_id: string | null;
  status: 'ready' | 'fallback' | 'skipped' | 'failed';
  detected_moment: string | null;
  suggested_bucket_id: string | null;
  suggested_bucket_name: string | null;
  bucket_confidence: number;
  quality_score: number;
  blur_score: number;
  people_count_range: string | null;
  is_video: boolean;
  slideshow_priority: number;
  caption: string | null;
  tags: string[];
  warnings: string[];
  error_message: string | null;
  analyzed_at: string;
};

export type PhotoUploadMetadataRow = {
  upload_id: string;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  has_exif: boolean;
  has_gps: boolean;
  file_sha256: string | null;
  perceptual_hash: string | null;
  location_label: string | null;
  event_match_id: string | null;
  event_match_confidence: number | null;
  event_match_reason: string | null;
};

export type PhotoAiBucketCorrectionRow = {
  id: string;
  upload_id: string | null;
  action: 'accepted' | 'rejected' | 'manual';
  previous_bucket_id: string | null;
  suggested_bucket_id: string | null;
  chosen_bucket_id: string | null;
  confidence: number | null;
  reason: string | null;
  created_at: string;
};

export type GuestbookEntryRow = {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  message: string;
  is_hidden: boolean;
  is_flagged: boolean;
  created_at: string;
};

export type GuestProspectOptinRow = {
  id: string;
  guest_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  wants_photo_updates: boolean;
  wants_own_event_info: boolean;
  recap_email_queued_at: string | null;
  future_event_email_queued_at: string | null;
  created_at: string;
};

export type GuestHubSettings = {
  rsvp_enabled: boolean;
  photos_enabled: boolean;
  guestbook_enabled: boolean;
  registry_enabled: boolean;
  schedule_enabled: boolean;
  travel_enabled: boolean;
  recap_status: 'draft' | 'private_link' | 'published' | 'closed';
  recap_published_at: string | null;
  recap_closed_at: string | null;
  custom_message: string;
  language_default: string;
};

export const DEFAULT_HUB_SETTINGS: GuestHubSettings = {
  rsvp_enabled: true,
  photos_enabled: true,
  guestbook_enabled: true,
  registry_enabled: true,
  schedule_enabled: true,
  travel_enabled: true,
  recap_status: 'published',
  recap_published_at: null,
  recap_closed_at: null,
  custom_message: '',
  language_default: 'en',
};

export type SlideshowOrderMode = 'newest' | 'oldest' | 'capture' | 'highlights';
export type SlideshowTheme = 'classic' | 'editorial' | 'party';

export type SlideshowFrame = {
  uploadId: string;
  bucketId: string;
  bucketName: string;
  title: string;
  caption: string;
  takenAt?: string | null;
};

export type PhotoMemoryChapterEntry = {
  upload: PhotoUploadRow;
  metadata?: PhotoUploadMetadataRow;
  analysis?: PhotoUploadAiAnalysisRow;
};

export type PhotoMemoryChapter = {
  date: string;
  entries: PhotoMemoryChapterEntry[];
  highlights: number;
  bucketNames: string[];
};

export type PhotoHighlightEntry = {
  upload: PhotoUploadRow;
  analysis?: PhotoUploadAiAnalysisRow;
  metadata?: PhotoUploadMetadataRow;
};

export type SimilarPhotoGroup = {
  key?: string;
  bestUploadId: string | null;
  duplicateIds: string[];
  entries: Array<{ upload: PhotoUploadRow }>;
};

export type PhotoDashboardCounts = {
  totalUploads: number;
  activeBucketsCount: number;
  pausedBucketsCount: number;
  visionReadyCount: number;
  visionFallbackCount: number;
  metadataExifCount: number;
  metadataGpsCount: number;
  metadataEventMatchCount: number;
  aiAcceptedCorrectionCount: number;
  aiRejectedCorrectionCount: number;
  hiddenUploadCount: number;
  flaggedUploadCount: number;
  recapHiddenCount: number;
  recapFeaturedCount: number;
  recapStoryCount: number;
};

export type PhotoMemoryCollections = {
  chronologicalUploads: PhotoMemoryChapterEntry[];
  memoryChapters: PhotoMemoryChapter[];
  highlightUploads: PhotoHighlightEntry[];
  reviewUploads: PhotoHighlightEntry[];
  similarPhotoGroups: SimilarPhotoGroup[];
  duplicateExtraCount: number;
};

export const PHOTO_ALBUM_LINKS_STORAGE_KEY = 'dayof.photoBucketLinks';
export const PHOTO_BUCKET_LINKS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STORED_BUCKET_LINKS = 24;
const MAX_STORED_BUCKET_LINK_KEY_LENGTH = 120;
const MAX_STORED_BUCKET_LINK_URL_LENGTH = 2048;

type StoredBucketLinksEnvelope = {
  savedAtISO: string;
  value: Record<string, string>;
};

function buildBucketLinksStorageKey(storageScope?: string | null): string {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${PHOTO_ALBUM_LINKS_STORAGE_KEY}::${scope}` : PHOTO_ALBUM_LINKS_STORAGE_KEY;
}

const isFreshBucketLinksTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= PHOTO_BUCKET_LINKS_RETENTION_MS;
};

const isStoredBucketLinksEnvelope = (value: unknown): value is StoredBucketLinksEnvelope => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
  && typeof (value as StoredBucketLinksEnvelope).savedAtISO === 'string'
  && 'value' in (value as Record<string, unknown>)
);

const normalizeStoredBucketLinks = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .flatMap(([key, link]) => {
        if (typeof link !== 'string') return [];
        const normalizedKey = key.trim().slice(0, MAX_STORED_BUCKET_LINK_KEY_LENGTH);
        const trimmedLink = link.trim().slice(0, MAX_STORED_BUCKET_LINK_URL_LENGTH);
        if (!normalizedKey || !/^https?:\/\//i.test(trimmedLink)) return [];
        return [[normalizedKey, trimmedLink]];
      })
      .slice(0, MAX_STORED_BUCKET_LINKS),
  );
};

export const readStoredBucketLinks = (storageScope?: string | null): Record<string, string> => {
  const storageKey = buildBucketLinksStorageKey(storageScope);
  try {
    const raw = localStorage.getItem(storageKey) ?? (
      storageKey !== PHOTO_ALBUM_LINKS_STORAGE_KEY
        ? localStorage.getItem(PHOTO_ALBUM_LINKS_STORAGE_KEY)
        : null
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (isStoredBucketLinksEnvelope(parsed)) {
      if (!isFreshBucketLinksTimestamp(parsed.savedAtISO)) {
        localStorage.removeItem(storageKey);
        return {};
      }
      const normalized = normalizeStoredBucketLinks(parsed.value);
      if (storageKey !== PHOTO_ALBUM_LINKS_STORAGE_KEY && normalized && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify({
          savedAtISO: new Date().toISOString(),
          value: normalized,
        }));
      }
      return normalized;
    }

    const normalized = normalizeStoredBucketLinks(parsed);
    localStorage.setItem(storageKey, JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value: normalized,
    }));
    return normalized;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore cleanup failures so the dashboard remains usable in private modes.
    }
    return {};
  }
};

export const writeStoredBucketLinks = (value: Record<string, string>, storageScope?: string | null) => {
  try {
    localStorage.setItem(buildBucketLinksStorageKey(storageScope), JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value: normalizeStoredBucketLinks(value),
    }));
  } catch {
    // ignore storage failures so the dashboard remains usable in private modes.
  }
};

export const safePhotoOwnerError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback);
};

export const slugTag = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

export const tagLabel = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const analysisSourceLabel = (analysis: Pick<PhotoUploadAiAnalysisRow, 'status' | 'suggested_bucket_name'>) => {
  if (analysis.status === 'fallback') return 'Organized from upload details';
  if (analysis.status === 'skipped') return 'Already organized';
  if (analysis.status === 'failed') return 'Worth checking';
  return analysis.suggested_bucket_name ? 'Ready to review' : 'Reviewed';
};

export const analysisDisplayStatus = (analysis?: Pick<PhotoUploadAiAnalysisRow, 'status'> | null) => {
  if (!analysis) return 'Not reviewed yet';
  if (analysis.status === 'ready') return 'Ready to review';
  if (analysis.status === 'fallback') return 'Organized from upload details';
  if (analysis.status === 'skipped') return 'Already organized';
  return 'Worth checking';
};

const csvEscape = (value: string | number | boolean | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function getPhotoBucketDownloadName(bucketName: string): string {
  return `${bucketName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'album'}-uploads.csv`;
}

function getBucketDisplayName(bucket: Pick<PhotoBucketRow, 'name' | 'hierarchy_label'> | undefined | null): string {
  return bucket?.hierarchy_label || bucket?.name || 'Album';
}

export function buildBucketUploadsCsv(rows: PhotoUploadRow[]): string {
  const lines = [
    ['filename', 'guest_name', 'guest_email', 'uploaded_at'].join(','),
    ...rows.map((row) => [
      csvEscape(row.original_filename),
      csvEscape(row.guest_name),
      csvEscape(row.guest_email),
      csvEscape(toGuestPhotoCsvTimestamp(row.uploaded_at)),
    ].join(',')),
  ];
  return lines.join('\n');
}

export function buildGuestbookCsv(entries: GuestbookEntryRow[]): string {
  const lines = [
    ['guest_name', 'guest_email', 'message', 'created_at', 'hidden', 'flagged'].join(','),
    ...entries.map((entry) => [
      csvEscape(entry.guest_name),
      csvEscape(entry.guest_email),
      csvEscape(entry.message),
      csvEscape(toGuestPhotoCsvTimestamp(entry.created_at)),
      csvEscape(entry.is_hidden ? 'yes' : 'no'),
      csvEscape(entry.is_flagged ? 'yes' : 'no'),
    ].join(',')),
  ];
  return lines.join('\n');
}

export function buildGuestProspectsCsv(entries: GuestProspectOptinRow[]): string {
  const lines = [
    ['guest_name', 'email', 'phone', 'source', 'photo_updates', 'future_event_interest', 'recap_email_queued_at', 'future_event_email_queued_at', 'created_at'].join(','),
    ...entries.map((entry) => [
      csvEscape(entry.guest_name),
      csvEscape(entry.email),
      csvEscape(entry.phone),
      csvEscape(entry.source),
      csvEscape(entry.wants_photo_updates ? 'yes' : 'no'),
      csvEscape(entry.wants_own_event_info ? 'yes' : 'no'),
      csvEscape(entry.recap_email_queued_at),
      csvEscape(entry.future_event_email_queued_at),
      csvEscape(toGuestPhotoCsvTimestamp(entry.created_at)),
    ].join(',')),
  ];
  return lines.join('\n');
}

export function buildCurationCsv(input: {
  uploads: PhotoUploadRow[];
  buckets: PhotoBucketRow[];
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  metadataByUploadId: Map<string, PhotoUploadMetadataRow>;
}): string {
  const bucketById = new Map(input.buckets.map((bucket) => [bucket.id, bucket]));
  const lines = [
    ['filename', 'current_album', 'suggested_album', 'tags', 'confidence', 'quality', 'slideshow_priority', 'taken_at', 'width', 'height', 'has_gps', 'status', 'review_reason'].join(','),
    ...input.uploads.map((upload) => {
      const analysis = input.analysisByUploadId.get(upload.id);
      const metadata = input.metadataByUploadId.get(upload.id);
      const reasons = [
        !analysis ? 'not analyzed' : '',
        analysis && analysis.status !== 'ready' ? analysis.status : '',
        analysis && analysis.bucket_confidence < 0.6 ? 'low confidence' : '',
        ...safePhotoAnalysisList(analysis?.warnings),
      ].filter(Boolean).join('; ');
      return [
        csvEscape(upload.original_filename),
        csvEscape(getBucketDisplayName(bucketById.get(upload.photo_album_id))),
        csvEscape(safePhotoAnalysisText(analysis?.suggested_bucket_name, '')),
        csvEscape(safePhotoAnalysisList(analysis?.tags).join('; ')),
        csvEscape(analysis?.bucket_confidence ?? ''),
        csvEscape(analysis?.quality_score ?? ''),
        csvEscape(analysis?.slideshow_priority ?? ''),
        csvEscape(metadata?.taken_at ?? ''),
        csvEscape(metadata?.width ?? ''),
        csvEscape(metadata?.height ?? ''),
        csvEscape(metadata?.has_gps ?? false),
        csvEscape(analysisDisplayStatus(analysis)),
        csvEscape(reasons),
      ].join(',');
    }),
  ];
  return lines.join('\n');
}

export function buildMemoryChaptersExportPayload(input: {
  generatedAt: string;
  siteSlug: string | null;
  memoryChapters: PhotoMemoryChapter[];
}) {
  return {
    generatedAt: input.generatedAt,
    siteSlug: input.siteSlug,
    chapters: input.memoryChapters.map((chapter) => ({
      date: chapter.date,
      label: formatGuestPhotoDate(chapter.date),
      uploadCount: chapter.entries.length,
      highlightCount: chapter.highlights,
      bucketNames: chapter.bucketNames,
      frames: chapter.entries.slice(0, 24).map((entry) => ({
        uploadId: entry.upload.id,
        filename: entry.upload.original_filename,
        takenAt: entry.metadata?.taken_at ?? null,
        caption: entry.analysis ? safeOptionalPhotoAnalysisText(entry.analysis.caption) : null,
        suggestedBucket: entry.analysis ? safeOptionalPhotoAnalysisText(entry.analysis.suggested_bucket_name) : null,
        slideshowPriority: entry.analysis?.slideshow_priority ?? null,
        qualityScore: entry.analysis?.quality_score ?? null,
      })),
    })),
  };
}

export function buildCuratedRecapExportPayload(input: {
  generatedAt: string;
  siteSlug: string | null;
  uploads: PhotoUploadRow[];
  buckets: PhotoBucketRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  hiddenUploadCount: number;
  flaggedUploadCount: number;
  highlightUploads: PhotoHighlightEntry[];
  chronologicalUploads: PhotoMemoryChapterEntry[];
  memoryChapters: PhotoMemoryChapter[];
  similarPhotoGroups: SimilarPhotoGroup[];
  duplicateExtraCount: number;
  slideshowOrder: SlideshowOrderMode;
  slideshowTheme: SlideshowTheme;
  slideshowFrames: SlideshowFrame[];
}) {
  const visibleUploads = input.uploads.filter((upload) => !upload.is_hidden && !upload.is_flagged);
  const bucketById = new Map(input.buckets.map((bucket) => [bucket.id, bucket]));

  return {
    generatedAt: input.generatedAt,
    siteSlug: input.siteSlug,
    summary: {
      totalUploads: input.uploads.length,
      visibleUploads: visibleUploads.length,
      hiddenUploads: input.hiddenUploadCount,
      flaggedUploads: input.flaggedUploadCount,
      analyzedUploads: input.uploadAnalyses.length,
      highlights: input.highlightUploads.length,
      timedUploads: input.chronologicalUploads.length,
      similarSets: input.similarPhotoGroups.length,
      duplicateExtras: input.duplicateExtraCount,
    },
    highlights: input.highlightUploads.map(({ upload, analysis, metadata }) => ({
      uploadId: upload.id,
      filename: upload.original_filename,
      bucket: getBucketDisplayName(bucketById.get(upload.photo_album_id)),
      suggestedBucket: analysis ? safeOptionalPhotoAnalysisText(analysis.suggested_bucket_name) : null,
      tags: safePhotoAnalysisList(analysis?.tags),
      featured: upload.recap_featured,
      story: upload.recap_story,
      recapHidden: upload.recap_hidden,
      caption: analysis ? safeOptionalPhotoAnalysisText(analysis.caption) : null,
      slideshowPriority: analysis?.slideshow_priority ?? null,
      qualityScore: analysis?.quality_score ?? null,
      takenAt: metadata?.taken_at ?? null,
    })),
    chapters: input.memoryChapters.map((chapter) => ({
      date: chapter.date,
      label: formatGuestPhotoDate(chapter.date),
      uploadCount: chapter.entries.length,
      highlights: chapter.highlights,
      bucketNames: chapter.bucketNames,
    })),
    duplicateSets: input.similarPhotoGroups.map((group) => ({
      bestUploadId: group.bestUploadId,
      duplicateIds: group.duplicateIds,
      filenames: group.entries.map((entry) => entry.upload.original_filename),
    })),
    slideshow: {
      order: input.slideshowOrder,
      theme: input.slideshowTheme,
      frames: input.slideshowFrames,
    },
  };
}

export interface PhotoFullResolutionDownloadJobRow {
  album: string | null;
  filename: string;
  guest_name: string | null;
  guest_email: string | null;
  note: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
  download_url: string | null;
  hidden?: string | boolean | null;
  flagged?: string | boolean | null;
}

function normalizeManifestBoolean(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  return false;
}

export function buildPhotoFullResolutionDownloadJobPayload(input: {
  generatedAt: string;
  siteSlug: string | null;
  rows: PhotoFullResolutionDownloadJobRow[];
}) {
  const readyRows = input.rows
    .filter((row) => typeof row.filename === 'string' && row.filename.trim().length > 0)
    .map((row) => ({
      album: row.album ?? '',
      filename: row.filename,
      guestName: row.guest_name ?? '',
      guestEmail: row.guest_email ?? '',
      note: row.note ?? '',
      mimeType: row.mime_type ?? '',
      sizeBytes: typeof row.size_bytes === 'number' ? row.size_bytes : null,
      uploadedAt: row.uploaded_at ? toGuestPhotoCsvTimestamp(row.uploaded_at) : '',
      downloadUrl: row.download_url ?? '',
      hidden: normalizeManifestBoolean(row.hidden),
      flagged: normalizeManifestBoolean(row.flagged),
    }));

  return {
    generatedAt: input.generatedAt,
    siteSlug: input.siteSlug,
    assetCount: readyRows.length,
    readyAssetCount: readyRows.filter((row) => row.downloadUrl.length > 0).length,
    assets: readyRows,
  };
}

export function buildPhotoDashboardCounts(input: {
  uploads: PhotoUploadRow[];
  buckets: PhotoBucketRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  aiBucketCorrections: PhotoAiBucketCorrectionRow[];
}): PhotoDashboardCounts {
  return {
    totalUploads: input.uploads.length,
    activeBucketsCount: input.buckets.filter((bucket) => bucket.is_active).length,
    pausedBucketsCount: input.buckets.filter((bucket) => !bucket.is_active).length,
    visionReadyCount: input.uploadAnalyses.filter((analysis) => analysis.status === 'ready').length,
    visionFallbackCount: input.uploadAnalyses.filter((analysis) => analysis.status === 'fallback' || analysis.status === 'skipped').length,
    metadataExifCount: input.uploadMetadata.filter((metadata) => metadata.has_exif).length,
    metadataGpsCount: input.uploadMetadata.filter((metadata) => metadata.has_gps).length,
    metadataEventMatchCount: input.uploadMetadata.filter((metadata) => Boolean(metadata.event_match_id)).length,
    aiAcceptedCorrectionCount: input.aiBucketCorrections.filter((correction) => correction.action === 'accepted').length,
    aiRejectedCorrectionCount: input.aiBucketCorrections.filter((correction) => correction.action === 'rejected').length,
    hiddenUploadCount: input.uploads.filter((upload) => upload.is_hidden).length,
    flaggedUploadCount: input.uploads.filter((upload) => upload.is_flagged).length,
    recapHiddenCount: input.uploads.filter((upload) => upload.recap_hidden).length,
    recapFeaturedCount: input.uploads.filter((upload) => upload.recap_featured && !upload.recap_hidden && !upload.is_hidden && !upload.is_flagged).length,
    recapStoryCount: input.uploads.filter((upload) => upload.recap_story && !upload.recap_hidden && !upload.is_hidden && !upload.is_flagged).length,
  };
}

export function buildPhotoMemoryCollections(input: {
  uploads: PhotoUploadRow[];
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  metadataByUploadId: Map<string, PhotoUploadMetadataRow>;
}): PhotoMemoryCollections {
  const chronologicalUploads = input.uploads
    .filter((upload) => !upload.is_hidden && !upload.is_flagged)
    .map((upload) => ({
      upload,
      metadata: input.metadataByUploadId.get(upload.id),
      analysis: input.analysisByUploadId.get(upload.id),
    }))
    .filter((entry) => Boolean(entry.metadata?.taken_at))
    .sort((a, b) => getGuestPhotoSortTime(a.metadata?.taken_at || a.upload.uploaded_at) - getGuestPhotoSortTime(b.metadata?.taken_at || b.upload.uploaded_at));

  const grouped = new Map<string, PhotoMemoryChapterEntry[]>();
  chronologicalUploads.forEach((entry) => {
    const key = (entry.metadata?.taken_at || entry.upload.uploaded_at).slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  });

  const memoryChapters = Array.from(grouped.entries())
    .map(([date, entries]) => ({
      date,
      entries,
      highlights: entries.filter((entry) => (entry.analysis?.slideshow_priority ?? 0) >= 70).length,
      bucketNames: Array.from(new Set(entries
        .map((entry) => safeOptionalPhotoAnalysisText(entry.analysis?.suggested_bucket_name))
        .filter((name): name is string => Boolean(name))
      )).slice(0, 3),
    }))
    .slice(0, 6);

  const highlightUploads = input.uploads
    .filter((upload) => !upload.is_hidden && !upload.is_flagged && !upload.recap_hidden)
    .map((upload) => ({
      upload,
      analysis: input.analysisByUploadId.get(upload.id),
      metadata: input.metadataByUploadId.get(upload.id),
    }))
    .filter((entry) => entry.upload.recap_featured || entry.upload.recap_story || ((entry.analysis?.status === 'ready') && ((entry.analysis?.slideshow_priority ?? 0) >= 70 || (entry.analysis?.quality_score ?? 0) >= 0.78)))
    .sort((a, b) => Number(b.upload.recap_featured) - Number(a.upload.recap_featured) || Number(b.upload.recap_story) - Number(a.upload.recap_story) || (b.analysis?.slideshow_priority ?? 0) - (a.analysis?.slideshow_priority ?? 0) || (b.analysis?.quality_score ?? 0) - (a.analysis?.quality_score ?? 0))
    .slice(0, 8);

  const reviewUploads = input.uploads
    .filter((upload) => !upload.is_hidden)
    .map((upload) => ({
      upload,
      analysis: input.analysisByUploadId.get(upload.id),
      metadata: input.metadataByUploadId.get(upload.id),
    }))
    .filter((entry) => !entry.analysis || entry.analysis.status !== 'ready' || entry.analysis.bucket_confidence < 0.6 || (entry.analysis.warnings ?? []).length > 0)
    .slice(0, 8);

  const duplicateGroups = new Map<string, Array<{ upload: PhotoUploadRow; metadata: PhotoUploadMetadataRow }>>();
  input.uploads.forEach((upload) => {
    if (upload.is_hidden || upload.is_flagged) return;
    const metadata = input.metadataByUploadId.get(upload.id);
    const key = metadata?.file_sha256 || metadata?.perceptual_hash;
    if (!metadata || !key) return;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), { upload, metadata }]);
  });

  const similarPhotoGroups = Array.from(duplicateGroups.entries())
    .map(([key, entries]) => {
      const ranked = [...entries].sort((a, b) => {
        const aAnalysis = input.analysisByUploadId.get(a.upload.id);
        const bAnalysis = input.analysisByUploadId.get(b.upload.id);
        return (bAnalysis?.slideshow_priority ?? 0) - (aAnalysis?.slideshow_priority ?? 0)
          || (bAnalysis?.quality_score ?? 0) - (aAnalysis?.quality_score ?? 0)
          || getGuestPhotoSortTime(a.metadata.taken_at || a.upload.uploaded_at) - getGuestPhotoSortTime(b.metadata.taken_at || b.upload.uploaded_at);
      });
      return {
        key,
        entries,
        bestUploadId: ranked[0]?.upload.id ?? null,
        duplicateIds: ranked.slice(1).map((entry) => entry.upload.id),
      };
    })
    .filter((group) => group.entries.length > 1)
    .slice(0, 6);

  return {
    chronologicalUploads,
    memoryChapters,
    highlightUploads,
    reviewUploads,
    similarPhotoGroups,
    duplicateExtraCount: similarPhotoGroups.reduce((sum, group) => sum + group.duplicateIds.length, 0),
  };
}

export function makePhotoShareMessage(bucketName: string, link: string): string {
  return `Please upload your ${bucketName} photos here: ${link}`;
}

export function buildPhotoShareMessageLines(input: {
  buckets: Pick<PhotoBucketRow, 'id' | 'name' | 'is_active'>[];
  bucketUploadLinks: Record<string, string>;
  activeOnly?: boolean;
}): string[] {
  return input.buckets
    .filter((bucket) => !input.activeOnly || bucket.is_active)
    .map((bucket) => {
      const link = input.bucketUploadLinks[bucket.id];
      if (!link) return null;
      return `${bucket.name}: ${makePhotoShareMessage(bucket.name, link)}`;
    })
    .filter((line): line is string => typeof line === 'string');
}

export function buildPhotoKnownLinks(input: {
  buckets: Pick<PhotoBucketRow, 'id'>[];
  bucketUploadLinks: Record<string, string>;
}): string[] {
  return input.buckets
    .map((bucket) => input.bucketUploadLinks[bucket.id])
    .filter((link): link is string => typeof link === 'string' && link.length > 0);
}

export function buildPhotoSharePackCsv(input: {
  buckets: Pick<PhotoBucketRow, 'id' | 'name' | 'is_active'>[];
  bucketUploadLinks: Record<string, string>;
}): string {
  const rows = input.buckets
    .map((bucket) => {
      const link = input.bucketUploadLinks[bucket.id] || '';
      return {
        name: bucket.name,
        status: bucket.is_active ? 'active' : 'paused',
        uploadLink: link,
        suggestedMessage: link ? makePhotoShareMessage(bucket.name, link) : '',
      };
    })
    .filter((row) => row.uploadLink);

  if (rows.length === 0) return '';

  return [
    ['name', 'status', 'upload_link', 'suggested_message'].join(','),
    ...rows.map((row) => [
      csvEscape(row.name),
      csvEscape(row.status),
      csvEscape(row.uploadLink),
      csvEscape(row.suggestedMessage),
    ].join(',')),
  ].join('\n');
}

export function buildPhotoBucketLinksCsv(input: {
  buckets: Pick<PhotoBucketRow, 'id' | 'name' | 'slug' | 'is_active' | 'drive_folder_url'>[];
  bucketUploadLinks: Record<string, string>;
}): string {
  const rows = input.buckets
    .map((bucket) => ({
      name: bucket.name,
      slug: bucket.slug,
      status: bucket.is_active ? 'active' : 'paused',
      uploadLink: input.bucketUploadLinks[bucket.id] || '',
      driveFolderUrl: bucket.drive_folder_url || '',
    }))
    .filter((row) => row.uploadLink || row.driveFolderUrl);

  if (rows.length === 0) return '';

  return [
    ['name', 'slug', 'status', 'upload_link', 'backup_folder_url'].join(','),
    ...rows.map((row) => [
      csvEscape(row.name),
      csvEscape(row.slug),
      csvEscape(row.status),
      csvEscape(row.uploadLink),
      csvEscape(row.driveFolderUrl),
    ].join(',')),
  ].join('\n');
}

export const eventMomentTags = (eventName: string) => {
  const normalized = eventName.toLowerCase();
  const tags = new Set<string>([slugTag(eventName)]);
  const add = (items: string[]) => items.forEach((item) => tags.add(item));
  if (/cocktail|drinks|hour/.test(normalized)) add(['cocktail_hour', 'mingling', 'drinks', 'guest_candids']);
  if (/ceremony|vow|altar/.test(normalized)) add(['ceremony', 'aisle_walk', 'vows', 'ring_exchange', 'first_kiss', 'recessional']);
  if (/processional|aisle/.test(normalized)) add(['aisle_walk', 'processional', 'family_processional']);
  if (/reception|dinner/.test(normalized)) add(['reception', 'dinner', 'table_moments', 'guest_reactions']);
  if (/toast|speech/.test(normalized)) add(['toasts', 'speeches', 'reaction_shots']);
  if (/dance|party|dj/.test(normalized)) add(['dance_floor', 'first_dance', 'party', 'guest_dancing']);
  if (/getting ready|prep|suite/.test(normalized)) add(['getting_ready', 'details', 'dress', 'wedding_party']);
  if (/photo|portrait|family/.test(normalized)) add(['portraits', 'family_photos', 'wedding_party']);
  if (/cake|dessert/.test(normalized)) add(['cake_cutting', 'dessert']);
  if (/send.?off|exit|sparkler|farewell/.test(normalized)) add(['sendoff', 'sparkler_exit', 'farewell']);
  if (/welcome|rehearsal/.test(normalized)) add(['welcome_party', 'rehearsal', 'guest_candids']);
  if (/brunch/.test(normalized)) add(['brunch', 'farewell', 'next_day']);
  return Array.from(tags).filter(Boolean).slice(0, 10);
};
