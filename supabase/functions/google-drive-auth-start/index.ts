import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { signSessionToken } from "../_shared/signedSession.ts";

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

const STORAGE_CONNECTION_SITE_REQUIRED_COPY = "Choose a site before connecting storage.";
const STORAGE_CONNECTION_SIGNIN_REQUIRED_COPY = "Please sign in to connect storage.";
const STORAGE_CONNECTION_ACCESS_UNAVAILABLE_COPY = "This storage connection is not available.";
const STORAGE_CONNECTION_NOT_READY_COPY = "This storage connection is not ready yet.";
const STORAGE_CONNECTION_START_FAILED_COPY = "Could not start this storage connection. Please try again.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: STORAGE_CONNECTION_SIGNIN_REQUIRED_COPY }, 401);

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    if (!siteId) return json({ error: STORAGE_CONNECTION_SITE_REQUIRED_COPY }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_DRIVE_REDIRECT_URI");

    if (!googleClientId || !redirectUri) {
      return json({ error: STORAGE_CONNECTION_NOT_READY_COPY }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: STORAGE_CONNECTION_SIGNIN_REQUIRED_COPY }, 401);

    const adminClient = createClient(supabaseUrl, serviceRole);
    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, user_id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return json({ error: STORAGE_CONNECTION_ACCESS_UNAVAILABLE_COPY }, 403);

    const state = await signSessionToken({
      scope: "google_drive_oauth",
      siteId,
      userId: user.id,
      ts: Date.now(),
    }, Deno.env.get("GOOGLE_DRIVE_STATE_SECRET") || serviceRole);
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&scope=${scope}&state=${encodeURIComponent(state)}`;

    return json({ authUrl });
  } catch (err) {
    console.error("GOOGLE_DRIVE_AUTH_START_UNEXPECTED_FAILED", { reason: "UNEXPECTED_GOOGLE_DRIVE_AUTH_START_FAILURE" });
    return json({ error: STORAGE_CONNECTION_START_FAILED_COPY }, 500);
  }
});
