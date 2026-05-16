import type { AiCanonicalSectionContent } from '../../lib/aiCanonicalContent';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import type { DraftGenerationResult } from '../../lib/aiDraftGenerator';
import type { CanonicalPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { supabase } from '../../lib/supabase';
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
} from './guestPhotoSharingUtils';
import { readDemoGuestPhotoState, writeDemoGuestPhotoState } from './guestPhotos/guestPhotoDemoState';

const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json';
const GUEST_PHOTO_DASHBOARD_SITE_SELECT = 'id, site_slug, is_published, wedding_data';
const GUEST_PHOTO_EVENT_SELECT = 'id,event_name,event_date,start_time,end_time' as const;
const GUEST_PHOTO_ALBUM_SELECT = 'id,name,slug,parent_album_id,hierarchy_label,drive_folder_url,is_active,created_at,itinerary_event_id,opens_at,closes_at' as const;
const GUEST_PHOTO_UPLOAD_SELECT = 'id,photo_album_id,original_filename,guest_name,guest_email,note,mime_type,size_bytes,drive_web_view_link,is_hidden,is_flagged,recap_hidden,recap_featured,recap_story,uploaded_at' as const;
const GUEST_PHOTO_GUESTBOOK_SELECT = 'id,guest_name,guest_email,message,is_hidden,is_flagged,created_at' as const;
const GUEST_PHOTO_PROSPECT_SELECT = 'id,guest_name,email,phone,source,wants_photo_updates,wants_own_event_info,recap_email_queued_at,future_event_email_queued_at,created_at' as const;
const GUEST_PHOTO_ANALYSIS_SELECT = 'id,upload_id,wedding_site_id,photo_album_id,status,detected_moment,suggested_bucket_id,suggested_bucket_name,bucket_confidence,quality_score,blur_score,people_count_range,is_video,slideshow_priority,caption,tags,warnings,error_message,analyzed_at' as const;
const GUEST_PHOTO_METADATA_SELECT = 'upload_id,taken_at,width,height,has_exif,has_gps,file_sha256,perceptual_hash,location_label,event_match_id,event_match_confidence,event_match_reason' as const;
const GUEST_PHOTO_BUCKET_CORRECTION_SELECT = 'id,upload_id,action,previous_bucket_id,suggested_bucket_id,chosen_bucket_id,confidence,reason,created_at' as const;
const GUEST_PHOTO_HUB_SETTINGS_SELECT = 'rsvp_enabled,photos_enabled,guestbook_enabled,registry_enabled,schedule_enabled,travel_enabled,recap_status,recap_published_at,recap_closed_at,custom_message,language_default' as const;
const GUEST_PHOTO_SITE_LOAD_ERROR_COPY = 'Choose a wedding site before managing photos.';
export const MAX_GUEST_PHOTO_EVENTS = 200;
export const MAX_GUEST_PHOTO_ALBUMS = 500;
export const MAX_GUEST_PHOTO_UPLOADS = 200;
export const MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES = 50;
export const MAX_GUEST_PHOTO_PROSPECTS = 200;
export const MAX_GUEST_PHOTO_ANALYSES = 250;
export const MAX_GUEST_PHOTO_METADATA_ROWS = 250;
export const MAX_GUEST_PHOTO_BUCKET_CORRECTIONS = 100;

export const safeGuestPhotoOwnerServiceError = (err: unknown, fallback = GUEST_PHOTO_SITE_LOAD_ERROR_COPY) => (
  customerSafeErrorMessage(err, fallback)
);

export interface GuestPhotoDashboardSnapshot {
  siteId: string;
  siteSlug: string | null;
  isPublished: boolean;
  weddingMeta: Record<string, unknown>;
  events: ItineraryEvent[];
  buckets: PhotoBucketRow[];
  uploads: PhotoUploadRow[];
  guestbookEntries: GuestbookEntryRow[];
  guestProspects: GuestProspectOptinRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  aiBucketCorrections: PhotoAiBucketCorrectionRow[];
  hubSettings: GuestHubSettings;
}

export async function saveGuestPhotoHubSettings(
  siteId: string,
  hubSettings: GuestHubSettings,
): Promise<void> {
  if (siteId === 'demo-site-id') {
    const snapshot = readDemoGuestPhotoState();
    writeDemoGuestPhotoState({
      ...snapshot,
      hubSettings: {
        ...snapshot.hubSettings,
        ...hubSettings,
      },
    });
    return;
  }
  const userId = await getGuestPhotoCurrentUserId();
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.rpc('guest_hub_settings_write', {
    p_wedding_site_id: siteId,
    p_payload: {
      ...hubSettings,
      recap_published_at: hubSettings.recap_status === 'published' ? (hubSettings.recap_published_at ?? now) : hubSettings.recap_published_at,
      recap_closed_at: hubSettings.recap_status === 'closed' ? (hubSettings.recap_closed_at ?? now) : null,
      custom_message: hubSettings.custom_message.trim() || null,
      language_default: hubSettings.language_default.trim() || 'en',
      updated_by: userId,
      updated_at: now,
    },
  });
  if (upsertError) throw upsertError;
}

