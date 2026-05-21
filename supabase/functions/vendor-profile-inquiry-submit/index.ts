import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { escapeHtml, sanitizeEmailSubject } from "../_shared/emailSafety.ts";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";
import { resolveLaunchFromAddress } from "../_shared/emailSender.ts";

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

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isSafeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildVendorInquiryEmail(input: {
  vendorName: string;
  name: string;
  email: string;
  message: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
  coupleNames: string;
  siteSlug: string;
  inquiryContext: string;
}) {
  const rows = [
    ["Couple", input.coupleNames || input.name],
    ["Name", input.name],
    ["Email", input.email],
    ["Wedding date", input.weddingDate || "Not shared"],
    ["Venue", input.venueName || "Not shared"],
    ["Venue location", input.venueLocation || "Not shared"],
    ["DayOf site", input.siteSlug ? `/${input.siteSlug}` : "Not shared"],
  ];

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f3ec;font-family:Inter,Arial,sans-serif;color:#2f261d;">
    <div style="max-width:640px;margin:0 auto;padding:28px;">
      <div style="background:#ffffff;border:1px solid #e7dac8;border-radius:14px;overflow:hidden;">
        <div style="background:#2f261d;color:#f8f3ec;padding:28px;">
          <p style="margin:0;color:#d8c4ad;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">New vendor inquiry</p>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1;">${escapeHtml(input.vendorName)}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">A couple sent an inquiry from your DayOf vendor page. Reply directly to their email when you are ready.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 22px;">
            <tbody>
              ${rows.map(([label, value]) => `<tr><td style="padding:9px 0;color:#8b6f53;font-size:13px;width:135px;">${escapeHtml(label)}</td><td style="padding:9px 0;font-size:14px;">${escapeHtml(value)}</td></tr>`).join("")}
            </tbody>
          </table>
          <div style="background:#fbf7f0;border:1px solid #eadfce;border-radius:12px;padding:18px;">
            <p style="margin:0 0 8px;color:#8b6f53;font-size:13px;font-weight:700;">Message</p>
            <p style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.7;">${escapeHtml(input.message)}</p>
          </div>
          ${input.inquiryContext ? `<div style="background:#ffffff;border:1px solid #eadfce;border-radius:12px;padding:18px;margin-top:16px;"><p style="margin:0 0 8px;color:#8b6f53;font-size:13px;font-weight:700;">Packaged wedding context</p><p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.7;">${escapeHtml(input.inquiryContext)}</p></div>` : ""}
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;color:#9a7a59;font-size:12px;">Powered by DayOf</p>
    </div>
  </body>
</html>`;
}

async function sendVendorInquiryEmail(input: {
  to: string;
  vendorName: string;
  name: string;
  email: string;
  message: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
  coupleNames: string;
  siteSlug: string;
  inquiryContext: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !isSafeEmail(input.to)) return;

  const { fromAddress } = resolveLaunchFromAddress({
    coupleName1: input.coupleNames || "DayOf",
    coupleName2: "Vendor",
    siteSlug: input.siteSlug || null,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [input.to],
      reply_to: input.email,
      subject: sanitizeEmailSubject(`New wedding inquiry from ${input.name}`),
      html: buildVendorInquiryEmail(input),
    }),
  });

  if (!response.ok) {
    console.error("VENDOR_PROFILE_INQUIRY_EMAIL_PROVIDER_FAILED", { status: response.status });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "vendor-profile-inquiry-submit", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: "Could not send inquiry. Please try again." }, 500);

    const body = await req.json().catch(() => ({}));
    const vendorProfileId = cleanText(body.vendor_profile_id, 80);
    const name = cleanText(body.name, 120);
    const email = cleanText(body.email, 180).toLowerCase();
    const message = cleanText(body.message, 2000);
    const weddingDate = cleanText(body.wedding_date, 80);
    const venueName = cleanText(body.venue_name, 180);
    const venueLocation = cleanText(body.venue_location, 180);
    const coupleNames = cleanText(body.couple_names, 180);
    const siteSlug = cleanText(body.site_slug, 120).replace(/[^a-z0-9-]/gi, "").toLowerCase();
    const inquiryContext = cleanText(body.inquiry_context, 1200);

    if (!vendorProfileId) return json({ error: "Choose a vendor page before sending this inquiry." }, 400);
    if (!name || !email || !message) return json({ error: "Add your name, email, and message." }, 400);
    if (!isSafeEmail(email)) return json({ error: "Enter a valid email." }, 400);
    if (message.length < 8) return json({ error: "Add a little more detail before sending." }, 400);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: profile, error: profileError } = await admin
      .from("vendor_profiles")
      .select("id, slug, vendor_name, contact_email")
      .eq("id", vendorProfileId)
      .maybeSingle();
    if (profileError) return json({ error: "Could not send inquiry. Please try again." }, 500);
    if (!profile) return json({ error: "This vendor page is not available." }, 404);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "vendor_profile_inquiry_submit",
      subject: `${vendorProfileId}:${email}`,
      siteSlug: profile.slug,
      maxIp: 12,
      maxSubject: 3,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const inquiryPayload = {
      vendor_profile_id: vendorProfileId,
      name,
      email,
      message,
      wedding_date: weddingDate || null,
      venue_name: venueName || null,
      venue_location: venueLocation || null,
    };
    let { error } = await admin.from("vendor_profile_inquiries").insert(inquiryPayload);
    if (error && ["wedding_date", "venue_name", "venue_location"].some((field) => error.message?.includes(field))) {
      const { error: fallbackError } = await admin.from("vendor_profile_inquiries").insert({
        vendor_profile_id: vendorProfileId,
        name,
        email,
        message,
      });
      error = fallbackError;
    }
    if (error) return json({ error: "Could not send inquiry. Please try again." }, 500);

    await sendVendorInquiryEmail({
      to: cleanText(profile.contact_email, 180).toLowerCase(),
      vendorName: cleanText(profile.vendor_name, 180) || "Vendor",
      name,
      email,
      message,
      weddingDate,
      venueName,
      venueLocation,
      coupleNames,
      siteSlug,
      inquiryContext,
    });

    return json({ ok: true });
  } catch (error) {
    return json({ error: "Could not send inquiry. Please try again." }, 500);
  }
});
