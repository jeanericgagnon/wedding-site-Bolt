import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";
import { embedTranslatedRsvpAssets } from "../../../src/lib/rsvpTranslationAssets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TARGET_LANGUAGES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  it: "Italian",
  de: "German",
  pt: "Portuguese",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractResponseText(payload: unknown): string {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text.trim();

  const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : [];
    for (const part of content) {
      if (typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeTranslateSiteContentError(code: "LOAD_FAILED" | "SAVE_FAILED" | "INTERNAL_ERROR"): string {
  if (code === "LOAD_FAILED") return "Could not load this site for translation. Please try again.";
  if (code === "SAVE_FAILED") return "Could not save this translation. Please try again.";
  return "Could not prepare translation. Please try again.";
}
const TRANSLATION_SIGNIN_REQUIRED_COPY = "Please sign in to translate this site.";
const TRANSLATION_NOT_READY_COPY = "Translation is not available right now. Please try again later.";
const TRANSLATION_SITE_REQUIRED_COPY = "Choose a site before translating.";
const TRANSLATION_LANGUAGE_UNAVAILABLE_COPY = "This translation language is not available.";
const TRANSLATION_SITE_UNAVAILABLE_COPY = "This site is not available for translation.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: TRANSLATION_SIGNIN_REQUIRED_COPY }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: TRANSLATION_SIGNIN_REQUIRED_COPY }, 401);

    const body = await req.json().catch(() => ({}));
    const siteId = String(body.siteId ?? body.wedding_site_id ?? "").trim();
    const language = String(body.language ?? "es").trim().toLowerCase();
    const languageLabel = TARGET_LANGUAGES[language];
    if (!siteId) return json({ error: TRANSLATION_SITE_REQUIRED_COPY }, 400);
    if (!languageLabel) return json({ error: TRANSLATION_LANGUAGE_UNAVAILABLE_COPY }, 400);

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,user_id,site_json,published_json,wedding_data,layout_config,couple_name_1,couple_name_2,rsvp_custom_questions,rsvp_meal_config")
      .eq("id", siteId)
      .maybeSingle();

    if (siteError) {
      console.error("TRANSLATE_SITE_CONTENT_LOAD_FAILED", { reason: "SITE_LOAD_FAILED" });
      return json({ error: safeTranslateSiteContentError("LOAD_FAILED") }, 500);
    }
    if (!site || site.user_id !== userData.user.id) return json({ error: TRANSLATION_SITE_UNAVAILABLE_COPY }, 404);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "translate_site_content",
      subject: `${userData.user.id}:${siteId}:${language}`,
      siteId,
      maxIp: 30,
      maxSubject: 8,
      windowMinutes: 60,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const source = {
      site_json: site.site_json ?? null,
      published_json: site.published_json ?? null,
      wedding_data: site.wedding_data ?? null,
      layout_config: site.layout_config ?? null,
      rsvp_custom_questions: Array.isArray((site as { rsvp_custom_questions?: unknown }).rsvp_custom_questions)
        ? (site as { rsvp_custom_questions?: unknown[] }).rsvp_custom_questions ?? []
        : [],
      rsvp_meal_config: ((site as { rsvp_meal_config?: unknown }).rsvp_meal_config ?? null),
    };
    const sourceHash = await sha256Hex(JSON.stringify(source));

    const { data: existingTranslation } = await admin
      .from("site_translations")
      .select("id,language,source_hash,translated_at")
      .eq("wedding_site_id", siteId)
      .eq("language", language)
      .eq("source_hash", sourceHash)
      .eq("status", "ready")
      .maybeSingle();

    if (existingTranslation) {
      return json({ success: true, translation: existingTranslation });
    }

    const markFailed = async () => {
      await admin
        .from("site_translations")
        .upsert({
          wedding_site_id: siteId,
          language,
          source_hash: sourceHash,
          status: "failed",
          translated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "wedding_site_id,language" });
    };

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      await markFailed();
      return json({ error: TRANSLATION_NOT_READY_COPY }, 503);
    }

    const prompt = [
      `Translate this DayOf public wedding site content into ${languageLabel}.`,
      "Return valid JSON with exactly these keys: site_json, published_json, wedding_data, layout_config, rsvp_custom_questions, rsvp_meal_config.",
      "Preserve all IDs, URLs, image paths, dates, times, colors, booleans, numbers, enum values, object keys, and array structure.",
      "Translate only guest-facing natural-language strings. Keep couple names, venue names, addresses, product URLs, email addresses, registry URLs, and proper nouns unchanged unless clearly grammatical context requires otherwise.",
      "If a field is null, return null.",
      JSON.stringify(source),
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TRANSLATION_MODEL") || Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: "You are a careful wedding-site localization engine. Output JSON only." }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      await markFailed();
      return json({ error: "Translation could not be generated right now. Try again in a few minutes." }, 502);
    }

    let translated: Record<string, unknown>;
    try {
      const payload = JSON.parse(raw);
      const text = extractResponseText(payload).replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      translated = JSON.parse(text) as Record<string, unknown>;
    } catch (_err) {
      await markFailed();
      return json({ error: "Translation could not be read cleanly. Try again in a few minutes." }, 502);
    }

    const { data: saved, error: saveError } = await admin
      .from("site_translations")
      .upsert({
        wedding_site_id: siteId,
        language,
        source_hash: sourceHash,
        status: "ready",
        translated_site_json: translated.site_json ?? null,
        translated_published_json: translated.published_json ?? null,
        translated_wedding_data: embedTranslatedRsvpAssets(translated.wedding_data ?? null, {
          questions: Array.isArray(translated.rsvp_custom_questions) ? translated.rsvp_custom_questions as Array<Record<string, unknown>> : [],
          mealConfig: translated.rsvp_meal_config && typeof translated.rsvp_meal_config === "object"
            ? translated.rsvp_meal_config as { enabled: boolean; options: string[] }
            : { enabled: true, options: [] },
        }),
        translated_layout_config: translated.layout_config ?? null,
        translated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "wedding_site_id,language" })
      .select("id,language,source_hash,translated_at")
      .single();

    if (saveError) {
      console.error("TRANSLATE_SITE_CONTENT_SAVE_FAILED", { reason: "TRANSLATION_SAVE_FAILED" });
      return json({ error: safeTranslateSiteContentError("SAVE_FAILED") }, 500);
    }
    return json({ success: true, translation: saved });
  } catch (err) {
    console.error("TRANSLATE_SITE_CONTENT_UNEXPECTED_FAILED", { reason: "UNEXPECTED_TRANSLATION_FAILURE" });
    return json({ error: safeTranslateSiteContentError("INTERNAL_ERROR") }, 500);
  }
});
