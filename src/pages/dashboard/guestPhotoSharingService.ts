import type { AiCanonicalSectionContent } from '../../lib/aiCanonicalContent';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import type { DraftGenerationResult } from '../../lib/aiDraftGenerator';
import type { CanonicalPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
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

const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json';
const GUEST_PHOTO_SHARING_SITE_SELECT = 'id, site_slug, wedding_data';
const GUEST_PHOTO_ITINERARY_EVENT_SELECT = 'id,event_name,event_date,start_time,end_time';
const GUEST_PHOTO_ALBUM_SELECT = 'id,name,slug,parent_album_id,hierarchy_label,drive_folder_url,is_active,created_at,itinerary_event_id,opens_at,closes_at';
const GUEST_PHOTO_UPLOAD_SELECT = 'id,photo_album_id,original_filename,guest_name,guest_email,note,mime_type,size_bytes,drive_web_view_link,is_hidden,is_flagged,recap_hidden,recap_featured,recap_story,uploaded_at';
const GUEST_PHOTO_GUESTBOOK_SELECT = 'id,guest_name,guest_email,message,is_hidden,is_flagged,created_at';
const GUEST_PHOTO_PROSPECT_SELECT = 'id,guest_name,email,phone,source,wants_photo_updates,wants_own_event_info,recap_email_queued_at,future_event_email_queued_at,created_at';
const GUEST_PHOTO_AI_ANALYSIS_SELECT = 'id,upload_id,wedding_site_id,photo_album_id,status,detected_moment,suggested_bucket_id,suggested_bucket_name,bucket_confidence,quality_score,blur_score,people_count_range,is_video,slideshow_priority,caption,tags,warnings,error_message,analyzed_at';
const GUEST_PHOTO_METADATA_SELECT = 'upload_id,taken_at,width,height,has_exif,has_gps,file_sha256,perceptual_hash,location_label,event_match_id,event_match_confidence,event_match_reason';
const GUEST_PHOTO_BUCKET_CORRECTION_SELECT = 'id,upload_id,action,previous_bucket_id,suggested_bucket_id,chosen_bucket_id,confidence,reason,created_at';
const GUEST_PHOTO_HUB_SETTINGS_SELECT = 'rsvp_enabled,photos_enabled,guestbook_enabled,registry_enabled,schedule_enabled,travel_enabled,recap_status,recap_published_at,recap_closed_at,custom_message,language_default';
const MAX_GUEST_PHOTO_EVENTS = 200;
const MAX_GUEST_PHOTO_ALBUMS = 500;

type GuestPhotoSharingSiteRow = {
  id: string;
  site_slug: string | null;
  wedding_data: Record<string, unknown> | null;
};

export type GuestPhotoSharingSpace = {
  site: GuestPhotoSharingSiteRow;
  events: ItineraryEvent[];
  buckets: PhotoBucketRow[];
  uploads: PhotoUploadRow[];
  guestbookEntries: GuestbookEntryRow[];
  guestProspects: GuestProspectOptinRow[];
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  aiBucketCorrections: PhotoAiBucketCorrectionRow[];
  hubSettings: GuestHubSettings;
};

function withDefaultGuestHubSettings(row: Partial<GuestHubSettings> | null | undefined): GuestHubSettings {
  const nextHubSettings = { ...DEFAULT_HUB_SETTINGS, ...(row ?? {}) };
  return {
    ...nextHubSettings,
    custom_message: nextHubSettings.custom_message ?? '',
    language_default: nextHubSettings.language_default ?? DEFAULT_HUB_SETTINGS.language_default,
  };
}

export async function loadGuestPhotoSharingSpace(userId: string): Promise<GuestPhotoSharingSpace> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) throw new Error('Choose a wedding site before managing photos.');

  const { data: site, error: siteErr } = await supabase
    .from('wedding_sites')
    .select(GUEST_PHOTO_SHARING_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (siteErr || !site) throw new Error(siteErr?.message ?? 'Choose a wedding site before managing photos.');

  const [
    { data: eventsData, error: eventsError },
    { data: bucketData, error: bucketError },
    { data: uploadsData, error: uploadsError },
    { data: guestbookData },
    { data: prospectData },
    { data: analysisData },
    { data: metadataData },
    { data: correctionData },
    { data: hubData },
  ] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_PHOTO_ITINERARY_EVENT_SELECT)
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
      .limit(200),
    supabase
      .from('guestbook_entries')
      .select(GUEST_PHOTO_GUESTBOOK_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('guest_prospect_optins')
      .select(GUEST_PHOTO_PROSPECT_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('photo_upload_ai_analysis')
      .select(GUEST_PHOTO_AI_ANALYSIS_SELECT)
      .eq('wedding_site_id', site.id)
      .order('analyzed_at', { ascending: false })
      .limit(250),
    supabase
      .from('photo_upload_metadata')
      .select(GUEST_PHOTO_METADATA_SELECT)
      .eq('wedding_site_id', site.id)
      .limit(250),
    supabase
      .from('photo_ai_bucket_corrections')
      .select(GUEST_PHOTO_BUCKET_CORRECTION_SELECT)
      .eq('wedding_site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('guest_hub_settings')
      .select(GUEST_PHOTO_HUB_SETTINGS_SELECT)
      .eq('wedding_site_id', site.id)
      .maybeSingle(),
  ]);

  if (eventsError) throw eventsError;
  if (bucketError) throw bucketError;
  if (uploadsError) throw uploadsError;

  return {
    site: site as GuestPhotoSharingSiteRow,
    events: (eventsData as ItineraryEvent[] | null) ?? [],
    buckets: (bucketData as PhotoBucketRow[] | null) ?? [],
    uploads: (uploadsData as PhotoUploadRow[] | null) ?? [],
    guestbookEntries: (guestbookData as GuestbookEntryRow[] | null) ?? [],
    guestProspects: (prospectData as GuestProspectOptinRow[] | null) ?? [],
    uploadAnalyses: (analysisData as PhotoUploadAiAnalysisRow[] | null) ?? [],
    uploadMetadata: (metadataData as PhotoUploadMetadataRow[] | null) ?? [],
    aiBucketCorrections: (correctionData as PhotoAiBucketCorrectionRow[] | null) ?? [],
    hubSettings: withDefaultGuestHubSettings(hubData as Partial<GuestHubSettings> | null),
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
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(GUEST_PHOTO_BUCKET_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;

  const updatePayload = buildGuestPhotoBucketSiteUpdate(
    data as { wedding_data?: Record<string, unknown> | null; site_json?: Record<string, unknown> | null } | null,
    nextBuckets,
  );

  const { error: updateError } = await supabase
    .from('wedding_sites')
    .update(updatePayload)
    .eq('id', siteId);

  if (updateError) throw updateError;
}

export async function persistGuestPhotoAiOpsPlan(siteId: string, plan: unknown): Promise<void> {
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

  const { error: updateError } = await supabase
    .from('wedding_sites')
    .update({ wedding_data: nextWeddingData })
    .eq('id', siteId);

  if (updateError) throw updateError;
}

export async function movePhotoUploadToBucket(uploadId: string, siteId: string, bucketId: string): Promise<void> {
  const { error } = await supabase
    .from('photo_uploads')
    .update({ photo_album_id: bucketId })
    .eq('id', uploadId)
    .eq('wedding_site_id', siteId);

  if (error) throw error;
}

export async function recordPhotoAiBucketCorrection(params: {
  siteId: string;
  analysis: PhotoUploadAiAnalysisRow;
  action: PhotoAiBucketCorrectionRow['action'];
  chosenBucketId: string | null;
  reason: string;
  userId: string | null;
}): Promise<PhotoAiBucketCorrectionRow> {
  const { siteId, analysis, action, chosenBucketId, reason, userId } = params;
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

  const { data, error } = await supabase
    .from('photo_ai_bucket_corrections')
    .insert(payload)
    .select(GUEST_PHOTO_BUCKET_CORRECTION_SELECT)
    .single();

  if (error) throw error;
  return data as PhotoAiBucketCorrectionRow;
}

export async function saveGuestHubSettings(params: {
  siteId: string;
  hubSettings: GuestHubSettings;
  userId: string | null;
  now?: string;
}): Promise<void> {
  const { siteId, hubSettings, userId, now = new Date().toISOString() } = params;
  const { error } = await supabase
    .from('guest_hub_settings')
    .upsert({
      wedding_site_id: siteId,
      ...hubSettings,
      recap_published_at: hubSettings.recap_status === 'published' ? (hubSettings.recap_published_at ?? now) : hubSettings.recap_published_at,
      recap_closed_at: hubSettings.recap_status === 'closed' ? (hubSettings.recap_closed_at ?? now) : null,
      custom_message: hubSettings.custom_message.trim() || null,
      language_default: hubSettings.language_default.trim() || 'en',
      updated_by: userId,
      updated_at: now,
    }, { onConflict: 'wedding_site_id' });

  if (error) throw error;
}

export async function updateGuestbookEntryModeration(
  entryId: string,
  patch: Partial<Pick<GuestbookEntryRow, 'is_hidden' | 'is_flagged'>>,
): Promise<void> {
  const { error } = await supabase
    .from('guestbook_entries')
    .update({ ...patch, moderated_at: new Date().toISOString() })
    .eq('id', entryId);

  if (error) throw error;
}
