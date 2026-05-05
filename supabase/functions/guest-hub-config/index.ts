import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: "Could not load hub config" }, 500);

    const admin = createClient(supabaseUrl, serviceRole);
    const url = new URL(req.url);
    const siteSlug = String(url.searchParams.get("site") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: "Invalid site" }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published,site_slug,couple_name_1,couple_name_2,wedding_date")
      .eq("site_slug", siteSlug)
      .maybeSingle();
    if (siteError) throw siteError;
    if (!site || !site.is_published) return json({ error: "Site not available" }, 404);

    const { data: settings } = await admin
      .from("guest_hub_settings")
      .select("rsvp_enabled,photos_enabled,guestbook_enabled,registry_enabled,schedule_enabled,travel_enabled,custom_message,language_default")
      .eq("wedding_site_id", site.id)
      .maybeSingle();

    return json({
      site: {
        slug: site.site_slug,
        coupleName1: site.couple_name_1,
        coupleName2: site.couple_name_2,
        weddingDate: site.wedding_date,
      },
      settings: settings ?? {
        rsvp_enabled: true,
        photos_enabled: true,
        guestbook_enabled: true,
        registry_enabled: true,
        schedule_enabled: true,
        travel_enabled: true,
        custom_message: null,
        language_default: "en",
      },
    });
  } catch {
    return json({ error: "Could not load hub config" }, 500);
  }
});
