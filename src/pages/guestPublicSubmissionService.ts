const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export function hasGuestPublicSubmissionRuntime() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getGuestPublicBase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Guest updates are not ready yet.');
  }
  return { supabaseUrl, supabaseAnonKey };
}

export async function uploadGuestPhotos(form: FormData) {
  const { supabaseUrl, supabaseAnonKey } = getGuestPublicBase();
  const res = await fetch(`${supabaseUrl}/functions/v1/photo-upload`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String((data as { code?: unknown; error?: unknown }).code ?? (data as { error?: unknown }).error ?? 'UPLOAD_FAILED'));
  }
  return data as {
    uploaded?: Array<{ name?: string }>;
    failed?: Array<{ name?: string }>;
  };
}

export async function submitGuestbookEntry(payload: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = getGuestPublicBase();
  const res = await fetch(`${supabaseUrl}/functions/v1/guestbook-submit`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { error?: unknown }).error) {
    throw new Error(String((data as { error?: unknown }).error ?? 'GUESTBOOK_SUBMIT_FAILED'));
  }
  return data;
}

export async function callGuestContactFunction<T>(name: 'guest-contact-lookup' | 'guest-contact-submit', body: unknown): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = getGuestPublicBase();
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { error?: unknown }).error) {
    throw new Error(String((data as { error?: unknown }).error ?? 'GUEST_CONTACT_FAILED'));
  }
  return data as T;
}
