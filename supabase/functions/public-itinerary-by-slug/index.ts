import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/signedSession.ts";

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

interface PasswordSessionPayload {
  scope: "public_site_password";
  slug: string;
  exp: number;
}

async function hasValidPasswordSession(
  slug: string,
  sessionToken: string | null,
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

async function canReadPublicSubresource(input: {
  slug: string;
  site: {
    is_published: boolean | null;
    privacy_mode?: string | null;
    guest_access_token?: string | null;
  };
  inviteToken: string;
  passwordSession: string | null;
  secret: string;
}): Promise<boolean> {
  if (input.site.is_published !== true) return false;
  const privacyMode = input.site.privacy_mode ?? "public";
  if (privacyMode === "password_protected") {
    return hasValidPasswordSession(input.slug, input.passwordSession, input.secret);
  }
  if (privacyMode === "invite_only") {
    const stored = input.site.guest_access_token?.trim() ?? "";
    return Boolean(input.inviteToken && stored && input.inviteToken === stored);
  }
  return privacyMode === "public" || privacyMode === "hidden";
}

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
      return new Response(JSON.stringify({ error: "slug required" }), {
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
      !(await canReadPublicSubresource({ slug, site, inviteToken, passwordSession, secret: serviceRoleKey }))
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
