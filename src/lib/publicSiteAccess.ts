import type { BuilderProject } from '../types/builder/project';
import type { LayoutConfigV1 } from '../types/layoutConfig';
import type { WeddingDataV1 } from '../types/weddingData';
import { customerSafeErrorMessage } from "./customerSafeError";

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
  is_published: boolean;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  wedding_location: string | null;
  template_id: string | null;
  default_language: string | null;
  allow_search_indexing: boolean;
  render_model: {
    builderProject: BuilderProject | null;
    weddingData: WeddingDataV1 | null;
    layoutConfig: LayoutConfigV1 | null;
  };
}

export interface PublicSiteAccessResponse {
  status: PublicSiteGateStatus;
  site: PublicSiteSafeRow | null;
  passwordSession?: string | null;
}

const PUBLIC_SITE_ACCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-site-access`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PUBLIC_SITE_ACCESS_ERROR_COPY = "Could not check this wedding site right now. Please try again.";

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function sanitizePublicSiteSafeRow(site: unknown): PublicSiteSafeRow | null {
  if (!site || typeof site !== "object" || Array.isArray(site)) return null;
  const row = site as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  const renderModel = asRecord(row.render_model);

  return {
    id: row.id,
    site_slug: nullableString(row.site_slug),
    site_url: nullableString(row.site_url),
    is_published: row.is_published === true,
    couple_name_1: nullableString(row.couple_name_1),
    couple_name_2: nullableString(row.couple_name_2),
    wedding_date: nullableString(row.wedding_date),
    venue_name: nullableString(row.venue_name),
    wedding_location: nullableString(row.wedding_location),
    template_id: nullableString(row.template_id),
    default_language: nullableString(row.default_language),
    allow_search_indexing: row.allow_search_indexing !== false,
    render_model: {
      builderProject: (renderModel?.builderProject ?? null) as BuilderProject | null,
      weddingData: (renderModel?.weddingData ?? null) as WeddingDataV1 | null,
      layoutConfig: (renderModel?.layoutConfig ?? null) as LayoutConfigV1 | null,
    },
  };
}

export function safePublicSiteAccessError(err: unknown): string {
  return customerSafeErrorMessage(err, PUBLIC_SITE_ACCESS_ERROR_COPY, {
    allow: [/^Too many password attempts\. Please wait a minute and try again\.$/i],
  });
}

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
    throw new Error(safePublicSiteAccessError((json as { error?: string }).error || `Error ${response.status}`));
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
    site: sanitizePublicSiteSafeRow((json as { site?: unknown }).site ?? null),
    passwordSession: ((json as { passwordSession?: unknown }).passwordSession ?? null) as string | null,
  };
}

export async function fetchPublicSiteAccess(input: {
  slug: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
  language?: string | null;
}): Promise<PublicSiteAccessResponse> {
  return callPublicSiteAccess({
    action: "resolve",
    slug: input.slug,
    inviteToken: input.inviteToken ?? null,
    passwordSession: input.passwordSession ?? null,
    language: input.language ?? null,
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
