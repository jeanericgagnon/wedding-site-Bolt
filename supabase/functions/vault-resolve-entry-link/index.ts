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

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google Drive OAuth env is missing.");

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
  if (!tokenRes.ok || !tokenJson.access_token) throw new Error("Could not refresh Google access token.");

  return {
    accessToken: tokenJson.access_token as string,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const entryId = typeof body.entryId === "string" ? body.entryId : null;
    if (!entryId) return json({ error: "entryId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRole);

    const { data: entry } = await adminClient
      .from("vault_entries")
      .select("id, wedding_site_id, storage_provider, external_file_id, external_file_url, attachment_url, unlock_at, vault_year")
      .eq("id", entryId)
      .maybeSingle();

    if (!entry) return json({ error: "Entry not found" }, 404);

    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, user_id, wedding_date, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at")
      .eq("id", entry.wedding_site_id)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // enforce lock check server-side
    let unlockAt: Date | null = null;
    if (entry.unlock_at) {
      unlockAt = new Date(entry.unlock_at);
    } else if (site.wedding_date) {
      const d = new Date(site.wedding_date);
      d.setFullYear(d.getFullYear() + Number(entry.vault_year || 0));
      unlockAt = d;
    }

    if (!unlockAt || unlockAt.getTime() > Date.now()) {
      return json({ error: "Entry is still locked." }, 423);
    }

    if (entry.storage_provider !== "google_drive") {
      const rawUrl = (entry.attachment_url as string | null) ?? null;
      if (!rawUrl) return json({ url: null });

      let path: string | null = null;
      const marker = '/storage/v1/object/public/vault-attachments/';
      const idx = rawUrl.indexOf(marker);
      if (idx >= 0) {
        path = decodeURIComponent(rawUrl.slice(idx + marker.length));
      } else if (rawUrl.startsWith('public/')) {
        path = rawUrl;
      }

      if (!path) return json({ url: rawUrl });

      const { data: signed, error: signedErr } = await adminClient.storage
        .from('vault-attachments')
        .createSignedUrl(path, 60 * 5);
      if (signedErr) return json({ error: signedErr.message }, 400);
      return json({ url: signed?.signedUrl ?? null });
    }

    if (!entry.external_file_id) {
      return json({ url: entry.external_file_url ?? entry.attachment_url ?? null });
    }

    let accessToken = site.vault_google_drive_access_token as string | null;
    const refreshToken = site.vault_google_drive_refresh_token as string | null;
    const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
      if (!refreshToken) return json({ error: "Google Drive token unavailable" }, 400);
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      await adminClient.from("wedding_sites").update({
        vault_google_drive_access_token: refreshed.accessToken,
        vault_google_drive_token_expires_at: refreshed.expiresAt,
      }).eq("id", site.id);
    }

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${entry.external_file_id}?fields=id,webViewLink,webContentLink`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const fileJson = await fileRes.json();
    if (!fileRes.ok) return json({ error: "Failed to resolve Google Drive link", details: fileJson }, 400);

    const url = fileJson.webViewLink ?? fileJson.webContentLink ?? null;
    if (url) {
      await adminClient.from("vault_entries").update({ external_file_url: url }).eq("id", entry.id);
    }

    return json({ url });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
