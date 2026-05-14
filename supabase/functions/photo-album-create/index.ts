import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, fail, json, sha256Hex } from "../_shared/photoUtils.ts";
import { canMutatePhotos } from "../_shared/collaboratorPermissions.ts";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "album";

function safePhotoAlbumCreateError(code: "CONFIG" | "AUTH" | "PARENT" | "SAVE" | "INTERNAL"): string {
  if (code === "CONFIG") return "Photo albums are not ready yet. Please try again in a few minutes.";
  if (code === "AUTH") return "Please sign in to manage photo albums.";
  if (code === "PARENT") return "Could not load the parent album. Please try again.";
  if (code === "SAVE") return "Could not create this photo album. Please try again.";
  return "Could not create this photo album. Please try again.";
}

const PHOTO_ALBUM_CREATE_SITE_REQUIRED_COPY = "Choose a site before creating a photo album.";
const PHOTO_ALBUM_CREATE_NAME_REQUIRED_COPY = "Add a photo album name before saving.";
const PHOTO_ALBUM_CREATE_SITE_UNAVAILABLE_COPY = "This site is not available for photo albums.";
const PHOTO_ALBUM_CREATE_ACCESS_UNAVAILABLE_COPY = "You do not have access to manage photo albums for this site.";

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

function isGoogleDriveRefreshFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("refresh google access token");
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

