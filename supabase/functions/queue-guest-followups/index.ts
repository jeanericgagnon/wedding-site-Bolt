import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type FollowupKind = "recap" | "future_event";

function hasPermissionKey(permissions: unknown, key: string): boolean {
  return Array.isArray(permissions) && permissions.includes(key);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRole) return json({ error: "Supabase not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRole);
    const body = await req.json().catch(() => ({}));
    const siteId = String(body.siteId ?? "").trim();
    const kind = String(body.kind ?? "recap") as FollowupKind;
    const limit = Math.max(1, Math.min(Number(body.limit ?? 100), 250));
    if (!siteId) return json({ error: "Missing siteId" }, 400);
    if (!["recap", "future_event"].includes(kind)) return json({ error: "Invalid follow-up kind" }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,user_id,site_slug,couple_name_1,couple_name_2,wedding_date")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) throw siteError;
    if (!site?.id) return json({ error: "Site not found" }, 404);

    let allowed = site.user_id === user.id;
    if (!allowed) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("wedding_site_collaborators")
        .select("permissions")
        .eq("wedding_site_id", siteId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) throw collaboratorError;
      allowed = hasPermissionKey(collaborator?.permissions, "photos") || hasPermissionKey(collaborator?.permissions, "messages");
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const wantsColumn = kind === "recap" ? "wants_photo_updates" : "wants_own_event_info";
    const queuedColumn = kind === "recap" ? "recap_email_queued_at" : "future_event_email_queued_at";
    const queueIdColumn = kind === "recap" ? "recap_email_queue_id" : "future_event_email_queue_id";
    const emailType = kind === "recap" ? "guest_recap_available" : "prospect_future_event";

    const { data: optins, error: optinError } = await admin
      .from("guest_prospect_optins")
      .select("id,guest_name,email,phone,source,wants_photo_updates,wants_own_event_info,created_at")
      .eq("wedding_site_id", siteId)
      .eq(wantsColumn, true)
      .is(queuedColumn, null)
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (optinError) throw optinError;

    const siteSlug = String(site.site_slug ?? "");
    const coupleName1 = String(site.couple_name_1 ?? "The couple");
    const coupleName2 = String(site.couple_name_2 ?? "");
    const coupleLabel = coupleName2 ? `${coupleName1} & ${coupleName2}` : coupleName1;
    const recapUrl = `https://dayof.love/event/${encodeURIComponent(siteSlug)}/recap`;

    let queued = 0;
    const failures: Array<{ id: string; error: string }> = [];

    for (const optin of optins ?? []) {
      const email = String(optin.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      const payload = {
        to: email,
        guestName: optin.guest_name || "there",
        coupleName1,
        coupleName2,
        coupleLabel,
        weddingDate: site.wedding_date,
        recapUrl,
        siteUrl: `https://dayof.love/site/${encodeURIComponent(siteSlug)}`,
        signupUrl: "https://dayof.love/signup",
      };

      const { data: queueRow, error: queueError } = await admin
        .from("email_queue")
        .insert({
          site_id: siteId,
          type: emailType,
          payload_json: payload,
          status: "pending",
          scheduled_for: null,
        })
        .select("id")
        .single();

      if (queueError || !queueRow?.id) {
        if (queueError) console.error("QUEUE_GUEST_FOLLOWUPS_INSERT_FAILED", queueError);
        failures.push({ id: optin.id, error: "Could not queue this follow-up." });
        continue;
      }

      const { error: updateError } = await admin
        .from("guest_prospect_optins")
        .update({
          [queuedColumn]: new Date().toISOString(),
          [queueIdColumn]: queueRow.id,
        })
        .eq("id", optin.id);

      if (updateError) {
        console.error("QUEUE_GUEST_FOLLOWUPS_MARK_FAILED", updateError);
        failures.push({ id: optin.id, error: "Could not mark this follow-up queued." });
        continue;
      }

      queued++;
    }

    return json({ queued, scanned: optins?.length ?? 0, failures });
  } catch (error) {
    console.error("QUEUE_GUEST_FOLLOWUPS_UNEXPECTED_FAILED", error);
    return json({ error: "Could not queue follow-ups. Please try again." }, 500);
  }
});
