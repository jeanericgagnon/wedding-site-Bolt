import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PublicItineraryEvent = {
  id: string;
  event_name: string | null;
  title: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  is_private: boolean | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json().catch(() => ({ slug: null }));
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published")
      .eq("site_slug", slug)
      .maybeSingle();

    if (siteError || !site || site.is_published !== true) {
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events, error: eventsError } = await admin
      .from("itinerary_events")
      .select("id,event_name,title,description,event_date,start_time,end_time,location_name,location_address,is_private")
      .eq("wedding_site_id", site.id)
      .or("is_private.is.null,is_private.eq.false")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (eventsError || !Array.isArray(events)) {
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ events: events as PublicItineraryEvent[] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ events: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
