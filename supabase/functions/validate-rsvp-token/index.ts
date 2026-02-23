import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LookupPayload {
  action: "lookup";
  searchValue: string;
}

interface SubmitPayload {
  action: "submit";
  guestId: string;
  inviteToken: string;
  attending: boolean;
  mealChoice?: string | null;
  plusOneName?: string | null;
  notes?: string | null;
  customAnswers?: Record<string, unknown> | null;
  applyToHousehold?: boolean;
  website?: string;
  hp_field?: string;
}

type Payload = LookupPayload | SubmitPayload;

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

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (payload.action === "lookup") {
      const { searchValue } = payload;
      if (!searchValue?.trim()) {
        return json({ error: "searchValue is required" }, 400);
      }

      const trimmed = searchValue.trim();

      const { data: byToken } = await adminClient
        .from("guests")
        .select("id, first_name, last_name, name, email, plus_one_allowed, invited_to_ceremony, invited_to_reception, invite_token, wedding_site_id, household_id")
        .eq("invite_token", trimmed)
        .maybeSingle();

      const fetchRsvpConfig = async (siteId: string): Promise<{ rsvpDeadline: string | null; rsvpQuestions: unknown[]; rsvpMealConfig: { enabled: boolean; options: string[] } }> => {
        const { data } = await adminClient
          .from("wedding_sites")
          .select("rsvp_deadline, rsvp_custom_questions, rsvp_meal_config")
          .eq("id", siteId)
          .maybeSingle();

        const typed = data as { rsvp_deadline?: string | null; rsvp_custom_questions?: unknown; rsvp_meal_config?: unknown } | null;
        const parsedQuestions = Array.isArray(typed?.rsvp_custom_questions)
          ? typed?.rsvp_custom_questions
          : [];

        const mealRaw = typed?.rsvp_meal_config as { enabled?: unknown; options?: unknown } | undefined;
        return {
          rsvpDeadline: typed?.rsvp_deadline ?? null,
          rsvpQuestions: parsedQuestions,
          rsvpMealConfig: {
            enabled: typeof mealRaw?.enabled === 'boolean' ? mealRaw.enabled : true,
            options: Array.isArray(mealRaw?.options) ? mealRaw!.options.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
          },
        };
      };


      const fetchHouseholdGuests = async (siteId: string, householdId: string | null | undefined, guestId: string) => {
        if (!householdId) return [] as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invite_token: string | null }>;
        const { data } = await adminClient
          .from("guests")
          .select("id, first_name, last_name, name, invite_token")
          .eq("wedding_site_id", siteId)
          .eq("household_id", householdId)
          .neq("id", guestId)
          .limit(8);
        return (data || []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invite_token: string | null }>;
      };
      if (byToken) {
        const [existingRsvpResult, config, householdGuests] = await Promise.all([
          adminClient.from("rsvps").select("id, attending, meal_choice, plus_one_name, notes, custom_answers").eq("guest_id", byToken.id).maybeSingle(),
          fetchRsvpConfig(byToken.wedding_site_id),
          fetchHouseholdGuests(byToken.wedding_site_id, (byToken as { household_id?: string | null }).household_id, byToken.id),
        ]);
        return json({
          guest: byToken,
          existingRsvp: existingRsvpResult.data,
          guests: null,
          rsvpDeadline: config.rsvpDeadline,
          rsvpQuestions: config.rsvpQuestions,
          rsvpMealConfig: config.rsvpMealConfig,
          householdGuests,
        });
      }

      const lower = trimmed.toLowerCase();
      const { data: byName } = await adminClient
        .from("guests")
        .select("id, first_name, last_name, name, email, plus_one_allowed, invited_to_ceremony, invited_to_reception, invite_token, wedding_site_id, household_id")
        .or(`name.ilike.%${lower}%,first_name.ilike.%${lower}%,last_name.ilike.%${lower}%`)
        .limit(10);

      if (!byName || byName.length === 0) {
        return json({ error: "We couldn't find an invitation matching that name or code. Please double-check the spelling or use the invitation code from your email." }, 404);
      }

      if (byName.length === 1) {
        const guest = byName[0];
        const [existingRsvpResult, config, householdGuests] = await Promise.all([
          adminClient.from("rsvps").select("id, attending, meal_choice, plus_one_name, notes, custom_answers").eq("guest_id", guest.id).maybeSingle(),
          fetchRsvpConfig(guest.wedding_site_id),
          fetchHouseholdGuests(guest.wedding_site_id, (guest as { household_id?: string | null }).household_id, guest.id),
        ]);
        return json({
          guest,
          existingRsvp: existingRsvpResult.data,
          guests: null,
          rsvpDeadline: config.rsvpDeadline,
          rsvpQuestions: config.rsvpQuestions,
          rsvpMealConfig: config.rsvpMealConfig,
          householdGuests,
        });
      }

      return json({ guest: null, existingRsvp: null, guests: byName, rsvpDeadline: null, rsvpQuestions: [], rsvpMealConfig: { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] }, householdGuests: [] });
    }

    if (payload.action === "submit") {
      const submitPayload = payload as SubmitPayload;

      if (submitPayload.website || submitPayload.hp_field) {
        return json({ success: true });
      }

      const { guestId, inviteToken, attending, mealChoice, plusOneName, notes, customAnswers, applyToHousehold } = submitPayload;

      if (!guestId || !inviteToken) {
        return json({ error: "guestId and inviteToken are required" }, 400);
      }

      if (typeof attending !== "boolean") {
        return json({ error: "Please indicate whether you will be attending." }, 400);
      }

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

      const { data: guest, error: guestErr } = await adminClient
        .from("guests")
        .select("id, invite_token, wedding_site_id, email, first_name, last_name, name, token_expires_at, household_id")
        .eq("id", guestId)
        .maybeSingle();

      if (guestErr || !guest) {
        return json({ error: "We couldn't find your invitation. Please use the RSVP link from your invitation email, or search by your full name." }, 404);
      }

      if (!guest.invite_token || guest.invite_token !== inviteToken) {
        return json({ error: "This RSVP link isn't valid. Please use the original link from your invitation email, or ask the couple for a new one." }, 403);
      }

      if (guest.token_expires_at && new Date(guest.token_expires_at) < new Date()) {
        return json({ error: "This RSVP link has expired. Please reach out to the couple to receive a new invitation link." }, 403);
      }

      const targetGuestIds: string[] = [guestId];
      if (applyToHousehold && guest.household_id) {
        const { data: sameHousehold } = await adminClient
          .from("guests")
          .select("id")
          .eq("wedding_site_id", guest.wedding_site_id)
          .eq("household_id", guest.household_id);
        for (const g of sameHousehold || []) {
          if (!targetGuestIds.includes(g.id)) targetGuestIds.push(g.id);
        }
      }

      for (const targetGuestId of targetGuestIds) {
        const rsvpPayload = {
          guest_id: targetGuestId,
          attending,
          meal_choice: mealChoice ?? null,
          plus_one_name: plusOneName ?? null,
          notes: notes ?? null,
          custom_answers: (customAnswers && typeof customAnswers === "object" && !Array.isArray(customAnswers)) ? customAnswers : {},
          responded_at: new Date().toISOString(),
        };

        const { data: existingRsvp } = await adminClient
          .from("rsvps")
          .select("id")
          .eq("guest_id", targetGuestId)
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
      }

      await adminClient
        .from("guests")
        .update({
          rsvp_status: attending ? "confirmed" : "declined",
          rsvp_received_at: new Date().toISOString(),
        })
        .in("id", targetGuestIds);

      const { data: siteData } = await adminClient
        .from("wedding_sites")
        .select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name")
        .eq("id", guest.wedding_site_id)
        .maybeSingle();

      const guestName =
        guest.first_name && guest.last_name
          ? `${guest.first_name} ${guest.last_name}`
          : guest.name;

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
        }).catch(() => {});
      }

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
        }).catch(() => {});
      }

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
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
