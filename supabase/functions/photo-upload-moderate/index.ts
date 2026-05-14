import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, fail, json } from "../_shared/photoUtils.ts";
import { canMutatePhotos } from "../_shared/collaboratorPermissions.ts";

function safePhotoModerationError(code: "LOAD" | "PERMISSION" | "SAVE" | "INTERNAL"): string {
  if (code === "LOAD") return "Could not load selected photos. Please try again.";
  if (code === "PERMISSION") return "Could not confirm photo permissions. Please try again.";
  if (code === "SAVE") return "Could not update selected photos. Please try again.";
  return "Could not update selected photos. Please try again.";
}

const PHOTO_MODERATION_SIGNIN_REQUIRED_COPY = "Please sign in to update these photos.";
const PHOTO_MODERATION_SELECTION_REQUIRED_COPY = "Choose at least one photo to update.";
const PHOTO_MODERATION_SELECTION_LIMIT_COPY = "Choose 500 photos or fewer at a time.";
const PHOTO_MODERATION_SELECTION_UNAVAILABLE_COPY = "One or more selected photos are not available.";
const PHOTO_MODERATION_ACCESS_UNAVAILABLE_COPY = "You do not have access to update one or more selected photos.";
const PHOTO_MODERATION_PATCH_REQUIRED_COPY = "Choose a valid photo update before saving.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Method not allowed.", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("UNAUTHORIZED", PHOTO_MODERATION_SIGNIN_REQUIRED_COPY, 401);

    const body = await req.json().catch(() => ({}));
    const uploadIds = Array.isArray(body.uploadIds)
      ? Array.from(new Set(body.uploadIds.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)))
      : [];
    const patch = (body.patch && typeof body.patch === "object") ? body.patch as Record<string, unknown> : {};

    if (uploadIds.length === 0) return fail("VALIDATION_ERROR", PHOTO_MODERATION_SELECTION_REQUIRED_COPY, 400);
    if (uploadIds.length > 500) return fail("VALIDATION_ERROR", PHOTO_MODERATION_SELECTION_LIMIT_COPY, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return fail("UNAUTHORIZED", PHOTO_MODERATION_SIGNIN_REQUIRED_COPY, 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: uploads, error: uploadsErr } = await admin
      .from("photo_uploads")
      .select("id,wedding_site_id")
      .in("id", uploadIds);

    if (uploadsErr || !uploads || uploads.length === 0) {
      if (uploadsErr) console.error("PHOTO_UPLOAD_MODERATE_LOAD_FAILED", { reason: "UPLOAD_LOAD_FAILED" });
      return fail("DB_ERROR", uploadsErr ? safePhotoModerationError("LOAD") : PHOTO_MODERATION_SELECTION_UNAVAILABLE_COPY, 400);
    }
    if (uploads.length !== uploadIds.length) {
      return fail("VALIDATION_ERROR", PHOTO_MODERATION_SELECTION_UNAVAILABLE_COPY, 400);
    }

    const siteIds = [...new Set(uploads.map((u) => u.wedding_site_id))];
    const { data: sites } = await admin
      .from("wedding_sites")
      .select("id,user_id")
      .in("id", siteIds);

    const ownedSiteIds = new Set((sites ?? []).filter((s) => s.user_id === user.id).map((s) => s.id));
    const remainingSiteIds = siteIds.filter((siteId) => !ownedSiteIds.has(siteId));
    if (remainingSiteIds.length > 0) {
      const { data: collaborators, error: collaboratorError } = await admin
        .from("wedding_site_collaborators")
        .select("wedding_site_id,role,permissions")
        .eq("user_id", user.id)
        .in("wedding_site_id", remainingSiteIds);
      if (collaboratorError) {
        console.error("PHOTO_UPLOAD_MODERATE_COLLABORATOR_FAILED", { reason: "COLLABORATOR_LOAD_FAILED" });
        return fail("DB_ERROR", safePhotoModerationError("PERMISSION"), 400);
      }
      const allowedSiteIds = new Set(
        (collaborators ?? [])
          .filter((row) => canMutatePhotos(row.role, row.permissions))
          .map((row) => row.wedding_site_id),
      );
      const unauthorized = remainingSiteIds.some((siteId) => !allowedSiteIds.has(siteId));
      if (unauthorized) return fail("FORBIDDEN", PHOTO_MODERATION_ACCESS_UNAVAILABLE_COPY, 403);
    }

    const allowedPatch: Record<string, unknown> = {};
    if (typeof patch.is_hidden === "boolean") allowedPatch.is_hidden = patch.is_hidden;
    if (typeof patch.is_flagged === "boolean") allowedPatch.is_flagged = patch.is_flagged;
    if (typeof patch.recap_hidden === "boolean") allowedPatch.recap_hidden = patch.recap_hidden;
    if (typeof patch.recap_featured === "boolean") allowedPatch.recap_featured = patch.recap_featured;
    if (typeof patch.recap_story === "boolean") allowedPatch.recap_story = patch.recap_story;
    if (Object.keys(allowedPatch).length === 0) return fail("VALIDATION_ERROR", PHOTO_MODERATION_PATCH_REQUIRED_COPY, 400);

    const hasRecapPatch = ["recap_hidden", "recap_featured", "recap_story"].some((key) => key in allowedPatch);
    const { error: updateErr } = await admin
      .from("photo_uploads")
      .update({
        ...allowedPatch,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id,
        ...(hasRecapPatch ? { recap_curated_at: new Date().toISOString(), recap_curated_by: user.id } : {}),
      })
      .in("id", uploadIds);

    if (updateErr) {
      console.error("PHOTO_UPLOAD_MODERATE_SAVE_FAILED", { reason: "PHOTO_MODERATION_SAVE_FAILED" });
      return fail("DB_ERROR", safePhotoModerationError("SAVE"), 400);
    }

    return json({ success: true, updated: uploadIds.length });
  } catch (err) {
    console.error("PHOTO_UPLOAD_MODERATE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_PHOTO_MODERATION_FAILURE" });
    return fail("INTERNAL_ERROR", safePhotoModerationError("INTERNAL"), 500);
  }
});
