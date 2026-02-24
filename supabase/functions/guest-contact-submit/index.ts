import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const siteRef = String(body.site_ref ?? "").trim();
    const guestId = String(body.guest_id ?? "").trim();
    const applyHousehold = Boolean(body.apply_household ?? false);
    const email = String(body.email ?? "").trim() || null;
    const phone = String(body.phone ?? "").trim() || null;
    const rsvpStatus = String(body.rsvp_status ?? "").trim() || null;
    const smsConsent = Boolean(body.sms_consent ?? false);

    if (!siteRef || !guestId) {
      return new Response(JSON.stringify({ error: "Missing site/guest" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id")
      .or(`id.eq.${siteRef},site_slug.eq.${siteRef}`)
      .maybeSingle();

    if (!site?.id) {
      return new Response(JSON.stringify({ error: "Invalid site" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: guest } = await admin
      .from("guests")
      .select("id, household_id")
      .eq("id", guestId)
      .eq("wedding_site_id", site.id)
      .maybeSingle();

    if (!guest?.id) {
      return new Response(JSON.stringify({ error: "Guest not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patch: Record<string, unknown> = {};
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (rsvpStatus && ["pending", "confirmed", "declined"].includes(rsvpStatus)) patch.rsvp_status = rsvpStatus;
    if (phone) patch.sms_consent = smsConsent;

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let query = admin.from("guests").update(patch).eq("wedding_site_id", site.id);
    if (applyHousehold && guest.household_id) {
      query = query.eq("household_id", guest.household_id);
    } else {
      query = query.eq("id", guest.id);
    }

    const { error: updateError } = await query;
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});