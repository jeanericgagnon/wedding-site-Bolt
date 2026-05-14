import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PHOTO_BUCKET_LINKS_RETENTION_MS,
  analysisDisplayStatus,
  analysisSourceLabel,
  buildBucketUploadsCsv,
  buildCurationCsv,
  buildCuratedRecapExportPayload,
  buildPhotoFullResolutionDownloadJobPayload,
  buildGuestProspectsCsv,
  buildGuestbookCsv,
  buildMemoryChaptersExportPayload,
  buildPhotoDashboardCounts,
  buildPhotoMemoryCollections,
  buildPhotoBucketLinksCsv,
  buildPhotoKnownLinks,
  buildPhotoShareMessageLines,
  buildPhotoSharePackCsv,
  eventMomentTags,
  getPhotoBucketDownloadName,
  makePhotoShareMessage,
  readStoredBucketLinks,
  tagLabel,
  writeStoredBucketLinks,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
} from './guestPhotoSharingUtils';

describe('guestPhotoSharingUtils', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('formats guest photo tags for display without changing stored slugs', () => {
    expect(tagLabel('dance_floor')).toBe('Dance Floor');
    expect(tagLabel('family-photos')).toBe('Family Photos');
  });

  it('derives useful event moment tags for album suggestions', () => {
    expect(eventMomentTags('Ceremony and vows')).toEqual(
      expect.arrayContaining(['ceremony', 'vows', 'ring_exchange', 'first_kiss']),
    );
    expect(eventMomentTags('Sparkler send-off')).toEqual(
      expect.arrayContaining(['sparkler_send_off', 'sendoff', 'sparkler_exit']),
    );
  });

  it('keeps AI analysis labels calm and customer-safe', () => {
    expect(analysisDisplayStatus(null)).toBe('Not reviewed yet');
    expect(analysisDisplayStatus({ status: 'fallback' })).toBe('Organized from upload details');
    expect(analysisSourceLabel({ status: 'ready', suggested_bucket_name: 'Ceremony' })).toBe('Ready to review');
    expect(analysisSourceLabel({ status: 'failed', suggested_bucket_name: null })).toBe('Worth checking');
  });

  it('reads and writes bucket links defensively', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.clear();
    writeStoredBucketLinks({ ceremony: 'https://example.com/ceremony' });
    expect(readStoredBucketLinks()).toEqual({ ceremony: 'https://example.com/ceremony' });
    expect(JSON.parse(localStorage.getItem('dayof.photoBucketLinks') || '{}').savedAtISO).toBe('2026-05-06T12:00:00.000Z');

    localStorage.setItem('dayof.photoBucketLinks', 'not json');
    expect(readStoredBucketLinks()).toEqual({});
  });

  it('migrates and expires stored bucket links', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.clear();
    localStorage.setItem('dayof.photoBucketLinks', JSON.stringify({
      ceremony: ' https://example.com/ceremony ',
      bad: 'javascript:alert(1)',
    }));

    expect(readStoredBucketLinks()).toEqual({ ceremony: 'https://example.com/ceremony' });
    expect(JSON.parse(localStorage.getItem('dayof.photoBucketLinks') || '{}').savedAtISO).toBe('2026-05-06T12:00:00.000Z');

    localStorage.setItem('dayof.photoBucketLinks', JSON.stringify({
      savedAtISO: new Date(Date.now() - PHOTO_BUCKET_LINKS_RETENTION_MS - 1).toISOString(),
      value: { ceremony: 'https://example.com/ceremony' },
    }));

    expect(readStoredBucketLinks()).toEqual({});
    expect(localStorage.getItem('dayof.photoBucketLinks')).toBeNull();
  });

  it('ignores unavailable storage so the dashboard can keep rendering', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('blocked');
    });

    expect(() => writeStoredBucketLinks({ blocked: 'yes' })).not.toThrow();

    setSpy.mockRestore();
  });

  it('builds bucket, guestbook, and prospect CSV exports with escaped values', () => {
    const upload = {
      id: 'u1',
      photo_album_id: 'b1',
      original_filename: 'first "dance".jpg',
      guest_name: 'Ava',
      guest_email: 'ava@example.com',
      note: null,
      mime_type: 'image/jpeg',
      size_bytes: 123,
      drive_web_view_link: 'https://drive.example/u1',
      is_hidden: false,
      is_flagged: false,
      recap_hidden: false,
      recap_featured: false,
      recap_story: false,
      uploaded_at: '2026-05-05T10:30:00Z',
    } satisfies PhotoUploadRow;
    const guestbook = {
      id: 'g1',
      guest_name: 'Sam',
      guest_email: 'sam@example.com',
      message: 'Congrats, "friends"',
      is_hidden: false,
      is_flagged: true,
      created_at: '2026-05-05T12:00:00Z',
    } satisfies GuestbookEntryRow;
    const prospect = {
      id: 'p1',
      guest_name: 'Lee',
      email: 'lee@example.com',
      phone: null,
      source: 'recap',
      wants_photo_updates: true,
      wants_own_event_info: false,
      recap_email_queued_at: null,
      future_event_email_queued_at: null,
      created_at: '2026-05-05T12:30:00Z',
    } satisfies GuestProspectOptinRow;

    expect(getPhotoBucketDownloadName('First Dance!')).toBe('first-dance-uploads.csv');
    expect(buildBucketUploadsCsv([upload])).toContain('"first ""dance"".jpg"');
    expect(buildGuestbookCsv([guestbook])).toContain('"Congrats, ""friends"""');
    expect(buildGuestProspectsCsv([prospect])).toContain('"yes","no"');
  });

  it('builds curation CSV with safe analysis labels and review reasons', () => {
    const upload = {
      id: 'u1',
      photo_album_id: 'b1',
      original_filename: 'ceremony.jpg',
      guest_name: null,
      guest_email: null,
      note: null,
      mime_type: 'image/jpeg',
      size_bytes: 123,
      drive_web_view_link: null,
      is_hidden: false,
      is_flagged: false,
      recap_hidden: false,
      recap_featured: false,
      recap_story: false,
      uploaded_at: '2026-05-05T10:30:00Z',
    } satisfies PhotoUploadRow;
    const bucket = {
      id: 'b1',
      name: 'Ceremony',
      slug: 'ceremony',
      parent_album_id: null,
      hierarchy_label: 'Main / Ceremony',
      drive_folder_url: null,
      is_active: true,
      created_at: '2026-05-05T10:00:00Z',
      itinerary_event_id: null,
      opens_at: null,
      closes_at: null,
    } satisfies PhotoBucketRow;
    const analysis = {
      id: 'a1',
      upload_id: 'u1',
      wedding_site_id: 'site1',
      photo_album_id: 'b1',
      status: 'ready',
      detected_moment: null,
      suggested_bucket_id: 'b1',
      suggested_bucket_name: 'Ceremony',
      bucket_confidence: 0.42,
      quality_score: 0.8,
      blur_score: 0,
      people_count_range: null,
      is_video: false,
      slideshow_priority: 75,
      caption: null,
      tags: ['vows', '<script>'],
      warnings: ['dim lighting'],
      error_message: null,
      analyzed_at: '2026-05-05T11:00:00Z',
    } satisfies PhotoUploadAiAnalysisRow;
    const metadata = {
      upload_id: 'u1',
      taken_at: '2026-05-05T09:00:00Z',
      width: 1200,
      height: 800,
      has_exif: true,
      has_gps: true,
      file_sha256: null,
      perceptual_hash: null,
      location_label: null,
      event_match_id: null,
      event_match_confidence: null,
      event_match_reason: null,
    } satisfies PhotoUploadMetadataRow;

    const csv = buildCurationCsv({
      uploads: [upload],
      buckets: [bucket],
      analysisByUploadId: new Map([[analysis.upload_id, analysis]]),
      metadataByUploadId: new Map([[metadata.upload_id, metadata]]),
    });

    expect(csv).toContain('"Main / Ceremony"');
    expect(csv).toContain('"low confidence; dim lighting"');
    expect(csv).toContain('"Ready to review"');
  });

  it('builds a full-resolution download job payload from owner export rows', () => {
    const payload = buildPhotoFullResolutionDownloadJobPayload({
      generatedAt: '2026-05-14T17:00:00.000Z',
      siteSlug: 'alex-and-jordan',
      rows: [
        {
          album: 'Ceremony',
          filename: 'vows.jpg',
          guest_name: 'Ava Stone',
          guest_email: 'ava@example.com',
          note: 'From the front row',
          mime_type: 'image/jpeg',
          size_bytes: 2048,
          uploaded_at: '2026-05-14T16:30:00.000Z',
          download_url: 'https://storage.example/vows.jpg',
          hidden: 'no',
          flagged: 'false',
        },
      ],
    });

    expect(payload).toMatchObject({
      generatedAt: '2026-05-14T17:00:00.000Z',
      siteSlug: 'alex-and-jordan',
      assetCount: 1,
      readyAssetCount: 1,
    });
    expect(payload.assets[0]).toMatchObject({
      album: 'Ceremony',
      filename: 'vows.jpg',
      guestName: 'Ava Stone',
      downloadUrl: 'https://storage.example/vows.jpg',
      hidden: false,
      flagged: false,
    });
  });

  it('builds memory chapter export payloads without dropping curation details', () => {
    const upload = {
      id: 'u1',
      photo_album_id: 'b1',
      original_filename: 'ceremony.jpg',
      guest_name: 'Ava',
      guest_email: 'ava@example.com',
      note: null,
      mime_type: 'image/jpeg',
      size_bytes: 123,
      drive_web_view_link: null,
      is_hidden: false,
      is_flagged: false,
      recap_hidden: false,
      recap_featured: true,
      recap_story: false,
      uploaded_at: '2026-05-05T10:30:00Z',
    } satisfies PhotoUploadRow;
    const analysis = {
      id: 'a1',
      upload_id: 'u1',
      wedding_site_id: 'site1',
      photo_album_id: 'b1',
      status: 'ready',
      detected_moment: null,
      suggested_bucket_id: 'b1',
      suggested_bucket_name: 'Ceremony',
      bucket_confidence: 0.82,
      quality_score: 0.91,
      blur_score: 0,
      people_count_range: null,
      is_video: false,
      slideshow_priority: 88,
      caption: 'First look <script>',
      tags: ['vows', 'aisle'],
      warnings: [],
      error_message: null,
      analyzed_at: '2026-05-05T11:00:00Z',
    } satisfies PhotoUploadAiAnalysisRow;
    const metadata = {
      upload_id: 'u1',
      taken_at: '2026-05-05T09:00:00Z',
      width: 1200,
      height: 800,
      has_exif: true,
      has_gps: false,
      file_sha256: 'same-file',
      perceptual_hash: null,
      location_label: null,
      event_match_id: null,
      event_match_confidence: null,
      event_match_reason: null,
    } satisfies PhotoUploadMetadataRow;

    const payload = buildMemoryChaptersExportPayload({
      generatedAt: '2026-05-05T12:00:00Z',
      siteSlug: 'ava-sam',
      memoryChapters: [{
        date: '2026-05-05',
        entries: [{ upload, analysis, metadata }],
        highlights: 1,
        bucketNames: ['Ceremony'],
      }],
    });

    expect(payload).toMatchObject({
      generatedAt: '2026-05-05T12:00:00Z',
      siteSlug: 'ava-sam',
      chapters: [{
        date: '2026-05-05',
        uploadCount: 1,
        highlightCount: 1,
        bucketNames: ['Ceremony'],
        frames: [{
          uploadId: 'u1',
          filename: 'ceremony.jpg',
          takenAt: '2026-05-05T09:00:00Z',
          suggestedBucket: 'Ceremony',
          slideshowPriority: 88,
          qualityScore: 0.91,
        }],
      }],
    });
  });

  it('builds curated recap export payloads with summary, highlights, duplicates, and slideshow state', () => {
    const upload = {
      id: 'u1',
      photo_album_id: 'b1',
      original_filename: 'first-dance.jpg',
      guest_name: 'Lee',
      guest_email: null,
      note: null,
      mime_type: 'image/jpeg',
      size_bytes: 123,
      drive_web_view_link: null,
      is_hidden: false,
      is_flagged: false,
      recap_hidden: false,
      recap_featured: true,
      recap_story: true,
      uploaded_at: '2026-05-05T10:30:00Z',
    } satisfies PhotoUploadRow;
    const hiddenUpload = {
      ...upload,
      id: 'u2',
      original_filename: 'hidden.jpg',
      is_hidden: true,
      recap_featured: false,
      recap_story: false,
    } satisfies PhotoUploadRow;
    const bucket = {
      id: 'b1',
      name: 'Dance Floor',
      slug: 'dance-floor',
      parent_album_id: null,
      hierarchy_label: 'Reception / Dance Floor',
      drive_folder_url: null,
      is_active: true,
      created_at: '2026-05-05T10:00:00Z',
      itinerary_event_id: null,
      opens_at: null,
      closes_at: null,
    } satisfies PhotoBucketRow;
    const analysis = {
      id: 'a1',
      upload_id: 'u1',
      wedding_site_id: 'site1',
      photo_album_id: 'b1',
      status: 'ready',
      detected_moment: null,
      suggested_bucket_id: 'b1',
      suggested_bucket_name: 'Dance Floor',
      bucket_confidence: 0.9,
      quality_score: 0.95,
      blur_score: 0,
      people_count_range: null,
      is_video: false,
      slideshow_priority: 96,
      caption: 'Favorite moment',
      tags: ['party'],
      warnings: [],
      error_message: null,
      analyzed_at: '2026-05-05T11:00:00Z',
    } satisfies PhotoUploadAiAnalysisRow;
    const metadata = {
      upload_id: 'u1',
      taken_at: '2026-05-05T09:00:00Z',
      width: 1200,
      height: 800,
      has_exif: true,
      has_gps: false,
      file_sha256: 'same-file',
      perceptual_hash: null,
      location_label: null,
      event_match_id: null,
      event_match_confidence: null,
      event_match_reason: null,
    } satisfies PhotoUploadMetadataRow;

    const payload = buildCuratedRecapExportPayload({
      generatedAt: '2026-05-05T12:00:00Z',
      siteSlug: 'lee-ava',
      uploads: [upload, hiddenUpload],
      buckets: [bucket],
      uploadAnalyses: [analysis],
      hiddenUploadCount: 1,
      flaggedUploadCount: 0,
      highlightUploads: [{ upload, analysis, metadata }],
      chronologicalUploads: [{ upload, analysis, metadata }],
      memoryChapters: [{
        date: '2026-05-05',
        entries: [{ upload, analysis, metadata }],
        highlights: 1,
        bucketNames: ['Dance Floor'],
      }],
      similarPhotoGroups: [{
        bestUploadId: 'u1',
        duplicateIds: ['u2'],
        entries: [{ upload }, { upload: hiddenUpload }],
      }],
      duplicateExtraCount: 1,
      slideshowOrder: 'highlights',
      slideshowTheme: 'editorial',
      slideshowFrames: [{
        uploadId: 'u1',
        bucketId: 'b1',
        bucketName: 'Reception / Dance Floor',
        title: 'first-dance.jpg',
        caption: 'Favorite moment',
        takenAt: '2026-05-05T09:00:00Z',
      }],
    });

    expect(payload.summary).toEqual({
      totalUploads: 2,
      visibleUploads: 1,
      hiddenUploads: 1,
      flaggedUploads: 0,
      analyzedUploads: 1,
      highlights: 1,
      timedUploads: 1,
      similarSets: 1,
      duplicateExtras: 1,
    });
    expect(payload.highlights[0]).toMatchObject({
      uploadId: 'u1',
      bucket: 'Reception / Dance Floor',
      suggestedBucket: 'Dance Floor',
      tags: ['party'],
      featured: true,
      story: true,
      recapHidden: false,
      slideshowPriority: 96,
      qualityScore: 0.95,
    });
    expect(payload.duplicateSets[0]).toMatchObject({
      bestUploadId: 'u1',
      duplicateIds: ['u2'],
      filenames: ['first-dance.jpg', 'hidden.jpg'],
    });
    expect(payload.slideshow).toMatchObject({
      order: 'highlights',
      theme: 'editorial',
      frames: [expect.objectContaining({ uploadId: 'u1' })],
    });
  });

  it('builds photo sharing messages and link CSV exports from known album links only', () => {
    const activeBucket = {
      id: 'b1',
      name: 'First "Dance"',
      slug: 'first-dance',
      parent_album_id: null,
      hierarchy_label: null,
      drive_folder_url: 'https://drive.example/folder',
      is_active: true,
      created_at: '2026-05-05T10:00:00Z',
      itinerary_event_id: null,
      opens_at: null,
      closes_at: null,
    } satisfies PhotoBucketRow;
    const pausedBucket = {
      ...activeBucket,
      id: 'b2',
      name: 'After Party',
      slug: 'after-party',
      drive_folder_url: null,
      is_active: false,
    } satisfies PhotoBucketRow;
    const links = {
      b1: 'https://dayof.love/photos/upload/first-dance',
      b2: 'https://dayof.love/photos/upload/after-party',
    };

    expect(makePhotoShareMessage('First Dance', links.b1)).toBe(
      'Please upload your First Dance photos here: https://dayof.love/photos/upload/first-dance',
    );
    expect(buildPhotoShareMessageLines({ buckets: [activeBucket, pausedBucket], bucketUploadLinks: links, activeOnly: true })).toEqual([
      'First "Dance": Please upload your First "Dance" photos here: https://dayof.love/photos/upload/first-dance',
    ]);
    expect(buildPhotoKnownLinks({ buckets: [activeBucket, pausedBucket], bucketUploadLinks: links })).toEqual([
      links.b1,
      links.b2,
    ]);

    const sharePack = buildPhotoSharePackCsv({ buckets: [activeBucket, pausedBucket], bucketUploadLinks: links });
    expect(sharePack).toContain('"First ""Dance"""');
    expect(sharePack).toContain('"Please upload your First ""Dance"" photos here: https://dayof.love/photos/upload/first-dance"');
    expect(sharePack).toContain('"paused"');

    const bucketLinks = buildPhotoBucketLinksCsv({ buckets: [activeBucket, pausedBucket], bucketUploadLinks: { b1: links.b1 } });
    expect(bucketLinks).toContain('name,slug,status,upload_link,backup_folder_url');
    expect(bucketLinks).toContain('"https://drive.example/folder"');
    expect(bucketLinks).not.toContain('After Party');
    expect(buildPhotoSharePackCsv({ buckets: [activeBucket], bucketUploadLinks: {} })).toBe('');
    expect(buildPhotoBucketLinksCsv({ buckets: [pausedBucket], bucketUploadLinks: {} })).toBe('');
  });

  it('builds dashboard photo counts and memory collections outside the page component', () => {
    const featuredUpload = {
      id: 'u1',
      photo_album_id: 'b1',
      original_filename: 'featured.jpg',
      guest_name: 'Ava',
      guest_email: null,
      note: null,
      mime_type: 'image/jpeg',
      size_bytes: 123,
      drive_web_view_link: null,
      is_hidden: false,
      is_flagged: false,
      recap_hidden: false,
      recap_featured: true,
      recap_story: false,
      uploaded_at: '2026-05-05T10:30:00Z',
    } satisfies PhotoUploadRow;
    const duplicateUpload = {
      ...featuredUpload,
      id: 'u2',
      original_filename: 'duplicate.jpg',
      recap_featured: false,
      uploaded_at: '2026-05-05T10:35:00Z',
    } satisfies PhotoUploadRow;
    const hiddenUpload = {
      ...featuredUpload,
      id: 'u3',
      original_filename: 'hidden.jpg',
      is_hidden: true,
      recap_featured: false,
      recap_hidden: true,
    } satisfies PhotoUploadRow;
    const flaggedUpload = {
      ...featuredUpload,
      id: 'u4',
      original_filename: 'flagged.jpg',
      is_flagged: true,
      recap_featured: false,
    } satisfies PhotoUploadRow;
    const bucket = {
      id: 'b1',
      name: 'Ceremony',
      slug: 'ceremony',
      parent_album_id: null,
      hierarchy_label: 'Main / Ceremony',
      drive_folder_url: null,
      is_active: true,
      created_at: '2026-05-05T10:00:00Z',
      itinerary_event_id: null,
      opens_at: null,
      closes_at: null,
    } satisfies PhotoBucketRow;
    const pausedBucket = {
      ...bucket,
      id: 'b2',
      name: 'Paused',
      slug: 'paused',
      is_active: false,
    } satisfies PhotoBucketRow;
    const featuredAnalysis = {
      id: 'a1',
      upload_id: 'u1',
      wedding_site_id: 'site1',
      photo_album_id: 'b1',
      status: 'ready',
      detected_moment: null,
      suggested_bucket_id: 'b1',
      suggested_bucket_name: 'Ceremony',
      bucket_confidence: 0.9,
      quality_score: 0.92,
      blur_score: 0,
      people_count_range: null,
      is_video: false,
      slideshow_priority: 91,
      caption: null,
      tags: [],
      warnings: [],
      error_message: null,
      analyzed_at: '2026-05-05T11:00:00Z',
    } satisfies PhotoUploadAiAnalysisRow;
    const duplicateAnalysis = {
      ...featuredAnalysis,
      id: 'a2',
      upload_id: 'u2',
      quality_score: 0.7,
      slideshow_priority: 50,
      bucket_confidence: 0.42,
      warnings: ['dim lighting'],
    } satisfies PhotoUploadAiAnalysisRow;
    const fallbackAnalysis = {
      ...featuredAnalysis,
      id: 'a3',
      upload_id: 'u3',
      status: 'fallback',
      quality_score: 0.1,
      slideshow_priority: 0,
    } satisfies PhotoUploadAiAnalysisRow;
    const metadata = {
      upload_id: 'u1',
      taken_at: '2026-05-05T09:00:00Z',
      width: 1200,
      height: 800,
      has_exif: true,
      has_gps: true,
      file_sha256: 'same',
      perceptual_hash: null,
      location_label: null,
      event_match_id: 'event-1',
      event_match_confidence: 0.8,
      event_match_reason: null,
    } satisfies PhotoUploadMetadataRow;
    const duplicateMetadata = {
      ...metadata,
      upload_id: 'u2',
      taken_at: '2026-05-05T09:05:00Z',
      has_gps: false,
    } satisfies PhotoUploadMetadataRow;

    expect(buildPhotoDashboardCounts({
      uploads: [featuredUpload, duplicateUpload, hiddenUpload, flaggedUpload],
      buckets: [bucket, pausedBucket],
      uploadAnalyses: [featuredAnalysis, duplicateAnalysis, fallbackAnalysis],
      uploadMetadata: [metadata, duplicateMetadata],
      aiBucketCorrections: [
        { id: 'c1', upload_id: 'u1', action: 'accepted', previous_bucket_id: null, suggested_bucket_id: 'b1', chosen_bucket_id: 'b1', confidence: 0.9, reason: null, created_at: '2026-05-05T12:00:00Z' },
        { id: 'c2', upload_id: 'u2', action: 'rejected', previous_bucket_id: null, suggested_bucket_id: 'b2', chosen_bucket_id: null, confidence: 0.4, reason: null, created_at: '2026-05-05T12:05:00Z' },
      ],
    })).toMatchObject({
      totalUploads: 4,
      activeBucketsCount: 1,
      pausedBucketsCount: 1,
      visionReadyCount: 2,
      visionFallbackCount: 1,
      metadataExifCount: 2,
      metadataGpsCount: 1,
      metadataEventMatchCount: 2,
      aiAcceptedCorrectionCount: 1,
      aiRejectedCorrectionCount: 1,
      hiddenUploadCount: 1,
      flaggedUploadCount: 1,
      recapHiddenCount: 1,
      recapFeaturedCount: 1,
    });

    const collections = buildPhotoMemoryCollections({
      uploads: [featuredUpload, duplicateUpload, hiddenUpload, flaggedUpload],
      analysisByUploadId: new Map<string, PhotoUploadAiAnalysisRow>([[featuredAnalysis.upload_id, featuredAnalysis], [duplicateAnalysis.upload_id, duplicateAnalysis], [fallbackAnalysis.upload_id, fallbackAnalysis]]),
      metadataByUploadId: new Map<string, PhotoUploadMetadataRow>([[metadata.upload_id, metadata], [duplicateMetadata.upload_id, duplicateMetadata]]),
    });

    expect(collections.chronologicalUploads.map((entry) => entry.upload.id)).toEqual(['u1', 'u2']);
    expect(collections.memoryChapters[0]).toMatchObject({ date: '2026-05-05', highlights: 1, bucketNames: ['Ceremony'] });
    expect(collections.highlightUploads.map((entry) => entry.upload.id)).toEqual(['u1']);
    expect(collections.reviewUploads.map((entry) => entry.upload.id)).toContain('u2');
    expect(collections.similarPhotoGroups[0]).toMatchObject({ bestUploadId: 'u1', duplicateIds: ['u2'] });
    expect(collections.duplicateExtraCount).toBe(1);
  });
});
