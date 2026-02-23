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
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error("Could not refresh Google access token.");
  }

  return {
    accessToken: tokenJson.access_token as string,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null,
  };
}

async function ensureFolder(accessToken: string, name: string, parentId?: string | null) {
  const qParts = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (parentId) qParts.push(`'${parentId}' in parents`);

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qParts.join(" and "))}&fields=files(id,name)&pageSize=1`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchJson = await searchRes.json();
  if (searchRes.ok && Array.isArray(searchJson.files) && searchJson.files.length > 0) {
    return searchJson.files[0].id as string;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });

  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.id) {
    throw new Error("Failed to create Google Drive folder.");
  }
  return createJson.id as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    const vaultYear = typeof body.vaultYear === "number" ? body.vaultYear : null;
    const fileName = typeof body.fileName === "string" ? body.fileName : null;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream";
    const base64 = typeof body.base64 === "string" ? body.base64 : null;

    if (!siteId || !vaultYear || !fileName || !base64) {
      return json({ error: "siteId, vaultYear, fileName, and base64 are required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole);

    // public-safe gate: site must be published and have an enabled vault for this year
    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id, is_published, site_slug, vault_storage_provider, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at, vault_google_drive_root_folder_id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site || !site.is_published) return json({ error: "Site not available for public contributions." }, 403);
    if (site.vault_storage_provider !== "google_drive") return json({ error: "Vault is not configured for Google Drive uploads." }, 400);
    if (!site.vault_google_drive_connected) return json({ error: "Google Drive is not connected for this site." }, 400);

    const { data: config } = await adminClient
      .from("vault_configs")
      .select("id, is_enabled")
      .eq("wedding_site_id", siteId)
      .eq("duration_years", vaultYear)
      .maybeSingle();

    if (!config || !config.is_enabled) {
      return json({ error: "Target vault is not enabled for contributions." }, 400);
    }

    let accessToken = site.vault_google_drive_access_token as string | null;
    const refreshToken = site.vault_google_drive_refresh_token as string | null;
    const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
      if (!refreshToken) return json({ error: "Google Drive connection needs reconnect." }, 400);
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      await adminClient
        .from("wedding_sites")
        .update({
          vault_google_drive_access_token: refreshed.accessToken,
          vault_google_drive_token_expires_at: refreshed.expiresAt,
        })
        .eq("id", siteId);
    }

    const siteSlug = (site.site_slug as string | null) ?? `site-${siteId.slice(0, 8)}`;
    let rootFolderId = site.vault_google_drive_root_folder_id as string | null;

    if (!rootFolderId) {
      rootFolderId = await ensureFolder(accessToken, `DayOf Vault - ${siteSlug}`);
      await adminClient
        .from("wedding_sites")
        .update({ vault_google_drive_root_folder_id: rootFolderId })
        .eq("id", siteId);
    }

    const yearFolderId = await ensureFolder(accessToken, `${vaultYear}-year`, rootFolderId);

    const metadata = {
      name: fileName,
      parents: [yearFolderId],
    };

    const boundary = "vault_upload_boundary";
    const blobHeader =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64}\r\n--${boundary}--`;

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: blobHeader,
    });

    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson.id) {
      return json({ error: "Google Drive upload failed", details: uploadJson }, 400);
    }

    return json({
      fileId: uploadJson.id,
      webViewLink: uploadJson.webViewLink ?? null,
      webContentLink: uploadJson.webContentLink ?? null,
      folderId: yearFolderId,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
