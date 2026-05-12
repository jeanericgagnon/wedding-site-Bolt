import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";
import { getPublicSessionSecretSource } from "../_shared/publicSessionSecrets.ts";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

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

const MAX_GOOGLE_DRIVE_UPLOAD_BYTES = 35 * 1024 * 1024;
const MAX_GOOGLE_DRIVE_UPLOAD_BASE64_CHARS = Math.ceil((MAX_GOOGLE_DRIVE_UPLOAD_BYTES * 4) / 3) + 8;
const ALLOWED_VAULT_UPLOAD_MIME_PREFIXES = ["image/", "video/", "audio/"];
const VAULT_UPLOAD_SITE_REQUIRED_COPY = "Choose a wedding site before sharing this file.";
const VAULT_UPLOAD_YEAR_REQUIRED_COPY = "Choose a memory vault before sharing this file.";
const VAULT_UPLOAD_FILE_REQUIRED_COPY = "Choose a file before sharing it to this memory vault.";
const VAULT_UPLOAD_LINK_UNAVAILABLE_COPY = "This memory vault contribution link is not available.";
const VAULT_UPLOAD_STORAGE_UNAVAILABLE_COPY = "This memory vault is not ready for file uploads right now.";
const VAULT_UPLOAD_VAULT_UNAVAILABLE_COPY = "This memory vault is not open for file contributions right now.";
const VAULT_UPLOAD_STORAGE_RECONNECT_COPY = "This memory vault upload connection needs attention. Please try again later.";

function sanitizeDriveFileName(value: string) {
  const withoutControls = Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("");
  return withoutControls
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "vault-upload";
}

function isAllowedVaultMimeType(value: string) {
  return (
    value !== "image/svg+xml" &&
    ALLOWED_VAULT_UPLOAD_MIME_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

function estimateBase64Bytes(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function isLikelyBase64File(value: string) {
  return value.length > 0 && value.length <= MAX_GOOGLE_DRIVE_UPLOAD_BASE64_CHARS && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function bodyString(body: Record<string, unknown>, key: "inviteToken" | "passwordSession"): string | null {
  const raw = body[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
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
  if (!createRes.ok || !createJson.id) {
    throw new Error("Failed to create Google Drive folder.");
  }
  return createJson.id as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId : null;
    const vaultYear = typeof body.vaultYear === "number" ? body.vaultYear : null;
    const fileName = typeof body.fileName === "string" ? sanitizeDriveFileName(body.fileName) : null;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "application/octet-stream";
    const base64 = typeof body.base64 === "string" ? body.base64.trim() : null;

    if (!siteId) return json({ error: VAULT_UPLOAD_SITE_REQUIRED_COPY }, 400);
    if (!vaultYear) return json({ error: VAULT_UPLOAD_YEAR_REQUIRED_COPY }, 400);
    if (!fileName || !base64) return json({ error: VAULT_UPLOAD_FILE_REQUIRED_COPY }, 400);
    if (!isAllowedVaultMimeType(mimeType)) {
      return json({ error: "Unsupported file type." }, 400);
    }
    if (!isLikelyBase64File(base64) || estimateBase64Bytes(base64) > MAX_GOOGLE_DRIVE_UPLOAD_BYTES) {
      return json({ error: "File is too large for vault uploads." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRole);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin: adminClient,
      request: req,
      scope: "vault_google_drive_upload",
      subject: `${siteId}:${vaultYear}`,
      siteId,
      maxIp: 12,
      maxSubject: 40,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    // public-safe gate: site must be published and have an enabled vault for this year
    const { data: site } = await adminClient
      .from("wedding_sites")
      .select("id,is_published,site_slug,privacy_mode,guest_access_token,vault_storage_provider,vault_google_drive_connected,vault_google_drive_access_token,vault_google_drive_refresh_token,vault_google_drive_token_expires_at,vault_google_drive_root_folder_id")
      .eq("id", siteId)
      .maybeSingle();

    const hasAccess = site
      ? await canReadPublicSubresource({
          isPublished: site.is_published === true,
          privacyMode: site.privacy_mode,
          siteSlug: site.site_slug,
          inviteToken: bodyString(body, "inviteToken"),
          passwordSession: bodyString(body, "passwordSession"),
          storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null,
          secret: getPublicSessionSecretSource(),
        })
      : false;

    if (!hasAccess) return json({ error: VAULT_UPLOAD_LINK_UNAVAILABLE_COPY }, 403);
    if (site.vault_storage_provider !== "google_drive") return json({ error: VAULT_UPLOAD_STORAGE_UNAVAILABLE_COPY }, 400);
    if (!site.vault_google_drive_connected) return json({ error: VAULT_UPLOAD_STORAGE_RECONNECT_COPY }, 400);

    const { data: config } = await adminClient
      .from("vault_configs")
      .select("id, is_enabled")
      .eq("wedding_site_id", siteId)
      .eq("duration_years", vaultYear)
      .maybeSingle();

    if (!config || !config.is_enabled) {
      return json({ error: VAULT_UPLOAD_VAULT_UNAVAILABLE_COPY }, 400);
    }

    let accessToken = site.vault_google_drive_access_token as string | null;
    const refreshToken = site.vault_google_drive_refresh_token as string | null;
    const tokenExpiresAt = site.vault_google_drive_token_expires_at ? new Date(site.vault_google_drive_token_expires_at as string).getTime() : 0;

    if (!accessToken || !tokenExpiresAt || tokenExpiresAt < Date.now() + 30_000) {
      if (!refreshToken) return json({ error: VAULT_UPLOAD_STORAGE_RECONNECT_COPY }, 400);
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
      console.error("VAULT_UPLOAD_GOOGLE_DRIVE_UPLOAD_FAILED", { status: uploadRes.status });
      return json({ error: "Could not upload this file to Google Drive. Please try again." }, 400);
    }

    return json({
      fileId: uploadJson.id,
      webViewLink: uploadJson.webViewLink ?? null,
      webContentLink: uploadJson.webContentLink ?? null,
      folderId: yearFolderId,
    });
  } catch (err) {
    console.error("VAULT_UPLOAD_GOOGLE_DRIVE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_VAULT_DRIVE_UPLOAD_FAILURE" });
    return json({ error: "Could not upload this file to Google Drive. Please try again." }, 500);
  }
});
