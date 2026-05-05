import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 20;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isSafeEmail(value: string | null): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashRateLimitKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceSubmitRateLimit(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  slug: string,
): Promise<boolean> {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const ipHash = await hashRateLimitKey(`public-site-rsvp:${slug}:${clientIp}:${Deno.env.get("SUPABASE_URL") ?? ""}`);
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: existingLimit } = await adminClient
    .from("rsvp_rate_limit")
    .select("id, attempts, last_attempt_at")
    .eq("ip_hash", ipHash)
    .gte("last_attempt_at", windowStart)
    .maybeSingle();

  if (existingLimit) {
    if (existingLimit.attempts >= RATE_LIMIT_MAX_ATTEMPTS) return false;
    await adminClient
      .from("rsvp_rate_limit")
      .update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() })
      .eq("id", existingLimit.id);
    return true;
  }

  const safeSubjectMarker = `h:${await hashRateLimitKey(`public-site-rsvp:${slug}:${Deno.env.get("SUPABASE_URL") ?? ""}`)}`;
  await adminClient
    .from("rsvp_rate_limit")
    .insert({ ip_hash: ipHash, guest_token: safeSubjectMarker, attempts: 1 });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = cleanText(body.slug, 96).toLowerCase();
    const inviteToken = cleanText(body.inviteToken, 256);
    const passwordSession = typeof body.passwordSession === "string" ? body.passwordSession : null;
    const guestName = cleanText(body.guestName, 160);
    const guestEmail = cleanText(body.guestEmail, 254) || null;
    const rsvpStatus = body.rsvpStatus === "declined" ? "declined" : "attending";
    const guestCount = rsvpStatus === "attending"
      ? Math.max(1, Math.min(10, Number.isFinite(Number(body.guestCount)) ? Math.floor(Number(body.guestCount)) : 1))
      : 1;
    const dietaryNotes = cleanText(body.dietaryNotes, 500) || null;

    if (!slug || !guestName) {
      return json({ error: "Please add your name before sending your RSVP." }, 400);
    }
    if (!isSafeEmail(guestEmail)) {
      return json({ error: "Enter a valid email address or leave it blank." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Could not send this RSVP right now. Please try again." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const allowed = await enforceSubmitRateLimit(admin, req, slug);
    if (!allowed) {
      return json({ error: "Too many RSVP attempts. Please wait a few minutes and try again." }, 429);
    }

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token")
      .eq("site_slug", slug)
      .maybeSingle();

    if (
      siteError ||
      !site ||
      !(await canReadPublicSubresource({
        isPublished: site.is_published === true,
        privacyMode: site.privacy_mode,
        siteSlug: site.site_slug,
        inviteToken,
        passwordSession,
        storedInviteToken: site.guest_access_token,
        secret: serviceRoleKey,
      }))
    ) {
      return json({ error: "This RSVP is not available right now." }, 403);
    }

    const { error: insertError } = await admin.from("site_rsvps").insert({
      wedding_site_id: site.id,
      guest_name: guestName,
      guest_email: guestEmail,
      rsvp_status: rsvpStatus,
      guest_count: guestCount,
      dietary_notes: dietaryNotes,
    });

    if (insertError) {
      console.error("PUBLIC_SITE_RSVP_INSERT_FAILED", { reason: "PUBLIC_SITE_RSVP_INSERT_FAILED" });
      return json({ error: "Could not send this RSVP right now. Please try again." }, 500);
    }

    return json({ ok: true }, 200);
  } catch {
    console.error("PUBLIC_SITE_RSVP_UNEXPECTED_FAILED", { reason: "UNEXPECTED_PUBLIC_SITE_RSVP_FAILURE" });
    return json({ error: "Could not send this RSVP right now. Please try again." }, 500);
  }
});
