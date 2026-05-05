import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const mailingAddressLine1 = String(body.mailing_address_line1 ?? '').trim() || null;
    const mailingAddressLine2 = String(body.mailing_address_line2 ?? '').trim() || null;
    const mailingCity = String(body.mailing_city ?? '').trim() || null;
    const mailingState = String(body.mailing_state ?? '').trim() || null;
    const mailingPostalCode = String(body.mailing_postal_code ?? '').trim() || null;
    const mailingCountry = String(body.mailing_country ?? '').trim() || null;

    if (!siteRef || !guestId) {
      return json({ error: "Missing site/guest" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const siteQuery = admin
      .from("wedding_sites")
      .select("id")
      .eq(UUID_RE.test(siteRef) ? "id" : "site_slug", siteRef)
      .maybeSingle();
    const { data: site } = await siteQuery;

    if (!site?.id) {
      return json({ error: "Invalid site" }, 404);
    }

    const { data: guest } = await admin
      .from("guests")
      .select("id, household_id")
      .eq("id", guestId)
      .eq("wedding_site_id", site.id)
      .maybeSingle();

    if (!guest?.id) {
      return json({ error: "Guest not found" }, 404);
    }

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "guest_contact_submit",
      subject: `${site.id}:${guest.id}`,
      siteId: site.id,
      siteSlug: UUID_RE.test(siteRef) ? null : siteRef,
      maxIp: 20,
      maxSubject: 8,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) {
      return json({ error: rateLimit.message }, rateLimit.status);
    }

    const patch: Record<string, unknown> = {};
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (rsvpStatus && ["pending", "confirmed", "declined"].includes(rsvpStatus)) patch.rsvp_status = rsvpStatus;
    if (mailingAddressLine1) patch.mailing_address_line1 = mailingAddressLine1;
    if (mailingAddressLine2) patch.mailing_address_line2 = mailingAddressLine2;
    if (mailingCity) patch.mailing_city = mailingCity;
    if (mailingState) patch.mailing_state = mailingState;
    if (mailingPostalCode) patch.mailing_postal_code = mailingPostalCode;
    if (mailingCountry) patch.mailing_country = mailingCountry;
    if (phone) patch.sms_consent = smsConsent;

    if (Object.keys(patch).length === 0) {
      return json({ error: "No updates provided" }, 400);
    }

    let query = admin.from("guests").update(patch).eq("wedding_site_id", site.id);
    if (applyHousehold && guest.household_id) {
      query = query.eq("household_id", guest.household_id);
    } else {
      query = query.eq("id", guest.id);
    }

    const { error: updateError } = await query;
    if (updateError) {
      console.error("GUEST_CONTACT_SUBMIT_UPDATE_FAILED", updateError);
      return json({ error: "Could not save this contact update. Please try again." }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("GUEST_CONTACT_SUBMIT_UNEXPECTED_FAILED", err);
    return json({ error: "Could not save this contact update. Please try again." }, 500);
  }
});
