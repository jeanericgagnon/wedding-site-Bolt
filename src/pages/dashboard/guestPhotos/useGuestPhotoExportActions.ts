import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copyTextOrDownload } from '../../../lib/copyText';
import { renderGuestHubQrPrintHtml } from '../../../lib/guestHubQrAssets';
import {
  exportGuestPhotoManifest,
  manageGuestPhotoAlbum,
} from '../guestPhotoSharingService';
import {
  buildBucketUploadsCsv,
  buildCurationCsv,
  buildCuratedRecapExportPayload,
  buildGuestProspectsCsv,
  buildGuestbookCsv,
  buildMemoryChaptersExportPayload,
  buildPhotoFullResolutionDownloadJobPayload,
  buildPhotoBucketLinksCsv,
  buildPhotoKnownLinks,
  buildPhotoShareMessageLines,
  buildPhotoSharePackCsv,
  getPhotoBucketDownloadName,
  type PhotoHighlightEntry,
  type PhotoMemoryChapter,
  type PhotoMemoryChapterEntry,
  type SimilarPhotoGroup,
  safePhotoOwnerError,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
  type SlideshowFrame,
  type SlideshowOrderMode,
  type SlideshowTheme,
} from '../guestPhotoSharingUtils';
import type { GuestHubQrAsset } from '../../../lib/guestHubQrAssets';
import { toGuestPhotoCsvTimestamp } from '../guestPhotoUploadTime';
import type { AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';

type LogPhotoAction = (
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
  targetId?: string | null,
  targetLabel?: string | null
) => void;

type UseGuestPhotoExportActionsArgs = {
  aiPhotoOpsPlan: AiPhotoOpsPlan | null;
  bucketUploadLinks: Record<string, string>;
  buckets: PhotoBucketRow[];
  guestHubQrAssets: GuestHubQrAsset[];
  guestProspects: GuestProspectOptinRow[];
  guestbookEntries: GuestbookEntryRow[];
  hiddenUploadCount: number;
  highlightUploads: PhotoHighlightEntry[];
  logPhotoAction: LogPhotoAction;
  memoryChapters: PhotoMemoryChapter[];
  metadataByUploadId: Map<string, PhotoUploadMetadataRow>;
  setBucketUploadLinks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  showHidden: boolean;
  siteId: string | null;
  siteSlug: string | null;
  slideshowBucketFilter: string;
  slideshowFrames: SlideshowFrame[];
  slideshowOrder: SlideshowOrderMode;
  slideshowTheme: SlideshowTheme;
  flaggedUploadCount: number;
  recapFeaturedCount: number;
  recapStoryCount: number;
  reviewUploads: Array<{ upload: PhotoUploadRow }>;
  chronologicalUploads: PhotoMemoryChapterEntry[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  uploads: PhotoUploadRow[];
  similarPhotoGroups: SimilarPhotoGroup[];
};

export function useGuestPhotoExportActions({
  aiPhotoOpsPlan,
  analysisByUploadId,
  bucketUploadLinks,
  buckets,
  chronologicalUploads,
  flaggedUploadCount,
  guestHubQrAssets,
  guestProspects,
  guestbookEntries,
  hiddenUploadCount,
  highlightUploads,
  logPhotoAction,
  memoryChapters,
  metadataByUploadId,
  recapFeaturedCount,
  recapStoryCount,
  reviewUploads,
  setBucketUploadLinks,
  setError,
  setSuccess,
  showHidden,
  similarPhotoGroups,
  siteId,
  siteSlug,
  slideshowBucketFilter,
  slideshowFrames,
  slideshowOrder,
  slideshowTheme,
  uploadAnalyses,
  uploads,
}: UseGuestPhotoExportActionsArgs) {
  const navigate = useNavigate();
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [copyNotice, setCopyNotice] = useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const [copyFallbackValue, setCopyFallbackValue] = useState('');
  const copyNoticeTimeoutRef = useRef<number | null>(null);
  const copyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyContextKey = useMemo(() => JSON.stringify({
    siteId,
    siteSlug,
    bucketUploadLinks,
    buckets: buckets.map((bucket) => [bucket.id, bucket.name, bucket.is_active]),
    uploads: uploads.map((upload) => [
      upload.id,
      upload.photo_album_id,
      upload.original_filename,
      upload.is_hidden,
      upload.is_flagged,
      upload.uploaded_at,
    ]),
    slideshowBucketFilter,
    slideshowFrames,
    slideshowOrder,
    slideshowTheme,
  }), [bucketUploadLinks, buckets, siteId, siteSlug, slideshowBucketFilter, slideshowFrames, slideshowOrder, slideshowTheme, uploads]);
  const copyContextKeyRef = useRef(copyContextKey);
  copyContextKeyRef.current = copyContextKey;

  useEffect(() => () => {
    mountedRef.current = false;
    copyRequestIdRef.current += 1;
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, []);

  useEffect(() => {
    copyRequestIdRef.current += 1;
    setCopyNotice(null);
    setCopyFallbackValue('');
    if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
  }, [copyContextKey]);

  const downloadTextFile = (filename: string, content: string, type = 'text/csv;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 0);
  };

  const copyText = async (value: string, key: string) => {
    const requestId = ++copyRequestIdRef.current;
    const requestContextKey = copyContextKeyRef.current;
    const isCurrentCopyRequest = () => (
      mountedRef.current &&
      requestId === copyRequestIdRef.current &&
      requestContextKey === copyContextKeyRef.current
    );
    try {
      const result = await copyTextOrDownload(value, `dayof-photo-${key}.txt`);
      if (!isCurrentCopyRequest()) return null;
      setCopyNotice({ key, mode: result });
      setCopyFallbackValue('');
      if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
      copyNoticeTimeoutRef.current = window.setTimeout(() => {
        if (isCurrentCopyRequest()) setCopyNotice((current) => (current?.key === key ? null : current));
      }, 1400);
      if (result === 'downloaded') {
        setSuccess('Clipboard was blocked, so I saved a small text file instead.');
      }
      return result;
    } catch {
      if (!isCurrentCopyRequest()) return null;
      setCopyFallbackValue(value);
      setError('Clipboard access is blocked here. The text is ready below so you can select it.');
      return null;
    }
  };

  const exportSlideshowPlan = async () => {
    const requestId = ++copyRequestIdRef.current;
    const requestContextKey = copyContextKeyRef.current;
    const isCurrentCopyRequest = () => (
      mountedRef.current &&
      requestId === copyRequestIdRef.current &&
      requestContextKey === copyContextKeyRef.current
    );
    const payload = {
      generatedAt: new Date().toISOString(),
      theme: slideshowTheme,
      order: slideshowOrder,
      bucketFilter: slideshowBucketFilter,
      frameCount: slideshowFrames.length,
      frames: slideshowFrames,
      aiPhotoOps: aiPhotoOpsPlan
        ? {
            generatedAt: aiPhotoOpsPlan.generatedAt,
            source: aiPhotoOpsPlan.source,
            summary: aiPhotoOpsPlan.summary,
            slideshow: aiPhotoOpsPlan.slideshow,
          }
        : null,
    };

    try {
      const result = await copyTextOrDownload(
        JSON.stringify(payload, null, 2),
        'dayof-slideshow-plan.json',
        'application/json;charset=utf-8'
      );
      if (!isCurrentCopyRequest()) return;
      setCopyNotice({ key: 'slideshow-plan', mode: result });
      setCopyFallbackValue('');
      if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);
      copyNoticeTimeoutRef.current = window.setTimeout(() => {
        if (isCurrentCopyRequest()) setCopyNotice((current) => (current?.key === 'slideshow-plan' ? null : current));
      }, 1400);
      if (result === 'copied') {
        setSuccess('Copied the slideshow notes.');
      } else {
        setSuccess('Clipboard was blocked, so I saved the slideshow notes instead.');
      }
    } catch {
      if (!isCurrentCopyRequest()) return;
      setCopyFallbackValue(JSON.stringify(payload, null, 2));
      setError('Clipboard access is blocked here. The slideshow notes are ready below so you can select them.');
    }
  };

  const exportBucketCsv = (bucketId: string, bucketName: string) => {
    const rows = uploads.filter((upload) => upload.photo_album_id === bucketId);
    if (rows.length === 0) return;
    downloadTextFile(getPhotoBucketDownloadName(bucketName), buildBucketUploadsCsv(rows));
  };

  const downloadGuestHubPrintPack = () => {
    if (guestHubQrAssets.length === 0) {
      setError('Set a public guest hub link before saving print cards.');
      return;
    }

    downloadTextFile(
      'dayof-guest-hub-qr-print-pack.html',
      renderGuestHubQrPrintHtml(guestHubQrAssets),
      'text/html;charset=utf-8'
    );
    setSuccess('Guest hub print cards saved.');
  };

  const exportMediaManifestCsv = async () => {
    if (uploads.length === 0) return;
    const esc = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    try {
      if (!siteId) throw new Error('Choose a wedding site before exporting photos.');
      const data = await exportGuestPhotoManifest(siteId, showHidden);
      const rows = Array.isArray(data?.rows) ? (data.rows as Array<Record<string, unknown>>) : [];
      const lines = [
        ['album', 'filename', 'guest_name', 'guest_email', 'note', 'mime_type', 'size_bytes', 'uploaded_at', 'download_url', 'hidden', 'flagged'].join(','),
        ...rows.map((row) => [
          esc(row.bucket as string),
          esc(row.filename as string),
          esc(row.guest_name as string),
          esc(row.guest_email as string),
          esc(row.note as string),
          esc(row.mime_type as string),
          esc(row.size_bytes as string | number),
          esc(toGuestPhotoCsvTimestamp(String(row.uploaded_at ?? ''))),
          esc(row.download_url as string),
          esc(row.hidden as string),
          esc(row.flagged as string),
        ].join(',')),
      ];
      downloadTextFile('photo-handoff-links.csv', lines.join('\n'));
      logPhotoAction('media_manifest_exported', 'Guest media handoff sheet was saved.', {
        rowCount: rows.length,
        includeHidden: showHidden,
        signedLinks: true,
      });
      setSuccess('Saved a fresh photo handoff sheet. Private file links are refreshed for 24 hours.');
    } catch (err) {
      const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
      const lines = [
        ['album', 'filename', 'guest_name', 'guest_email', 'note', 'mime_type', 'size_bytes', 'uploaded_at', 'download_url', 'hidden', 'flagged'].join(','),
        ...uploads.map((upload) => [
          esc(bucketById.get(upload.photo_album_id)?.name ?? ''),
          esc(upload.original_filename),
          esc(upload.guest_name),
          esc(upload.guest_email),
          esc(upload.note),
          esc(upload.mime_type),
          esc(upload.size_bytes),
          esc(toGuestPhotoCsvTimestamp(upload.uploaded_at)),
          esc(upload.drive_web_view_link),
          esc(upload.is_hidden ? 'yes' : 'no'),
          esc(upload.is_flagged ? 'yes' : 'no'),
        ].join(',')),
      ];
      downloadTextFile('photo-handoff-sheet.csv', lines.join('\n'));
      logPhotoAction('media_manifest_exported', 'Guest media handoff sheet was saved with current links.', {
        rowCount: uploads.length,
        includeHidden: showHidden,
        signedLinks: false,
      });
      setError(safePhotoOwnerError(err, 'Saved the current photo handoff sheet, but fresh private links need another try.'));
    }
  };

  const exportFullResolutionDownloadJob = async () => {
    if (uploads.length === 0) return;

    try {
      if (!siteId) throw new Error('Choose a wedding site before exporting photos.');
      const data = await exportGuestPhotoManifest(siteId, showHidden);
      const rows = Array.isArray(data?.rows) ? (data.rows as Array<Record<string, unknown>>) : [];
      const payload = buildPhotoFullResolutionDownloadJobPayload({
        generatedAt: new Date().toISOString(),
        siteSlug,
        rows: rows.map((row) => ({
          album: typeof row.bucket === 'string' ? row.bucket : null,
          filename: typeof row.filename === 'string' ? row.filename : '',
          guest_name: typeof row.guest_name === 'string' ? row.guest_name : null,
          guest_email: typeof row.guest_email === 'string' ? row.guest_email : null,
          note: typeof row.note === 'string' ? row.note : null,
          mime_type: typeof row.mime_type === 'string' ? row.mime_type : null,
          size_bytes: typeof row.size_bytes === 'number' ? row.size_bytes : null,
          uploaded_at: typeof row.uploaded_at === 'string' ? row.uploaded_at : null,
          download_url: typeof row.download_url === 'string' ? row.download_url : null,
          hidden: row.hidden as string | boolean | null | undefined,
          flagged: row.flagged as string | boolean | null | undefined,
        })),
      });
      downloadTextFile(
        'photo-full-resolution-download-job.json',
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
      logPhotoAction('full_resolution_download_job_exported', 'Full-resolution photo download job was saved.', {
        rowCount: payload.assetCount,
        readyAssetCount: payload.readyAssetCount,
        includeHidden: showHidden,
      });
      setSuccess('Saved a full-resolution photo download job with refreshed private links.');
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t save the full-resolution download job right now.'));
    }
  };

  const exportGuestbookCsv = () => {
    if (guestbookEntries.length === 0) return;
    downloadTextFile('guestbook-notes.csv', buildGuestbookCsv(guestbookEntries));
    logPhotoAction('guestbook_notes_exported', 'Guestbook notes were exported.', { rowCount: guestbookEntries.length });
  };

  const exportProspectsCsv = () => {
    if (guestProspects.length === 0) return;
    downloadTextFile('guest-photo-prospects.csv', buildGuestProspectsCsv(guestProspects));
    logPhotoAction('guest_prospects_exported', 'Guest photo prospect opt-ins were exported.', { rowCount: guestProspects.length });
  };

  const exportCurationCsv = () => {
    if (uploads.length === 0) return;
    downloadTextFile('photo-curation-queue.csv', buildCurationCsv({ uploads, buckets, analysisByUploadId, metadataByUploadId }));
    logPhotoAction('photo_curation_queue_exported', 'Photo curation queue was exported.', { rowCount: uploads.length });
  };

  const exportMemoryChaptersJson = () => {
    const payload = buildMemoryChaptersExportPayload({
      generatedAt: new Date().toISOString(),
      siteSlug,
      memoryChapters,
    });
    downloadTextFile('photo-memory-chapters.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  };

  const exportCuratedRecapJson = () => {
    const payload = buildCuratedRecapExportPayload({
      generatedAt: new Date().toISOString(),
      siteSlug,
      uploads,
      buckets,
      uploadAnalyses,
      hiddenUploadCount,
      flaggedUploadCount,
      highlightUploads,
      chronologicalUploads,
      memoryChapters,
      similarPhotoGroups,
      duplicateExtraCount: Array.from(new Set(similarPhotoGroups.flatMap((group) => group.duplicateIds))).length,
      slideshowOrder,
      slideshowTheme,
      slideshowFrames,
    });
    downloadTextFile('photo-curated-recap.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  };

  const sendAllActiveBucketRequests = () => {
    const lines = buildPhotoShareMessageLines({ buckets, bucketUploadLinks, activeOnly: true });
    if (lines.length === 0) {
      setError('No active albums with links available to send.');
      return;
    }
    const subject = encodeURIComponent('Photo upload links');
    const body = encodeURIComponent(lines.join('\n\n'));
    navigate(`/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`);
  };

  const copyAllShareMessages = async () => {
    const lines = buildPhotoShareMessageLines({ buckets, bucketUploadLinks });
    if (lines.length === 0) {
      setError('No share messages are ready yet. Create links first.');
      return;
    }
    const result = await copyText(lines.join('\n\n'), 'all-share-messages');
    if (result === 'copied') {
      setSuccess(`Copied ${lines.length} share message(s).`);
    }
  };

  const copyAllKnownLinks = async () => {
    const links = buildPhotoKnownLinks({ buckets, bucketUploadLinks });
    if (links.length === 0) {
      setError('No upload links are ready yet. Create or refresh links first.');
      return;
    }
    const result = await copyText(links.join('\n'), 'all-links');
    if (result === 'copied') {
      setSuccess(`Copied ${links.length} link(s).`);
    }
  };

  const regenerateAllKnownBucketLinks = async () => {
    const targetBuckets = buckets.filter((bucket) => bucketUploadLinks[bucket.id]);
    if (targetBuckets.length === 0) {
      setError('No album links are ready to refresh yet.');
      return;
    }

    try {
      setBulkRegenerating(true);
      setError(null);
      const updated: Record<string, string> = {};

      for (const bucket of targetBuckets) {
        const data = await manageGuestPhotoAlbum({ action: 'regenerate_link', albumId: bucket.id });
        const link = typeof data?.uploadUrl === 'string' ? data.uploadUrl : '';
        if (link) updated[bucket.id] = link;
      }

      if (Object.keys(updated).length > 0) {
        setBucketUploadLinks((prev) => ({ ...prev, ...updated }));
      }
      setSuccess(`Refreshed ${Object.keys(updated).length} link${Object.keys(updated).length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t refresh those links yet.'));
    } finally {
      setBulkRegenerating(false);
    }
  };

  const exportSharePackCsv = () => {
    const csv = buildPhotoSharePackCsv({ buckets, bucketUploadLinks });
    if (!csv) return;
    downloadTextFile('photo-share-pack.csv', csv);
  };

  const exportBucketLinksCsv = () => {
    const csv = buildPhotoBucketLinksCsv({ buckets, bucketUploadLinks });
    if (!csv) return;
    downloadTextFile('photo-album-links.csv', csv);
  };

  return {
    bulkRegenerating,
    copyNotice,
    copyAllKnownLinks,
    copyAllShareMessages,
    copyFallbackValue,
    copyText,
    downloadGuestHubPrintPack,
    exportBucketCsv,
    exportBucketLinksCsv,
    exportCuratedRecapJson,
    exportCurationCsv,
    exportFullResolutionDownloadJob,
    exportGuestbookCsv,
    exportMediaManifestCsv,
    exportMemoryChaptersJson,
    exportProspectsCsv,
    exportSharePackCsv,
    exportSlideshowPlan,
    regenerateAllKnownBucketLinks,
    sendAllActiveBucketRequests,
  };
}
