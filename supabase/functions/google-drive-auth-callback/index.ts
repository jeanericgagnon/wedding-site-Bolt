import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/signedSession.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type GoogleDriveOAuthState = {
  scope: "google_drive_oauth";
  siteId: string;
  userId: string;
  ts: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let code: string | null = null;
    let stateRaw: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      code = url.searchParams.get("code");
      stateRaw = url.searchParams.get("state");

      const oauthErr = url.searchParams.get("error");
      if (oauthErr) {
        console.error("GOOGLE_DRIVE_AUTH_PROVIDER_DECLINED", { reason: "oauth_error" });
        return json({ error: "Could not connect Google Drive. Please try again." }, 400);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      code = typeof body.code === "string" ? body.code : null;
      stateRaw = typeof body.state === "string" ? body.state : null;
    }

    if (!code || !stateRaw) return json({ error: "code and state are required" }, 400);

    const state = await verifySessionToken<GoogleDriveOAuthState>(
      stateRaw,
      Deno.env.get("GOOGLE_DRIVE_STATE_SECRET") || serviceRole,
    );
    if (
      !state ||
      state.scope !== "google_drive_oauth" ||
      !state.siteId ||
      !state.userId ||
      typeof state.ts !== "number"
    ) {
      return json({ error: "Invalid state" }, 400);
    }

    // 15 minute max state age
    if (Date.now() - state.ts > 15 * 60 * 1000) {
      return json({ error: "OAuth session expired. Please reconnect Google Drive." }, 400);
    }

    const googleClientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_DRIVE_REDIRECT_URI");
    if (!googleClientId || !googleClientSecret || !redirectUri) {
      return json({ error: "Google Drive connection is not ready yet." }, 500);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED", { status: tokenRes.status });
      return json({ error: "Could not connect Google Drive. Please try again." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRole);

    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, user_id, vault_google_drive_refresh_token")
      .eq("id", state.siteId)
      .eq("user_id", state.userId)
      .maybeSingle();

    if (!site) return json({ error: "Site not found or unauthorized" }, 403);

    const expiresAt = tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null;

    const nextRefreshToken = tokenJson.refresh_token ?? site.vault_google_drive_refresh_token ?? null;

    const { error } = await adminClient
      .from("wedding_sites")
      .update({
        vault_storage_provider: "google_drive",
        vault_google_drive_connected: true,
        vault_google_drive_access_token: tokenJson.access_token,
        vault_google_drive_refresh_token: nextRefreshToken,
        vault_google_drive_token_expires_at: expiresAt,
      })
      .eq("id", state.siteId)
      .eq("user_id", state.userId);

    if (error) throw error;

    return json({ success: true, connected: true });
  } catch (err) {
    console.error("GOOGLE_DRIVE_AUTH_CALLBACK_UNEXPECTED_FAILED", { reason: "UNEXPECTED_GOOGLE_DRIVE_CALLBACK_FAILURE" });
    return json({ error: "Could not connect Google Drive. Please try again." }, 500);
  }
});
