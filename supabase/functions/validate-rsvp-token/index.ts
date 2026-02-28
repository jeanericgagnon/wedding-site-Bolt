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
  attendCeremony?: boolean;
  attendReception?: boolean;
  mealChoice?: string | null;
  plusOneName?: string | null;
  plusOneCount?: number;
  childrenCount?: number;
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
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
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

    const logConflict = async (
      weddingSiteId: string,
      guestId: string,
      conflictCode: string,
      message: string,
      attemptedPayload: unknown,
      severity: "error" | "warning" = "error",
    ) => {
      try {
        await adminClient.from("rsvp_conflicts").insert({
          wedding_site_id: weddingSiteId,
          guest_id: guestId,
          conflict_code: conflictCode,
          message,
          severity,
          attempted_payload: attemptedPayload ?? {},
        });
      } catch {
        // best effort
      }
    };

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (payload.action === "lookup") {
      const { searchValue } = payload;
      if (!searchValue?.trim()) return json({ error: "searchValue is required" }, 400);

      const trimmed = searchValue.trim();
      const guestSelect = "id, first_name, last_name, name, email, plus_one_allowed, invited_to_ceremony, invited_to_reception, invite_token, wedding_site_id, household_id";

      const { data: byToken } = await adminClient.from("guests").select(guestSelect).eq("invite_token", trimmed).maybeSingle();

      const fetchRsvpConfig = async (siteId: string): Promise<{ rsvpDeadline: string | null; rsvpQuestions: unknown[]; rsvpMealConfig: { enabled: boolean; options: string[] } }> => {
        const { data } = await adminClient.from("wedding_sites").select("rsvp_deadline, rsvp_custom_questions, rsvp_meal_config").eq("id", siteId).maybeSingle();
        const typed = data as { rsvp_deadline?: string | null; rsvp_custom_questions?: unknown; rsvp_meal_config?: unknown } | null;
        const parsedQuestions = Array.isArray(typed?.rsvp_custom_questions) ? typed.rsvp_custom_questions : [];
        const mealRaw = typed?.rsvp_meal_config as { enabled?: unknown; options?: unknown } | undefined;
        return {
          rsvpDeadline: typed?.rsvp_deadline ?? null,
          rsvpQuestions: parsedQuestions,
          rsvpMealConfig: {
            enabled: typeof mealRaw?.enabled === "boolean" ? mealRaw.enabled : true,
            options: Array.isArray(mealRaw?.options)
              ? mealRaw.options.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
              : ["Chicken", "Beef", "Fish", "Vegetarian", "Vegan"],
          },
        };
      };

      const fetchHouseholdGuests = async (siteId: string, householdId: string | null | undefined, guestId: string) => {
        if (!householdId) return [] as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invite_token: string | null }>;
        const { data } = await adminClient.from("guests").select("id, first_name, last_name, name, invite_token").eq("wedding_site_id", siteId).eq("household_id", householdId).neq("id", guestId).limit(8);
        return (data || []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invite_token: string | null }>;
      };

      if (byToken) {
        const [existingRsvpResult, config, householdGuests] = await Promise.all([
          adminClient.from("rsvps").select("id, attending, attending_ceremony, attending_reception, meal_choice, plus_one_name, plus_one_count, children_count, notes, custom_answers").eq("guest_id", byToken.id).maybeSingle(),
          fetchRsvpConfig(byToken.wedding_site_id),
          fetchHouseholdGuests(byToken.wedding_site_id, (byToken as { household_id?: string | null }).household_id, byToken.id),
        ]);
        return json({ guest: byToken, existingRsvp: existingRsvpResult.data, guests: null, rsvpDeadline: config.rsvpDeadline, rsvpQuestions: config.rsvpQuestions, rsvpMealConfig: config.rsvpMealConfig, householdGuests });
      }

      const lower = trimmed.toLowerCase();
      const { data: byName } = await adminClient.from("guests").select(guestSelect).or(`name.ilike.%${lower}%,first_name.ilike.%${lower}%,last_name.ilike.%${lower}%`).limit(10);
      if (!byName || byName.length === 0) return json({ error: "We couldn't find an invitation matching that name or code. Please double-check the spelling or use the invitation code from your email." }, 404);

      if (byName.length === 1) {
        const guest = byName[0];
        const [existingRsvpResult, config, householdGuests] = await Promise.all([
          adminClient.from("rsvps").select("id, attending, attending_ceremony, attending_reception, meal_choice, plus_one_name, plus_one_count, children_count, notes, custom_answers").eq("guest_id", guest.id).maybeSingle(),
          fetchRsvpConfig(guest.wedding_site_id),
          fetchHouseholdGuests(guest.wedding_site_id, (guest as { household_id?: string | null }).household_id, guest.id),
        ]);
        return json({ guest, existingRsvp: existingRsvpResult.data, guests: null, rsvpDeadline: config.rsvpDeadline, rsvpQuestions: config.rsvpQuestions, rsvpMealConfig: config.rsvpMealConfig, householdGuests });
      }

      return json({ guest: null, existingRsvp: null, guests: byName, rsvpDeadline: null, rsvpQuestions: [], rsvpMealConfig: { enabled: true, options: ["Chicken", "Beef", "Fish", "Vegetarian", "Vegan"] }, householdGuests: [] });
    }

    if (payload.action === "submit") {
      const submitPayload = payload as SubmitPayload;
      if (submitPayload.website || submitPayload.hp_field) return json({ success: true });

      const { guestId, inviteToken, attending, mealChoice, plusOneName, notes, customAnswers, applyToHousehold } = submitPayload;
      const attendCeremony = !!submitPayload.attendCeremony;
      const attendReception = !!submitPayload.attendReception;
      const plusOneCount = Number.isFinite(submitPayload.plusOneCount) ? Math.max(0, Math.floor(submitPayload.plusOneCount as number)) : (plusOneName?.trim() ? 1 : 0);
      const childrenCount = Number.isFinite(submitPayload.childrenCount) ? Math.max(0, Math.floor(submitPayload.childrenCount as number)) : 0;

      if (!guestId || !inviteToken) return json({ error: "guestId and inviteToken are required" }, 400);
      if (typeof attending !== "boolean") return json({ error: "Please indicate whether you will be attending." }, 400);

      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
      const ipHash = await hashIp(clientIp);
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

      const { data: existingLimit } = await adminClient.from("rsvp_rate_limit").select("id, attempts, last_attempt_at").eq("ip_hash", ipHash).gte("last_attempt_at", windowStart).maybeSingle();
      if (existingLimit) {
        if (existingLimit.attempts >= RATE_LIMIT_MAX_ATTEMPTS) return json({ error: "Too many requests. Please try again later." }, 429);
        await adminClient.from("rsvp_rate_limit").update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() }).eq("id", existingLimit.id);
      } else {
        await adminClient.from("rsvp_rate_limit").insert({ ip_hash: ipHash, guest_token: inviteToken.slice(0, 16), attempts: 1 });
      }

      const { data: guest, error: guestErr } = await adminClient
        .from("guests")
        .select("id, invite_token, wedding_site_id, email, first_name, last_name, name, household_id, plus_one_allowed, invited_to_ceremony, invited_to_reception, children_allowed, max_children, max_additional_guests")
        .eq("id", guestId)
        .maybeSingle();

      if (guestErr || !guest) return json({ error: "We couldn't find your invitation. Please use the RSVP link from your invitation email, or search by your full name." }, 404);
      if (!guest.invite_token || guest.invite_token !== inviteToken) {
        await logConflict(guest.wedding_site_id, guestId, "invite_token_mismatch", "Invite token did not match guest record.", submitPayload);
        return json({ error: "This RSVP link isn't valid. Please use the original link from your invitation email, or ask the couple for a new one." }, 403);
      }
      const tokenExpiresAt = (guest as { token_expires_at?: string | null }).token_expires_at;
      if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
        await logConflict(guest.wedding_site_id, guestId, "invite_token_expired", "Invite token is expired.", submitPayload);
        return json({ error: "This RSVP link has expired. Please reach out to the couple to receive a new invitation link." }, 403);
      }

      if (attending) {
        if (attendCeremony && !guest.invited_to_ceremony) {
          await logConflict(guest.wedding_site_id, guestId, "invite_scope_violation", "Guest attempted to RSVP for ceremony without invitation.", submitPayload);
          return json({ error: "Your invitation does not include the ceremony." }, 400);
        }
        if (attendReception && !guest.invited_to_reception) {
          await logConflict(guest.wedding_site_id, guestId, "invite_scope_violation", "Guest attempted to RSVP for reception without invitation.", submitPayload);
          return json({ error: "Your invitation does not include the reception." }, 400);
        }
        if ((guest.invited_to_ceremony || guest.invited_to_reception) && !attendCeremony && !attendReception) {
          await logConflict(guest.wedding_site_id, guestId, "empty_event_selection", "Guest marked attending but no invited events selected.", submitPayload, "warning");
          return json({ error: "Please select at least one invited event, or mark not attending." }, 400);
        }
      }

      const allowedPlusOne = guest.plus_one_allowed ? 1 : 0;
      const allowedChildren = guest.children_allowed ? Math.max(0, Number(guest.max_children ?? 0)) : 0;
      const allowedAdditional = Math.max(Number(guest.max_additional_guests ?? 0), allowedPlusOne + allowedChildren);
      const requestedAdditional = plusOneCount + childrenCount;

      if (plusOneCount > allowedPlusOne) {
        await logConflict(guest.wedding_site_id, guestId, "plus_one_limit_exceeded", "Plus-one count exceeded invite allowance.", submitPayload);
        return json({ error: "Your invitation does not allow that many plus-ones." }, 400);
      }
      if (childrenCount > allowedChildren) {
        await logConflict(guest.wedding_site_id, guestId, "children_limit_exceeded", "Children count exceeded invite allowance.", submitPayload);
        return json({ error: "This invitation does not allow that many children." }, 400);
      }
      if (requestedAdditional > allowedAdditional) {
        await logConflict(guest.wedding_site_id, guestId, "additional_guest_limit_exceeded", "Total additional guest count exceeded invite allowance.", submitPayload);
        return json({ error: "This response exceeds the additional guest count allowed on your invitation." }, 400);
      }

      const targetGuestIds: string[] = [guestId];
      if (applyToHousehold && guest.household_id) {
        const { data: sameHousehold } = await adminClient.from("guests").select("id, invited_to_ceremony, invited_to_reception").eq("wedding_site_id", guest.wedding_site_id).eq("household_id", guest.household_id);
        for (const g of sameHousehold || []) {
          if (!targetGuestIds.includes(g.id)) targetGuestIds.push(g.id);
          if (attending && attendCeremony && !g.invited_to_ceremony) {
            await logConflict(guest.wedding_site_id, g.id, "household_scope_conflict", "Household RSVP attempted ceremony attendance for a member not invited to ceremony.", submitPayload);
            return json({ error: "Household RSVP conflict: one or more household members are not invited to all selected events." }, 400);
          }
          if (attending && attendReception && !g.invited_to_reception) {
            await logConflict(guest.wedding_site_id, g.id, "household_scope_conflict", "Household RSVP attempted reception attendance for a member not invited to reception.", submitPayload);
            return json({ error: "Household RSVP conflict: one or more household members are not invited to all selected events." }, 400);
          }
        }
      }

      for (const targetGuestId of targetGuestIds) {
        const rsvpPayload = {
          guest_id: targetGuestId,
          attending,
          attending_ceremony: attending ? attendCeremony : false,
          attending_reception: attending ? attendReception : false,
          meal_choice: mealChoice ?? null,
          plus_one_name: plusOneName ?? null,
          plus_one_count: plusOneCount,
          children_count: childrenCount,
          notes: notes ?? null,
          conflict_flags: [],
          custom_answers: (customAnswers && typeof customAnswers === "object" && !Array.isArray(customAnswers)) ? customAnswers : {},
          responded_at: new Date().toISOString(),
        };

        const { data: existingRsvp } = await adminClient.from("rsvps").select("id").eq("guest_id", targetGuestId).maybeSingle();
        if (existingRsvp) {
          const { error: updateErr } = await adminClient.from("rsvps").update(rsvpPayload).eq("id", existingRsvp.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await adminClient.from("rsvps").insert([rsvpPayload]);
          if (insertErr) throw insertErr;
        }
      }

      await adminClient.from("guests").update({ rsvp_status: attending ? "confirmed" : "declined", rsvp_received_at: new Date().toISOString() }).in("id", targetGuestIds);

      const { data: siteData } = await adminClient.from("wedding_sites").select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name").eq("id", guest.wedding_site_id).maybeSingle();
      const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;

      if (guest.email && siteData) {
        try {
          await adminClient.from("email_queue").insert({
            site_id: guest.wedding_site_id,
            guest_id: guest.id,
            type: "rsvp_confirmation",
            payload_json: { to: guest.email, guestName, attending, coupleName1: siteData.couple_name_1, coupleName2: siteData.couple_name_2, weddingDate: siteData.wedding_date, venueName: siteData.venue_name },
            status: "pending",
          });
        } catch {
          // best effort
        }
      }

      if (siteData?.couple_email) {
        try {
          await adminClient.from("email_queue").insert({
            site_id: guest.wedding_site_id,
            guest_id: guest.id,
            type: "rsvp_notification",
            payload_json: { to: siteData.couple_email, guestName, attending, mealChoice: mealChoice ?? null, plusOneName: plusOneName ?? null, notes: notes ?? null, coupleName1: siteData.couple_name_1, coupleName2: siteData.couple_name_2 },
            status: "pending",
          });
        } catch {
          // best effort
        }
      }

      EdgeRuntime.waitUntil((async () => {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-email-queue`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({ trigger: "rsvp" }),
          });
        } catch {
          // best effort
        }
      })());

      return json({ success: true, guestName, attending });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
