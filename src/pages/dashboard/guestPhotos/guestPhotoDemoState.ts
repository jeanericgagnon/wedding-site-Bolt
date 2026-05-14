import { demoEvents, demoWeddingSite } from '../../../lib/demoData';
import {
  DEFAULT_HUB_SETTINGS,
  type GuestHubSettings,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type ItineraryEvent,
  type PhotoAiBucketCorrectionRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
} from '../guestPhotoSharingUtils';

export const DEMO_GUEST_PHOTO_STATE_STORAGE_KEY = 'dayof.demo.guest-photo.state.v1';

interface GuestPhotoDemoStateEnvelope {
  savedAtISO: string;
  value: GuestPhotoDemoStateSnapshot;
}

export interface GuestPhotoDemoStateSnapshot {
  siteId: string;
  siteSlug: string;
  events: ItineraryEvent[];
  buckets: PhotoBucketRow[];
  uploads: PhotoUploadRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  aiBucketCorrections: PhotoAiBucketCorrectionRow[];
  guestbookEntries: GuestbookEntryRow[];
  guestProspects: GuestProspectOptinRow[];
  hubSettings: GuestHubSettings;
  bucketUploadLinks: Record<string, string>;
}

const NOW = '2026-05-02T12:00:00.000Z';
const DEMO_SITE_ID = demoWeddingSite.id;
const DEMO_SITE_SLUG = demoWeddingSite.site_url;

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const defaultBuckets = (): PhotoBucketRow[] => [
  {
    id: 'demo-photo-album-ceremony',
    name: 'Ceremony',
    slug: 'ceremony',
    parent_album_id: null,
    hierarchy_label: 'Ceremony',
    drive_folder_url: null,
    is_active: true,
    created_at: NOW,
    itinerary_event_id: 'ceremony-id',
    opens_at: null,
    closes_at: null,
  },
  {
    id: 'demo-photo-album-reception',
    name: 'Reception',
    slug: 'reception',
    parent_album_id: null,
    hierarchy_label: 'Reception',
    drive_folder_url: null,
    is_active: true,
    created_at: NOW,
    itinerary_event_id: 'reception-id',
    opens_at: null,
    closes_at: null,
  },
  {
    id: 'demo-photo-album-dance-floor',
    name: 'Dance floor',
    slug: 'dance-floor',
    parent_album_id: 'demo-photo-album-reception',
    hierarchy_label: 'Reception / Dance floor',
    drive_folder_url: null,
    is_active: true,
    created_at: NOW,
    itinerary_event_id: 'reception-id',
    opens_at: null,
    closes_at: null,
  },
];

const defaultBucketUploadLinks = () => ({
  'demo-photo-album-ceremony': `${window.location.origin}/photos/upload?site=${DEMO_SITE_SLUG}&hub=1&invite_token=token-c-1`,
  'demo-photo-album-reception': `${window.location.origin}/photos/upload?site=${DEMO_SITE_SLUG}&hub=1&invite_token=token-c-2`,
  'demo-photo-album-dance-floor': `${window.location.origin}/photos/upload?site=${DEMO_SITE_SLUG}&hub=1&invite_token=token-c-2`,
});