async function tryEnsureDriveFolder(options: {
  admin: ReturnType<typeof createClient>;
  site: Record<string, unknown>;
  siteId: string;
  siteSlug: string;
  albumName: string;
}) {
  const { admin, site, siteId, siteSlug, albumName } = options;
  if (!site.vault_google_drive_connected) return { folderId: null, folderUrl: null, backupStatus: "not_connected" };

  let accessToken = site.vault_google_drive_access_token as string | null;
  const refreshToken = site.vault_google_drive_refresh_token as string | null;
  const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

  if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
    if (!refreshToken) return { folderId: null, folderUrl: null, backupStatus: "reconnect_required" };
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      await admin
        .from("wedding_sites")
        .update({
          vault_google_drive_access_token: refreshed.accessToken,
          vault_google_drive_token_expires_at: refreshed.expiresAt,
        })
        .eq("id", siteId);
    } catch (error) {
      if (isGoogleDriveRefreshFailure(error)) {
        return { folderId: null, folderUrl: null, backupStatus: "reconnect_required" };
      }
      return { folderId: null, folderUrl: null, backupStatus: "failed" };
    }
  }

  try {
    let rootFolderId = site.vault_google_drive_root_folder_id as string | null;
    if (!rootFolderId) {
      rootFolderId = await ensureFolder(accessToken!, `DayOf Photos - ${siteSlug}`);
      await admin.from("wedding_sites").update({ vault_google_drive_root_folder_id: rootFolderId }).eq("id", siteId);
    }
    const folderId = await ensureFolder(accessToken!, albumName, rootFolderId);
    return {
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      backupStatus: "connected",
    };
  } catch {
    return { folderId: null, folderUrl: null, backupStatus: "failed" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Method not allowed.", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("UNAUTHORIZED", safePhotoAlbumCreateError("AUTH"), 401);

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const itineraryEventId = typeof body.itineraryEventId === "string" ? body.itineraryEventId : null;
    const parentAlbumId = typeof body.parentAlbumId === "string" && body.parentAlbumId.trim() ? body.parentAlbumId.trim() : null;
    const opensAt = typeof body.opensAt === "string" ? body.opensAt : null;
    const closesAt = typeof body.closesAt === "string" ? body.closesAt : null;

    if (!siteId) return fail("VALIDATION_ERROR", PHOTO_ALBUM_CREATE_SITE_REQUIRED_COPY, 400);
    if (!name) return fail("VALIDATION_ERROR", PHOTO_ALBUM_CREATE_NAME_REQUIRED_COPY, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://dayof.love";

    if (!anonKey) return fail("SERVER_CONFIG_ERROR", safePhotoAlbumCreateError("CONFIG"), 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return fail("UNAUTHORIZED", safePhotoAlbumCreateError("AUTH"), 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id, user_id, site_slug, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at, vault_google_drive_root_folder_id")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) return fail("FORBIDDEN", PHOTO_ALBUM_CREATE_SITE_UNAVAILABLE_COPY, 403);
    let allowed = site.user_id === user.id;
    if (!allowed) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("wedding_site_collaborators")
        .select("role,permissions")
        .eq("wedding_site_id", siteId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) {
        console.error("PHOTO_ALBUM_CREATE_COLLABORATOR_FAILED", { reason: "COLLABORATOR_LOAD_FAILED" });
        return fail("PERMISSION_ERROR", safePhotoAlbumCreateError("AUTH"), 400);
      }
      allowed = canMutatePhotos(collaborator?.role, collaborator?.permissions);
    }
    if (!allowed) return fail("FORBIDDEN", PHOTO_ALBUM_CREATE_ACCESS_UNAVAILABLE_COPY, 403);

    let parentAlbum: Record<string, unknown> | null = null;
    if (parentAlbumId) {
      const { data: parent, error: parentError } = await admin
        .from("photo_albums")
        .select("id,wedding_site_id,name")
        .eq("id", parentAlbumId)
        .maybeSingle();
      if (parentError) {
        console.error("PHOTO_ALBUM_CREATE_PARENT_FAILED", { reason: "PARENT_ALBUM_LOAD_FAILED" });
        return fail("PARENT_BUCKET_ERROR", safePhotoAlbumCreateError("PARENT"), 400);
      }
      if (!parent || parent.wedding_site_id !== siteId) {
        return fail("PARENT_BUCKET_INVALID", "Parent bucket must belong to this wedding site.", 400);
      }
      parentAlbum = parent;
    }

    const siteSlug = (site.site_slug as string | null) ?? `site-${siteId.slice(0, 8)}`;
    const albumSlugBase = slugify(name);
    const albumSlug = `${albumSlugBase}-${Date.now().toString(36).slice(-4)}`;
    const hierarchyLabel = parentAlbum ? `${String(parentAlbum.name)} / ${name}` : name;
    const driveBackup = await tryEnsureDriveFolder({ admin, site, siteId, siteSlug, albumName: hierarchyLabel });
    const hostedFolderKey = `hosted/${siteId}/${albumSlug}`;

    const token = randomToken();
    const tokenHash = await sha256Hex(token);

    const { data: created, error } = await admin
      .from("photo_albums")
      .insert({
        wedding_site_id: siteId,
        parent_album_id: parentAlbumId,
        hierarchy_label: hierarchyLabel,
        itinerary_event_id: itineraryEventId,
        name,
        slug: albumSlug,
        drive_folder_id: driveBackup.folderId ?? hostedFolderKey,
        drive_folder_url: driveBackup.folderUrl,
        upload_token_hash: tokenHash,
        is_active: true,
        opens_at: opensAt,
        closes_at: closesAt,
        created_by: user.id,
      })
      .select("id,name,slug,parent_album_id,hierarchy_label,drive_folder_id,drive_folder_url")
      .single();

    if (error) {
      console.error("PHOTO_ALBUM_CREATE_SAVE_FAILED", { reason: "ALBUM_CREATE_SAVE_FAILED" });
      return fail("DB_ERROR", safePhotoAlbumCreateError("SAVE"), 400);
    }

    const uploadUrl = `${appUrl.replace(/\/$/, "")}/photos/upload?t=${encodeURIComponent(token)}`;

    return json({
      album: created,
      uploadUrl,
      uploadToken: token,
      storageProvider: "dayof_hosted",
      driveBackupStatus: driveBackup.backupStatus,
    });
  } catch (err) {
    console.error("PHOTO_ALBUM_CREATE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_PHOTO_ALBUM_CREATE_FAILURE" });
    return fail("INTERNAL_ERROR", safePhotoAlbumCreateError("INTERNAL"), 500);
  }
});
