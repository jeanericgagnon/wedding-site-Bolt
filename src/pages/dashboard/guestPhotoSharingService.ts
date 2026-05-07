import type { AiCanonicalSectionContent } from '../../lib/aiCanonicalContent';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import type { DraftGenerationResult } from '../../lib/aiDraftGenerator';
import type { CanonicalPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { supabase } from '../../lib/supabase';

const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json';
const GUEST_PHOTO_SITE_LOAD_ERROR_COPY = 'Choose a wedding site before managing photos.';

export const safeGuestPhotoOwnerServiceError = (err: unknown, fallback = GUEST_PHOTO_SITE_LOAD_ERROR_COPY) => (
  customerSafeErrorMessage(err, fallback)
);

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

  const { error: updateError } = await supabase
    .from('wedding_sites')
    .update(updatePayload)
    .eq('id', siteId);
  if (updateError) throw new Error(safeGuestPhotoOwnerServiceError(updateError, 'Couldn’t save photo buckets right now.'));
}