const defaultUploads = (): PhotoUploadRow[] => [
  {
    id: 'demo-photo-upload-1',
    photo_album_id: 'demo-photo-album-ceremony',
    original_filename: 'vows-kiss.jpg',
    guest_name: 'Emma Waters',
    guest_email: 'emma.waters+0@dayof.demo',
    note: 'The first kiss from the left aisle.',
    mime_type: 'image/jpeg',
    size_bytes: 1823400,
    drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-1/view?token=demo-safe-link-1',
    is_hidden: false,
    is_flagged: false,
    recap_hidden: false,
    recap_featured: true,
    recap_story: true,
    uploaded_at: '2026-06-15T16:24:00.000Z',
  },
  {
    id: 'demo-photo-upload-2',
    photo_album_id: 'demo-photo-album-ceremony',
    original_filename: 'ring-closeup.jpg',
    guest_name: 'Noah Waters',
    guest_email: 'noah.waters+1@dayof.demo',
    note: 'Rings right before the vows.',
    mime_type: 'image/jpeg',
    size_bytes: 1532200,
    drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-2/view?token=demo-safe-link-2',
    is_hidden: false,
    is_flagged: false,
    recap_hidden: false,
    recap_featured: true,
    recap_story: false,
    uploaded_at: '2026-06-15T16:10:00.000Z',
  },
  {
    id: 'demo-photo-upload-5',
    photo_album_id: 'demo-photo-album-ceremony',
    original_filename: 'aisle-smile.jpg',
    guest_name: 'Maya Brooks',
    guest_email: 'maya.brooks+4@dayof.demo',
    note: 'A quiet smile right before everyone stood.',
    mime_type: 'image/jpeg',
    size_bytes: 1642800,
    drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-5/view?token=demo-safe-link-5',
    is_hidden: false,
    is_flagged: false,
    recap_hidden: false,
    recap_featured: true,
    recap_story: false,
    uploaded_at: '2026-06-15T16:15:00.000Z',
  },
  {
    id: 'demo-photo-upload-3',
    photo_album_id: 'demo-photo-album-reception',
    original_filename: 'cheers-boomerang.mp4',
    guest_name: 'Olivia Nguyen',
    guest_email: 'olivia.nguyen+2@dayof.demo',
    note: 'Cheers from the welcome toast.',
    mime_type: 'video/mp4',
    size_bytes: 4421000,
    drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-3/view?token=demo-safe-link-3',
    is_hidden: false,
    is_flagged: false,
    recap_hidden: false,
    recap_featured: false,
    recap_story: true,
    uploaded_at: '2026-06-15T18:26:00.000Z',
  },
  {
    id: 'demo-photo-upload-4',
    photo_album_id: 'demo-photo-album-dance-floor',
    original_filename: 'dance-floor-lights.jpg',
    guest_name: 'Liam Nguyen',
    guest_email: 'liam.nguyen+3@dayof.demo',
    note: 'Packed dance floor near the end of the night.',
    mime_type: 'image/jpeg',
    size_bytes: 2119000,
    drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-4/view?token=demo-safe-link-4',
    is_hidden: false,
    is_flagged: false,
    recap_hidden: false,
    recap_featured: false,
    recap_story: true,
    uploaded_at: '2026-06-15T21:48:00.000Z',
  },
];

const defaultUploadAnalyses = (): PhotoUploadAiAnalysisRow[] => [
  {
    id: 'demo-photo-analysis-1',
    upload_id: 'demo-photo-upload-1',
    wedding_site_id: DEMO_SITE_ID,
    photo_album_id: 'demo-photo-album-ceremony',
    status: 'ready',
    detected_moment: 'Ceremony',
    suggested_bucket_id: 'demo-photo-album-ceremony',
    suggested_bucket_name: 'Ceremony',
    bucket_confidence: 0.96,
    quality_score: 0.94,
    blur_score: 0.06,
    people_count_range: '2-4',
    is_video: false,
    slideshow_priority: 96,
    caption: 'You can almost hear the crowd inhale right before the kiss.',
    tags: ['ceremony', 'kiss', 'couple'],
    warnings: [],
    error_message: null,
    analyzed_at: NOW,
  },
  {
    id: 'demo-photo-analysis-2',
    upload_id: 'demo-photo-upload-2',
    wedding_site_id: DEMO_SITE_ID,
    photo_album_id: 'demo-photo-album-ceremony',
    status: 'ready',
    detected_moment: 'Ceremony details',
    suggested_bucket_id: 'demo-photo-album-ceremony',
    suggested_bucket_name: 'Ceremony',
    bucket_confidence: 0.88,
    quality_score: 0.82,
    blur_score: 0.08,
    people_count_range: '0-1',
    is_video: false,
    slideshow_priority: 83,
    caption: 'A quiet detail shot before the ceremony starts moving fast.',
    tags: ['rings', 'details', 'ceremony'],
    warnings: [],
    error_message: null,
    analyzed_at: NOW,
  },
  {
    id: 'demo-photo-analysis-3',
    upload_id: 'demo-photo-upload-5',
    wedding_site_id: DEMO_SITE_ID,
    photo_album_id: 'demo-photo-album-ceremony',
    status: 'ready',
    detected_moment: 'Ceremony aisle',
    suggested_bucket_id: 'demo-photo-album-ceremony',
    suggested_bucket_name: 'Ceremony',
    bucket_confidence: 0.9,
    quality_score: 0.84,
    blur_score: 0.09,
    people_count_range: '2-4',
    is_video: false,
    slideshow_priority: 81,
    caption: 'A calm frame before the ceremony picks up speed.',
    tags: ['ceremony', 'aisle', 'smile'],
    warnings: [],
    error_message: null,
    analyzed_at: NOW,
  },
  {
    id: 'demo-photo-analysis-4',
    upload_id: 'demo-photo-upload-3',
    wedding_site_id: DEMO_SITE_ID,
    photo_album_id: 'demo-photo-album-reception',
    status: 'ready',
    detected_moment: 'Reception toast',
    suggested_bucket_id: 'demo-photo-album-reception',
    suggested_bucket_name: 'Reception',
    bucket_confidence: 0.91,
    quality_score: 0.79,
    blur_score: 0.11,
    people_count_range: '5-9',
    is_video: true,
    slideshow_priority: 77,
    caption: 'Short motion clip from the first big reception toast.',
    tags: ['toast', 'reception', 'video'],
    warnings: [],
    error_message: null,
    analyzed_at: NOW,
  },
  {
    id: 'demo-photo-analysis-5',
    upload_id: 'demo-photo-upload-4',
    wedding_site_id: DEMO_SITE_ID,
    photo_album_id: 'demo-photo-album-dance-floor',
    status: 'ready',
    detected_moment: 'Dance floor',
    suggested_bucket_id: 'demo-photo-album-dance-floor',
    suggested_bucket_name: 'Dance floor',
    bucket_confidence: 0.95,
    quality_score: 0.87,
    blur_score: 0.14,
    people_count_range: '10+',
    is_video: false,
    slideshow_priority: 89,
    caption: 'High-energy frame for the late-night slideshow section.',
    tags: ['dance floor', 'party', 'reception'],
    warnings: [],
    error_message: null,
    analyzed_at: NOW,
  },
];

