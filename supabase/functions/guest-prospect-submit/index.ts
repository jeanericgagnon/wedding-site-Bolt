import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "guest-prospect-submit", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: "We could not save this update. Please try again." }, 500);

    const admin = createClient(supabaseUrl, serviceRole);
    const body = await req.json().catch(() => ({}));
    const siteSlug = String(body.siteSlug ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase() || null;
    const phone = String(body.phone ?? "").trim() || null;
    const guestName = String(body.guestName ?? "").trim() || null;
    const source = String(body.source ?? "guest_recap").trim().slice(0, 80) || "guest_recap";
    const wantsOwnEventInfo = body.wantsOwnEventInfo === true;
    const wantsPhotoUpdates = body.wantsPhotoUpdates !== false;

    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: "Invalid site" }, 400);
    if (!email && !phone) return json({ error: "Add an email or phone." }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published")
      .eq("site_slug", siteSlug)
      .maybeSingle();
    if (siteError) return json({ error: "We could not save this update. Please try again." }, 500);
    if (!site || !site.is_published) return json({ error: "Site not available" }, 404);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "guest_prospect_submit",
      subject: email || phone || siteSlug,
      siteId: site.id,
      siteSlug,
      maxIp: 20,
      maxSubject: 4,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500) || null;
    const referrer = (req.headers.get("referer") || "").slice(0, 500) || null;
    const { error } = await admin.from("guest_prospect_optins").insert({
      wedding_site_id: site.id,
      site_slug: siteSlug,
      guest_name: guestName,
      email,
      phone,
      source,
      wants_photo_updates: wantsPhotoUpdates,
      wants_own_event_info: wantsOwnEventInfo,
      metadata: { userAgent, referrer },
    });
    if (error) return json({ error: "We could not save this update. Please try again." }, 500);

    const { error: eventError } = await admin.from("guest_hub_events").insert({
      wedding_site_id: site.id,
      site_slug: siteSlug,
      event_type: wantsOwnEventInfo ? "prospect_opt_in" : "photo_update_opt_in",
      target: source,
      user_agent: userAgent,
      referrer,
    });
    if (eventError) return json({ error: "We could not save this update. Please try again." }, 500);

    return json({ ok: true });
  } catch (error) {
    return json({ error: "We could not save this update. Please try again." }, 500);
  }
});