export async function moderateGuestbookEntry(
  entryId: string,
  patch: Partial<Pick<GuestbookEntryRow, 'is_hidden' | 'is_flagged'>>,
): Promise<void> {
  const { error: updateError } = await supabase.rpc('guestbook_entry_moderate', {
    p_entry_id: entryId,
    p_payload: { ...patch, moderated_at: new Date().toISOString() },
  });
  if (updateError) throw updateError;
}

export async function persistGuestPhotoAiOpsPlan(
  siteId: string,
  plan: unknown,
): Promise<void> {
  const { data, error: readError } = await supabase
    .from('wedding_sites')
    .select('wedding_data')
    .eq('id', siteId)
    .maybeSingle();

  if (readError) throw readError;

  const weddingData = (data?.wedding_data as Record<string, unknown> | null) ?? {};
  const nextWeddingData = {
    ...weddingData,
    meta: {
      ...(((weddingData.meta as Record<string, unknown> | undefined) ?? {})),
      aiPhotoOps: plan,
    },
  };

  const { error: updateError } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: { wedding_data: nextWeddingData },
  });

  if (updateError) throw updateError;
}

export async function moveGuestPhotoUploadToBucket(
  siteId: string,
  uploadId: string,
  photoAlbumId: string,
): Promise<void> {
  const { error: moveError } = await supabase.rpc('photo_upload_bucket_move', {
    p_wedding_site_id: siteId,
    p_upload_id: uploadId,
    p_photo_album_id: photoAlbumId,
  });
  if (moveError) throw moveError;
}

export async function createGuestPhotoBucketCorrection(
  siteId: string,
  analysis: PhotoUploadAiAnalysisRow,
  action: PhotoAiBucketCorrectionRow['action'],
  chosenBucketId: string | null,
  reason: string,
): Promise<PhotoAiBucketCorrectionRow> {
  const userId = await getGuestPhotoCurrentUserId();
  const payload = {
    wedding_site_id: siteId,
    upload_id: analysis.upload_id,
    previous_bucket_id: analysis.photo_album_id,
    suggested_bucket_id: analysis.suggested_bucket_id,
    chosen_bucket_id: chosenBucketId,
    action,
    confidence: analysis.bucket_confidence,
    reason,
    metadata: {
      detected_moment: analysis.detected_moment,
      suggested_bucket_name: analysis.suggested_bucket_name,
    },
    created_by: userId,
  };

  const { data, error: correctionError } = await supabase.rpc('photo_ai_bucket_correction_write', {
    p_wedding_site_id: siteId,
    p_payload: payload,
  });
  if (correctionError) throw correctionError;
  return data as PhotoAiBucketCorrectionRow;
}

export async function refreshGuestPhotoSession(): Promise<boolean> {
  const { data } = await supabase.auth.refreshSession();
  return Boolean(data.session);
}

export async function getGuestPhotoCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function resolveGuestPhotoDashboardUserId(): Promise<string | null> {
  await supabase.auth.getSession();

  const currentUserId = await getGuestPhotoCurrentUserId();
  if (currentUserId) return currentUserId;

  const { data: sessionRes } = await supabase.auth.getSession();
  const sessionUserId = sessionRes.session?.user?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const refreshed = await supabase.auth.refreshSession();
  return refreshed.data.session?.user?.id ?? null;
}

export async function invokeGuestPhotoOwnerFunction<T = unknown>(
  fnName: string,
  body: Record<string, unknown>,
): Promise<T> {
  try {
    const data = await invokeFunctionOrThrow(supabase, fnName, body);
    return data as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
    if (!authish) throw err;

    const refreshed = await refreshGuestPhotoSession();
    if (!refreshed) throw err;
    const data = await invokeFunctionOrThrow(supabase, fnName, body);
    return data as T;
  }
}

export async function queueGuestPhotoFollowups(
  siteId: string,
  kind: 'recap' | 'future_event',
): Promise<{ queued?: number } | null> {
  return await invokeGuestPhotoOwnerFunction<{ queued?: number }>('queue-guest-followups', { siteId, kind });
}

