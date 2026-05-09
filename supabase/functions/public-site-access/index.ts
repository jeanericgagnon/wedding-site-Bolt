import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { signSessionToken } from "../_shared/signedSession.ts";
import { normalizePublicPrivacyMode, resolvePublicAccessStatus } from "../_shared/publicAccessGate.ts";
import { applyPublicSiteTranslation, buildPublicSiteRenderSite } from "../../../src/lib/publicSiteRenderModel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResolvePayload {
  action: "resolve";
  slug: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
  language?: string | null;
}

interface PasswordUnlockPayload {
  action: "password_unlock";
  slug: string;
  password: string;
}

type Payload = ResolvePayload | PasswordUnlockPayload;

const PUBLIC_SITE_PASSWORD_RATE_LIMIT_WINDOW_MINUTES = 15;
const PUBLIC_SITE_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS = 8;

const PUBLIC_SITE_RENDER_COLUMNS = [
  "id",
  "site_slug",
  "site_url",
  "is_published",
  "site_json",
  "published_json",
  "couple_name_1",
  "couple_name_2",
  "wedding_date",
  "venue_name",
  "wedding_location",
  "template_id",
  "wedding_data",
  "layout_config",
  "default_language",
];

const PRIVATE_PUBLIC_SITE_COLUMNS = [
  ...PUBLIC_SITE_RENDER_COLUMNS,
  "privacy_mode",
  "hide_from_search",
  "site_password_hash",
  "guest_access_token",
];

function cleanSlugToken(token: string): string | null {
  const cleaned = token.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
  return cleaned || null;
}

