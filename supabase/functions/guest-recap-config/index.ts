import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dayof-invite-token, x-dayof-password-session",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const HOSTED_BUCKET = "photo-uploads";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const GUEST_RECAP_LINK_UNAVAILABLE_COPY = "This wedding link is not available.";

function isHostedStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.includes("/") && !/^https?:\/\//i.test(value);
}

function isDisplayableImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return false;
    if (/(\.|^)drive\.google\.com$/i.test(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: "Could not load this recap. Please try again." }, 500);

    const admin = createClient(supabaseUrl, serviceRole);
    const url = new URL(req.url);
    const siteSlug = String(url.searchParams.get("site") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: GUEST_RECAP_LINK_UNAVAILABLE_COPY }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token,couple_name_1,couple_name_2,wedding_date")
      .eq("site_slug", siteSlug)
      .maybeSingle();
    if (siteError) throw siteError;
    if (
      !site ||
      !(await canReadPublicSubresource({
        isPublished: site.is_published === true,
        privacyMode: site.privacy_mode,
        siteSlug: site.site_slug,
        inviteToken: req.headers.get("x-dayof-invite-token"),
        passwordSession: req.headers.get("x-dayof-password-session"),
        storedInviteToken: site.guest_access_token,
        secret: serviceRole,
      }))
    ) {
      return json({ error: GUEST_RECAP_LINK_UNAVAILABLE_COPY }, 404);
    }

    const { data: hubSettings, error: settingsError } = await admin
      .from("guest_hub_settings")
      .select("photos_enabled,recap_status,recap_published_at,recap_closed_at")
      .eq("wedding_site_id", site.id)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (hubSettings && hubSettings.photos_enabled === false) {
      return json({ error: "Photo sharing is currently turned off for this event." }, 403);
    }
    const recapStatus = String(hubSettings?.recap_status ?? "published");
    if (recapStatus === "draft") {
      return json({ error: "This photo recap is still being curated." }, 403);
    }
    if (recapStatus === "closed") {
      return json({ error: "This photo recap is closed." }, 403);
    }

    const { data: uploads, error: uploadError } = await admin
      .from("photo_uploads")
      .select("id,photo_album_id,original_filename,guest_name,note,mime_type,drive_file_id,drive_web_view_link,uploaded_at,recap_hidden,recap_featured,recap_story")
      .eq("wedding_site_id", site.id)
      .eq("is_hidden", false)
      .eq("is_flagged", false)
      .eq("recap_hidden", false)
      .order("uploaded_at", { ascending: false })
      .limit(120);
    if (uploadError) throw uploadError;

    const uploadIds = (uploads ?? []).map((upload) => upload.id);
    const [{ data: analysisData }, { data: metadataData }, { data: albumData }] = await Promise.all([
      uploadIds.length
        ? admin
            .from("photo_upload_ai_analysis")
            .select("upload_id,status,detected_moment,suggested_bucket_name,bucket_confidence,quality_score,slideshow_priority,caption,tags")
            .in("upload_id", uploadIds)
        : Promise.resolve({ data: [] }),
      uploadIds.length
        ? admin
            .from("photo_upload_metadata")
            .select("upload_id,taken_at,width,height,has_exif")
            .in("upload_id", uploadIds)
        : Promise.resolve({ data: [] }),
      admin
        .from("photo_albums")
        .select("id,name")
        .eq("wedding_site_id", site.id),
    ]);

    const analysisByUpload = new Map((analysisData ?? []).map((row) => [row.upload_id, row]));
    const metadataByUpload = new Map((metadataData ?? []).map((row) => [row.upload_id, row]));
    const albumById = new Map((albumData ?? []).map((row) => [row.id, row.name]));

    const cards = await Promise.all((uploads ?? []).slice(0, 60).map(async (upload) => {
      const analysis = analysisByUpload.get(upload.id) as Record<string, unknown> | undefined;
      const metadata = metadataByUpload.get(upload.id) as Record<string, unknown> | undefined;
      let imageUrl: string | null = null;
      if (isHostedStoragePath(upload.drive_file_id)) {
        const { data: signed } = await admin.storage.from(HOSTED_BUCKET).createSignedUrl(upload.drive_file_id, 60 * 60);
        imageUrl = signed?.signedUrl ?? null;
      }
      if (!imageUrl && isDisplayableImageUrl(upload.drive_web_view_link)) {
        imageUrl = upload.drive_web_view_link;
      }
      return {
        id: upload.id,
        filename: upload.original_filename,
        imageUrl,
        guestName: upload.guest_name,
        note: upload.note,
        mimeType: upload.mime_type,
        uploadedAt: upload.uploaded_at,
        takenAt: metadata?.taken_at ?? null,
        bucketName: analysis?.suggested_bucket_name ?? albumById.get(upload.photo_album_id) ?? "Wedding moments",
        caption: analysis?.caption ?? null,
        moment: analysis?.detected_moment ?? null,
        tags: Array.isArray(analysis?.tags) ? analysis.tags : [],
        featured: upload.recap_featured === true,
        story: upload.recap_story === true,
        score: Number(analysis?.slideshow_priority ?? analysis?.quality_score ?? 0),
      };
    }));

    const curated = cards.filter((card) => card.featured || card.story);
    const sorted = cards.sort((a, b) => {
      const aCurated = (a.featured ? 1000 : 0) + (a.story ? 500 : 0);
      const bCurated = (b.featured ? 1000 : 0) + (b.story ? 500 : 0);
      return bCurated - aCurated || Number(b.score ?? 0) - Number(a.score ?? 0);
    });
    const highlights = (curated.length > 0 ? sorted.filter((card) => card.featured || card.story) : sorted).slice(0, 20);
    const chapters = new Map<string, typeof cards>();
    cards.forEach((card) => {
      const key = String(card.takenAt ?? card.uploadedAt).slice(0, 10);
      chapters.set(key, [...(chapters.get(key) ?? []), card]);
    });

    return json({
      site: {
        slug: site.site_slug,
        coupleName1: site.couple_name_1,
        coupleName2: site.couple_name_2,
        weddingDate: site.wedding_date,
        recapStatus,
        recapPublishedAt: hubSettings?.recap_published_at ?? null,
      },
      summary: {
        uploadCount: cards.length,
        highlightCount: highlights.length,
        chapterCount: chapters.size,
        curatedCount: curated.length,
        storyCount: cards.filter((card) => card.story).length,
      },
      highlights,
      chapters: Array.from(chapters.entries()).map(([date, entries]) => ({
        date,
        count: entries.length,
        highlights: entries.slice(0, 8),
      })),
    });
  } catch (error) {
    console.error("GUEST_RECAP_CONFIG_UNEXPECTED_FAILED", { reason: "UNEXPECTED_GUEST_RECAP_CONFIG_FAILURE" });
    return json({ error: "Could not load this recap. Please try again." }, 500);
  }
});