const defaultUploadMetadata = (): PhotoUploadMetadataRow[] => [
  {
    upload_id: 'demo-photo-upload-1',
    taken_at: '2026-06-15T16:23:42.000Z',
    width: 3024,
    height: 4032,
    has_exif: true,
    has_gps: false,
    file_sha256: 'demo-photo-sha-1',
    perceptual_hash: 'demo-photo-hash-1',
    location_label: 'Rose Garden',
    event_match_id: 'ceremony-id',
    event_match_confidence: 0.97,
    event_match_reason: 'Captured inside ceremony window.',
  },
  {
    upload_id: 'demo-photo-upload-2',
    taken_at: '2026-06-15T16:09:10.000Z',
    width: 3024,
    height: 4032,
    has_exif: true,
    has_gps: false,
    file_sha256: 'demo-photo-sha-2',
    perceptual_hash: 'demo-photo-hash-2',
    location_label: 'Rose Garden',
    event_match_id: 'ceremony-id',
    event_match_confidence: 0.94,
    event_match_reason: 'Captured inside ceremony window.',
  },
  {
    upload_id: 'demo-photo-upload-5',
    taken_at: '2026-06-15T16:14:33.000Z',
    width: 3024,
    height: 4032,
    has_exif: true,
    has_gps: false,
    file_sha256: 'demo-photo-sha-5',
    perceptual_hash: 'demo-photo-hash-5',
    location_label: 'Rose Garden',
    event_match_id: 'ceremony-id',
    event_match_confidence: 0.92,
    event_match_reason: 'Captured inside ceremony window.',
  },
  {
    upload_id: 'demo-photo-upload-3',
    taken_at: '2026-06-15T18:25:31.000Z',
    width: 1920,
    height: 1080,
    has_exif: true,
    has_gps: false,
    file_sha256: 'demo-photo-sha-3',
    perceptual_hash: 'demo-photo-hash-3',
    location_label: 'Grand Ballroom',
    event_match_id: 'reception-id',
    event_match_confidence: 0.95,
    event_match_reason: 'Captured inside reception window.',
  },
  {
    upload_id: 'demo-photo-upload-4',
    taken_at: '2026-06-15T21:48:59.000Z',
    width: 3024,
    height: 4032,
    has_exif: true,
    has_gps: false,
    file_sha256: 'demo-photo-sha-4',
    perceptual_hash: 'demo-photo-hash-4',
    location_label: 'Grand Ballroom',
    event_match_id: 'reception-id',
    event_match_confidence: 0.93,
    event_match_reason: 'Captured inside reception window.',
  },
];

const defaultGuestbookEntries = (): GuestbookEntryRow[] => [
  {
    id: 'demo-guestbook-1',
    guest_name: 'Ava Turner',
    guest_email: 'ava.turner+10@dayof.demo',
    message: 'Still thinking about the vows and that sunset.',
    is_hidden: false,
    is_flagged: false,
    created_at: '2026-06-16T08:15:00.000Z',
  },
];

const defaultGuestProspects = (): GuestProspectOptinRow[] => [
  {
    id: 'demo-guest-prospect-1',
    guest_name: 'Grace Campbell',
    email: 'grace.campbell+26@dayof.demo',
    phone: null,
    source: 'guest_upload',
    wants_photo_updates: true,
    wants_own_event_info: false,
    recap_email_queued_at: null,
    future_event_email_queued_at: null,
    created_at: '2026-06-15T22:15:00.000Z',
  },
];

