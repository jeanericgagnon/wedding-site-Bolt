import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";
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
const HOSTED_BUCKET = "photo-uploads";
const PHOTO_UPLOAD_LINK_UNAVAILABLE_COPY = "This photo upload link is not available.";

const safePathSegment = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "upload";

type ExtractedPhotoMetadata = {
  fileSha256: string;
  perceptualHash: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  takenAt: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAltitude: number | null;
  hasExif: boolean;
  hasGps: boolean;
  rawExif: Record<string, unknown>;
};

type ItineraryEventForMatch = {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

const readAscii = (bytes: Uint8Array, start: number, length: number) =>
  new TextDecoder("ascii").decode(bytes.slice(start, start + length)).replace(/\0+$/g, "").trim();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256Bytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function parseExifDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

function readRational(view: DataView, offset: number, little: boolean) {
  const numerator = view.getUint32(offset, little);
  const denominator = view.getUint32(offset + 4, little);
  return denominator === 0 ? 0 : numerator / denominator;
}

function readExifValue(bytes: Uint8Array, view: DataView, tiffStart: number, entryOffset: number, little: boolean) {
  const type = view.getUint16(entryOffset + 2, little);
  const count = view.getUint32(entryOffset + 4, little);
  const valueOffset = entryOffset + 8;
  const inlineOrOffset = view.getUint32(valueOffset, little);
  const unitSize = type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 || type === 10 ? 8 : 1;
  const totalSize = count * unitSize;
  const dataOffset = totalSize <= 4 ? valueOffset : tiffStart + inlineOrOffset;

  if (dataOffset < 0 || dataOffset >= bytes.length) return null;

  if (type === 2) return readAscii(bytes, dataOffset, count);
  if (type === 3) return count === 1 ? view.getUint16(dataOffset, little) : null;
  if (type === 4) return count === 1 ? view.getUint32(dataOffset, little) : null;
  if (type === 5) return count === 1 ? readRational(view, dataOffset, little) : Array.from({ length: count }, (_, i) => readRational(view, dataOffset + i * 8, little));
  return null;
}

function readIfd(bytes: Uint8Array, view: DataView, tiffStart: number, ifdOffset: number, little: boolean) {
  const entries = new Map<number, unknown>();
  const start = tiffStart + ifdOffset;
  if (start < 0 || start + 2 > bytes.length) return entries;
  const count = view.getUint16(start, little);
  for (let i = 0; i < count; i += 1) {
    const entryOffset = start + 2 + i * 12;
    if (entryOffset + 12 > bytes.length) break;
    const tag = view.getUint16(entryOffset, little);
    entries.set(tag, readExifValue(bytes, view, tiffStart, entryOffset, little));
  }
  return entries;
}

function parseJpegDimensions(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { width: null, height: null };
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  return { width: null, height: null };
}

function parsePngDimensions(bytes: Uint8Array) {
  const isPng = bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) return { width: null, height: null };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function parseJpegExif(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 10 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker === 0xe1 && readAscii(bytes, offset + 4, 6) === "Exif") {
      const tiffStart = offset + 10;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const endian = readAscii(bytes, tiffStart, 2);
      const little = endian === "II";
      if (!little && endian !== "MM") return null;
      const firstIfdOffset = view.getUint32(tiffStart + 4, little);
      const ifd0 = readIfd(bytes, view, tiffStart, firstIfdOffset, little);
      const exifOffset = typeof ifd0.get(0x8769) === "number" ? ifd0.get(0x8769) as number : null;
      const gpsOffset = typeof ifd0.get(0x8825) === "number" ? ifd0.get(0x8825) as number : null;
      const exif = exifOffset ? readIfd(bytes, view, tiffStart, exifOffset, little) : new Map<number, unknown>();
      const gps = gpsOffset ? readIfd(bytes, view, tiffStart, gpsOffset, little) : new Map<number, unknown>();
      return { ifd0, exif, gps };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function gpsToDecimal(value: unknown, ref: unknown) {
  if (!Array.isArray(value) || value.length < 3) return null;
  const decimal = Number(value[0]) + Number(value[1]) / 60 + Number(value[2]) / 3600;
  if (!Number.isFinite(decimal)) return null;
  const direction = String(ref ?? "").toUpperCase();
  return direction === "S" || direction === "W" ? -decimal : decimal;
}

async function extractPhotoMetadata(file: File): Promise<ExtractedPhotoMetadata> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileSha256 = await sha256Bytes(bytes);
  const jpegDims = parseJpegDimensions(bytes);
  const pngDims = parsePngDimensions(bytes);
  const parsed = parseJpegExif(bytes);
  const ifd0 = parsed?.ifd0 ?? new Map<number, unknown>();
  const exif = parsed?.exif ?? new Map<number, unknown>();
  const gps = parsed?.gps ?? new Map<number, unknown>();
  const takenAt = parseExifDate(String(exif.get(0x9003) ?? exif.get(0x9004) ?? ifd0.get(0x0132) ?? ""));
  const gpsLat = gpsToDecimal(gps.get(0x0002), gps.get(0x0001));
  const gpsLng = gpsToDecimal(gps.get(0x0004), gps.get(0x0003));
  const width = jpegDims.width ?? pngDims.width;
  const height = jpegDims.height ?? pngDims.height;

  return {
    fileSha256,
    perceptualHash: width && height ? `${width}x${height}:${Math.round(file.size / 1024)}` : null,
    width,
    height,
    orientation: typeof ifd0.get(0x0112) === "number" ? ifd0.get(0x0112) as number : null,
    takenAt,
    cameraMake: typeof ifd0.get(0x010f) === "string" ? ifd0.get(0x010f) as string : null,
    cameraModel: typeof ifd0.get(0x0110) === "string" ? ifd0.get(0x0110) as string : null,
    gpsLat,
    gpsLng,
    gpsAltitude: typeof gps.get(0x0006) === "number" ? gps.get(0x0006) as number : null,
    hasExif: Boolean(parsed),
    hasGps: gpsLat !== null && gpsLng !== null,
    rawExif: {
      takenAt,
      cameraMake: typeof ifd0.get(0x010f) === "string" ? ifd0.get(0x010f) : null,
      cameraModel: typeof ifd0.get(0x0110) === "string" ? ifd0.get(0x0110) : null,
      orientation: typeof ifd0.get(0x0112) === "number" ? ifd0.get(0x0112) : null,
      width,
      height,
      hasGps: gpsLat !== null && gpsLng !== null,
    },
  };
}

function matchEventByTakenAt(takenAt: string | null, events: ItineraryEventForMatch[]) {
  if (!takenAt) return { eventMatchId: null, confidence: null, reason: null };
  const taken = new Date(takenAt);
  if (Number.isNaN(taken.getTime())) return { eventMatchId: null, confidence: null, reason: null };
  const dateKey = taken.toISOString().slice(0, 10);
  const sameDay = events.filter((event) => typeof event.event_date === "string" && event.event_date.slice(0, 10) === dateKey);
  if (sameDay.length === 0) return { eventMatchId: null, confidence: null, reason: null };
  const withWindows = sameDay.map((event) => {
    const start = event.start_time ? new Date(`${dateKey}T${event.start_time}`).getTime() : Number.NaN;
    const end = event.end_time ? new Date(`${dateKey}T${event.end_time}`).getTime() : Number.NaN;
    const inWindow = Number.isFinite(start) && Number.isFinite(end) && taken.getTime() >= start - 30 * 60_000 && taken.getTime() <= end + 30 * 60_000;
    return { event, inWindow };
  });
  const exact = withWindows.find((entry) => entry.inWindow);
  if (exact) return { eventMatchId: exact.event.id, confidence: 0.9, reason: `Capture time matches ${exact.event.event_name}.` };
  if (sameDay.length === 1) return { eventMatchId: sameDay[0].id, confidence: 0.55, reason: `Capture date matches ${sameDay[0].event_name}.` };
  return { eventMatchId: sameDay[0].id, confidence: 0.35, reason: "Capture date matches multiple events; picked earliest same-day event." };
}

function formString(form: FormData, key: string): string | null {
  const raw = form.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function persistUploadMetadata(
  admin: ReturnType<typeof createClient>,
  upload: { id: string; wedding_site_id: string; photo_album_id: string },
  metadata: ExtractedPhotoMetadata,
  events: ItineraryEventForMatch[],
) {
  const eventMatch = matchEventByTakenAt(metadata.takenAt, events);
  await admin
    .from("photo_upload_metadata")
    .upsert({
      upload_id: upload.id,
      wedding_site_id: upload.wedding_site_id,
      photo_album_id: upload.photo_album_id,
      file_sha256: metadata.fileSha256,
      perceptual_hash: metadata.perceptualHash,
      width: metadata.width,
      height: metadata.height,
      orientation: metadata.orientation,
      taken_at: metadata.takenAt,
      camera_make: metadata.cameraMake,
      camera_model: metadata.cameraModel,
      gps_lat: metadata.gpsLat,
      gps_lng: metadata.gpsLng,
      gps_altitude: metadata.gpsAltitude,
      location_precision: metadata.hasGps ? "exact_private" : null,
      location_label: metadata.hasGps ? "GPS captured privately" : null,
      event_match_id: eventMatch.eventMatchId,
      event_match_confidence: eventMatch.confidence,
      event_match_reason: eventMatch.reason,
      metadata_source: "upload",
      has_exif: metadata.hasExif,
      has_gps: metadata.hasGps,
      raw_exif: metadata.rawExif,
    }, { onConflict: "upload_id" });
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

async function uploadFileToHostedStorage(
  admin: ReturnType<typeof createClient>,
  album: { id: string; wedding_site_id: string },
  file: File,
) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  const baseName = safePathSegment(file.name.replace(/\.[^.]+$/, ""));
  const path = `${album.wedding_site_id}/${album.id}/${crypto.randomUUID()}-${baseName}${extension ? `.${safePathSegment(extension)}` : ""}`;
  const uploadOptions = {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  };
  let { error } = await admin.storage.from(HOSTED_BUCKET).upload(path, file, uploadOptions);
  if (error && /bucket/i.test(error.message)) {
    await admin.storage.createBucket(HOSTED_BUCKET, { public: false });
    const retry = await admin.storage.from(HOSTED_BUCKET).upload(path, file, uploadOptions);
    error = retry.error;
  }
  if (error) throw new Error("Hosted upload failed.");

  const { data: signed } = await admin.storage.from(HOSTED_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
  return {
    path,
    signedUrl: signed?.signedUrl ?? null,
  };
}

async function resolveDriveBackup(
  admin: ReturnType<typeof createClient>,
  site: Record<string, unknown>,
  siteId: string,
) {
  if (!site.vault_google_drive_connected) return { accessToken: null, status: "not_connected" };

  let accessToken = site.vault_google_drive_access_token as string | null;
  const refreshToken = site.vault_google_drive_refresh_token as string | null;
  const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

  if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
    if (!refreshToken) return { accessToken: null, status: "reconnect_required" };
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
        return { accessToken: null, status: "reconnect_required" };
      }
      return { accessToken: null, status: "failed" };
    }
  }

  return { accessToken, status: "connected" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "photo-upload", readiness: "ok" });
  }
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Method not allowed.", 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const requesterIp = forwardedFor.split(",")[0]?.trim() || null;

    const form = await req.formData();
    const token = String(form.get("token") ?? "").trim();
    const siteSlug = String(form.get("siteSlug") ?? "").trim().toLowerCase();
    const inviteToken = formString(form, "inviteToken");
    const passwordSession = formString(form, "passwordSession");
    const guestName = String(form.get("guestName") ?? "").trim() || null;
    const guestEmailRaw = String(form.get("guestEmail") ?? "").trim();
    const guestEmail = guestEmailRaw ? guestEmailRaw.toLowerCase() : null;
    const note = String(form.get("note") ?? "").trim() || null;
    const honeypot = String(form.get(HONEYPOT_FIELD) ?? '').trim();
    const files = form.getAll("files").filter((v): v is File => v instanceof File);

    if (!token && !siteSlug) return fail("TOKEN_REQUIRED", "Open this photo upload link again before sending photos.", 400);
    if (siteSlug && !/^[a-z0-9-]{2,80}$/.test(siteSlug)) {
      return fail("INVALID_SITE", PHOTO_UPLOAD_LINK_UNAVAILABLE_COPY, 400);
    }
    if (honeypot) return fail("BOT_DETECTED", "Request rejected", 400);
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return fail("INVALID_EMAIL", "Invalid email address.", 400);
    }
    if (files.length === 0) return fail("FILES_REQUIRED", "Choose at least one photo or video to upload.", 400);
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

    const tokenHash = token ? await sha256Hex(token) : null;

    let album: Record<string, unknown> | null = null;
    if (tokenHash) {
      const { data } = await admin
        .from("photo_albums")
        .select("id,wedding_site_id,name,drive_folder_id,is_active,opens_at,closes_at")
        .eq("upload_token_hash", tokenHash)
        .maybeSingle();
      album = data;
    } else {
      const { data: siteBySlug } = await admin
        .from("wedding_sites")
        .select("id,site_slug,is_published,privacy_mode,guest_access_token")
        .eq("site_slug", siteSlug)
        .maybeSingle();

      const hasAccess = siteBySlug
        ? await canReadPublicSubresource({
            isPublished: siteBySlug.is_published === true,
            privacyMode: siteBySlug.privacy_mode,
            siteSlug: siteBySlug.site_slug,
            inviteToken,
            passwordSession,
            storedInviteToken: typeof siteBySlug.guest_access_token === "string" ? siteBySlug.guest_access_token : null,
            secret: Deno.env.get("PUBLIC_SITE_SESSION_SECRET") || serviceRole,
          })
        : false;

      if (!hasAccess) {
        return fail("SITE_UNAVAILABLE", PHOTO_UPLOAD_LINK_UNAVAILABLE_COPY, 403);
      }

      const { data } = await admin
        .from("photo_albums")
        .select("id,wedding_site_id,name,drive_folder_id,is_active,opens_at,closes_at")
        .eq("wedding_site_id", siteBySlug.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      album = data;
    }

    if (!album) return fail("INVALID_TOKEN", "Invalid upload link.", 404);
    if (!album.is_active) return fail("ALBUM_INACTIVE", "Uploads are disabled for this album.", 403);
    const requesterIpMarker = requesterIp ? `h:${await sha256Hex(`photo-upload:${album.id}:${requesterIp}`)}` : null;
    const attemptTokenMarker = tokenHash ?? `site:${await sha256Hex(`photo-upload-site:${siteSlug}`)}`;

    const { data: hubSettings } = await admin
      .from("guest_hub_settings")
      .select("photos_enabled")
      .eq("wedding_site_id", album.wedding_site_id)
      .maybeSingle();
    if (hubSettings && hubSettings.photos_enabled === false) {
      return fail("PHOTO_SHARING_DISABLED", "Photo sharing is currently turned off for this event.", 403);
    }

    const tenMinutesAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: albumAttemptCount } = await admin
      .from("photo_upload_attempts")
      .select("id", { count: "exact", head: true })
      .eq("photo_album_id", album.id)
      .gte("attempted_at", tenMinutesAgoIso);

    if ((albumAttemptCount ?? 0) > MAX_ATTEMPTS_PER_10_MIN) {
      return fail("RATE_LIMITED", "Too many upload attempts. Please try again shortly.", 429);
    }

    if (requesterIpMarker) {
      const { count: ipAttemptCount } = await admin
        .from("photo_upload_attempts")
        .select("id", { count: "exact", head: true })
        .eq("requester_ip", requesterIpMarker)
        .gte("attempted_at", tenMinutesAgoIso);

      if ((ipAttemptCount ?? 0) > MAX_ATTEMPTS_PER_10_MIN_PER_IP) {
        return fail("RATE_LIMITED", "Too many upload attempts from this network. Please try again shortly.", 429);
      }
    }

    await admin.from("photo_upload_attempts").insert({
      photo_album_id: album.id,
      token_hash: attemptTokenMarker,
      requester_ip: requesterIpMarker,
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
      .select("id, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at")
      .eq("id", album.wedding_site_id as string)
      .maybeSingle();

    if (!site) return fail("SITE_UNAVAILABLE", PHOTO_UPLOAD_LINK_UNAVAILABLE_COPY, 403);
    const driveBackup = await resolveDriveBackup(admin, site, album.wedding_site_id as string);
    const { data: itineraryData } = await admin
      .from("itinerary_events")
      .select("id,event_name,event_date,start_time,end_time")
      .eq("wedding_site_id", album.wedding_site_id)
      .order("event_date", { ascending: true });
    const itineraryEvents = (itineraryData ?? []) as ItineraryEventForMatch[];

    const uploaded: Array<{ id: string; name: string; storagePath: string; webViewLink: string | null; driveBackupStatus: string }> = [];
    const failed: Array<{ name: string; code: string; error: string }> = [];

    for (const file of files) {
      try {
        const metadata = await extractPhotoMetadata(file);
        const hosted = await uploadFileToHostedStorage(admin, album as { id: string; wedding_site_id: string }, file);
        let driveFileId: string | null = null;
        let driveWebViewLink: string | null = null;
        let driveBackupStatus = driveBackup.status;

        if (driveBackup.accessToken && album.drive_folder_id && !String(album.drive_folder_id).startsWith("hosted/")) {
          try {
            const drive = await uploadFileToDrive(driveBackup.accessToken, album.drive_folder_id as string, file);
            driveFileId = drive.id;
            driveWebViewLink = drive.webViewLink;
            driveBackupStatus = "backed_up";
          } catch {
            driveBackupStatus = "failed";
          }
        }

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
            drive_file_id: driveFileId ?? hosted.path,
            drive_web_view_link: driveWebViewLink ?? hosted.signedUrl,
          })
          .select("id")
          .single();

        if (error) throw new Error("PHOTO_UPLOAD_ROW_INSERT_FAILED");
        await persistUploadMetadata(admin, {
          id: row.id as string,
          wedding_site_id: album.wedding_site_id as string,
          photo_album_id: album.id as string,
        }, metadata, itineraryEvents);

        uploaded.push({ id: row.id as string, name: file.name, storagePath: hosted.path, webViewLink: driveWebViewLink ?? hosted.signedUrl, driveBackupStatus });
      } catch (error) {
        failed.push({
          name: file.name,
          code: "UPLOAD_FAILED",
          error: "We couldn't upload this file. Please try again.",
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
    return fail("INTERNAL_ERROR", "We couldn't finish this upload. Please try again.", 500);
  }
});
