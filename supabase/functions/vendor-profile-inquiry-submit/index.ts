import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

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

    if (!vendorProfileId) return json({ error: "Missing vendor profile" }, 400);
    if (!name || !email || !message) return json({ error: "Add your name, email, and message." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);
    if (message.length < 8) return json({ error: "Add a little more detail before sending." }, 400);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: profile, error: profileError } = await admin
      .from("vendor_profiles")
      .select("id, slug")
      .eq("id", vendorProfileId)
      .maybeSingle();
    if (profileError) return json({ error: "Could not send inquiry. Please try again." }, 500);
    if (!profile) return json({ error: "Vendor page not found." }, 404);

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

    const { error } = await admin.from("vendor_profile_inquiries").insert({
      vendor_profile_id: vendorProfileId,
      name,
      email,
      message,
    });
    if (error) return json({ error: "Could not send inquiry. Please try again." }, 500);

    return json({ ok: true });
  } catch (error) {
    return json({ error: "Could not send inquiry. Please try again." }, 500);
  }
});
