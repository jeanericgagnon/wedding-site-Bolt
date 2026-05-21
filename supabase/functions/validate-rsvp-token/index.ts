import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getPublicSessionSecretSource } from "../_shared/publicSessionSecrets.ts";
import { sha256Hex, signSessionToken, verifySessionToken } from "../_shared/signedSession.ts";
import { resolveLocalizedRsvpConfig } from "../../../src/lib/rsvpTranslationAssets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LookupPayload {
  action: "lookup";
  searchValue: string;
  language?: string | null;
}
interface NameLookupPayload {
  action: "lookup_name";
  fullName: string;
  siteRef: string;
}

interface EventLookupPayload {
  action: "event_lookup";
  inviteToken: string;
}

interface GuestLookupPayload {
  action: "lookup_guest";
  guestId: string;
  rsvpSession?: string | null;
  language?: string | null;
}

interface SubmitPayload {
  action: "submit";
  guestId: string;
  rsvpSession: string;
  attending: boolean;
  attendCeremony?: boolean;
  attendReception?: boolean;
  mealChoice?: string | null;
  plusOneName?: string | null;
  plusOneCount?: number;
  childrenCount?: number;
  notes?: string | null;
  customAnswers?: Record<string, unknown> | null;
  applyToHousehold?: boolean;
  targetGuestIds?: string[];
  website?: string;
  hp_field?: string;
}

interface EventSubmitPayload {
  action: "event_submit";
  guestId: string;
  rsvpSession: string;
  eventInvitationId: string;
  attending: boolean;
  dietaryRestrictions?: string | null;
  notes?: string | null;
}

type Payload = LookupPayload | NameLookupPayload | GuestLookupPayload | EventLookupPayload | SubmitPayload | EventSubmitPayload;

interface RsvpSessionPayload {
  scope: "rsvp";
  guestId: string;
  inviteTokenHash: string;
  exp: number;
}

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const LOOKUP_RATE_LIMIT_MAX_ATTEMPTS = 8;
const RSVP_REQUEST_INVALID_COPY = "Could not read this RSVP request. Please try again.";
const RSVP_SEARCH_REQUIRED_COPY = "Enter the invitation code from your invitation.";

function isMissingEventRsvpTableError(error: unknown) {
  const typed = error as { code?: string; message?: string } | null;
  const message = (typed?.message || "").toLowerCase();
  return typed?.code === "PGRST205"
    || message.includes("event_rsvps")
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("relation");
}

function normalizeEventName(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isCeremonyEvent(eventName: string | null | undefined): boolean {
  const normalized = normalizeEventName(eventName);
  return normalized.includes("ceremony") || normalized.includes("wedding ceremony");
}

function isReceptionEvent(eventName: string | null | undefined): boolean {
  const normalized = normalizeEventName(eventName);
  return normalized.includes("reception") || normalized.includes("cocktail hour") || normalized.includes("dinner and dancing");
}

function buildEventRsvpSyncRows(params: {
  invitations: Array<{ event_invitation_id: string; event_name: string | null }>;
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  respondedAt: string;
}) {
  const { invitations, attending, attendCeremony, attendReception, respondedAt } = params;

  if (!attending) {
    return invitations.map((invitation) => ({
      event_invitation_id: invitation.event_invitation_id,
      attending: false,
      responded_at: respondedAt,
    }));
  }

  return invitations.map((invitation) => {
    if (isCeremonyEvent(invitation.event_name)) {
      return {
        event_invitation_id: invitation.event_invitation_id,
        attending: attendCeremony,
        responded_at: respondedAt,
      };
    }

    if (isReceptionEvent(invitation.event_name)) {
      return {
        event_invitation_id: invitation.event_invitation_id,
        attending: attendReception,
        responded_at: respondedAt,
      };
    }

    return {
      event_invitation_id: invitation.event_invitation_id,
      attending: true,
      responded_at: respondedAt,
    };
  });
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_URL"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function sanitizeGuest(guest: {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  plus_one_allowed: boolean | null;
  invited_to_ceremony: boolean | null;
  invited_to_reception: boolean | null;
  children_allowed?: boolean | null;
  max_children?: number | null;
  max_additional_guests?: number | null;
}) {
  return {
    id: guest.id,
    first_name: guest.first_name ?? null,
    last_name: guest.last_name ?? null,
    name: guest.name,
    plus_one_allowed: guest.plus_one_allowed === true,
    invited_to_ceremony: guest.invited_to_ceremony === true,
    invited_to_reception: guest.invited_to_reception === true,
    children_allowed: guest.children_allowed ?? false,
    max_children: guest.max_children ?? 0,
    max_additional_guests: guest.max_additional_guests ?? 0,
  };
}

