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
}

type Payload = LookupPayload | SubmitPayload;

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
        .select("id, first_name, last_name, name, email, plus_one_allowed, invited_to_ceremony, invited_to_reception, invite_token, wedding_site_id")
        .eq("invite_token", trimmed)
        .maybeSingle();

      if (byToken) {
        const { data: existingRsvp } = await adminClient
          .from("rsvps")
          .select("id, attending, meal_choice, plus_one_name, notes")
          .eq("guest_id", byToken.id)
          .maybeSingle();
        return json({ guest: byToken, existingRsvp });
      }

      const lower = trimmed.toLowerCase();
      const { data: byName } = await adminClient
        .from("guests")
        .select("id, first_name, last_name, name, email, plus_one_allowed, invited_to_ceremony, invited_to_reception, invite_token, wedding_site_id")
        .or(`name.ilike.%${lower}%,first_name.ilike.%${lower}%,last_name.ilike.%${lower}%`)
        .limit(5);

      if (!byName || byName.length === 0) {
        return json({ error: "Guest not found. Please check your name or invitation code." }, 404);
      }

      const guest = byName[0];
      const { data: existingRsvp } = await adminClient
        .from("rsvps")
        .select("id, attending, meal_choice, plus_one_name, notes")
        .eq("guest_id", guest.id)
        .maybeSingle();

      return json({ guest, existingRsvp });
    }

    if (payload.action === "submit") {
      const { guestId, inviteToken, attending, mealChoice, plusOneName, notes } = payload;

      if (!guestId || !inviteToken) {
        return json({ error: "guestId and inviteToken are required" }, 400);
      }

      const { data: guest, error: guestErr } = await adminClient
        .from("guests")
        .select("id, invite_token, wedding_site_id, email, first_name, last_name, name, token_expires_at")
        .eq("id", guestId)
        .maybeSingle();

      if (guestErr || !guest) {
        return json({ error: "Guest not found" }, 404);
      }

      if (!guest.invite_token || guest.invite_token !== inviteToken) {
        return json({ error: "Invalid invitation token" }, 403);
      }

      if (guest.token_expires_at && new Date(guest.token_expires_at) < new Date()) {
        return json({ error: "This invitation link has expired. Please contact the couple." }, 403);
      }

      const rsvpPayload = {
        guest_id: guestId,
        attending,
        meal_choice: mealChoice ?? null,
        plus_one_name: plusOneName ?? null,
        notes: notes ?? null,
        responded_at: new Date().toISOString(),
      };

      const { data: existingRsvp } = await adminClient
        .from("rsvps")
        .select("id")
        .eq("guest_id", guestId)
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
        .eq("id", guestId);

      const { data: siteData } = await adminClient
        .from("wedding_sites")
        .select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name")
        .eq("id", guest.wedding_site_id)
        .maybeSingle();

      return json({
        success: true,
        siteData: siteData
          ? {
              coupleEmail: siteData.couple_email,
              coupleName1: siteData.couple_name_1,
              coupleName2: siteData.couple_name_2,
              weddingDate: siteData.wedding_date,
              venueName: siteData.venue_name,
            }
          : null,
        guestName:
          guest.first_name && guest.last_name
            ? `${guest.first_name} ${guest.last_name}`
            : guest.name,
        guestEmail: guest.email,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
