import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RSVP_REQUEST_INVALID_COPY = "Could not read this RSVP request. Please try again.";
const RSVP_SUBMIT_LINK_REQUIRED_COPY = "Open your invitation link again before submitting your RSVP.";

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_URL"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function hashRateLimitSubject(subject: string): Promise<string> {
  return `h:${await hashIp(`subject:${subject}`)}`;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: RSVP_REQUEST_INVALID_COPY }, 400);
    }

    // Honeypot field — bots fill this in, humans don't
    if (body.website || body.hp_field) {
      return json({ success: true });
    }

    const { inviteToken, attending } = body as {
      inviteToken?: string;
      attending?: boolean;
    };
    const mealChoice = cleanText(body.mealChoice, 120);
    const plusOneName = cleanText(body.plusOneName, 160);
    const notes = cleanText(body.notes, 1000);

    if (!inviteToken || typeof inviteToken !== "string" || inviteToken.trim().length < 20) {
      return json({ error: RSVP_SUBMIT_LINK_REQUIRED_COPY }, 400);
    }

    if (typeof attending !== "boolean") {
      return json({ error: "Please indicate whether you will be attending." }, 400);
    }

    // Rate limiting by IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const ipHash = await hashIp(clientIp);
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: existingLimit } = await adminClient
      .from("rsvp_rate_limit")
      .select("id, attempts, last_attempt_at")
      .eq("ip_hash", ipHash)
      .gte("last_attempt_at", windowStart)
      .maybeSingle();

    if (existingLimit) {
      if (existingLimit.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
        return json({ error: "Too many requests. Please try again later." }, 429);
      }
      await adminClient
        .from("rsvp_rate_limit")
        .update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() })
        .eq("id", existingLimit.id);
    } else {
      await adminClient.from("rsvp_rate_limit").insert({
        ip_hash: ipHash,
        guest_token: await hashRateLimitSubject(inviteToken.trim()),
        attempts: 1,
      });
    }

    // Look up guest by token
    const { data: guest, error: guestErr } = await adminClient
      .from("guests")
      .select("id, wedding_site_id, email, first_name, last_name, name, rsvp_status, token_expires_at, invited_to_ceremony, invited_to_reception, plus_one_allowed")
      .eq("invite_token", inviteToken.trim())
      .maybeSingle();

    if (guestErr || !guest) {
      return json({ error: "Invalid invitation token. Please use the link from your invitation email." }, 404);
    }

    if (guest.token_expires_at && new Date(guest.token_expires_at) < new Date()) {
      return json({ error: "This invitation link has expired. Please contact the couple." }, 403);
    }

    const rsvpPayload = {
      guest_id: guest.id,
      attending,
      meal_choice: mealChoice ?? null,
      plus_one_name: plusOneName ?? null,
      notes: notes ?? null,
      responded_at: new Date().toISOString(),
    };

    const { data: existingRsvp } = await adminClient
      .from("rsvps")
      .select("id")
      .eq("guest_id", guest.id)
      .maybeSingle();

    if (existingRsvp) {
      const { error: updateErr } = await adminClient
        .from("rsvps")
        .update(rsvpPayload)
        .eq("id", existingRsvp.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await adminClient
        .from("rsvps")
        .insert([rsvpPayload]);
      if (insertErr) throw insertErr;
    }

    const { data: siteData } = await adminClient
      .from("wedding_sites")
      .select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name, rsvp_deadline, rsvp_capacity_limit, rsvp_waitlist_enabled")
      .eq("id", guest.wedding_site_id)
      .maybeSingle();

    const respondedAt = new Date().toISOString();
    const { data: capacityDecision, error: capacityDecisionError } = await adminClient.rpc(
      "apply_public_rsvp_capacity_decision",
      {
        p_wedding_site_id: guest.wedding_site_id,
        p_guest_id: guest.id,
        p_attending: attending,
        p_already_confirmed: guest.rsvp_status === "confirmed",
        p_responded_at: respondedAt,
      },
    );

    if (capacityDecisionError) throw capacityDecisionError;

    const waitlisted = Boolean(capacityDecision?.waitlisted);
    if (capacityDecision?.blocked) {
      return json({ error: "This event has reached capacity. Please contact the couple for updates." }, 409);
    }

    const guestName =
      guest.first_name && guest.last_name
        ? `${guest.first_name} ${guest.last_name}`
        : guest.name;

    // Queue confirmation email to guest
    if (guest.email && siteData) {
      await adminClient.from("email_queue").insert({
        site_id: guest.wedding_site_id,
        guest_id: guest.id,
        type: "rsvp_confirmation",
        payload_json: {
          to: guest.email,
          guestName,
          attending,
          coupleName1: siteData.couple_name_1,
          coupleName2: siteData.couple_name_2,
          weddingDate: siteData.wedding_date,
          venueName: siteData.venue_name,
        },
        status: "pending",
      });
    }

    // Queue notification email to couple
    if (siteData?.couple_email) {
      await adminClient.from("email_queue").insert({
        site_id: guest.wedding_site_id,
        guest_id: guest.id,
        type: "rsvp_notification",
        payload_json: {
          to: siteData.couple_email,
          guestName,
          attending,
          mealChoice: mealChoice ?? null,
          plusOneName: plusOneName ?? null,
          notes: notes ?? null,
          coupleName1: siteData.couple_name_1,
          coupleName2: siteData.couple_name_2,
        },
        status: "pending",
      });
    }

    // Fire-and-forget: trigger email processing
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-email-queue`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ trigger: "rsvp" }),
            },
          );
        } catch {
          // best-effort only
        }
      })(),
    );

    return json({
      success: true,
      guestName,
      attending,
      waitlisted,
      siteData: siteData
        ? {
            coupleName1: siteData.couple_name_1,
            coupleName2: siteData.couple_name_2,
            weddingDate: siteData.wedding_date,
            venueName: siteData.venue_name,
          }
        : null,
    });
  } catch (err) {
    console.error("SUBMIT_RSVP_UNEXPECTED_FAILED", { reason: "UNEXPECTED_RSVP_SUBMIT_FAILURE" });
    return json({ error: "Could not submit this RSVP. Please try again." }, 500);
  }
});
