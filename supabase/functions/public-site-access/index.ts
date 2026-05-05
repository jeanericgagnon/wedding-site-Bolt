import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { signSessionToken, verifySessionToken } from "../_shared/signedSession.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PublicSiteGateStatus =
  | "unavailable"
  | "coming_soon"
  | "password_required"
  | "invite_required"
  | "open";

interface ResolvePayload {
  action: "resolve";
  slug: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
}

interface PasswordUnlockPayload {
  action: "password_unlock";
  slug: string;
  password: string;
}

type Payload = ResolvePayload | PasswordUnlockPayload;

interface PasswordSessionPayload {
  scope: "public_site_password";
  slug: string;
  exp: number;
}

const SAFE_PUBLIC_SITE_COLUMNS = [
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
  ...SAFE_PUBLIC_SITE_COLUMNS,
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

function isPrivatePublishedSite(input: {
  isPublished: boolean;
  privacyMode: string;
}): boolean {
  return input.isPublished && (
    input.privacyMode === "password_protected" ||
    input.privacyMode === "invite_only"
  );
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSafePublicSite(row: Record<string, unknown>): Record<string, unknown> {
  const site = Object.fromEntries(
    SAFE_PUBLIC_SITE_COLUMNS.map((key) => [key, row[key] ?? null]),
  );
  site.allow_search_indexing = row.hide_from_search !== true;
  return site;
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

async function hasValidPasswordSession(
  slug: string,
  sessionToken: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!sessionToken) return false;
  const payload = await verifySessionToken<PasswordSessionPayload>(sessionToken, secret);
  return Boolean(
    payload &&
    payload.scope === "public_site_password" &&
    payload.slug === slug &&
    Number.isFinite(payload.exp) &&
    payload.exp > Date.now(),
  );
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

  const fuzzy = await adminClient
    .from("wedding_sites")
    .select(select)
    .ilike("site_url", `%${slug}%`)
    .limit(20);
  if (fuzzy.error) throw fuzzy.error;

  const match = (fuzzy.data ?? []).find((entry) => {
    const row = entry as Record<string, unknown>;
    const siteUrl = typeof row.site_url === "string" ? row.site_url : null;
    return normalizePublicSiteSlug(siteUrl) === slug;
  });

  return (match as Record<string, unknown> | undefined) ?? null;
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
    const privacyMode = typeof row.privacy_mode === "string" ? row.privacy_mode : "public";

    if (!isPublished && !isPrivatePublishedSite({ isPublished, privacyMode })) {
      return json({ status: "coming_soon", site: null }, 200);
    }

    if (payload.action === "password_unlock") {
      if (privacyMode !== "password_protected") {
        return json({ status: "open", site: buildSafePublicSite(row) }, 200);
      }

      const password = typeof payload.password === "string" ? payload.password : "";
      if (!password.trim()) {
        return json({ status: "password_required", site: null }, 200);
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
        site: buildSafePublicSite(row),
        passwordSession,
      }, 200);
    }

    if (privacyMode === "password_protected") {
      const sessionOk = await hasValidPasswordSession(slug, payload.passwordSession ?? null, sessionSecret);
      if (!sessionOk) {
        return json({ status: "password_required", site: null }, 200);
      }
    }

    if (privacyMode === "invite_only") {
      const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken.trim() : "";
      const storedInviteToken = typeof row.guest_access_token === "string" ? row.guest_access_token.trim() : "";
      if (!inviteToken || !storedInviteToken || inviteToken !== storedInviteToken) {
        return json({ status: "invite_required", site: null }, 200);
      }
    }

    return json({ status: "open", site: buildSafePublicSite(row) }, 200);
  } catch (error) {
    console.error("PUBLIC_SITE_ACCESS_FAILED", error);
    return json({ error: "Could not load this site right now." }, 500);
  }
});
