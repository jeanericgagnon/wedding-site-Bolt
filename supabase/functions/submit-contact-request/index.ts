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
    const token = String(body.token ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const phone = String(body.phone ?? "").trim() || null;
    const rsvpStatus = String(body.rsvp_status ?? "").trim() || null;
    const smsConsent = Boolean(body.sms_consent ?? false);

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!email && !phone && !rsvpStatus) {
      return new Response(JSON.stringify({ error: "Provide at least one update" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: requestRow, error: requestErr } = await admin
      .from("guest_contact_requests")
      .select("id, guest_id, wedding_site_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (requestErr || !requestRow) {
      return new Response(JSON.stringify({ error: "Invalid link" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (requestRow.used_at) {
      return new Response(JSON.stringify({ error: "This link has already been used" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(requestRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "This link has expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patch: Record<string, unknown> = {};
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (rsvpStatus && ["pending", "confirmed", "declined"].includes(rsvpStatus)) patch.rsvp_status = rsvpStatus;
    if (phone) patch.sms_consent = smsConsent;

    const { error: guestErr } = await admin
      .from("guests")
      .update(patch)
      .eq("id", requestRow.guest_id)
      .eq("wedding_site_id", requestRow.wedding_site_id);

    if (guestErr) {
      return new Response(JSON.stringify({ error: guestErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin
      .from("guest_contact_requests")
      .update({ used_at: new Date().toISOString() })
      .eq("id", requestRow.id);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});