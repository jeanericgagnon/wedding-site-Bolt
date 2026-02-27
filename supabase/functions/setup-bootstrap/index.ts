import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fail, json, corsHeaders } from "../_shared/photoUtils.ts";

type SetupPayload = {
  selectedTemplateId?: string;
  partnerOneFirstName?: string;
  partnerOneLastName?: string;
  partnerTwoFirstName?: string;
  partnerTwoLastName?: string;
  dateKnown?: boolean;
  weddingDate?: string;
  weddingCity?: string;
  weddingRegion?: string;
  guestEstimateBand?: string;
  stylePreferences?: string[];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("UNAUTHORIZED", "Unauthorized", 401);

    const body = (await req.json().catch(() => ({}))) as SetupPayload;

    const p1 = (body.partnerOneFirstName ?? "").trim();
    const p2 = (body.partnerTwoFirstName ?? "").trim();
    if (!p1 || !p2) return fail("VALIDATION_ERROR", "Both partner first names are required", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anonKey) return fail("SERVER_CONFIG_ERROR", "Missing SUPABASE_ANON_KEY", 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return fail("UNAUTHORIZED", userErr?.message ?? "Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: site, error: siteErr } = await admin
      .from("wedding_sites")
      .select("id,wedding_data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteErr) return fail("DB_ERROR", siteErr.message, 400);
    if (!site) return fail("NO_SITE", "No wedding site found for this account", 404);

    const weddingDateISO = body.dateKnown && body.weddingDate ? new Date(body.weddingDate).toISOString() : undefined;
    const location = [body.weddingCity?.trim(), body.weddingRegion?.trim()].filter(Boolean).join(", ");

    const currentData = (site.wedding_data && typeof site.wedding_data === "object") ? site.wedding_data as Record<string, unknown> : {};
    const mergedWeddingData = {
      ...currentData,
      version: "1",
      couple: {
        ...(currentData.couple as Record<string, unknown> | undefined),
        partner1Name: p1,
        partner2Name: p2,
        displayName: `${p1} & ${p2}`,
      },
      event: {
        ...(currentData.event as Record<string, unknown> | undefined),
        weddingDateISO,
      },
      venues: location ? [{ id: "primary", name: "Main Venue", address: location }] : (currentData.venues ?? []),
      theme: {
        ...(currentData.theme as Record<string, unknown> | undefined),
        tokens: {
          ...(((currentData.theme as Record<string, unknown> | undefined)?.tokens as Record<string, string> | undefined) ?? {}),
          style_preferences: Array.isArray(body.stylePreferences) ? body.stylePreferences.join(",") : "",
          guest_estimate_band: body.guestEstimateBand ?? "",
        },
      },
    };

    const updatePayload: Record<string, unknown> = {
      wedding_data: mergedWeddingData,
      couple_name_1: p1,
      couple_name_2: p2,
      wedding_date: body.dateKnown && body.weddingDate ? body.weddingDate : null,
      venue_date: body.dateKnown && body.weddingDate ? body.weddingDate : null,
      wedding_location: location || null,
      active_template_id: body.selectedTemplateId || "modern-luxe",
      template_id: body.selectedTemplateId || "modern-luxe",
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin.from("wedding_sites").update(updatePayload).eq("id", site.id);
    if (updateErr) return fail("DB_ERROR", updateErr.message, 400);

    return json({ success: true, weddingSiteId: site.id });
  } catch (err) {
    return fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500);
  }
});