function extractHost(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizePublicSiteSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const fromPath = raw.match(/\/site\/([^/?#]+)/i);
  if (fromPath?.[1]) return cleanSlugToken(fromPath[1]);

  const host = extractHost(raw);
  if (host) {
    if (host.endsWith(".dayof.love")) {
      const sub = host.replace(/\.dayof\.love$/, "");
      if (sub && sub !== "www") return cleanSlugToken(sub);
    }
    if (host === "dayof.love" || host === "www.dayof.love") return null;
  }

  if (raw.includes(".") || raw.includes("/")) return null;
  return cleanSlugToken(raw);
}

function buildSiteUrlLookupCandidates(slug: string): string[] {
  const normalized = normalizePublicSiteSlug(slug);
  if (!normalized) return [];

  const bare = `${normalized}.dayof.love`;
  return [
    normalized,
    bare,
    `https://${bare}`,
    `http://${bare}`,
    `https://www.${bare}`,
    `http://www.${bare}`,
  ];
}

async function hashRateLimitKey(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getIsPublishedFromSiteRow(row: Record<string, unknown>): boolean {
  const siteJsonMeta = asRecord(row.site_json);
  const publishedJsonMeta = asRecord(row.published_json);
  const publishMeta = publishedJsonMeta ?? siteJsonMeta;
  const lastPublishedAt = typeof publishMeta?.lastPublishedAt === "string"
    ? publishMeta.lastPublishedAt.trim()
    : "";

  return Boolean(
    row.is_published === true ||
    publishMeta?.publishStatus === "published" ||
    (typeof publishMeta?.publishedVersion === "number" && publishMeta.publishedVersion > 0) ||
    lastPublishedAt.length > 0
  );
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadPublicSiteTranslation(
  adminClient: ReturnType<typeof createClient>,
  siteId: string,
  language: string | null | undefined,
): Promise<Record<string, unknown> | null> {
  const normalizedLanguage = typeof language === "string" ? language.trim().toLowerCase() : "";
  if (!siteId || !normalizedLanguage || normalizedLanguage === "en") return null;

  const { data, error } = await adminClient
    .from("site_translations")
    .select("translated_site_json,translated_published_json,translated_wedding_data,translated_layout_config")
    .eq("wedding_site_id", siteId)
    .eq("language", normalizedLanguage)
    .eq("status", "ready")
    .maybeSingle();

  if (error?.code === "42P01" || error?.code === "42703") return null;
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

async function buildSafePublicSite(
  adminClient: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
  language: string | null | undefined,
): Promise<Record<string, unknown>> {
  const translation = await loadPublicSiteTranslation(adminClient, String(row.id), language);
  return buildPublicSiteRenderSite(applyPublicSiteTranslation(row, translation));
}

async function issuePasswordSessionToken(slug: string, secret: string): Promise<string> {
  return signSessionToken<PasswordSessionPayload>(
    {
      scope: "public_site_password",
      slug,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    },
    secret,
  );
}

async function enforcePasswordAttemptRateLimit(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  slug: string,
): Promise<boolean> {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const ipHash = await hashRateLimitKey(`public-site-password:${slug}:${clientIp}:${Deno.env.get("SUPABASE_URL") ?? ""}`);
  const windowStart = new Date(Date.now() - PUBLIC_SITE_PASSWORD_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: existingLimit } = await adminClient
    .from("rsvp_rate_limit")
    .select("id, attempts, last_attempt_at")
    .eq("ip_hash", ipHash)
    .gte("last_attempt_at", windowStart)
    .maybeSingle();

  if (existingLimit) {
    if (existingLimit.attempts >= PUBLIC_SITE_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS) return false;
    await adminClient
      .from("rsvp_rate_limit")
      .update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() })
      .eq("id", existingLimit.id);
    return true;
  }

  const safeSubjectMarker = `h:${await hashRateLimitKey(`public-site-access:${slug}:${Deno.env.get("SUPABASE_URL") ?? ""}`)}`;
  await adminClient
    .from("rsvp_rate_limit")
    .insert({ ip_hash: ipHash, guest_token: safeSubjectMarker, attempts: 1 });
  return true;
}

async function queryPublicSiteRow(
  adminClient: ReturnType<typeof createClient>,
  slugInput: string,
): Promise<Record<string, unknown> | null> {
  const slug = normalizePublicSiteSlug(slugInput);
  if (!slug) return null;

  const select = PRIVATE_PUBLIC_SITE_COLUMNS.join(",");
  const queryBy = async (column: "site_slug" | "site_url", value: string) => {
    const result = await adminClient
      .from("wedding_sites")
      .select(select)
      .eq(column, value)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data as Record<string, unknown> | null;
  };

  const bySlug = await queryBy("site_slug", slug);
  if (bySlug) return bySlug;

  const urlCandidates = buildSiteUrlLookupCandidates(slug);
  for (const candidate of urlCandidates) {
    const byUrl = await queryBy("site_url", candidate);
    if (byUrl) return byUrl;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json() as Payload;
    const slug = normalizePublicSiteSlug(payload?.slug ?? "");
    if (!slug) {
      return json({ status: "unavailable", site: null satisfies null as null }, 200);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const sessionSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const row = await queryPublicSiteRow(adminClient, slug);
    if (!row) return json({ status: "unavailable", site: null }, 200);

    const isPublished = getIsPublishedFromSiteRow(row);
    const privacyMode = normalizePublicPrivacyMode(row.privacy_mode);

    if (!isPublished) {
      return json({ status: "coming_soon", site: null }, 200);
    }

    if (!privacyMode) {
      return json({ status: "unavailable", site: null }, 200);
    }

    if (payload.action === "password_unlock") {
      if (privacyMode === "public") {
        return json({ status: "open", site: await buildSafePublicSite(adminClient, row, null) }, 200);
      }
      if (privacyMode === "invite_only") {
        return json({ status: "invite_required", site: null }, 200);
      }
      if (privacyMode === "hidden") {
        return json({ status: "coming_soon", site: null }, 200);
      }

      const password = typeof payload.password === "string" ? payload.password : "";
      if (!password.trim()) {
        return json({ status: "password_required", site: null }, 200);
      }

      if (!(await enforcePasswordAttemptRateLimit(adminClient, req, slug))) {
        return json({ status: "password_required", site: null, error: "Too many password attempts. Please wait a few minutes and try again." }, 429);
      }

      const { data: passwordOk, error } = await adminClient.rpc("check_site_password", {
        p_slug: slug,
        p_password: password,
      });
      if (error || passwordOk !== true) {
        return json({ status: "password_required", site: null }, 200);
      }

      const passwordSession = await issuePasswordSessionToken(slug, sessionSecret);
      return json({
        status: "open",
        site: await buildSafePublicSite(adminClient, row, null),
        passwordSession,
      }, 200);
    }

    const accessStatus = await resolvePublicAccessStatus({
      isPublished,
      privacyMode,
      siteSlug: slug,
      inviteToken: payload.inviteToken ?? null,
      passwordSession: payload.passwordSession ?? null,
      storedInviteToken: typeof row.guest_access_token === "string" ? row.guest_access_token : null,
      secret: sessionSecret,
    });

    if (accessStatus !== "open") {
      return json({ status: accessStatus, site: null }, 200);
    }

    return json({ status: "open", site: await buildSafePublicSite(adminClient, row, payload.language ?? null) }, 200);
  } catch (error) {
    console.error("PUBLIC_SITE_ACCESS_FAILED", { reason: "UNEXPECTED_PUBLIC_SITE_ACCESS_FAILURE" });
    return json({ error: "Could not load this site right now." }, 500);
  }
});
