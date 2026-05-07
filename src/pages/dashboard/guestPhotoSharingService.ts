import type { AiCanonicalSectionContent } from '../../lib/aiCanonicalContent';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import type { DraftGenerationResult } from '../../lib/aiDraftGenerator';
import type { CanonicalPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { supabase } from '../../lib/supabase';

const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json';
const GUEST_PHOTO_SITE_LOAD_ERROR_COPY = 'Choose a wedding site before managing photos.';

export const safeGuestPhotoOwnerServiceError = (err: unknown, fallback = GUEST_PHOTO_SITE_LOAD_ERROR_COPY) => (
  customerSafeErrorMessage(err, fallback)
);

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