export async function analyzeGuestPhotoUploads(
  siteId: string,
  uploadIds: string[],
  force: boolean,
  mode: 'vision' | 'auto',
): Promise<{ analyzed?: number; skipped?: number; results?: PhotoUploadAiAnalysisRow[] }> {
  return await invokeGuestPhotoOwnerFunction<{ analyzed?: number; skipped?: number; results?: PhotoUploadAiAnalysisRow[] }>('photo-analyze-batch', {
    siteId,
    uploadIds,
    limit: uploadIds.length,
    force,
    mode,
  });
}

export async function exportGuestPhotoManifest(
  siteId: string,
  includeHidden: boolean,
): Promise<{ rows?: Array<Record<string, unknown>> }> {
  if (siteId === 'demo-site-id') {
    const snapshot = readDemoGuestPhotoState();
    const bucketById = new Map(snapshot.buckets.map((bucket) => [bucket.id, bucket]));
    const rows = snapshot.uploads
      .filter((upload) => includeHidden || !upload.is_hidden)
      .map((upload) => ({
        bucket: bucketById.get(upload.photo_album_id)?.name ?? '',
        filename: upload.original_filename,
        guest_name: upload.guest_name ?? null,
        guest_email: upload.guest_email ?? null,
        note: upload.note ?? null,
        mime_type: upload.mime_type ?? null,
        size_bytes: upload.size_bytes ?? null,
        uploaded_at: upload.uploaded_at ?? null,
        download_url: upload.drive_web_view_link ?? null,
        hidden: upload.is_hidden ? 'yes' : 'no',
        flagged: upload.is_flagged ? 'yes' : 'no',
      }));
    return { rows };
  }
  return await invokeGuestPhotoOwnerFunction<{ rows?: Array<Record<string, unknown>> }>('photo-export-manifest', {
    siteId,
    includeHidden,
  });
}

export async function moderateGuestPhotoUploads(
  uploadIds: string[],
  patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged' | 'recap_hidden' | 'recap_featured' | 'recap_story'>>,
): Promise<void> {
  if (uploadIds.some((id) => id.startsWith('demo-photo-upload-'))) {
    const snapshot = readDemoGuestPhotoState();
    const targetIds = new Set(uploadIds);
    writeDemoGuestPhotoState({
      ...snapshot,
      uploads: snapshot.uploads.map((upload) => (
        targetIds.has(upload.id)
          ? { ...upload, ...patch }
          : upload
      )),
    });
    return;
  }
  await invokeGuestPhotoOwnerFunction('photo-upload-moderate', { uploadIds, patch });
}

export async function manageGuestPhotoAlbum(body: {
  action: 'regenerate_link' | 'set_active' | 'set_parent' | 'set_window';
  albumId: string;
  isActive?: boolean;
  parentAlbumId?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
}): Promise<Record<string, unknown>> {
  return await invokeGuestPhotoOwnerFunction<Record<string, unknown>>('photo-album-manage', body);
}

export async function createGuestPhotoAlbum(body: {
  siteId: string;
  name: string;
  itineraryEventId?: string | null;
  parentAlbumId?: string | null;
}): Promise<{
  album?: { id?: string | null; name?: string | null } | null;
  bucket?: { id?: string | null; name?: string | null } | null;
  uploadUrl?: string | null;
}> {
  return await invokeGuestPhotoOwnerFunction<{
    album?: { id?: string | null; name?: string | null } | null;
    bucket?: { id?: string | null; name?: string | null } | null;
    uploadUrl?: string | null;
  }>('photo-album-create', body);
}