const defaultHubSettings = (): GuestHubSettings => ({
  ...DEFAULT_HUB_SETTINGS,
  recap_status: 'private_link',
  recap_published_at: '2026-06-16T10:00:00.000Z',
  custom_message: 'Add your favorite photos or a quick video. We will fold the best moments into the recap.',
});

export function buildDefaultDemoGuestPhotoState(): GuestPhotoDemoStateSnapshot {
  return {
    siteId: DEMO_SITE_ID,
    siteSlug: DEMO_SITE_SLUG,
    events: cloneJson(demoEvents as ItineraryEvent[]),
    buckets: defaultBuckets(),
    uploads: defaultUploads(),
    uploadAnalyses: defaultUploadAnalyses(),
    uploadMetadata: defaultUploadMetadata(),
    aiBucketCorrections: [],
    guestbookEntries: defaultGuestbookEntries(),
    guestProspects: defaultGuestProspects(),
    hubSettings: defaultHubSettings(),
    bucketUploadLinks: defaultBucketUploadLinks(),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function sanitizeSnapshot(value: unknown): GuestPhotoDemoStateSnapshot {
  const defaults = buildDefaultDemoGuestPhotoState();
  if (!isRecord(value)) return defaults;

  return {
    siteId: typeof value.siteId === 'string' && value.siteId.trim() ? value.siteId : defaults.siteId,
    siteSlug: typeof value.siteSlug === 'string' && value.siteSlug.trim() ? value.siteSlug : defaults.siteSlug,
    events: Array.isArray(value.events) ? cloneJson(value.events) as ItineraryEvent[] : defaults.events,
    buckets: Array.isArray(value.buckets) ? cloneJson(value.buckets) as PhotoBucketRow[] : defaults.buckets,
    uploads: Array.isArray(value.uploads) ? cloneJson(value.uploads) as PhotoUploadRow[] : defaults.uploads,
    uploadAnalyses: Array.isArray(value.uploadAnalyses) ? cloneJson(value.uploadAnalyses) as PhotoUploadAiAnalysisRow[] : defaults.uploadAnalyses,
    uploadMetadata: Array.isArray(value.uploadMetadata) ? cloneJson(value.uploadMetadata) as PhotoUploadMetadataRow[] : defaults.uploadMetadata,
    aiBucketCorrections: Array.isArray(value.aiBucketCorrections) ? cloneJson(value.aiBucketCorrections) as PhotoAiBucketCorrectionRow[] : defaults.aiBucketCorrections,
    guestbookEntries: Array.isArray(value.guestbookEntries) ? cloneJson(value.guestbookEntries) as GuestbookEntryRow[] : defaults.guestbookEntries,
    guestProspects: Array.isArray(value.guestProspects) ? cloneJson(value.guestProspects) as GuestProspectOptinRow[] : defaults.guestProspects,
    hubSettings: isRecord(value.hubSettings) ? { ...defaults.hubSettings, ...cloneJson(value.hubSettings) as GuestHubSettings } : defaults.hubSettings,
    bucketUploadLinks: isRecord(value.bucketUploadLinks) ? cloneJson(value.bucketUploadLinks) as Record<string, string> : defaults.bucketUploadLinks,
  };
}

export function readDemoGuestPhotoState(storageKey = DEMO_GUEST_PHOTO_STATE_STORAGE_KEY): GuestPhotoDemoStateSnapshot {
  const defaults = buildDefaultDemoGuestPhotoState();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return writeDemoGuestPhotoState(defaults, storageKey);
    const parsed: unknown = JSON.parse(raw);
    const envelopeValue = isRecord(parsed) && 'value' in parsed ? (parsed as unknown as GuestPhotoDemoStateEnvelope).value : parsed;
    return writeDemoGuestPhotoState(sanitizeSnapshot(envelopeValue), storageKey);
  } catch {
    window.localStorage.removeItem(storageKey);
    return writeDemoGuestPhotoState(defaults, storageKey);
  }
}

export function writeDemoGuestPhotoState(
  input: GuestPhotoDemoStateSnapshot,
  storageKey = DEMO_GUEST_PHOTO_STATE_STORAGE_KEY,
): GuestPhotoDemoStateSnapshot {
  const snapshot = sanitizeSnapshot(input);
  if (typeof window !== 'undefined') {
    const envelope: GuestPhotoDemoStateEnvelope = {
      savedAtISO: new Date().toISOString(),
      value: snapshot,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  }
  return snapshot;
}
