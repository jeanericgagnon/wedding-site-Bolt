import { customerSafeErrorMessage } from '../lib/customerSafeError';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

type GuestHubHeaders = Record<string, string>;
type GuestHubAccessPayload = {
  inviteToken?: string | null;
  passwordSession?: string | null;
  guestInviteToken?: string | null;
};

export function hasGuestHubPublicRuntime() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getGuestHubPublicBaseHeaders(headers: GuestHubHeaders = {}) {
  return supabaseAnonKey ? { apikey: supabaseAnonKey, ...headers } : headers;
}

export async function fetchGuestHubConfig<T>(slug: string, headers: GuestHubHeaders = {}): Promise<T | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const res = await fetch(`${supabaseUrl}/functions/v1/guest-hub-config?site=${encodeURIComponent(slug)}`, {
    headers: getGuestHubPublicBaseHeaders(headers),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGuestRecapConfig<T>(slug: string, headers: GuestHubHeaders = {}, fallback = 'Couldn’t load the recap.'): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error(fallback);
  const res = await fetch(`${supabaseUrl}/functions/v1/guest-recap-config?site=${encodeURIComponent(slug)}`, {
    headers: getGuestHubPublicBaseHeaders(headers),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(customerSafeErrorMessage(typeof (payload as { error?: unknown }).error === 'string' ? (payload as { error?: string }).error : '', fallback));
  }
  return payload as T;
}

export async function trackGuestHubEvent(
  slug: string,
  eventType: 'view' | 'click',
  target: string,
  access: GuestHubAccessPayload,
): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) return;
  await fetch(`${supabaseUrl}/functions/v1/guest-hub-track`, {
    method: 'POST',
    headers: { ...getGuestHubPublicBaseHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteSlug: slug, eventType, target, ...access }),
  });
}

export async function submitGuestHubProspect<T>(
  payload: Record<string, unknown>,
  fallback: string,
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error(fallback);
  const res = await fetch(`${supabaseUrl}/functions/v1/guest-prospect-submit`, {
    method: 'POST',
    headers: { ...getGuestHubPublicBaseHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(customerSafeErrorMessage(typeof (body as { error?: unknown }).error === 'string' ? (body as { error?: string }).error : '', fallback));
  }
  return body as T;
}
