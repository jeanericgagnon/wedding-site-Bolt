import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, fail, json, sha256Hex } from "../_shared/photoUtils.ts";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "album";

function randomToken(length = 48) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

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
  if (!createRes.ok || !createJson.id) throw new Error("Failed to create Google Drive folder.");
  return createJson.id as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("UNAUTHORIZED", "Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const itineraryEventId = typeof body.itineraryEventId === "string" ? body.itineraryEventId : null;
    const opensAt = typeof body.opensAt === "string" ? body.opensAt : null;
    const closesAt = typeof body.closesAt === "string" ? body.closesAt : null;

    if (!siteId || !name) return fail("VALIDATION_ERROR", "siteId and name are required.", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://dayof.love";

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, serviceRole);

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(jwt);

    if (userErr || !user) return fail("UNAUTHORIZED", userErr?.message ?? "Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id, user_id, site_slug, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at, vault_google_drive_root_folder_id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site || site.user_id !== user.id) return fail("FORBIDDEN", "Forbidden", 403);
    if (!site.vault_google_drive_connected) return fail("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 400);

    let accessToken = site.vault_google_drive_access_token as string | null;
    const refreshToken = site.vault_google_drive_refresh_token as string | null;
    const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
      if (!refreshToken) return fail("DRIVE_RECONNECT_REQUIRED", "Google Drive connection needs reconnect.", 400);
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      await admin
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
      rootFolderId = await ensureFolder(accessToken!, `DayOf Photos - ${siteSlug}`);
      await admin.from("wedding_sites").update({ vault_google_drive_root_folder_id: rootFolderId }).eq("id", siteId);
    }

    const albumSlugBase = slugify(name);
    const albumSlug = `${albumSlugBase}-${Date.now().toString(36).slice(-4)}`;
    const folderId = await ensureFolder(accessToken!, name, rootFolderId);
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    const token = randomToken();
    const tokenHash = await sha256Hex(token);

    const { data: created, error } = await admin
      .from("photo_albums")
      .insert({
        wedding_site_id: siteId,
        itinerary_event_id: itineraryEventId,
        name,
        slug: albumSlug,
        drive_folder_id: folderId,
        drive_folder_url: folderUrl,
        upload_token_hash: tokenHash,
        is_active: true,
        opens_at: opensAt,
        closes_at: closesAt,
        created_by: user.id,
      })
      .select("id,name,slug,drive_folder_id,drive_folder_url")
      .single();

    if (error) return fail("DB_ERROR", error.message, 400);

    const uploadUrl = `${appUrl.replace(/\/$/, "")}/photos/upload?t=${encodeURIComponent(token)}`;

    return json({
      album: created,
      uploadUrl,
      uploadToken: token,
    });
  } catch (err) {
    return fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500);
  }
});
