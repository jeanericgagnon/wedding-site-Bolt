const RSVP_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rsvp-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasRsvpFunctionRuntime() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(ANON_KEY);
}

export async function callValidateRsvpToken<T = unknown>(
  body: object,
): Promise<{ data?: T; error?: string; status?: number }> {
  if (!hasRsvpFunctionRuntime()) {
    return { error: 'missing-config', status: 0 };
  }

  const response = await fetch(RSVP_FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      error: (json as { error?: string })?.error ?? `Error ${response.status}`,
      status: response.status,
    };
  }

  if ((json as { error?: string })?.error) {
    return { error: (json as { error?: string }).error };
  }

  return { data: json as T };
}
