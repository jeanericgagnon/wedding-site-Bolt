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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(length = 48) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const albumId = typeof body.albumId === "string" ? body.albumId : "";
    const isActive = typeof body.isActive === "boolean" ? body.isActive : null;

    if (!albumId) return json({ error: "albumId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://dayof.love";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: album, error: albumErr } = await admin
      .from("photo_albums")
      .select("id,wedding_site_id,is_active")
      .eq("id", albumId)
      .maybeSingle();

    if (albumErr || !album) return json({ error: albumErr?.message ?? "Album not found" }, 404);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id,user_id")
      .eq("id", album.wedding_site_id as string)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    if (action === "set_active") {
      if (isActive === null) return json({ error: "isActive is required for set_active" }, 400);
      const { error } = await admin
        .from("photo_albums")
        .update({ is_active: isActive })
        .eq("id", albumId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, albumId, isActive });
    }

    if (action === "regenerate_link") {
      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const { error } = await admin
        .from("photo_albums")
        .update({ upload_token_hash: tokenHash, is_active: true })
        .eq("id", albumId);

      if (error) return json({ error: error.message }, 400);

      const uploadUrl = `${appUrl.replace(/\/$/, "")}/photos/upload?t=${encodeURIComponent(token)}`;
      return json({ success: true, albumId, uploadUrl, uploadToken: token });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
