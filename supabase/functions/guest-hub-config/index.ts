import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dayof-invite-token, x-dayof-password-session, x-dayof-guest-invite-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const GUEST_HUB_LINK_UNAVAILABLE_COPY = "This wedding link is not available.";
const GUEST_HUB_LOAD_FAILED_COPY = "Could not load this guest hub. Please try again.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ error: GUEST_HUB_LOAD_FAILED_COPY }, 500);

    const admin = createClient(supabaseUrl, serviceRole);
    const url = new URL(req.url);
    const siteSlug = String(url.searchParams.get("site") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,80}$/.test(siteSlug)) return json({ error: GUEST_HUB_LINK_UNAVAILABLE_COPY }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,is_published,site_slug,privacy_mode,guest_access_token,couple_name_1,couple_name_2,wedding_date")
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
      return json({ error: GUEST_HUB_LINK_UNAVAILABLE_COPY }, 404);
    }

    const { data: settings } = await admin
      .from("guest_hub_settings")
      .select("rsvp_enabled,photos_enabled,guestbook_enabled,registry_enabled,schedule_enabled,travel_enabled,custom_message,language_default")
      .eq("wedding_site_id", site.id)
      .maybeSingle();

    const { data: recentMessages } = await admin
      .from("messages")
      .select("subject,body,status,sent_at,scheduled_for,recipient_filter,created_at")
      .eq("wedding_site_id", site.id)
      .in("status", ["scheduled", "queued", "sending", "sent", "partial"])
      .order("created_at", { ascending: false })
      .limit(8);

    const announcementSource = (recentMessages ?? []).find((message) => {
      const filter = typeof message.recipient_filter === "object" && message.recipient_filter !== null ? message.recipient_filter as Record<string, unknown> : {};
      const campaignType = typeof filter.campaignType === "string" ? filter.campaignType : "";
      return campaignType === "day-of-update" || campaignType === "event-reminder";
    }) ?? null;

    const { data: handoffRows } = await admin
      .from("coordinator_event_handoffs")
      .select("handoff_status,lead_name,support_name,note,updated_at,itinerary_event_id")
      .eq("wedding_site_id", site.id)
      .order("updated_at", { ascending: false })
      .limit(6);

    const latestHandoff = (handoffRows ?? []).find((handoff) => {
      const note = typeof handoff.note === "string" ? handoff.note.trim() : "";
      const lead = typeof handoff.lead_name === "string" ? handoff.lead_name.trim() : "";
      const support = typeof handoff.support_name === "string" ? handoff.support_name.trim() : "";
      return note.length > 0 || lead.length > 0 || support.length > 0;
    }) ?? null;

    const eventNameById = latestHandoff
      ? await admin
          .from("itinerary_events")
          .select("id,event_name")
          .eq("wedding_site_id", site.id)
          .eq("id", latestHandoff.itinerary_event_id)
          .maybeSingle()
      : { data: null };

    const guestInviteToken = String(req.headers.get("x-dayof-guest-invite-token") ?? "").trim();
    const { data: guest } = guestInviteToken
      ? await admin
          .from("guests")
          .select("name,rsvp_status,checked_in_at")
          .eq("wedding_site_id", site.id)
          .eq("invite_token", guestInviteToken)
          .maybeSingle()
      : { data: null };

    return json({
      site: {
        slug: site.site_slug,
        coupleName1: site.couple_name_1,
        coupleName2: site.couple_name_2,
        weddingDate: site.wedding_date,
      },
      settings: settings ?? {
        rsvp_enabled: true,
        photos_enabled: true,
        guestbook_enabled: true,
        registry_enabled: true,
        schedule_enabled: true,
        travel_enabled: true,
        custom_message: null,
        language_default: "en",
      },
      announcement: announcementSource ? {
        title: announcementSource.subject,
        detail: announcementSource.body,
        status: announcementSource.status,
        scheduledFor: announcementSource.scheduled_for,
        sentAt: announcementSource.sent_at,
      } : null,
      guestState: guest ? {
        guestName: guest.name,
        rsvpStatus: guest.rsvp_status,
        checkedInAt: guest.checked_in_at,
      } : null,
      coordinatorHandoff: latestHandoff ? {
        eventName: eventNameById.data?.event_name ?? null,
        handoffStatus: latestHandoff.handoff_status,
        leadName: latestHandoff.lead_name,
        supportName: latestHandoff.support_name,
        note: latestHandoff.note,
        updatedAt: latestHandoff.updated_at,
      } : null,
    });
  } catch {
    return json({ error: GUEST_HUB_LOAD_FAILED_COPY }, 500);
  }
});
