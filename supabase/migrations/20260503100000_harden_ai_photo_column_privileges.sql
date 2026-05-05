-- Keep AI/provider diagnostics and raw metadata service-side only.
-- RLS still decides which site rows an authenticated user can see; these
-- column grants keep regular browser clients from selecting sensitive fields.
-- Rollout order: deploy or explicitly order-coordinate the frontend that no
-- longer selects these sensitive columns, then apply this migration, then run
-- V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure.

REVOKE SELECT ON public.photo_upload_ai_analysis FROM anon, authenticated;
GRANT SELECT (
  id,
  upload_id,
  wedding_site_id,
  photo_album_id,
  status,
  source_hash,
  detected_moment,
  suggested_bucket_id,
  suggested_bucket_name,
  bucket_confidence,
  quality_score,
  blur_score,
  people_count_range,
  is_video,
  slideshow_priority,
  caption,
  tags,
  warnings,
  error_message,
  analyzed_at,
  created_at,
  updated_at
) ON public.photo_upload_ai_analysis TO authenticated;

REVOKE SELECT ON public.photo_upload_metadata FROM anon, authenticated;
GRANT SELECT (
  id,
  upload_id,
  wedding_site_id,
  photo_album_id,
  file_sha256,
  perceptual_hash,
  width,
  height,
  orientation,
  taken_at,
  camera_make,
  camera_model,
  location_precision,
  location_label,
  event_match_id,
  event_match_confidence,
  event_match_reason,
  metadata_source,
  has_exif,
  has_gps,
  created_at,
  updated_at
) ON public.photo_upload_metadata TO authenticated;

REVOKE SELECT ON public.photo_ai_bucket_corrections FROM anon, authenticated;
GRANT SELECT (
  id,
  wedding_site_id,
  upload_id,
  previous_bucket_id,
  suggested_bucket_id,
  chosen_bucket_id,
  action,
  confidence,
  reason,
  created_at
) ON public.photo_ai_bucket_corrections TO authenticated;

REVOKE SELECT ON public.internal_ai_usage_events FROM anon, authenticated;
