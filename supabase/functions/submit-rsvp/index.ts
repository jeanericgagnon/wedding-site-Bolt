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

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_URL"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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
      return json({ error: "Invalid JSON body" }, 400);
    }

    // Honeypot field — bots fill this in, humans don't
    if (body.website || body.hp_field) {
      return json({ success: true });
    }

    const { inviteToken, attending, mealChoice, plusOneName, notes } = body as {
      inviteToken?: string;
      attending?: boolean;
      mealChoice?: string | null;
      plusOneName?: string | null;
      notes?: string | null;
    };

    if (!inviteToken || typeof inviteToken !== "string" || inviteToken.trim().length < 20) {
      return json({ error: "A valid invitation token is required to submit your RSVP." }, 400);
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
        guest_token: inviteToken.slice(0, 16),
        attempts: 1,
      });
    }

    // Look up guest by token
    const { data: guest, error: guestErr } = await adminClient
      .from("guests")
      .select("id, invite_token, wedding_site_id, email, first_name, last_name, name, token_expires_at, invited_to_ceremony, invited_to_reception, plus_one_allowed")
      .eq("invite_token", inviteToken.trim())
      .maybeSingle();

    if (guestErr || !guest) {
      return json({ error: "Invalid invitation token. Please use the link from your invitation email." }, 404);
    }

    if (!guest.invite_token || guest.invite_token !== inviteToken.trim()) {
      return json({ error: "Invalid invitation token." }, 403);
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

    await adminClient
      .from("guests")
      .update({
        rsvp_status: attending ? "confirmed" : "declined",
        rsvp_received_at: new Date().toISOString(),
      })
      .eq("id", guest.id);

    const { data: siteData } = await adminClient
      .from("wedding_sites")
      .select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name, rsvp_deadline")
      .eq("id", guest.wedding_site_id)
      .maybeSingle();

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
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
