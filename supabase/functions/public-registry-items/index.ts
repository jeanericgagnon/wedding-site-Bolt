import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const weddingSiteId = typeof body.wedding_site_id === "string" ? body.wedding_site_id.trim() : "";
    const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(100, Number(body.limit))) : 100;

    if (!weddingSiteId) {
      return json({ items: [] }, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "server misconfigured" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published")
      .eq("id", weddingSiteId)
      .maybeSingle();

    if (siteError || !site || site.is_published !== true) {
      return json({ items: [] }, 200);
    }

    const { data: items, error: itemsError } = await admin
      .from("registry_items")
      .select("*")
      .eq("wedding_site_id", weddingSiteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (itemsError || !Array.isArray(items)) {
      return json({ items: [] }, 200);
    }

    return json({ items }, 200);
  } catch {
    return json({ items: [] }, 200);
  }
});
