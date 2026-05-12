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

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VAULT_ATTACHMENT_BUCKET = "vault-attachments";
const MAX_UPLOAD_BYTES_BY_TYPE: Record<string, number> = {
  photo: 8 * 1024 * 1024,
  video: 35 * 1024 * 1024,
  voice: 12 * 1024 * 1024,
};
const ALLOWED_MIME_PREFIX_BY_TYPE: Record<string, string> = {
  photo: "image/",
  video: "video/",
  voice: "audio/",
};

const safePathSegment = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "upload";

function accessValue(body: Record<string, unknown>, key: "inviteToken" | "passwordSession"): string | null {
  const raw = body[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function requireVaultPublicAccess(input: {
  body: Record<string, unknown>;
  admin: ReturnType<typeof createClient>;
  siteId: string;
  errorMessage: string;
}) {
  const { data: site, error: siteError } = await input.admin
    .from("wedding_sites")
    .select("id,site_slug,is_published,privacy_mode,guest_access_token,wedding_date")
    .eq("id", input.siteId)
    .maybeSingle();

  if (siteError) return { ok: false as const, response: json({ error: input.errorMessage }, 500) };
  if (!site?.id) return { ok: false as const, response: json({ error: "Vault site is not available" }, 403) };

  const hasAccess = await canReadPublicSubresource({
    isPublished: site.is_published === true,
    privacyMode: site.privacy_mode,
    siteSlug: site.site_slug,
    inviteToken: accessValue(input.body, "inviteToken"),
    passwordSession: accessValue(input.body, "passwordSession"),
    storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null,
    secret: getPublicSessionSecretSource(),
  });

  if (!hasAccess) return { ok: false as const, response: json({ error: "Vault site is not available" }, 403) };
  return { ok: true as const, site };
}

function normalizeWeddingDate(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === raw ? raw : null;
}

function vaultWindowStatus(weddingDateRaw: unknown, forceOpen: boolean) {
  if (forceOpen) return { canSubmit: true, message: "QA mode: vault uploads are open for testing." };
  const normalized = normalizeWeddingDate(weddingDateRaw);
  if (!normalized) return { canSubmit: true, message: null };

  const weddingDate = new Date(`${normalized}T00:00:00Z`);
  const openAt = new Date(weddingDate);
  openAt.setUTCDate(openAt.getUTCDate() - 3);
  const closeAt = new Date(weddingDate);
  closeAt.setUTCDate(closeAt.getUTCDate() + 3);

  const now = new Date();
  if (now < openAt) return { canSubmit: false, message: "Vault uploads are not open yet." };
  if (now > closeAt) return { canSubmit: false, message: "Vault uploads are closed." };
  return { canSubmit: true, message: null };
}

function decodeBase64File(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "vault-entry-submit", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const qaOpen = body.qaOpen === true && Deno.env.get("ALLOW_VAULT_QA_OPEN") === "true";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.action === "upload_attachment") {
      const siteId = String(body.siteId ?? "").trim();
      const configId = String(body.vaultConfigId ?? "").trim();
      const mediaType = String(body.mediaType ?? "").trim();
      const fileName = String(body.fileName ?? "").trim() || "vault-attachment";
      const mimeType = String(body.mimeType ?? "application/octet-stream").trim();
      const base64 = String(body.base64 ?? "").trim();

      if (!siteId || !configId || !base64) return json({ error: "Missing upload fields" }, 400);
      if (!["photo", "video", "voice"].includes(mediaType)) return json({ error: "Unsupported vault media type" }, 400);
      if (mimeType === "image/svg+xml" || !mimeType.startsWith(ALLOWED_MIME_PREFIX_BY_TYPE[mediaType])) {
        return json({ error: "Unsupported file type" }, 400);
      }

      const bytes = decodeBase64File(base64);
      const maxBytes = MAX_UPLOAD_BYTES_BY_TYPE[mediaType];
      if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
        return json({ error: `File is too large for ${mediaType} vault uploads` }, 400);
      }

      const access = await requireVaultPublicAccess({
        body,
        admin,
        siteId,
        errorMessage: "Could not save this vault memory. Please try again.",
      });
      if (!access.ok) return access.response;
      const windowStatus = vaultWindowStatus(access.site.wedding_date, qaOpen);
      if (!windowStatus.canSubmit) return json({ error: windowStatus.message ?? "Vault uploads are closed" }, 403);

      const { data: config, error: configError } = await admin
        .from("vault_configs")
        .select("id, wedding_site_id, duration_years, is_enabled")
        .eq("id", configId)
        .eq("wedding_site_id", siteId)
        .eq("is_enabled", true)
        .maybeSingle();

      if (configError) return json({ error: "Could not save this vault memory. Please try again." }, 500);
      if (!config?.id) return json({ error: "Vault is not available" }, 404);

      const rateLimit = await enforcePublicSubmissionRateLimit({
        admin,
        request: req,
        scope: "vault_attachment_upload",
        subject: `${siteId}:${config.id}`,
        siteId,
        maxIp: 12,
        maxSubject: 40,
        windowMinutes: 10,
      });
      if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

      const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
      const baseName = safePathSegment(fileName.replace(/\.[^.]+$/, ""));
      const path = `public/${siteId}/${config.id}/${crypto.randomUUID()}-${baseName}${extension ? `.${safePathSegment(extension)}` : ""}`;
      let { error: uploadError } = await admin.storage
        .from(VAULT_ATTACHMENT_BUCKET)
        .upload(path, bytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError && /bucket/i.test(uploadError.message)) {
        await admin.storage.createBucket(VAULT_ATTACHMENT_BUCKET, { public: true });
        const retry = await admin.storage
          .from(VAULT_ATTACHMENT_BUCKET)
          .upload(path, bytes, {
            contentType: mimeType,
            upsert: false,
          });
        uploadError = retry.error;
      }

      if (uploadError) return json({ error: "Could not upload this vault attachment. Please try again." }, 500);

      const { data: publicData } = admin.storage.from(VAULT_ATTACHMENT_BUCKET).getPublicUrl(path);
      return json({
        ok: true,
        path,
        publicUrl: publicData.publicUrl,
        fileName,
        mimeType,
        sizeBytes: bytes.byteLength,
      });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0 || rows.length > 5) return json({ error: "Invalid vault entries" }, 400);

    const siteId = String(rows[0]?.wedding_site_id ?? "").trim();
    const configId = String(rows[0]?.vault_config_id ?? "").trim();
    if (!siteId || !configId) return json({ error: "Missing vault site/config" }, 400);

    const access = await requireVaultPublicAccess({
      body,
      admin,
      siteId,
      errorMessage: "Could not save this vault memory. Please try again.",
    });
    if (!access.ok) return access.response;
    const windowStatus = vaultWindowStatus(access.site.wedding_date, qaOpen);
    if (!windowStatus.canSubmit) return json({ error: windowStatus.message ?? "Vault uploads are closed" }, 403);

    const { data: config, error: configError } = await admin
      .from("vault_configs")
      .select("id, wedding_site_id, duration_years, is_enabled")
      .eq("id", configId)
      .eq("wedding_site_id", siteId)
      .eq("is_enabled", true)
      .maybeSingle();

    if (configError) return json({ error: "Could not save this vault memory. Please try again." }, 500);
    if (!config?.id) return json({ error: "Vault is not available" }, 404);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "vault_entry_submit",
      subject: `${siteId}:${config.id}`,
      siteId,
      maxIp: 20,
      maxSubject: 60,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const cleaned = rows.map((row: Record<string, unknown>) => {
      const mediaType = String(row.media_type ?? "text");
      return {
        wedding_site_id: siteId,
        vault_config_id: config.id,
        vault_year: config.duration_years,
        title: String(row.title ?? "").trim() || null,
        content: String(row.content ?? "").trim(),
        author_name: String(row.author_name ?? "").trim() || "Guest",
        attachment_url: typeof row.attachment_url === "string" ? row.attachment_url : null,
        attachment_name: typeof row.attachment_name === "string" ? row.attachment_name : null,
        media_type: ["text", "photo", "video", "voice"].includes(mediaType) ? mediaType : "text",
        mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
        size_bytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
        storage_provider: "supabase",
        external_file_id: null,
        external_file_url: null,
        unlock_at: typeof row.unlock_at === "string" ? row.unlock_at : null,
      };
    });

    if (cleaned.some((row) => !row.content)) return json({ error: "Add a memory message before saving." }, 400);

    const { data: inserted, error: insertError } = await admin
      .from("vault_entries")
      .insert(cleaned)
      .select("id");

    if (insertError) return json({ error: "Could not save this vault memory. Please try again." }, 500);

    return json({ ok: true, entries: inserted ?? [] });
  } catch (err) {
    return json({ error: "Could not save this vault memory. Please try again." }, 500);
  }
});
