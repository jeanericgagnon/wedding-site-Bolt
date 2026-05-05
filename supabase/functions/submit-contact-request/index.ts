import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const phone = String(body.phone ?? "").trim() || null;
    const rsvpStatus = String(body.rsvp_status ?? "").trim() || null;
    const smsConsent = Boolean(body.sms_consent ?? false);

    if (!token) {
      return json({ error: "Missing token" }, 400);
    }

    if (!email && !phone && !rsvpStatus) {
      return json({ error: "Provide at least one update" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "submit_contact_request",
      subject: token,
      maxIp: 20,
      maxSubject: 8,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) {
      return json({ error: rateLimit.message }, rateLimit.status);
    }

    const { data: requestRow, error: requestErr } = await admin
      .from("guest_contact_requests")
      .select("id, guest_id, wedding_site_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (requestErr || !requestRow) {
      return json({ error: "Invalid link" }, 404);
    }

    if (requestRow.used_at) {
      return json({ error: "This link has already been used" }, 400);
    }

    if (new Date(requestRow.expires_at).getTime() < Date.now()) {
      return json({ error: "This link has expired" }, 400);
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
      console.error("SUBMIT_CONTACT_REQUEST_UPDATE_FAILED", guestErr);
      return json({ error: "Could not save this contact update. Please try again." }, 500);
    }

    await admin
      .from("guest_contact_requests")
      .update({ used_at: new Date().toISOString() })
      .eq("id", requestRow.id);

    return json({ ok: true });
  } catch (err) {
    console.error("SUBMIT_CONTACT_REQUEST_UNEXPECTED_FAILED", { reason: "UNEXPECTED_CONTACT_REQUEST_SUBMIT_FAILURE" });
    return json({ error: "Could not save this contact update. Please try again." }, 500);
  }
});
