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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const uploadIds = Array.isArray(body.uploadIds) ? body.uploadIds.filter((x) => typeof x === "string") : [];
    const patch = (body.patch && typeof body.patch === "object") ? body.patch as Record<string, unknown> : {};

    if (uploadIds.length === 0) return json({ error: "uploadIds required" }, 400);
    if (uploadIds.length > 500) return json({ error: "Too many uploadIds (max 500)" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: uploads, error: uploadsErr } = await admin
      .from("photo_uploads")
      .select("id,wedding_site_id")
      .in("id", uploadIds);

    if (uploadsErr || !uploads || uploads.length === 0) {
      return json({ error: uploadsErr?.message ?? "No uploads found" }, 400);
    }

    const siteIds = [...new Set(uploads.map((u) => u.wedding_site_id))];
    const { data: sites } = await admin
      .from("wedding_sites")
      .select("id,user_id")
      .in("id", siteIds);

    const unauthorized = (sites ?? []).some((s) => s.user_id !== user.id);
    if (unauthorized) return json({ error: "Forbidden" }, 403);

    const allowedPatch: Record<string, unknown> = {};
    if (typeof patch.is_hidden === "boolean") allowedPatch.is_hidden = patch.is_hidden;
    if (typeof patch.is_flagged === "boolean") allowedPatch.is_flagged = patch.is_flagged;
    if (Object.keys(allowedPatch).length === 0) return json({ error: "No valid patch fields" }, 400);

    const { error: updateErr } = await admin
      .from("photo_uploads")
      .update({
        ...allowedPatch,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id,
      })
      .in("id", uploadIds);

    if (updateErr) return json({ error: updateErr.message }, 400);

    return json({ success: true, updated: uploadIds.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
