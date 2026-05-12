import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";
import { getPublicSessionSecretSource } from "../_shared/publicSessionSecrets.ts";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";
import { signSessionToken } from "../_shared/signedSession.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, content-type, Authorization, authorization, X-Client-Info, x-client-info, Apikey, apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_SESSION_TTL_MS = 1000 * 60 * 20;

type ContactSessionPayload = {
  scope: "guest_contact_update";
  siteId: string;
  guestId: string;
  exp: number;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayName(guest: { name?: string | null; first_name?: string | null; last_name?: string | null }) {
  return guest.name || [guest.first_name, guest.last_name].filter(Boolean).join(" ");
}

function bodyString(body: Record<string, unknown>, key: "inviteToken" | "passwordSession"): string | null {
  const raw = body[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const siteRef = String(body.site_ref ?? "").trim();
    const query = String(body.query ?? "").trim();
    const normalizedQuery = normalizeName(query);
    const queryParts = normalizedQuery.split(" ").filter(Boolean);

    if (!siteRef || normalizedQuery.length < 5 || queryParts.length < 2) {
      return json({ matches: [] });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publicSessionSecretSource = getPublicSessionSecretSource();
    const admin = createClient(supabaseUrl, serviceRole);

    const siteQuery = admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token")
      .eq(UUID_RE.test(siteRef) ? "id" : "site_slug", siteRef)
      .maybeSingle();
    const { data: site } = await siteQuery;

    if (!site?.id) {
      return json({ matches: [] });
    }

    const hasAccess = await canReadPublicSubresource({
      isPublished: site.is_published === true,
      privacyMode: site.privacy_mode,
      siteSlug: site.site_slug,
      inviteToken: bodyString(body, "inviteToken"),
      passwordSession: bodyString(body, "passwordSession"),
      storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null,
      secret: publicSessionSecretSource,
    });
    if (!hasAccess) return json({ matches: [] });

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "guest_contact_lookup",
      subject: `${site.id}:${normalizedQuery.slice(0, 80)}`,
      siteId: site.id,
      siteSlug: UUID_RE.test(siteRef) ? null : siteRef,
      maxIp: 20,
      maxSubject: 4,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) {
      return json({ error: rateLimit.message }, rateLimit.status);
    }

    const lastName = queryParts.at(-1) ?? "";
    const firstName = queryParts.slice(0, -1).join(" ");
    const { data: exactNameCandidates } = await admin
      .from("guests")
      .select("id, name, first_name, last_name, household_id")
      .eq("wedding_site_id", site.id)
      .ilike("name", normalizedQuery)
      .limit(5);
    const { data: splitNameCandidates } = await admin
      .from("guests")
      .select("id, name, first_name, last_name, household_id")
      .eq("wedding_site_id", site.id)
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .limit(5);

    const candidateById = new Map<string, any>();
    for (const candidate of [...(exactNameCandidates ?? []), ...(splitNameCandidates ?? [])] as any[]) {
      if (candidate?.id) candidateById.set(candidate.id, candidate);
    }

    const guests = Array.from(candidateById.values())
      .filter((guest: any) => normalizeName(displayName(guest)) === normalizedQuery)
      .slice(0, 5);

    const householdIds = Array.from(new Set((guests ?? []).map((g: any) => g.household_id).filter(Boolean)));
    const householdCounts: Record<string, number> = {};

    if (householdIds.length > 0) {
      const { data: hh } = await admin
        .from("guests")
        .select("household_id")
        .eq("wedding_site_id", site.id)
        .in("household_id", householdIds as string[]);
      for (const row of (hh ?? []) as any[]) {
        if (!row.household_id) continue;
        householdCounts[row.household_id] = (householdCounts[row.household_id] ?? 0) + 1;
      }
    }

    const matches = await Promise.all((guests ?? []).map(async (g: any) => ({
      contact_session: await signSessionToken<ContactSessionPayload>({
        scope: "guest_contact_update",
        siteId: site.id,
        guestId: g.id,
        exp: Date.now() + CONTACT_SESSION_TTL_MS,
      }, publicSessionSecretSource),
      name: g.name || [g.first_name, g.last_name].filter(Boolean).join(" "),
      household_size: g.household_id ? (householdCounts[g.household_id] ?? 1) : 1,
    })));

    return json({ matches });
  } catch (err) {
    console.error("GUEST_CONTACT_LOOKUP_UNEXPECTED_FAILED", { reason: "UNEXPECTED_GUEST_CONTACT_LOOKUP_FAILURE" });
    return json({ error: "Could not look up guests. Please try again." }, 500);
  }
});