function sanitizeHouseholdGuest(guest: {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  invited_to_ceremony: boolean | null;
  invited_to_reception: boolean | null;
}) {
  return {
    id: guest.id,
    first_name: guest.first_name ?? null,
    last_name: guest.last_name ?? null,
    name: guest.name,
    invited_to_ceremony: guest.invited_to_ceremony === true,
    invited_to_reception: guest.invited_to_reception === true,
  };
}

function normalizeFullName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function maskEmailHint(value: string | null | undefined): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return null;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain) return null;
  const localHint = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}***`;
  const domainParts = domain.split(".");
  const domainHead = domainParts[0] ?? "";
  const domainTail = domainParts.length > 1 ? `.${domainParts.slice(1).join(".")}` : "";
  const domainHint = domainHead.length <= 2 ? `${domainHead[0] ?? "*"}*` : `${domainHead.slice(0, 2)}***`;
  return `${localHint}@${domainHint}${domainTail}`;
}

function maskPhoneHint(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (digits.length < 4) return null;
  return `***-***-${digits.slice(-4)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const sessionSecret = getPublicSessionSecretSource();

    const issueRsvpSession = async (guestId: string, inviteToken: string) => {
      const inviteTokenHash = await sha256Hex(`${inviteToken}:${supabaseUrl}`);
      return signSessionToken<RsvpSessionPayload>({
        scope: "rsvp",
        guestId,
        inviteTokenHash,
        exp: Date.now() + 1000 * 60 * 60 * 12,
      }, sessionSecret);
    };

    const validateRsvpSession = async (guestId: string, rsvpSession: string) => {
      const payload = await verifySessionToken<RsvpSessionPayload>(rsvpSession, sessionSecret);
      if (!payload || payload.scope !== "rsvp" || payload.guestId !== guestId || payload.exp <= Date.now()) {
        return null;
      }

      const { data: guest, error } = await adminClient
        .from("guests")
        .select("id, invite_token, wedding_site_id, email, first_name, last_name, name, household_id, plus_one_allowed, invited_to_ceremony, invited_to_reception, children_allowed, max_children, max_additional_guests")
        .eq("id", guestId)
        .maybeSingle();

      if (error || !guest?.invite_token) return null;

      const inviteTokenHash = await sha256Hex(`${guest.invite_token}:${supabaseUrl}`);
      if (inviteTokenHash !== payload.inviteTokenHash) return null;
      return guest;
    };

    const logConflict = async (
      weddingSiteId: string,
      guestId: string,
      conflictCode: string,
      message: string,
      attemptedPayload: unknown,
      severity: "error" | "warning" = "error",
    ) => {
      try {
        await adminClient.from("rsvp_conflicts").insert({
          wedding_site_id: weddingSiteId,
          guest_id: guestId,
          conflict_code: conflictCode,
          message,
          severity,
          attempted_payload: attemptedPayload ?? {},
        });
      } catch {
        // best effort
      }
    };

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

    const enforceRateLimit = async (
      scope: string,
      subject: string | null,
      maxAttempts = RATE_LIMIT_MAX_ATTEMPTS,
    ) => {
      const ipHash = await hashIp(`${scope}:${clientIp}`);
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { data: existingLimit } = await adminClient
        .from("rsvp_rate_limit")
        .select("id, attempts, last_attempt_at")
        .eq("ip_hash", ipHash)
        .gte("last_attempt_at", windowStart)
        .maybeSingle();

      if (existingLimit) {
        if (existingLimit.attempts >= maxAttempts) {
          return false;
        }
        await adminClient
          .from("rsvp_rate_limit")
          .update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() })
          .eq("id", existingLimit.id);
        return true;
      }

      const safeSubjectMarker = subject
        ? `h:${(await sha256Hex(`${scope}:${subject}:${supabaseUrl}`)).slice(0, 32)}`
        : scope;

      await adminClient
        .from("rsvp_rate_limit")
        .insert({ ip_hash: ipHash, guest_token: safeSubjectMarker, attempts: 1 });
      return true;
    };

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: RSVP_REQUEST_INVALID_COPY }, 400);
    }

    if (payload.action === "lookup") {
      const { searchValue, language: requestedLanguage } = payload;
      if (!searchValue?.trim()) return json({ error: RSVP_SEARCH_REQUIRED_COPY }, 400);

      const trimmed = searchValue.trim();
      if (!(await enforceRateLimit("rsvp_lookup", trimmed, LOOKUP_RATE_LIMIT_MAX_ATTEMPTS))) {
        return json({ error: "Too many lookup attempts. Please wait a few minutes and try again." }, 429);
      }

      const guestSelect = "id, first_name, last_name, name, plus_one_allowed, invited_to_ceremony, invited_to_reception, wedding_site_id, household_id, children_allowed, max_children, max_additional_guests";
      const guestLookupSelect = `${guestSelect}, invite_token`;

      const buildLookupSuccess = async (
        guest: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          name: string;
          plus_one_allowed: boolean | null;
          invited_to_ceremony: boolean | null;
          invited_to_reception: boolean | null;
          wedding_site_id: string;
          household_id?: string | null;
          children_allowed?: boolean | null;
          max_children?: number | null;
          max_additional_guests?: number | null;
          invite_token?: string | null;
        },
      ) => {
        const [existingRsvpResult, config, householdGuests, rsvpSession] = await Promise.all([
          adminClient.from("rsvps").select("id, attending, attending_ceremony, attending_reception, meal_choice, plus_one_name, plus_one_count, children_count, notes, custom_answers").eq("guest_id", guest.id).maybeSingle(),
          fetchRsvpConfig(guest.wedding_site_id),
          fetchHouseholdGuests(guest.wedding_site_id, guest.household_id, guest.id),
          issueRsvpSession(guest.id, guest.invite_token ?? ""),
        ]);

        return json({
          guest: sanitizeGuest(guest),
          existingRsvp: existingRsvpResult.data,
          guests: null,
          rsvpDeadline: config.rsvpDeadline,
          rsvpQuestions: config.rsvpQuestions,
          rsvpMealConfig: config.rsvpMealConfig,
          musicPlaylistUrl: config.musicPlaylistUrl,
          householdGuests: householdGuests.map(sanitizeHouseholdGuest),
          rsvpSession,
        });
      };

      const { data: byToken } = await adminClient.from("guests").select(guestLookupSelect).eq("invite_token", trimmed).maybeSingle();

      const fetchRsvpConfig = async (siteId: string): Promise<{ rsvpDeadline: string | null; rsvpQuestions: unknown[]; rsvpMealConfig: { enabled: boolean; options: string[] }; musicPlaylistUrl: string | null }> => {
        const { data, error } = await adminClient
          .from("wedding_sites")
          .select("rsvp_custom_questions, rsvp_meal_config, music_playlist_url, default_language, wedding_data")
          .eq("id", siteId)
          .maybeSingle();

        if (error) throw error;

        const typed = data as {
          rsvp_custom_questions?: unknown;
          rsvp_meal_config?: unknown;
          music_playlist_url?: string | null;
          default_language?: string | null;
          wedding_data?: unknown;
        } | null;
        let translatedWeddingData: unknown = null;

        if (typeof requestedLanguage === "string" && requestedLanguage.trim().length > 0 && requestedLanguage !== typed?.default_language) {
          const { data: translationRow } = await adminClient
            .from("site_translations")
            .select("translated_wedding_data")
            .eq("wedding_site_id", siteId)
            .eq("language", requestedLanguage)
            .eq("status", "ready")
            .maybeSingle();
          translatedWeddingData = (translationRow as { translated_wedding_data?: unknown } | null)?.translated_wedding_data ?? null;
        }

        const localized = resolveLocalizedRsvpConfig({
          baseQuestions: typed?.rsvp_custom_questions,
          baseMealConfig: typed?.rsvp_meal_config,
          requestedLanguage,
          siteDefaultLanguage: typed?.default_language,
          weddingData: typed?.wedding_data,
          translatedWeddingData,
        });

        return {
          rsvpDeadline: null,
          rsvpQuestions: localized.questions,
          rsvpMealConfig: localized.mealConfig,
          musicPlaylistUrl: typed?.music_playlist_url ?? null,
        };
      };

      const fetchHouseholdGuests = async (siteId: string, householdId: string | null | undefined, guestId: string) => {
        if (!householdId) return [] as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invited_to_ceremony: boolean; invited_to_reception: boolean }>;
        const { data } = await adminClient
          .from("guests")
          .select("id, first_name, last_name, name, invited_to_ceremony, invited_to_reception")
          .eq("wedding_site_id", siteId)
          .eq("household_id", householdId)
          .neq("id", guestId)
          .limit(8);
        return (data || []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invited_to_ceremony: boolean; invited_to_reception: boolean }>;
      };

      if (byToken) {
        return buildLookupSuccess(byToken);
      }

      return json({ error: "We couldn't verify that invitation. Please use the private RSVP link or code from your invitation." }, 404);
    }

    if (payload.action === "lookup_name") {
      const nameLookupEnabled = ["1", "true", "yes"].includes(String(Deno.env.get("ENABLE_PUBLIC_RSVP_NAME_LOOKUP") ?? "").trim().toLowerCase());
      if (!nameLookupEnabled) {
        return json({ error: "Please use the private RSVP link or code from your invitation." }, 403);
      }

      const normalizedName = normalizeFullName(payload.fullName ?? "");
      const queryParts = normalizedName.split(" ").filter(Boolean);
      const siteRef = String(payload.siteRef ?? "").trim();
      if (!siteRef || normalizedName.length < 5 || queryParts.length < 2) {
        return json({ error: "Add your full name and wedding site before searching." }, 400);
      }
      if (!(await enforceRateLimit("rsvp_lookup_name", `${siteRef}:${normalizedName}`, LOOKUP_RATE_LIMIT_MAX_ATTEMPTS))) {
        return json({ error: "Too many lookup attempts. Please wait a few minutes and try again." }, 429);
      }

      const siteFilterColumn = /^[0-9a-f-]{36}$/i.test(siteRef) ? "id" : "site_slug";
      const { data: site } = await adminClient
        .from("wedding_sites")
        .select("id")
        .eq(siteFilterColumn, siteRef)
        .maybeSingle();
      if (!site?.id) return json({ matches: [], ambiguous: false }, 200);

      const lastName = queryParts.at(-1) ?? "";
      const firstName = queryParts.slice(0, -1).join(" ");
      const { data: exactNameCandidates } = await adminClient
        .from("guests")
        .select("id, name, first_name, last_name, email, phone")
        .eq("wedding_site_id", site.id)
        .ilike("name", normalizedName)
        .limit(8);
      const { data: splitNameCandidates } = await adminClient
        .from("guests")
        .select("id, name, first_name, last_name, email, phone")
        .eq("wedding_site_id", site.id)
        .ilike("first_name", firstName)
        .ilike("last_name", lastName)
        .limit(8);

      const byId = new Map<string, { id: string; name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null }>();
      for (const row of [...(exactNameCandidates ?? []), ...(splitNameCandidates ?? [])]) {
        if (row?.id) byId.set(row.id, row);
      }
      const matches = Array.from(byId.values())
        .filter((row) => normalizeFullName(row.name || [row.first_name, row.last_name].filter(Boolean).join(" ")) === normalizedName)
        .slice(0, 5)
        .map((row) => ({
          name: row.name || [row.first_name, row.last_name].filter(Boolean).join(" "),
          email_hint: maskEmailHint(row.email),
          phone_hint: maskPhoneHint(row.phone),
        }));

      return json({
        ambiguous: matches.length !== 1,
        matches,
      });
    }

    if (payload.action === "lookup_guest") {
      const { guestId, rsvpSession, language: requestedLanguage } = payload;
      if (!guestId?.trim() || !rsvpSession?.trim()) {
        return json({ error: "Please use the private RSVP link or code from your invitation." }, 403);
      }
      if (!(await enforceRateLimit("rsvp_lookup_guest", guestId, LOOKUP_RATE_LIMIT_MAX_ATTEMPTS))) {
        return json({ error: "Too many lookup attempts. Please wait a few minutes and try again." }, 429);
      }

      const guest = await validateRsvpSession(guestId.trim(), rsvpSession);

      if (!guest) {
        return json({ error: "Please use the private RSVP link or code from your invitation." }, 403);
      }

      const fetchRsvpConfig = async (siteId: string): Promise<{ rsvpDeadline: string | null; rsvpQuestions: unknown[]; rsvpMealConfig: { enabled: boolean; options: string[] }; musicPlaylistUrl: string | null }> => {
        const { data, error } = await adminClient
          .from("wedding_sites")
          .select("rsvp_custom_questions, rsvp_meal_config, music_playlist_url, default_language, wedding_data")
          .eq("id", siteId)
          .maybeSingle();

        if (error) throw error;

        const typed = data as {
          rsvp_custom_questions?: unknown;
          rsvp_meal_config?: unknown;
          music_playlist_url?: string | null;
          default_language?: string | null;
          wedding_data?: unknown;
        } | null;
        let translatedWeddingData: unknown = null;

        if (typeof requestedLanguage === "string" && requestedLanguage.trim().length > 0 && requestedLanguage !== typed?.default_language) {
          const { data: translationRow } = await adminClient
            .from("site_translations")
            .select("translated_wedding_data")
            .eq("wedding_site_id", siteId)
            .eq("language", requestedLanguage)
            .eq("status", "ready")
            .maybeSingle();
          translatedWeddingData = (translationRow as { translated_wedding_data?: unknown } | null)?.translated_wedding_data ?? null;
        }

        const localized = resolveLocalizedRsvpConfig({
          baseQuestions: typed?.rsvp_custom_questions,
          baseMealConfig: typed?.rsvp_meal_config,
          requestedLanguage,
          siteDefaultLanguage: typed?.default_language,
          weddingData: typed?.wedding_data,
          translatedWeddingData,
        });

        return {
          rsvpDeadline: null,
          rsvpQuestions: localized.questions,
          rsvpMealConfig: localized.mealConfig,
          musicPlaylistUrl: typed?.music_playlist_url ?? null,
        };
      };

      const fetchHouseholdGuests = async (siteId: string, householdId: string | null | undefined, currentGuestId: string) => {
        if (!householdId) return [] as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invited_to_ceremony: boolean; invited_to_reception: boolean }>;
        const { data } = await adminClient
          .from("guests")
          .select("id, first_name, last_name, name, invited_to_ceremony, invited_to_reception")
          .eq("wedding_site_id", siteId)
          .eq("household_id", householdId)
          .neq("id", currentGuestId)
          .limit(8);
        return (data || []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string; invited_to_ceremony: boolean; invited_to_reception: boolean }>;
      };

      const [existingRsvpResult, config, householdGuests, nextRsvpSession, siteRow] = await Promise.all([
        adminClient.from("rsvps").select("id, attending, attending_ceremony, attending_reception, meal_choice, plus_one_name, plus_one_count, children_count, notes, custom_answers").eq("guest_id", guest.id).maybeSingle(),
        fetchRsvpConfig(guest.wedding_site_id),
        fetchHouseholdGuests(guest.wedding_site_id, guest.household_id, guest.id),
        issueRsvpSession(guest.id, guest.invite_token),
        adminClient.from("wedding_sites").select("site_slug").eq("id", guest.wedding_site_id).maybeSingle(),
      ]);

      return json({
        guest: sanitizeGuest(guest),
        existingRsvp: existingRsvpResult.data,
        guests: null,
        siteSlug: siteRow.data?.site_slug ?? null,
        rsvpDeadline: config.rsvpDeadline,
        rsvpQuestions: config.rsvpQuestions,
        rsvpMealConfig: config.rsvpMealConfig,
        musicPlaylistUrl: config.musicPlaylistUrl,
        householdGuests: householdGuests.map(sanitizeHouseholdGuest),
        rsvpSession: nextRsvpSession,
      });
    }

    if (payload.action === "event_lookup") {
      const { inviteToken } = payload;
      if (!inviteToken?.trim()) return json({ error: RSVP_SEARCH_REQUIRED_COPY }, 400);
      if (!(await enforceRateLimit("rsvp_event_lookup", inviteToken.trim(), LOOKUP_RATE_LIMIT_MAX_ATTEMPTS))) {
        return json({ error: "Too many lookup attempts. Please wait a few minutes and try again." }, 429);
      }

      const { data: guest, error: guestErr } = await adminClient
        .from("guests")
        .select("id, first_name, last_name, name, invite_token, wedding_site_id")
        .eq("invite_token", inviteToken.trim())
        .maybeSingle();

      if (guestErr || !guest) {
        return json({ error: "No invitation link found. Please use your invite email link or ask the couple for help." }, 404);
      }

      const rsvpSession = await issueRsvpSession(guest.id, inviteToken.trim());

      const { data: invitations, error: invitationsError } = await adminClient
        .from("event_invitations")
        .select(`
          id,
          guest_id,
          event_id,
          itinerary_events (
            id,
            event_name,
            event_date,
            start_time,
            end_time,
            location_name,
            location_address,
            description
          )
        `)
        .eq("guest_id", guest.id)
        .order("event_date", {
          foreignTable: "itinerary_events",
          ascending: true,
        });

      if (invitationsError) throw invitationsError;

      const invitationRows = invitations || [];
      const invitationIds = invitationRows.map((invitation: { id: string }) => invitation.id);
      const { data: eventRsvps, error: eventRsvpsError } = invitationIds.length > 0
        ? await adminClient
          .from("event_rsvps")
          .select("id, event_invitation_id, attending, dietary_restrictions, notes, responded_at")
          .in("event_invitation_id", invitationIds)
        : { data: [], error: null };

      const hasEventRsvpSupport = !eventRsvpsError;
      if (eventRsvpsError && !isMissingEventRsvpTableError(eventRsvpsError)) throw eventRsvpsError;

      const rsvpsByInvitationId = new Map<string, Array<{ id: string; attending: boolean | null; dietary_restrictions: string | null; notes: string | null; responded_at: string | null }>>();
      ((eventRsvps || []) as Array<{ id: string; event_invitation_id: string; attending: boolean | null; dietary_restrictions: string | null; notes: string | null; responded_at: string | null }>).forEach((rsvp) => {
        const existing = rsvpsByInvitationId.get(rsvp.event_invitation_id) ?? [];
        existing.push({
          id: rsvp.id,
          attending: rsvp.attending,
          dietary_restrictions: rsvp.dietary_restrictions,
          notes: rsvp.notes,
          responded_at: rsvp.responded_at,
        });
        rsvpsByInvitationId.set(rsvp.event_invitation_id, existing);
      });

      const { data: siteRow } = await adminClient
        .from("wedding_sites")
        .select("site_slug")
        .eq("id", guest.wedding_site_id)
        .maybeSingle();

      return json({
        guest: { id: guest.id, name: guest.name },
        eventRsvpSupport: hasEventRsvpSupport,
        siteSlug: siteRow?.site_slug ?? null,
        rsvpSession,
        invitations: invitationRows.map((invitation: { id: string }) => ({
          ...invitation,
          event_rsvps: rsvpsByInvitationId.get(invitation.id) ?? [],
        })),
      });
    }

    if (payload.action === "event_submit") {
      const { guestId, rsvpSession, eventInvitationId, attending, dietaryRestrictions, notes } = payload;
      if (!guestId || !rsvpSession || !eventInvitationId) {
        return json({ error: "guestId, rsvpSession, and eventInvitationId are required" }, 400);
      }
      if (typeof attending !== "boolean") {
        return json({ error: "Please indicate whether you will be attending." }, 400);
      }

      const guest = await validateRsvpSession(guestId, rsvpSession);
      if (!guest) {
        return json({ error: "This RSVP link isn't valid. Please use the original link from your invitation email, or ask the couple for a new one." }, 403);
      }

      const { data: invitation, error: invitationError } = await adminClient
        .from("event_invitations")
        .select("id, guest_id")
        .eq("id", eventInvitationId)
        .maybeSingle();

      if (invitationError || !invitation || invitation.guest_id !== guestId) {
        return json({ error: "We couldn't find that event invitation for this guest." }, 404);
      }

      const respondedAt = new Date().toISOString();
      const eventRsvpPayload = {
        event_invitation_id: eventInvitationId,
        attending,
        dietary_restrictions: typeof dietaryRestrictions === "string" && dietaryRestrictions.trim().length > 0 ? dietaryRestrictions.trim() : null,
        notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
        responded_at: respondedAt,
      };

      const { error: eventRsvpError } = await adminClient
        .from("event_rsvps")
        .upsert(eventRsvpPayload, { onConflict: "event_invitation_id" });

      if (eventRsvpError && isMissingEventRsvpTableError(eventRsvpError)) {
        return json({ error: "Event-specific RSVP is temporarily unavailable for this site." }, 503);
      }
      if (eventRsvpError) throw eventRsvpError;

      const { data: guestInvitationRows, error: guestInvitationRowsError } = await adminClient
        .from("event_invitations")
        .select("id")
        .eq("guest_id", guestId);

      if (guestInvitationRowsError) throw guestInvitationRowsError;

      const guestInvitationIds = ((guestInvitationRows || []) as Array<{ id: string }>).map((row) => row.id);
      const { data: guestEventRsvps, error: guestEventRsvpsError } = guestInvitationIds.length > 0
        ? await adminClient
          .from("event_rsvps")
          .select("event_invitation_id, attending")
          .in("event_invitation_id", guestInvitationIds)
        : { data: [], error: null };

      if (guestEventRsvpsError && !isMissingEventRsvpTableError(guestEventRsvpsError)) throw guestEventRsvpsError;

      const eventResponses = (guestEventRsvps || []) as Array<{ event_invitation_id: string; attending: boolean | null }>;
      const hasAcceptedEvent = eventResponses.some((row) => row.attending === true);
      const allInvitedEventsDeclined = guestInvitationIds.length > 0
        && eventResponses.length >= guestInvitationIds.length
        && eventResponses.every((row) => row.attending === false);
      const nextGuestRsvpStatus = hasAcceptedEvent ? "confirmed" : allInvitedEventsDeclined ? "declined" : "pending";

      await adminClient
        .from("guests")
        .update({
          rsvp_status: nextGuestRsvpStatus,
          rsvp_received_at: respondedAt,
        })
        .eq("id", guestId);

      return json({ success: true, respondedAt });
    }

    if (payload.action === "submit") {
      const submitPayload = payload as SubmitPayload;
      if (submitPayload.website || submitPayload.hp_field) return json({ success: true });

      const { guestId, rsvpSession, attending, mealChoice, plusOneName, notes, customAnswers, applyToHousehold, targetGuestIds } = submitPayload;
      const attendCeremony = !!submitPayload.attendCeremony;
      const attendReception = !!submitPayload.attendReception;
      const plusOneCount = Number.isFinite(submitPayload.plusOneCount) ? Math.max(0, Math.floor(submitPayload.plusOneCount as number)) : (plusOneName?.trim() ? 1 : 0);
      const childrenCount = Number.isFinite(submitPayload.childrenCount) ? Math.max(0, Math.floor(submitPayload.childrenCount as number)) : 0;

      if (!guestId || !rsvpSession) return json({ error: "guestId and rsvpSession are required" }, 400);
      if (typeof attending !== "boolean") return json({ error: "Please indicate whether you will be attending." }, 400);

      if (!(await enforceRateLimit("rsvp_submit", guestId))) {
        return json({ error: "Too many requests. Please try again later." }, 429);
      }

      const guest = await validateRsvpSession(guestId, rsvpSession);

      if (!guest) return json({ error: "We couldn't find your invitation. Please use the RSVP link from your invitation email, or search by your full name." }, 404);
      if (!guest.invite_token) {
        await logConflict(guest.wedding_site_id, guestId, "invite_token_mismatch", "RSVP session did not resolve to a valid guest token.", submitPayload);
        return json({ error: "This RSVP link isn't valid. Please use the original link from your invitation email, or ask the couple for a new one." }, 403);
      }
      const tokenExpiresAt = (guest as { token_expires_at?: string | null }).token_expires_at;
      if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
        await logConflict(guest.wedding_site_id, guestId, "invite_token_expired", "Invite token is expired.", submitPayload);
        return json({ error: "This RSVP link has expired. Please reach out to the couple to receive a new invitation link." }, 403);
      }

      if (attending) {
        if (attendCeremony && !guest.invited_to_ceremony) {
          await logConflict(guest.wedding_site_id, guestId, "invite_scope_violation", "Guest attempted to RSVP for ceremony without invitation.", submitPayload);
          return json({ error: "Your invitation does not include the ceremony." }, 400);
        }
        if (attendReception && !guest.invited_to_reception) {
          await logConflict(guest.wedding_site_id, guestId, "invite_scope_violation", "Guest attempted to RSVP for reception without invitation.", submitPayload);
          return json({ error: "Your invitation does not include the reception." }, 400);
        }
        if ((guest.invited_to_ceremony || guest.invited_to_reception) && !attendCeremony && !attendReception) {
          await logConflict(guest.wedding_site_id, guestId, "empty_event_selection", "Guest marked attending but no invited events selected.", submitPayload, "warning");
          return json({ error: "Please select at least one invited event, or mark not attending." }, 400);
        }
      }

      const allowedPlusOne = guest.plus_one_allowed ? 1 : 0;
      const allowedChildren = guest.children_allowed ? Math.max(0, Number(guest.max_children ?? 0)) : 0;
      const allowedAdditional = Math.max(Number(guest.max_additional_guests ?? 0), allowedPlusOne + allowedChildren);
      const requestedAdditional = plusOneCount + childrenCount;

      if (plusOneCount > allowedPlusOne) {
        await logConflict(guest.wedding_site_id, guestId, "plus_one_limit_exceeded", "Plus-one count exceeded invite allowance.", submitPayload);
        return json({ error: "Your invitation does not allow that many plus-ones." }, 400);
      }
      if (childrenCount > allowedChildren) {
        await logConflict(guest.wedding_site_id, guestId, "children_limit_exceeded", "Children count exceeded invite allowance.", submitPayload);
        return json({ error: "This invitation does not allow that many children." }, 400);
      }
      if (requestedAdditional > allowedAdditional) {
        await logConflict(guest.wedding_site_id, guestId, "additional_guest_limit_exceeded", "Total additional guest count exceeded invite allowance.", submitPayload);
        return json({ error: "This response exceeds the additional guest count allowed on your invitation." }, 400);
      }

      const targetGuestIdsFinal: string[] = [guestId];
      if (guest.household_id) {
        const { data: sameHousehold } = await adminClient
          .from("guests")
          .select("id, invited_to_ceremony, invited_to_reception")
          .eq("wedding_site_id", guest.wedding_site_id)
          .eq("household_id", guest.household_id);

        const householdIds = new Set((sameHousehold || []).map((g) => g.id));
        householdIds.add(guestId);

        if (Array.isArray(targetGuestIds) && targetGuestIds.length > 0) {
          for (const id of targetGuestIds) {
            if (!householdIds.has(id)) {
              await logConflict(guest.wedding_site_id, guestId, "household_target_invalid", "RSVP inheritance included guest outside household.", submitPayload);
              return json({ error: "One or more selected household guests are invalid for this invitation." }, 400);
            }
            if (!targetGuestIdsFinal.includes(id)) targetGuestIdsFinal.push(id);
          }
        } else if (applyToHousehold) {
          for (const g of sameHousehold || []) {
            if (!targetGuestIdsFinal.includes(g.id)) targetGuestIdsFinal.push(g.id);
          }
        }

        const selectedRows = (sameHousehold || []).filter((g) => targetGuestIdsFinal.includes(g.id));
        for (const g of selectedRows) {
          if (attending && attendCeremony && !g.invited_to_ceremony) {
            await logConflict(guest.wedding_site_id, g.id, "household_scope_conflict", "Household RSVP attempted ceremony attendance for a member not invited to ceremony.", submitPayload);
            return json({ error: "Household RSVP conflict: one or more selected household guests are not invited to all selected events." }, 400);
          }
          if (attending && attendReception && !g.invited_to_reception) {
            await logConflict(guest.wedding_site_id, g.id, "household_scope_conflict", "Household RSVP attempted reception attendance for a member not invited to reception.", submitPayload);
            return json({ error: "Household RSVP conflict: one or more selected household guests are not invited to all selected events." }, 400);
          }
        }
      }

      const respondedAt = new Date().toISOString();

      for (const targetGuestId of targetGuestIdsFinal) {
        const rsvpPayload = {
          guest_id: targetGuestId,
          attending,
          attending_ceremony: attending ? attendCeremony : false,
          attending_reception: attending ? attendReception : false,
          meal_choice: mealChoice ?? null,
          plus_one_name: plusOneName ?? null,
          plus_one_count: plusOneCount,
          children_count: childrenCount,
          notes: notes ?? null,
          conflict_flags: [],
          custom_answers: (customAnswers && typeof customAnswers === "object" && !Array.isArray(customAnswers)) ? customAnswers : {},
          responded_at: respondedAt,
        };

        const { data: existingRsvp } = await adminClient.from("rsvps").select("id").eq("guest_id", targetGuestId).maybeSingle();
        if (existingRsvp) {
          const { error: updateErr } = await adminClient.from("rsvps").update(rsvpPayload).eq("id", existingRsvp.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await adminClient.from("rsvps").insert([rsvpPayload]);
          if (insertErr) throw insertErr;
        }
      }

      const { data: eventInvitations, error: eventInvitationsError } = await adminClient
        .from("event_invitations")
        .select("id, guest_id, itinerary_events(event_name)")
        .in("guest_id", targetGuestIdsFinal);

      if (eventInvitationsError) throw eventInvitationsError;

      const eventRsvpRows = buildEventRsvpSyncRows({
        invitations: ((eventInvitations || []) as Array<{ id: string; itinerary_events?: { event_name?: string | null } | Array<{ event_name?: string | null }> | null }>).map((row) => ({
          event_invitation_id: row.id,
          event_name: Array.isArray(row.itinerary_events)
            ? row.itinerary_events[0]?.event_name ?? null
            : row.itinerary_events?.event_name ?? null,
        })),
        attending,
        attendCeremony,
        attendReception,
        respondedAt,
      });

      if (eventRsvpRows.length > 0) {
        const { error: eventRsvpSyncError } = await adminClient
          .from("event_rsvps")
          .upsert(eventRsvpRows, { onConflict: "event_invitation_id" });

        if (eventRsvpSyncError) {
          const message = (eventRsvpSyncError.message || "").toLowerCase();
          if (!message.includes("event_rsvps") && !message.includes("does not exist") && !message.includes("404") && !message.includes("relation")) {
            throw eventRsvpSyncError;
          }
        }
      }

      await adminClient.from("guests").update({ rsvp_status: attending ? "confirmed" : "declined", rsvp_received_at: respondedAt }).in("id", targetGuestIdsFinal);

      const { data: siteData } = await adminClient.from("wedding_sites").select("couple_email, couple_name_1, couple_name_2, wedding_date, venue_name").eq("id", guest.wedding_site_id).maybeSingle();
      const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;

      if (guest.email && siteData) {
        try {
          await adminClient.from("email_queue").insert({
            site_id: guest.wedding_site_id,
            guest_id: guest.id,
            type: "rsvp_confirmation",
            payload_json: { to: guest.email, guestName, attending, coupleName1: siteData.couple_name_1, coupleName2: siteData.couple_name_2, weddingDate: siteData.wedding_date, venueName: siteData.venue_name },
            status: "pending",
          });
        } catch {
          // best effort
        }
      }

      if (siteData?.couple_email) {
        try {
          await adminClient.from("email_queue").insert({
            site_id: guest.wedding_site_id,
            guest_id: guest.id,
            type: "rsvp_notification",
            payload_json: { to: siteData.couple_email, guestName, attending, mealChoice: mealChoice ?? null, plusOneName: plusOneName ?? null, notes: notes ?? null, coupleName1: siteData.couple_name_1, coupleName2: siteData.couple_name_2 },
            status: "pending",
          });
        } catch {
          // best effort
        }
      }

      EdgeRuntime.waitUntil((async () => {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-email-queue`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({ trigger: "rsvp" }),
          });
        } catch {
          // best effort
        }
      })());

      return json({ success: true, guestName, attending });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("VALIDATE_RSVP_TOKEN_UNEXPECTED_FAILED", { reason: "UNEXPECTED_RSVP_TOKEN_VALIDATION_FAILURE" });
    return json({ error: "Could not update this RSVP. Please try again." }, 500);
  }
});
