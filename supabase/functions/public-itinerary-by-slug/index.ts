import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const PUBLIC_ITINERARY_SLUG_REQUIRED_COPY = "Choose a wedding link before loading the itinerary.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({ slug: null }));
    const { slug } = body;
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: PUBLIC_ITINERARY_SLUG_REQUIRED_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    const passwordSession = typeof body.passwordSession === "string" ? body.passwordSession : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published,privacy_mode,guest_access_token")
      .eq("site_slug", slug)
      .maybeSingle();

    if (
      siteError ||
      !site ||
      !(await canReadPublicSubresource({
        isPublished: site.is_published === true,
        privacyMode: site.privacy_mode,
        siteSlug: slug,
        inviteToken,
        passwordSession,
        storedInviteToken: site.guest_access_token,
        secret: serviceRoleKey,
      }))
    ) {
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
