import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "guestbook-submit", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: "Guestbook is temporarily unavailable. Please try again." }, 500);

    const admin = createClient(supabaseUrl, serviceRole);
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const requesterIp = forwardedFor.split(",")[0]?.trim() || null;
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500) || null;
    const body = await req.json().catch(() => ({}));
    const siteSlug = String(body.siteSlug ?? "").trim().toLowerCase();
    const guestName = String(body.guestName ?? "").trim().slice(0, 160) || null;
    const guestEmailRaw = String(body.guestEmail ?? "").trim().toLowerCase();
    const guestEmail = guestEmailRaw ? guestEmailRaw.slice(0, 254) : null;
    const message = String(body.message ?? "").trim();
    const honeypot = String(body.website ?? "").trim();

    if (honeypot) return json({ error: "Request rejected" }, 400);
    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: "Invalid site" }, 400);
    if (!message || message.length < 2) return json({ error: "Message is required" }, 400);
    if (message.length > 2000) return json({ error: "Message is too long" }, 400);
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) return json({ error: "Invalid email" }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (siteError) return json({ error: "Guestbook is temporarily unavailable. Please try again." }, 500);
    if (!site || !site.is_published) return json({ error: "Site not available" }, 404);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: siteRecentCount } = await admin
      .from("guestbook_entries")
      .select("id", { count: "exact", head: true })
      .eq("wedding_site_id", site.id)
      .gte("created_at", tenMinutesAgo);
    if ((siteRecentCount ?? 0) > 80) return json({ error: "Guestbook is busy. Please try again shortly." }, 429);

    if (requesterIp) {
      const { count: ipRecentCount } = await admin
        .from("guestbook_entries")
        .select("id", { count: "exact", head: true })
        .eq("wedding_site_id", site.id)
        .eq("requester_ip", requesterIp)
        .gte("created_at", tenMinutesAgo);
      if ((ipRecentCount ?? 0) > 12) return json({ error: "Too many notes from this network. Please try again shortly." }, 429);
    }

    if (guestEmail) {
      const { count: emailRecentCount } = await admin
        .from("guestbook_entries")
        .select("id", { count: "exact", head: true })
        .eq("wedding_site_id", site.id)
        .eq("guest_email", guestEmail)
        .gte("created_at", tenMinutesAgo);
      if ((emailRecentCount ?? 0) > 5) return json({ error: "Too many notes from this email. Please try again shortly." }, 429);
    }

    const { data, error } = await admin
      .from("guestbook_entries")
      .insert({
        wedding_site_id: site.id,
        guest_name: guestName,
        guest_email: guestEmail,
        message,
        requester_ip: requesterIp,
        user_agent: userAgent,
      })
      .select("id,created_at")
      .single();

    if (error) return json({ error: "Could not submit guestbook entry. Please try again." }, 500);
    return json({ entry: data });
  } catch (error) {
    return json({ error: "Could not submit guestbook entry. Please try again." }, 500);
  }
});
