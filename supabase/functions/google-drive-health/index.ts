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

const DRIVE_CONFIG_MISSING_ERROR = "DRIVE_HEALTH_CONFIG_MISSING";
const DRIVE_TOKEN_REFRESH_ERROR = "DRIVE_HEALTH_TOKEN_REFRESH_FAILED";
const STORAGE_CONNECTION_SITE_REQUIRED_COPY = "Choose a site before checking storage.";
const STORAGE_CONNECTION_SIGNIN_REQUIRED_COPY = "Please sign in to check storage.";
const STORAGE_CONNECTION_ACCESS_UNAVAILABLE_COPY = "This storage connection is not available.";
const STORAGE_CONNECTION_NOT_CONNECTED_COPY = "Storage is not connected yet.";
const STORAGE_CONNECTION_RECONNECT_COPY = "Storage needs attention. Please reconnect and try again.";
const STORAGE_CONNECTION_REFRESHED_COPY = "Storage connection refreshed and healthy.";
const STORAGE_CONNECTION_HEALTHY_COPY = "Storage connection healthy.";
const STORAGE_CONNECTION_RECOVERY_COPY = "Storage needs attention. Uploads are still available here.";

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error(DRIVE_CONFIG_MISSING_ERROR);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(DRIVE_TOKEN_REFRESH_ERROR);
  }

  return {
    accessToken: tokenJson.access_token as string,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null,
  };
}

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: STORAGE_CONNECTION_SIGNIN_REQUIRED_COPY }, 401);

    const adminClient = createClient(supabaseUrl, serviceRole);
    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, user_id, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at")
      .eq("id", siteId)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return json({ error: STORAGE_CONNECTION_ACCESS_UNAVAILABLE_COPY }, 403);

    const connected = !!site.vault_google_drive_connected;
    if (!connected) {
      return json({ connected: false, healthy: false, needsReconnect: true, message: STORAGE_CONNECTION_NOT_CONNECTED_COPY });
    }

    let accessToken = site.vault_google_drive_access_token as string | null;
    const refreshToken = site.vault_google_drive_refresh_token as string | null;
    const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

    let refreshed = false;
    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
      if (!refreshToken) {
        return json({ connected: true, healthy: false, needsReconnect: true, message: STORAGE_CONNECTION_RECONNECT_COPY });
      }
      const next = await refreshAccessToken(refreshToken);
      accessToken = next.accessToken;
      refreshed = true;
      await adminClient
        .from("wedding_sites")
        .update({
          vault_google_drive_access_token: next.accessToken,
          vault_google_drive_token_expires_at: next.expiresAt,
        })
        .eq("id", siteId);
    }

    const aboutRes = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!aboutRes.ok) {
      return json({ connected: true, healthy: false, needsReconnect: true, message: STORAGE_CONNECTION_RECONNECT_COPY });
    }

    return json({
      connected: true,
      healthy: true,
      needsReconnect: false,
      refreshed,
      message: refreshed ? STORAGE_CONNECTION_REFRESHED_COPY : STORAGE_CONNECTION_HEALTHY_COPY,
    });
  } catch (err) {
    console.error("GOOGLE_DRIVE_HEALTH_CHECK_FAILED", { reason: "DRIVE_HEALTH_CHECK_FAILED" });
    return json({
      connected: true,
      healthy: false,
      needsReconnect: true,
      message: STORAGE_CONNECTION_RECOVERY_COPY,
    });
  }
});