export async function loadGuestPhotoDashboardSnapshot(userId: string): Promise<GuestPhotoDashboardSnapshot> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) throw new Error(GUEST_PHOTO_SITE_LOAD_ERROR_COPY);

  const { data: site, error: siteErr } = await supabase
    .from('wedding_sites')
    .select(GUEST_PHOTO_DASHBOARD_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();
  if (siteErr || !site) throw new Error(siteErr?.message ?? GUEST_PHOTO_SITE_LOAD_ERROR_COPY);

  const [{ data: eventsData, error: eventsError }, { data: bucketData, error: bucketError }, { data: uploadsData, error: uploadsError }] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_PHOTO_EVENT_SELECT)
      .eq('wedding_site_id', site.id)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(MAX_GUEST_PHOTO_EVENTS),
    supabase
      .from('photo_albums')
      .select(GUEST_PHOTO_ALBUM_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_ALBUMS),
    supabase
      .from('photo_uploads')
      .select(GUEST_PHOTO_UPLOAD_SELECT)
      .eq('wedding_site_id', site.id)
      .order('uploaded_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_UPLOADS),
  ]);

  if (eventsError) throw eventsError;
  if (bucketError) throw bucketError;
  if (uploadsError) throw uploadsError;

  const [
    { data: guestbookData },
    { data: prospectData },
    { data: analysisData },
    { data: metadataData },
    { data: correctionData },
    { data: hubData },
  ] = await Promise.all([
    supabase
      .from('guestbook_entries')
      .select(GUEST_PHOTO_GUESTBOOK_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES),
    supabase
      .from('guest_prospect_optins')
      .select(GUEST_PHOTO_PROSPECT_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_PROSPECTS),
    supabase
      .from('photo_upload_ai_analysis')
      .select(GUEST_PHOTO_ANALYSIS_SELECT)
      .eq('wedding_site_id', site.id)
      .order('analyzed_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_ANALYSES),
    supabase
      .from('photo_upload_metadata')
      .select(GUEST_PHOTO_METADATA_SELECT)
      .eq('wedding_site_id', site.id)
      .limit(MAX_GUEST_PHOTO_METADATA_ROWS),
    supabase
      .from('photo_ai_bucket_corrections')
      .select(GUEST_PHOTO_BUCKET_CORRECTION_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_PHOTO_BUCKET_CORRECTIONS),
    supabase
      .from('guest_hub_settings')
      .select(GUEST_PHOTO_HUB_SETTINGS_SELECT)
      .eq('wedding_site_id', site.id)
      .maybeSingle(),
  ]);

  const nextHubSettings = { ...DEFAULT_HUB_SETTINGS, ...(hubData as Partial<GuestHubSettings> | null ?? {}) };

  return {
    siteId: site.id as string,
    siteSlug: (site.site_slug as string) ?? null,
    isPublished: (site as { is_published?: boolean | null }).is_published === true,
    weddingMeta: (((site.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined) ?? {}),
    events: (eventsData as ItineraryEvent[] | null) ?? [],
    buckets: (bucketData as PhotoBucketRow[] | null) ?? [],
    uploads: (uploadsData as PhotoUploadRow[] | null) ?? [],
    guestbookEntries: (guestbookData as GuestbookEntryRow[] | null) ?? [],
    guestProspects: (prospectData as GuestProspectOptinRow[] | null) ?? [],
    uploadAnalyses: (analysisData as PhotoUploadAiAnalysisRow[] | null) ?? [],
    uploadMetadata: (metadataData as PhotoUploadMetadataRow[] | null) ?? [],
    aiBucketCorrections: (correctionData as PhotoAiBucketCorrectionRow[] | null) ?? [],
    hubSettings: {
      ...nextHubSettings,
      custom_message: nextHubSettings.custom_message ?? '',
      language_default: nextHubSettings.language_default ?? DEFAULT_HUB_SETTINGS.language_default,
    },
  };
}

export function buildGuestPhotoBucketSiteUpdate(
  current: {
    wedding_data?: Record<string, unknown> | null;
    site_json?: Record<string, unknown> | null;
  } | null,
  nextBuckets: CanonicalPhotoBuckets,
): { wedding_data: Record<string, unknown>; site_json: Record<string, unknown> | null | undefined } {
  const weddingData = current?.wedding_data ?? {};
  const meta = (weddingData.meta as Record<string, unknown> | undefined) ?? {};
  const nextWeddingData = {
    ...weddingData,
    meta: {
      ...meta,
      photoBuckets: nextBuckets,
    },
  };
  const aiDraft = (meta.aiDraft as DraftGenerationResult | undefined) ?? null;
  const aiContent = (meta.aiContent as AiCanonicalSectionContent | undefined) ?? null;
  const nextSiteJson = aiDraft
    ? mergeGeneratedDraftIntoBuilderProject(current?.site_json ?? null, aiDraft, aiContent, nextBuckets)
    : current?.site_json;

  return {
    wedding_data: nextWeddingData,
    site_json: nextSiteJson,
  };
}

export async function persistGuestPhotoBuckets(siteId: string, nextBuckets: CanonicalPhotoBuckets): Promise<void> {
  const { data, error: siteErr } = await supabase
    .from('wedding_sites')
    .select(GUEST_PHOTO_BUCKET_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();
  if (siteErr) throw new Error(safeGuestPhotoOwnerServiceError(siteErr, GUEST_PHOTO_SITE_LOAD_ERROR_COPY));

  const updatePayload = buildGuestPhotoBucketSiteUpdate(
    data as { wedding_data?: Record<string, unknown> | null; site_json?: Record<string, unknown> | null } | null,
    nextBuckets,
  );

  const { error: updateError } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: updatePayload,
  });
  if (updateError) throw new Error(safeGuestPhotoOwnerServiceError(updateError, 'Couldn’t save photo buckets right now.'));
}
