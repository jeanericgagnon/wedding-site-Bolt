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

const INTERACTIVE_LINK_UNAVAILABLE_COPY = "This interactive guest link is not available.";
const INTERACTIVE_REQUEST_RETRY_COPY = "Could not save that response right now. Please try again.";
const INTERACTIVE_INVALID_WIDGET_COPY = "Choose an available interactive option and try again.";
const INTERACTIVE_INVALID_SUGGESTION_COPY = "Add a short response before sending.";
const INTERACTIVE_SUGGESTION_MAX_LENGTH = 180;
const INTERACTIVE_WIDGET_ID_MAX_LENGTH = 120;
const INTERACTIVE_OPTION_ID_MAX_LENGTH = 120;
const INTERACTIVE_PROMPT_KEY_MAX_LENGTH = 120;

type SyncPayload = {
  action: "sync";
  siteSlug: string;
  pollWidgetId: string;
  quizWidgetId: string;
  suggestionPrompt: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
};

type SuggestPayload = {
  action: "suggest";
  siteSlug: string;
  promptKey: string;
  suggestionText: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
};

type VotePayload = {
  action: "vote";
  siteSlug: string;
  widgetKind: "poll" | "quiz";
  widgetId: string;
  optionId: string;
  inviteToken?: string | null;
  passwordSession?: string | null;
};

type Payload = SyncPayload | SuggestPayload | VotePayload;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanShortText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function countOptionIds(rows: Array<{ option_id?: string | null }> | null | undefined): Record<string, number> {
  return (rows ?? []).reduce<Record<string, number>>((acc, row) => {
    const id = String(row.option_id || "");
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
}

function mapSuggestions(rows: Array<{ suggestion_text?: string | null }> | null | undefined): string[] {
  return (rows ?? [])
    .map((row) => String(row.suggestion_text || "").trim())
    .filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Partial<Payload>;
    const action = cleanShortText(body.action, 24) as Payload["action"] | "";
    const siteSlug = cleanShortText(body.siteSlug, 120).toLowerCase();
    const inviteToken = cleanShortText(body.inviteToken, 256) || null;
    const passwordSession = cleanShortText(body.passwordSession, 1024) || null;

    if (!siteSlug) return json({ error: INTERACTIVE_LINK_UNAVAILABLE_COPY }, 400);
    if (action !== "sync" && action !== "suggest" && action !== "vote") {
      return json({ error: INTERACTIVE_REQUEST_RETRY_COPY }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    const hasAccess = site
      ? await canReadPublicSubresource({
          isPublished: site.is_published === true,
          privacyMode: site.privacy_mode,
          siteSlug: site.site_slug,
          inviteToken,
          passwordSession,
          storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null,
          secret: getPublicSessionSecretSource(),
        })
      : false;

    if (!site?.id || !hasAccess) {
      return json({ error: INTERACTIVE_LINK_UNAVAILABLE_COPY }, 403);
    }

    if (action === "sync") {
      const pollWidgetId = cleanShortText(body.pollWidgetId, INTERACTIVE_WIDGET_ID_MAX_LENGTH);
      const quizWidgetId = cleanShortText(body.quizWidgetId, INTERACTIVE_WIDGET_ID_MAX_LENGTH);
      const suggestionPrompt = cleanShortText(body.suggestionPrompt, INTERACTIVE_PROMPT_KEY_MAX_LENGTH);
      if (!pollWidgetId || !quizWidgetId || !suggestionPrompt) {
        return json({ pollCounts: {}, quizCounts: {}, suggestions: [] }, 200);
      }

      const [pollRes, quizRes, suggestionsRes] = await Promise.all([
        admin
          .from("interactive_votes")
          .select("option_id")
          .eq("site_slug", siteSlug)
          .eq("widget_kind", "poll")
          .eq("widget_id", pollWidgetId),
        admin
          .from("interactive_votes")
          .select("option_id")
          .eq("site_slug", siteSlug)
          .eq("widget_kind", "quiz")
          .eq("widget_id", quizWidgetId),
        admin
          .from("interactive_suggestions")
          .select("suggestion_text")
          .eq("site_slug", siteSlug)
          .eq("prompt_key", suggestionPrompt)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      return json({
        pollCounts: pollRes.error ? {} : countOptionIds(pollRes.data),
        quizCounts: quizRes.error ? {} : countOptionIds(quizRes.data),
        suggestions: suggestionsRes.error ? [] : mapSuggestions(suggestionsRes.data),
      });
    }

    if (action === "suggest") {
      const promptKey = cleanShortText(body.promptKey, INTERACTIVE_PROMPT_KEY_MAX_LENGTH);
      const suggestionText = cleanShortText(body.suggestionText, INTERACTIVE_SUGGESTION_MAX_LENGTH);
      if (!promptKey || !suggestionText) {
        return json({ error: INTERACTIVE_INVALID_SUGGESTION_COPY }, 400);
      }

      const rateLimit = await enforcePublicSubmissionRateLimit({
        admin,
        request: req,
        scope: "interactive_section_suggest",
        subject: `${siteSlug}:${promptKey}`,
        siteId: site.id,
        siteSlug,
        maxIp: 30,
        maxSubject: 12,
        windowMinutes: 10,
      });
      if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

      const { error } = await admin
        .from("interactive_suggestions")
        .insert({
          site_slug: siteSlug,
          prompt_key: promptKey,
          suggestion_text: suggestionText,
        });

      if (error) {
        console.error("INTERACTIVE_SECTION_SUGGEST_INSERT_FAILED", { reason: "INTERACTIVE_SUGGESTION_INSERT_FAILED" });
        return json({ error: INTERACTIVE_REQUEST_RETRY_COPY }, 500);
      }

      return json({ ok: true });
    }

    const widgetKind = body.widgetKind === "poll" || body.widgetKind === "quiz" ? body.widgetKind : null;
    const widgetId = cleanShortText(body.widgetId, INTERACTIVE_WIDGET_ID_MAX_LENGTH);
    const optionId = cleanShortText(body.optionId, INTERACTIVE_OPTION_ID_MAX_LENGTH);
    if (!widgetKind || !widgetId || !optionId) {
      return json({ error: INTERACTIVE_INVALID_WIDGET_COPY }, 400);
    }

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "interactive_section_vote",
      subject: `${siteSlug}:${widgetKind}:${widgetId}`,
      siteId: site.id,
      siteSlug,
      maxIp: 40,
      maxSubject: 20,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const { error } = await admin
      .from("interactive_votes")
      .insert({
        site_slug: siteSlug,
        widget_kind: widgetKind,
        widget_id: widgetId,
        option_id: optionId,
      });

    if (error) {
      console.error("INTERACTIVE_SECTION_VOTE_INSERT_FAILED", { reason: "INTERACTIVE_VOTE_INSERT_FAILED" });
      return json({ error: INTERACTIVE_REQUEST_RETRY_COPY }, 500);
    }

    return json({ ok: true });
  } catch {
    console.error("UNEXPECTED_INTERACTIVE_SECTION_PUBLIC_FAILURE", { reason: "UNEXPECTED_INTERACTIVE_SECTION_PUBLIC_FAILURE" });
    return json({ error: INTERACTIVE_REQUEST_RETRY_COPY }, 500);
  }
});
