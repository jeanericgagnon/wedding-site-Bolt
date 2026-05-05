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
  guestEstimateBand?: '' | 'lt50' | '50to100' | '100to200' | '200plus';
  stylePreferences?: string[];
};

const allowedGuestBands = new Set(['', 'lt50', '50to100', '100to200', '200plus']);
const allowedTemplateIds = new Set([
  'modern-luxe',
  'garden-romance',
  'coastal-breeze',
  'classic-elegance',
  'rustic-warmth',
  'bold-minimal',
]);
const allowedStyleTags = new Set(['Modern', 'Classic', 'Floral', 'Minimal', 'Romantic', 'Rustic', 'Bold', 'Destination']);

function safeSetupBootstrapError(code: "SERVER_CONFIG_ERROR" | "SAVE_FAILED" | "LOAD_FAILED" | "INTERNAL_ERROR"): string {
  if (code === "SERVER_CONFIG_ERROR") return "Setup is not ready yet. Please try again in a few minutes.";
  if (code === "LOAD_FAILED") return "Could not load your setup space. Please try again.";
  if (code === "SAVE_FAILED") return "Could not save your setup details. Please try again.";
  return "Could not finish setup. Please try again.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Method not allowed.", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("UNAUTHORIZED", "Unauthorized", 401);

    const body = (await req.json().catch(() => ({}))) as SetupPayload;

    const p1 = (body.partnerOneFirstName ?? "").trim();
    const p2 = (body.partnerTwoFirstName ?? "").trim();
    if (!p1 || !p2) return fail("VALIDATION_ERROR", "Both partner first names are required", 400);

    if (!allowedGuestBands.has(body.guestEstimateBand ?? '')) {
      return fail("VALIDATION_ERROR", "Invalid guest estimate band", 400);
    }

    const selectedTemplateId = allowedTemplateIds.has(body.selectedTemplateId ?? '')
      ? body.selectedTemplateId!
      : 'modern-luxe';

    const stylePreferences = Array.isArray(body.stylePreferences)
      ? body.stylePreferences
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => allowedStyleTags.has(x))
          .slice(0, 8)
      : [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anonKey) return fail("SERVER_CONFIG_ERROR", safeSetupBootstrapError("SERVER_CONFIG_ERROR"), 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return fail("UNAUTHORIZED", "Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: site, error: siteErr } = await admin
      .from("wedding_sites")
      .select("id,wedding_data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteErr) {
      console.error("SETUP_BOOTSTRAP_LOAD_FAILED", { reason: "SITE_LOAD_FAILED" });
      return fail("DB_ERROR", safeSetupBootstrapError("LOAD_FAILED"), 400);
    }
    if (!site) return fail("NO_SITE", "No wedding site found for this account", 404);

    let weddingDateISO: string | undefined;
    if (body.dateKnown && body.weddingDate) {
      const parsedDate = new Date(body.weddingDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return fail("VALIDATION_ERROR", "Invalid wedding date", 400);
      }
      weddingDateISO = parsedDate.toISOString();
    }

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
          style_preferences: stylePreferences.join(","),
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
      active_template_id: selectedTemplateId,
      template_id: selectedTemplateId,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin.from("wedding_sites").update(updatePayload).eq("id", site.id);
    if (updateErr) {
      console.error("SETUP_BOOTSTRAP_SAVE_FAILED", { reason: "SITE_UPDATE_FAILED" });
      return fail("DB_ERROR", safeSetupBootstrapError("SAVE_FAILED"), 400);
    }

    return json({ success: true, weddingSiteId: site.id });
  } catch (err) {
    console.error("SETUP_BOOTSTRAP_UNEXPECTED_FAILED", { reason: "UNEXPECTED_SETUP_BOOTSTRAP_FAILURE" });
    return fail("INTERNAL_ERROR", safeSetupBootstrapError("INTERNAL_ERROR"), 500);
  }
});
