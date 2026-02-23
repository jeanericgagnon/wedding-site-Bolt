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
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    if (!siteId) return json({ error: "siteId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_DRIVE_REDIRECT_URI");

    if (!googleClientId || !redirectUri) {
      return json({ error: "Google Drive OAuth is not configured on server env." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRole);
    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, user_id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const state = btoa(JSON.stringify({ siteId, userId: user.id, ts: Date.now() }));
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&scope=${scope}&state=${encodeURIComponent(state)}`;

    return json({ authUrl });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
