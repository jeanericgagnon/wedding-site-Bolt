import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const GUEST_LINK_UNAVAILABLE_COPY = "This wedding link is not available.";

function safeReferrer(value: string | null): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ ok: true, tracked: false });

    const admin = createClient(supabaseUrl, serviceRole);
    const body = await req.json().catch(() => ({}));
    const siteSlug = String(body.siteSlug ?? "").trim().toLowerCase();
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : null;
    const passwordSession = typeof body.passwordSession === "string" ? body.passwordSession.trim() : null;
    const eventType = String(body.eventType ?? "view").trim().toLowerCase().slice(0, 80) || "view";
    const target = String(body.target ?? "").trim().slice(0, 240) || null;

    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: GUEST_LINK_UNAVAILABLE_COPY }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token,wedding_data")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (siteError) throw siteError;
    if (
      !site ||
      !(await canReadPublicSubresource({
        isPublished: site.is_published === true,
        privacyMode: site.privacy_mode,
        siteSlug: site.site_slug,
        inviteToken,
        passwordSession,
        storedInviteToken: site.guest_access_token,
        secret: serviceRole,
      }))
    ) {
      return json({ ok: true, tracked: false });
    }

    const analyticsSettings = site.wedding_data && typeof site.wedding_data === "object"
      ? ((site.wedding_data as Record<string, unknown>).analytics_settings as Record<string, unknown> | undefined)
      : undefined;
    if (analyticsSettings?.enabled === false) {
      return json({ ok: true, tracked: false });
    }

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "guest_hub_track",
      subject: `${site.id}:${eventType}:${target ?? "site"}`,
      siteId: site.id,
      siteSlug,
      maxIp: 120,
      maxSubject: 60,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ ok: true, tracked: false });

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500) || null;
    const referrer = safeReferrer(req.headers.get("referer"));
    const { error } = await admin.from("guest_hub_events").insert({
      wedding_site_id: site.id,
      site_slug: siteSlug,
      event_type: eventType,
      target,
      user_agent: userAgent,
      referrer,
    });

    if (error) throw error;
    return json({ ok: true, tracked: true });
  } catch {
    return json({ ok: true, tracked: false });
  }
});
