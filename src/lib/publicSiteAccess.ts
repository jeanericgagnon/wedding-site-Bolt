export type PublicSiteGateStatus =
  | "unavailable"
  | "coming_soon"
  | "password_required"
  | "invite_required"
  | "open";

export interface PublicSiteSafeRow {
  id: string;
  site_slug: string | null;
  site_url: string | null;
  is_published: boolean | null;
  site_json: unknown;
  published_json?: unknown;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  wedding_location: string | null;
  template_id: string | null;
  wedding_data: unknown;
  layout_config: unknown;
  default_language: string | null;
  allow_search_indexing: boolean | null;
}

export interface PublicSiteAccessResponse {
  status: PublicSiteGateStatus;
  site: PublicSiteSafeRow | null;
  passwordSession?: string | null;
}

const PUBLIC_SITE_ACCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-site-access`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callPublicSiteAccess(
  body: Record<string, unknown>,
): Promise<PublicSiteAccessResponse> {
  const response = await fetch(PUBLIC_SITE_ACCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as { error?: string }).error || `Error ${response.status}`);
  }

  const status = (json as { status?: string }).status;
  if (
    status !== "unavailable" &&
    status !== "coming_soon" &&
    status !== "password_required" &&
    status !== "invite_required" &&
    status !== "open"
  ) {
    throw new Error("Invalid public site response");
  }

  return {
    status,
    site: ((json as { site?: unknown }).site ?? null) as PublicSiteSafeRow | null,
    passwordSession: ((json as { passwordSession?: unknown }).passwordSession ?? null) as string | null,
  };
}

export async function fetchPublicSiteAccess(input: {
  slug: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
}): Promise<PublicSiteAccessResponse> {
  return callPublicSiteAccess({
    action: "resolve",
    slug: input.slug,
    inviteToken: input.inviteToken ?? null,
    passwordSession: input.passwordSession ?? null,
  });
}

export async function requestPublicSitePasswordUnlock(input: {
  slug: string;
  password: string;
}): Promise<{ ok: boolean; passwordSession?: string | null }> {
  const result = await callPublicSiteAccess({
    action: "password_unlock",
    slug: input.slug,
    password: input.password,
  });

  return {
    ok: result.status === "open",
    passwordSession: result.passwordSession ?? null,
  };
}
