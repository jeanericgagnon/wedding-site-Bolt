import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canMutatePhotos } from "../_shared/collaboratorPermissions.ts";

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

const PHOTO_ALBUM_MANAGE_SIGNIN_REQUIRED_COPY = "Please sign in to manage photo albums.";
const PHOTO_ALBUM_MANAGE_ALBUM_REQUIRED_COPY = "Choose a photo album before updating it.";
const PHOTO_ALBUM_MANAGE_ALBUM_UNAVAILABLE_COPY = "This photo album is not available.";
const PHOTO_ALBUM_MANAGE_ACCESS_UNAVAILABLE_COPY = "You do not have access to manage this photo album.";
const PHOTO_ALBUM_MANAGE_ACTIVE_REQUIRED_COPY = "Choose whether this photo album should stay active.";
const PHOTO_ALBUM_MANAGE_ACTION_INVALID_COPY = "Choose a valid photo album update.";
const PHOTO_ALBUM_MANAGE_PARENT_INVALID_COPY = "Choose a different parent album for this photo album.";
const PHOTO_ALBUM_MANAGE_PARENT_SITE_INVALID_COPY = "Choose a parent album from the same site.";

function safePhotoAlbumManageError(code: "LOOKUP_FAILED" | "COLLABORATOR_FAILED" | "UPDATE_FAILED" | "PARENT_FAILED" | "INTERNAL_ERROR"): string {
  if (code === "LOOKUP_FAILED") return "Could not load this photo album. Please try again.";
  if (code === "COLLABORATOR_FAILED") return "Could not confirm photo permissions. Please try again.";
  if (code === "PARENT_FAILED") return "Could not load the parent album. Please try again.";
  if (code === "UPDATE_FAILED") return "Could not update this photo album. Please try again.";
  return "Could not update photo albums. Please try again.";
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(length = 48) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: PHOTO_ALBUM_MANAGE_SIGNIN_REQUIRED_COPY }, 401);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const albumId = typeof body.albumId === "string" ? body.albumId : "";
    const isActive = typeof body.isActive === "boolean" ? body.isActive : null;
    const opensAt = typeof body.opensAt === "string" ? body.opensAt : null;
    const closesAt = typeof body.closesAt === "string" ? body.closesAt : null;
    const parentAlbumId = typeof body.parentAlbumId === "string" && body.parentAlbumId.trim() ? body.parentAlbumId.trim() : null;

    if (!albumId) return json({ error: PHOTO_ALBUM_MANAGE_ALBUM_REQUIRED_COPY }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://dayof.love";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: PHOTO_ALBUM_MANAGE_SIGNIN_REQUIRED_COPY }, 401);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: album, error: albumErr } = await admin
      .from("photo_albums")
      .select("id,wedding_site_id,is_active")
      .eq("id", albumId)
      .maybeSingle();

    if (albumErr) {
      console.error("PHOTO_ALBUM_MANAGE_LOOKUP_FAILED", { reason: "ALBUM_LOOKUP_FAILED" });
      return json({ error: safePhotoAlbumManageError("LOOKUP_FAILED") }, 404);
    }
    if (!album) return json({ error: PHOTO_ALBUM_MANAGE_ALBUM_UNAVAILABLE_COPY }, 404);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id,user_id")
      .eq("id", album.wedding_site_id as string)
      .maybeSingle();

    let allowed = !!site && site.user_id === user.id;
    if (!allowed) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("wedding_site_collaborators")
        .select("role,permissions")
        .eq("wedding_site_id", album.wedding_site_id as string)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) {
        console.error("PHOTO_ALBUM_MANAGE_COLLABORATOR_FAILED", { reason: "COLLABORATOR_LOAD_FAILED" });
        return json({ error: safePhotoAlbumManageError("COLLABORATOR_FAILED") }, 400);
      }
      allowed = canMutatePhotos(collaborator?.role, collaborator?.permissions);
    }
    if (!allowed) return json({ error: PHOTO_ALBUM_MANAGE_ACCESS_UNAVAILABLE_COPY }, 403);

    if (action === "set_active") {
      if (isActive === null) return json({ error: PHOTO_ALBUM_MANAGE_ACTIVE_REQUIRED_COPY }, 400);
      const { error } = await admin
        .from("photo_albums")
        .update({ is_active: isActive })
        .eq("id", albumId);
      if (error) {
        console.error("PHOTO_ALBUM_MANAGE_SET_ACTIVE_FAILED", { reason: "ALBUM_ACTIVE_UPDATE_FAILED" });
        return json({ error: safePhotoAlbumManageError("UPDATE_FAILED") }, 400);
      }
      return json({ success: true, albumId, isActive });
    }

    if (action === "set_window") {
      const { error } = await admin
        .from("photo_albums")
        .update({ opens_at: opensAt, closes_at: closesAt })
        .eq("id", albumId);
      if (error) {
        console.error("PHOTO_ALBUM_MANAGE_SET_WINDOW_FAILED", { reason: "ALBUM_WINDOW_UPDATE_FAILED" });
        return json({ error: safePhotoAlbumManageError("UPDATE_FAILED") }, 400);
      }
      return json({ success: true, albumId, opensAt, closesAt });
    }

    if (action === "set_parent") {
      if (parentAlbumId === albumId) return json({ error: PHOTO_ALBUM_MANAGE_PARENT_INVALID_COPY }, 400);
      let hierarchyLabel: string | null = null;
      if (parentAlbumId) {
        const { data: parent, error: parentError } = await admin
          .from("photo_albums")
          .select("id,wedding_site_id,name")
          .eq("id", parentAlbumId)
          .maybeSingle();
        if (parentError) {
          console.error("PHOTO_ALBUM_MANAGE_PARENT_FAILED", { reason: "PARENT_ALBUM_LOAD_FAILED" });
          return json({ error: safePhotoAlbumManageError("PARENT_FAILED") }, 400);
        }
        if (!parent || parent.wedding_site_id !== album.wedding_site_id) {
          return json({ error: PHOTO_ALBUM_MANAGE_PARENT_SITE_INVALID_COPY }, 400);
        }
        const { data: current } = await admin
          .from("photo_albums")
          .select("name")
          .eq("id", albumId)
          .maybeSingle();
        hierarchyLabel = `${parent.name as string} / ${String(current?.name ?? "Bucket")}`;
      }
      const { error } = await admin
        .from("photo_albums")
        .update({ parent_album_id: parentAlbumId, hierarchy_label: hierarchyLabel })
        .eq("id", albumId);
      if (error) {
        console.error("PHOTO_ALBUM_MANAGE_SET_PARENT_FAILED", { reason: "ALBUM_PARENT_UPDATE_FAILED" });
        return json({ error: safePhotoAlbumManageError("UPDATE_FAILED") }, 400);
      }
      return json({ success: true, albumId, parentAlbumId });
    }

    if (action === "regenerate_link") {
      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const { error } = await admin
        .from("photo_albums")
        .update({ upload_token_hash: tokenHash, is_active: true })
        .eq("id", albumId);

      if (error) {
        console.error("PHOTO_ALBUM_MANAGE_REGENERATE_LINK_FAILED", { reason: "ALBUM_LINK_REGENERATION_FAILED" });
        return json({ error: safePhotoAlbumManageError("UPDATE_FAILED") }, 400);
      }

      const uploadUrl = `${appUrl.replace(/\/$/, "")}/photos/upload?t=${encodeURIComponent(token)}`;
      return json({ success: true, albumId, uploadUrl, uploadToken: token });
    }

    return json({ error: PHOTO_ALBUM_MANAGE_ACTION_INVALID_COPY }, 400);
  } catch (err) {
    console.error("PHOTO_ALBUM_MANAGE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_PHOTO_ALBUM_MANAGE_FAILURE" });
    return json({ error: safePhotoAlbumManageError("INTERNAL_ERROR") }, 500);
  }
});
