import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canMutatePhotos } from "../_shared/collaboratorPermissions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HOSTED_BUCKET = "photo-uploads";
const PHOTO_EXPORT_SIGNIN_REQUIRED_COPY = "Please sign in to export these photos.";
const PHOTO_EXPORT_SITE_REQUIRED_COPY = "Choose a site before exporting this photo manifest.";
const PHOTO_EXPORT_SITE_UNAVAILABLE_COPY = "This photo manifest is not available.";
const PHOTO_EXPORT_ACCESS_UNAVAILABLE_COPY = "You do not have access to this photo manifest.";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeSpreadsheetCell(value: unknown): string {
  const text = String(value ?? "");
  return /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
}

function safeManifestUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  if (url.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "photo-export-manifest", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: PHOTO_EXPORT_SIGNIN_REQUIRED_COPY }, 401);

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
    const includeHidden = body.includeHidden === true;
    if (!siteId) return json({ error: PHOTO_EXPORT_SITE_REQUIRED_COPY }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: PHOTO_EXPORT_SIGNIN_REQUIRED_COPY }, 401);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,user_id,site_slug")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) return json({ error: "Could not export photo manifest. Please try again." }, 500);
    if (!site) return json({ error: PHOTO_EXPORT_SITE_UNAVAILABLE_COPY }, 404);

    let allowed = site.user_id === user.id;
    if (!allowed) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("wedding_site_collaborators")
        .select("role,permissions")
        .eq("wedding_site_id", siteId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) return json({ error: "Could not export photo manifest. Please try again." }, 500);
      allowed = canMutatePhotos(collaborator?.role, collaborator?.permissions);
    }
    if (!allowed) return json({ error: PHOTO_EXPORT_ACCESS_UNAVAILABLE_COPY }, 403);

    let query = admin
      .from("photo_uploads")
      .select("id,photo_album_id,original_filename,guest_name,guest_email,note,mime_type,size_bytes,drive_file_id,drive_web_view_link,is_hidden,is_flagged,uploaded_at")
      .eq("wedding_site_id", siteId)
      .order("uploaded_at", { ascending: false })
      .limit(2000);
    if (!includeHidden) query = query.eq("is_hidden", false);

    const [{ data: uploads, error: uploadError }, { data: albums, error: albumError }] = await Promise.all([
      query,
      admin.from("photo_albums").select("id,name").eq("wedding_site_id", siteId),
    ]);
    if (uploadError) return json({ error: "Could not export photo manifest. Please try again." }, 500);
    if (albumError) return json({ error: "Could not export photo manifest. Please try again." }, 500);

    const albumById = new Map((albums ?? []).map((album) => [album.id, album.name]));
    const rows = await Promise.all((uploads ?? []).map(async (upload) => {
      let downloadUrl = safeManifestUrl(upload.drive_web_view_link);
      const driveFileId = typeof upload.drive_file_id === "string" ? upload.drive_file_id : "";
      if (driveFileId && !driveFileId.startsWith("http")) {
        const { data: signed } = await admin.storage.from(HOSTED_BUCKET).createSignedUrl(driveFileId, 60 * 60 * 24);
        downloadUrl = signed?.signedUrl ?? downloadUrl;
      }
      return {
        bucket: safeSpreadsheetCell(albumById.get(upload.photo_album_id)),
        filename: safeSpreadsheetCell(upload.original_filename),
        guest_name: safeSpreadsheetCell(upload.guest_name),
        guest_email: safeSpreadsheetCell(upload.guest_email),
        note: safeSpreadsheetCell(upload.note),
        mime_type: safeSpreadsheetCell(upload.mime_type),
        size_bytes: upload.size_bytes ?? "",
        uploaded_at: upload.uploaded_at ?? "",
        download_url: downloadUrl,
        hidden: upload.is_hidden === true ? "yes" : "no",
        flagged: upload.is_flagged === true ? "yes" : "no",
      };
    }));

    return json({
      success: true,
      siteSlug: site.site_slug,
      generatedAt: new Date().toISOString(),
      expiresInSeconds: 60 * 60 * 24,
      rows,
    });
  } catch (error) {
    return json({ error: "Could not export photo manifest. Please try again." }, 500);
  }
});
