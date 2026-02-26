import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, fail, json, sha256Hex, sleep } from "../_shared/photoUtils.ts";

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;
const MAX_TOTAL_BYTES_PER_REQUEST = 120 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const DISALLOWED_MIME_TYPES = new Set([
  'image/svg+xml',
]);

const HONEYPOT_FIELD = 'website';
const MAX_ATTEMPTS_PER_10_MIN = 30;
const MAX_ATTEMPTS_PER_10_MIN_PER_IP = 60;


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

async function uploadFileToDrive(accessToken: string, folderId: string, file: File) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const boundary = `photo_upload_${crypto.randomUUID()}`;
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `--${boundary}--`;

  const metadataPart =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    "\r\n";

  const fileHeader =
    delimiter +
    `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const body = new Uint8Array(
    encoder.encode(metadataPart).length +
      encoder.encode(fileHeader).length +
      fileBytes.length +
      encoder.encode("\r\n" + closeDelimiter).length,
  );

  let offset = 0;
  for (const part of [encoder.encode(metadataPart), encoder.encode(fileHeader), fileBytes, encoder.encode("\r\n" + closeDelimiter)]) {
    body.set(part, offset);
    offset += part.length;
  }

  let attempt = 0;
  while (attempt < 3) {
    attempt += 1;

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    const uploadJson = await uploadRes.json().catch(() => ({}));
    if (uploadRes.ok && uploadJson.id) {
      return {
        id: uploadJson.id as string,
        webViewLink: (uploadJson.webViewLink as string | undefined) ?? null,
      };
    }

    const retryable = uploadRes.status === 429 || uploadRes.status >= 500;
    if (!retryable || attempt >= 3) {
      throw new Error(`Google Drive upload failed for ${file.name}`);
    }

    await sleep(250 * attempt);
  }

  throw new Error(`Google Drive upload failed for ${file.name}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const requesterIp = forwardedFor.split(",")[0]?.trim() || null;

    const form = await req.formData();
    const token = String(form.get("token") ?? "").trim();
    const guestName = String(form.get("guestName") ?? "").trim() || null;
    const guestEmailRaw = String(form.get("guestEmail") ?? "").trim();
    const guestEmail = guestEmailRaw ? guestEmailRaw.toLowerCase() : null;
    const note = String(form.get("note") ?? "").trim() || null;
    const honeypot = String(form.get(HONEYPOT_FIELD) ?? '').trim();
    const files = form.getAll("files").filter((v): v is File => v instanceof File);

    if (!token) return fail("TOKEN_REQUIRED", "token is required", 400);
    if (honeypot) return fail("BOT_DETECTED", "Request rejected", 400);
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return fail("INVALID_EMAIL", "Invalid email address.", 400);
    }
    if (files.length === 0) return fail("FILES_REQUIRED", "At least one file is required", 400);
    if (files.length > MAX_FILES_PER_REQUEST) return fail("TOO_MANY_FILES", `Too many files (max ${MAX_FILES_PER_REQUEST})`, 400);

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES_PER_REQUEST) {
      return fail("TOTAL_TOO_LARGE", `Total upload too large (max ${Math.floor(MAX_TOTAL_BYTES_PER_REQUEST / (1024 * 1024))}MB per request)`, 400);
    }

    for (const file of files) {
      const mime = file.type || 'application/octet-stream';
      const allowedByPrefix = ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
      if (!allowedByPrefix || DISALLOWED_MIME_TYPES.has(mime)) {
        return fail("UNSUPPORTED_FILE_TYPE", `Unsupported file type: ${mime}`, 400);
      }
      if (file.size > MAX_FILE_BYTES) {
        return fail("FILE_TOO_LARGE", `File too large: ${file.name} (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB each)`, 400);
      }
    }

    const tokenHash = await sha256Hex(token);

    const { data: album } = await admin
      .from("photo_albums")
      .select("id,wedding_site_id,name,drive_folder_id,is_active,opens_at,closes_at")
      .eq("upload_token_hash", tokenHash)
      .maybeSingle();

    if (!album) return fail("INVALID_TOKEN", "Invalid upload link.", 404);
    if (!album.is_active) return fail("ALBUM_INACTIVE", "Uploads are disabled for this album.", 403);

    const tenMinutesAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: albumAttemptCount } = await admin
      .from("photo_upload_attempts")
      .select("id", { count: "exact", head: true })
      .eq("photo_album_id", album.id)
      .gte("attempted_at", tenMinutesAgoIso);

    if ((albumAttemptCount ?? 0) > MAX_ATTEMPTS_PER_10_MIN) {
      return fail("RATE_LIMITED", "Too many upload attempts. Please try again shortly.", 429);
    }

    if (requesterIp) {
      const { count: ipAttemptCount } = await admin
        .from("photo_upload_attempts")
        .select("id", { count: "exact", head: true })
        .eq("requester_ip", requesterIp)
        .gte("attempted_at", tenMinutesAgoIso);

      if ((ipAttemptCount ?? 0) > MAX_ATTEMPTS_PER_10_MIN_PER_IP) {
        return fail("RATE_LIMITED", "Too many upload attempts from this network. Please try again shortly.", 429);
      }
    }

    await admin.from("photo_upload_attempts").insert({
      photo_album_id: album.id,
      token_hash: tokenHash,
      requester_ip: requesterIp,
      file_count: files.length,
      total_bytes: totalBytes,
    });

    const now = Date.now();
    if (album.opens_at && new Date(album.opens_at as string).getTime() > now) {
      return fail("ALBUM_NOT_OPEN", "This album is not open yet.", 403);
    }
    if (album.closes_at && new Date(album.closes_at as string).getTime() < now) {
      return fail("ALBUM_CLOSED", "This album is closed.", 403);
    }

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id, is_published, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at")
      .eq("id", album.wedding_site_id as string)
      .maybeSingle();

    if (!site || !site.is_published) return fail("SITE_UNAVAILABLE", "Site not available for uploads.", 403);
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
        .eq("id", album.wedding_site_id as string);
    }

    const uploaded: Array<{ id: string; name: string; webViewLink: string | null }> = [];
    const failed: Array<{ name: string; code: string; error: string }> = [];

    for (const file of files) {
      try {
        const drive = await uploadFileToDrive(accessToken!, album.drive_folder_id as string, file);

        const { data: row, error } = await admin
          .from("photo_uploads")
          .insert({
            photo_album_id: album.id,
            wedding_site_id: album.wedding_site_id,
            guest_name: guestName,
            guest_email: guestEmail,
            note,
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            drive_file_id: drive.id,
            drive_web_view_link: drive.webViewLink,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);

        uploaded.push({ id: row.id as string, name: file.name, webViewLink: drive.webViewLink });
      } catch (error) {
        failed.push({
          name: file.name,
          code: "UPLOAD_FAILED",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    if (uploaded.length === 0) {
      return fail("UPLOAD_BATCH_FAILED", "All files failed to upload. Please retry.", 502);
    }

    return json({
      success: true,
      albumId: album.id,
      albumName: album.name,
      uploaded,
      failed,
      partial: failed.length > 0,
    });
  } catch (err) {
    return fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500);
  }
});
