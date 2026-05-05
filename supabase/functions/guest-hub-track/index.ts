import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ ok: true, tracked: false });

    const admin = createClient(supabaseUrl, serviceRole);
    const body = await req.json().catch(() => ({}));
    const siteSlug = String(body.siteSlug ?? "").trim().toLowerCase();
    const eventType = String(body.eventType ?? "view").trim().toLowerCase().slice(0, 80) || "view";
    const target = String(body.target ?? "").trim().slice(0, 240) || null;

    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: "Invalid site" }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (siteError) throw siteError;
    if (!site || !site.is_published) return json({ ok: true, tracked: false });

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500) || null;
    const referrer = (req.headers.get("referer") || "").slice(0, 500) || null;
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
