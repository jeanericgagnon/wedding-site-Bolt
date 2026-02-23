import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : null;
    const stateRaw = typeof body.state === "string" ? body.state : null;
    if (!code || !stateRaw) return json({ error: "code and state are required" }, 400);

    const state = JSON.parse(atob(stateRaw)) as { siteId: string; userId: string; ts: number };
    if (!state?.siteId || !state?.userId) return json({ error: "Invalid state" }, 400);

    const googleClientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_DRIVE_REDIRECT_URI");
    if (!googleClientId || !googleClientSecret || !redirectUri) {
      return json({ error: "Google Drive OAuth is not configured on server env." }, 500);
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
      return json({ error: "Failed to exchange code for Google token", details: tokenJson }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole);

    const expiresAt = tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null;

    const { error } = await adminClient
      .from("wedding_sites")
      .update({
        vault_storage_provider: "google_drive",
        vault_google_drive_connected: true,
        vault_google_drive_access_token: tokenJson.access_token,
        vault_google_drive_refresh_token: tokenJson.refresh_token ?? null,
        vault_google_drive_token_expires_at: expiresAt,
      })
      .eq("id", state.siteId)
      .eq("user_id", state.userId);

    if (error) throw error;

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
