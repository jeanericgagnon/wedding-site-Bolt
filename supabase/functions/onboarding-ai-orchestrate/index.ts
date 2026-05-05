import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, fail, json } from "../_shared/photoUtils.ts";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_LOOP_COUNT = 3;

type InitialSetupAnswers = {
  names?: string;
  labelPreference?: string;
  whenWhere?: string;
  venueNameOrTbd?: string;
  style?: string;
  guestFeel?: string;
  weekendEventsRaw?: string;
  ceremonyArrivalTime?: string;
  guestCountBand?: string;
  plusOnePolicy?: string;
  childrenAllowed?: string;
  rsvpDeadline?: string;
  mealChoice?: string;
  registryIntent?: string;
  optionalStory?: string;
};

type StoredClarifyingQuestion = {
  id: string;
  category: "guest_clarity" | "event_structure" | "emotional_depth" | "location_meaning" | "guest_guidance";
  question: string;
  expectedAnswerType: "short_text" | "multi_line";
  targetFields: string[];
  affectedSections: string[];
  skippable: boolean;
  round?: number;
  status?: "pending" | "answered" | "unresolved";
  answer?: string;
};

type ClarifyingDraftOutputs = {
  hero: { headline: string; subheadline: string; toneNote: string };
  schedule: { intro: string; eventSummary: string };
  faq: { guidance: string[] };
  travel: { intro: string };
  story: { intro: string };
  guestGuidance: { dressCode: string; children: string; lodging: string; transport: string };
  siteTone: { summary: string };
};

type Decision = {
  mode: "ask" | "draft";
  questions: StoredClarifyingQuestion[];
  draftOutputs?: ClarifyingDraftOutputs;
  why: string[];
  confidence: "low" | "medium" | "high";
  qualityScore: number;
  loopCount: number;
  fallbackUsed?: boolean;
};

type RequestBody = {
  answers?: InitialSetupAnswers;
  previousQuestions?: StoredClarifyingQuestion[];
  followUpAnswers?: Record<string, string>;
  loopCount?: number;
  siteId?: string;
};

function trimString(value: unknown, max = 800) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function humanizeCopy(value: string, fallback = "") {
  const text = (value || fallback || "").trim();
  return text
    .replace(/[—–]/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/([A-Za-z])[-‐‑‒]([A-Za-z])/g, "$1 $2")
    .replace(/\bnew chapter\b/gi, "what comes next")
    .replace(/\bplan accordingly\b/gi, "plan well")
    .replace(/\bWe invite you to join us\b/g, "We would love to have you with us")
    .replace(/\bcurated list\b/gi, "short list")
    .replace(/\bsavor\b/gi, "enjoy")
    .replace(/\bbeautiful moments\b/gi, "the parts we are most excited to share")
    .replace(/\bfilled with love, great company, and\b/gi, "with")
    .replace(/\bwarmly welcome\b/gi, "welcome")
    .replace(/\bblack tie optional\b/gi, "black tie optional")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .trim();
}

function getString(record: Record<string, unknown> | undefined, key: string, fallback: string) {
  return humanizeCopy(trimString(record?.[key], 420), fallback);
}

function normalizeDraftOutputs(value: unknown, fallback: ClarifyingDraftOutputs): ClarifyingDraftOutputs {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const hero = record.hero && typeof record.hero === "object" && !Array.isArray(record.hero) ? record.hero as Record<string, unknown> : undefined;
  const schedule = record.schedule && typeof record.schedule === "object" && !Array.isArray(record.schedule) ? record.schedule as Record<string, unknown> : undefined;
  const faq = record.faq && typeof record.faq === "object" && !Array.isArray(record.faq) ? record.faq as Record<string, unknown> : undefined;
  const travel = record.travel && typeof record.travel === "object" && !Array.isArray(record.travel) ? record.travel as Record<string, unknown> : undefined;
  const story = record.story && typeof record.story === "object" && !Array.isArray(record.story) ? record.story as Record<string, unknown> : undefined;
  const guestGuidance = record.guestGuidance && typeof record.guestGuidance === "object" && !Array.isArray(record.guestGuidance) ? record.guestGuidance as Record<string, unknown> : undefined;
  const siteTone = record.siteTone && typeof record.siteTone === "object" && !Array.isArray(record.siteTone) ? record.siteTone as Record<string, unknown> : undefined;
  const guidance = Array.isArray(faq?.guidance)
    ? faq.guidance.map((item) => humanizeCopy(trimString(item, 240))).filter(Boolean).slice(0, 6)
    : fallback.faq.guidance;

  return {
    hero: {
      headline: getString(hero, "headline", fallback.hero.headline),
      subheadline: getString(hero, "subheadline", fallback.hero.subheadline),
      toneNote: getString(hero, "toneNote", fallback.hero.toneNote),
    },
    schedule: {
      intro: getString(schedule, "intro", fallback.schedule.intro),
      eventSummary: getString(schedule, "eventSummary", fallback.schedule.eventSummary),
    },
    faq: { guidance },
    travel: { intro: getString(travel, "intro", fallback.travel.intro) },
    story: { intro: getString(story, "intro", fallback.story.intro) },
    guestGuidance: {
      dressCode: getString(guestGuidance, "dressCode", fallback.guestGuidance.dressCode),
      children: getString(guestGuidance, "children", fallback.guestGuidance.children),
      lodging: getString(guestGuidance, "lodging", fallback.guestGuidance.lodging),
      transport: getString(guestGuidance, "transport", fallback.guestGuidance.transport),
    },
    siteTone: { summary: getString(siteTone, "summary", fallback.siteTone.summary) },
  };
}

function normalizeAnswers(input: unknown): InitialSetupAnswers {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    names: trimString(record.names, 160),
    labelPreference: trimString(record.labelPreference, 80),
    whenWhere: trimString(record.whenWhere, 240),
    venueNameOrTbd: trimString(record.venueNameOrTbd, 180),
    style: trimString(record.style, 180),
    guestFeel: trimString(record.guestFeel, 240),
    weekendEventsRaw: trimString(record.weekendEventsRaw, 600),
    ceremonyArrivalTime: trimString(record.ceremonyArrivalTime, 80),
    guestCountBand: trimString(record.guestCountBand, 80),
    plusOnePolicy: trimString(record.plusOnePolicy, 80),
    childrenAllowed: trimString(record.childrenAllowed, 80),
    rsvpDeadline: trimString(record.rsvpDeadline, 80),
    mealChoice: trimString(record.mealChoice, 80),
    registryIntent: trimString(record.registryIntent, 80),
    optionalStory: trimString(record.optionalStory, 900),
  };
}

function compactAnswers(answers: InitialSetupAnswers) {
  return Object.fromEntries(Object.entries(answers).filter(([, value]) => typeof value === "string" && value.trim()));
}

function parseEvents(raw = "") {
  return raw
    .split(/\n|,|\band\b|\bthen\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function answeredFollowUps(previousQuestions: StoredClarifyingQuestion[] = [], followUpAnswers: Record<string, string> = {}) {
  return previousQuestions
    .map((question) => ({
      id: question.id,
      question: question.question,
      answer: trimString(followUpAnswers[question.id] || question.answer || "", 600),
      targetFields: question.targetFields || [],
      affectedSections: question.affectedSections || [],
    }))
    .filter((entry) => entry.answer);
}

function readinessScore(answers: InitialSetupAnswers, followUps: ReturnType<typeof answeredFollowUps>) {
  let score = 0;
  if (answers.names) score += 18;
  if (answers.whenWhere) score += 18;
  if (answers.venueNameOrTbd || /tbd|deciding|not sure/i.test(answers.venueNameOrTbd || "")) score += 8;
  if (answers.style) score += 8;
  if (answers.guestFeel) score += 8;
  if (answers.weekendEventsRaw) score += 12;
  if (answers.ceremonyArrivalTime) score += 6;
  if (answers.guestCountBand) score += 5;
  if (answers.plusOnePolicy) score += 5;
  if (answers.childrenAllowed) score += 4;
  if (answers.rsvpDeadline) score += 4;
  if (answers.mealChoice) score += 2;
  if (answers.optionalStory) score += 8;
  score += Math.min(12, followUps.length * 4);
  return Math.max(0, Math.min(100, score));
}

function makeQuestion(id: string, question: string, category: StoredClarifyingQuestion["category"], targetFields: string[], affectedSections: string[]): StoredClarifyingQuestion {
  return {
    id,
    category,
    question,
    expectedAnswerType: "multi_line",
    targetFields,
    affectedSections,
    skippable: true,
    status: "pending",
    answer: "",
  };
}

function buildDraftOutputs(answers: InitialSetupAnswers, followUps: ReturnType<typeof answeredFollowUps>): ClarifyingDraftOutputs {
  const names = answers.names || "Your wedding";
  const location = answers.whenWhere || answers.venueNameOrTbd || "the celebration";
  const feel = answers.guestFeel || answers.style || "warm, clear, and easy to follow";
  const events = parseEvents(answers.weekendEventsRaw);
  const followUpText = followUps.map((item) => item.answer).join(" ");
  return {
    hero: {
      headline: names,
      subheadline: humanizeCopy(`We cannot wait to gather everyone for a celebration that feels ${feel}, all centered around ${location}.`),
      toneNote: feel,
    },
    schedule: {
      intro: events.length ? "Here is the simple weekend flow so guests know what to expect." : "We will keep the main celebration details here as they come together.",
      eventSummary: events.length ? events.join(", ") : answers.ceremonyArrivalTime ? `Ceremony arrival is around ${answers.ceremonyArrivalTime}.` : "Schedule details will be shared here soon.",
    },
    faq: {
      guidance: [
        answers.plusOnePolicy ? `Plus one guidance: ${answers.plusOnePolicy}.` : "Clarify plus one expectations before launch.",
        answers.childrenAllowed ? `Children policy: ${answers.childrenAllowed}.` : "Clarify whether children are invited.",
        answers.rsvpDeadline ? `RSVP deadline: ${answers.rsvpDeadline}.` : "Add an RSVP deadline before launch.",
        followUpText ? `Guest guidance: ${followUpText.slice(0, 220)}.` : "",
      ].filter(Boolean).map((line) => humanizeCopy(line)),
    },
    travel: {
      intro: answers.venueNameOrTbd
        ? humanizeCopy(`Travel and arrival notes should help guests feel comfortable getting to ${answers.venueNameOrTbd}.`)
        : "Travel and arrival notes should make the weekend easy for guests.",
    },
    story: {
      intro: humanizeCopy(answers.optionalStory || `${names} are building a celebration that feels ${feel}.`),
    },
    guestGuidance: {
      dressCode: answers.style ? `Dress for a ${answers.style} celebration.` : "Dress code details will be shared here.",
      children: answers.childrenAllowed ? `Children: ${answers.childrenAllowed}.` : "",
      lodging: "Add hotel and stay guidance if guests are traveling.",
      transport: "Add parking, shuttle, rideshare, or arrival notes before launch.",
    },
    siteTone: {
      summary: feel,
    },
  };
}

function fallbackDecision(answers: InitialSetupAnswers, previousQuestions: StoredClarifyingQuestion[], followUpAnswers: Record<string, string>, loopCount: number): Decision {
  const followUps = answeredFollowUps(previousQuestions, followUpAnswers);
  const score = readinessScore(answers, followUps);
  const askedIds = new Set(previousQuestions.map((question) => question.id));
  const questions: StoredClarifyingQuestion[] = [];

  const add = (question: StoredClarifyingQuestion) => {
    if (!askedIds.has(question.id) && questions.length < 3) questions.push(question);
  };

  if (!answers.guestFeel) {
    add(makeQuestion("guest-feel", "What do you want guests to feel right away when they land on the site?", "guest_clarity", ["guestFeel"], ["hero", "faq", "travel"]));
  }
  if (!answers.weekendEventsRaw || parseEvents(answers.weekendEventsRaw).some((event) => /tbd|maybe|something|party/i.test(event))) {
    add(makeQuestion("event-flow", "What events are actually happening across the weekend, even if the timing is rough?", "event_structure", ["weekendEventsRaw"], ["schedule", "rsvp", "travel"]));
  }
  if (!answers.venueNameOrTbd || /tbd|not sure|deciding/i.test(answers.venueNameOrTbd)) {
    add(makeQuestion("guest-logistics", "What should guests know about location, arrival, parking, hotels, or transportation so the weekend feels easy?", "guest_guidance", ["venueNameOrTbd", "travel"], ["travel", "faq", "directions"]));
  }
  if (!answers.optionalStory && !followUps.some((item) => item.affectedSections.includes("story"))) {
    add(makeQuestion("story-signal", "Is there one personal detail or reason this celebration/location matters that should come through on the site?", "emotional_depth", ["optionalStory"], ["story", "hero"]));
  }

  if (loopCount >= MAX_LOOP_COUNT || score >= 82 || questions.length === 0) {
    return {
      mode: "draft",
      questions: [],
      draftOutputs: buildDraftOutputs(answers, followUps),
      why: [`Readiness score ${score}/100`, loopCount >= MAX_LOOP_COUNT ? "Reached max follow-up loop budget" : "Enough signal to draft"],
      confidence: score >= 86 ? "high" : score >= 70 ? "medium" : "low",
      qualityScore: score,
      loopCount,
      fallbackUsed: true,
    };
  }

  return {
    mode: "ask",
    questions,
    why: [`Readiness score ${score}/100`, "A few high-leverage answers would materially improve the site"],
    confidence: score >= 70 ? "medium" : "low",
    qualityScore: score,
    loopCount,
    fallbackUsed: true,
  };
}

function buildSystemPrompt() {
  return `You are the DayOf AI onboarding concierge for wedding websites.

Decide whether to ask another tiny round of high-leverage follow-up questions or generate draft-ready site outputs.

The product goal:
- Ask only questions that materially improve the final guest-facing site.
- Stop asking once the site can be genuinely useful, polished, and believable.
- Never invent venue facts, dates, logistics, or promises not supported by intake.
- Respect TBD as a valid answer.
- Return JSON only.
- Write like a sincere human, not a marketing team.
- Avoid em dashes, en dashes, and dash-heavy phrasing in all customer-facing copy.
- Avoid stiff labels like "plus-one policy" in draft copy. Prefer natural wording such as "plus one guidance".
- Prefer first-person couple voice where it feels natural.
- Do not write comma-stacked hero subtitles. A hero subtitle should read like one natural invitation line.
- Avoid generic phrases like "new chapter", "plan accordingly", "special day", "journey", "cherished", "savor", "curated", or "beautiful moments".

Quality gate:
- A good draft has couple identity, date/location context, guest tone, event flow, RSVP/guest rules, and practical guest guidance.
- If the missing info would make guests confused, ask.
- If missing info is minor polish, draft and mark guidance in outputs.
- Ask max 3 questions per round.
- If loopCount is 3 or more, draft with best available information.`;
}

function buildUserPrompt(body: RequestBody, answers: InitialSetupAnswers) {
  const followUps = answeredFollowUps(body.previousQuestions || [], body.followUpAnswers || {});
  return JSON.stringify({
    loopCount: Math.max(0, Math.min(MAX_LOOP_COUNT, Math.round(Number(body.loopCount ?? 0)))),
    intake: compactAnswers(answers),
    previousQuestions: body.previousQuestions || [],
    answeredFollowUps: followUps,
    expectedOutputShape: {
      mode: "ask | draft",
      questions: "array of 0-3 high-value questions if mode ask",
      draftOutputs: "required when mode draft",
      exactDraftOutputsShape: {
        hero: { headline: "string", subheadline: "string", toneNote: "string" },
        schedule: { intro: "string", eventSummary: "string" },
        faq: { guidance: ["string"] },
        travel: { intro: "string" },
        story: { intro: "string" },
        guestGuidance: { dressCode: "string", children: "string", lodging: "string", transport: "string" },
        siteTone: { summary: "string" },
      },
      why: "brief reasons",
      confidence: "low | medium | high",
      qualityScore: "0-100",
    },
  }, null, 2);
}

function extractText(payload: unknown): string {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : [];
    for (const entry of content) {
      if (typeof entry.text === "string") parts.push(entry.text);
      else if (entry.text && typeof entry.text === "object" && typeof (entry.text as Record<string, unknown>).value === "string") {
        parts.push((entry.text as Record<string, unknown>).value as string);
      }
    }
  }
  return parts.join("\n").trim();
}

function usageNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function extractUsage(payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const usage = record.usage && typeof record.usage === "object" ? record.usage as Record<string, unknown> : {};
  const details = usage.input_tokens_details && typeof usage.input_tokens_details === "object" ? usage.input_tokens_details as Record<string, unknown> : {};
  return {
    input_tokens: usageNumber(usage.input_tokens),
    cached_input_tokens: usageNumber(details.cached_tokens),
    output_tokens: usageNumber(usage.output_tokens),
    total_tokens: usageNumber(usage.total_tokens),
    raw_usage: usage,
  };
}

function modelPricingUsdPerMillion(model: string) {
  const configuredInput = Number(Deno.env.get("ONBOARDING_AI_INPUT_USD_PER_1M"));
  const configuredOutput = Number(Deno.env.get("ONBOARDING_AI_OUTPUT_USD_PER_1M"));
  const configuredCachedInput = Number(Deno.env.get("ONBOARDING_AI_CACHED_INPUT_USD_PER_1M"));
  if (Number.isFinite(configuredInput) && Number.isFinite(configuredOutput)) {
    return { input: configuredInput, cachedInput: Number.isFinite(configuredCachedInput) ? configuredCachedInput : configuredInput, output: configuredOutput };
  }
  const normalized = model.toLowerCase();
  if (normalized.includes("gpt-4.1-nano")) return { input: 0.10, cachedInput: 0.025, output: 0.40 };
  if (normalized.includes("gpt-4.1-mini")) return { input: 0.40, cachedInput: 0.10, output: 1.60 };
  if (normalized.includes("gpt-4.1")) return { input: 2.00, cachedInput: 0.50, output: 8.00 };
  return { input: 0, cachedInput: 0, output: 0 };
}

function estimatedCost(model: string, usage: ReturnType<typeof extractUsage>) {
  const pricing = modelPricingUsdPerMillion(model);
  const billableInput = Math.max(0, usage.input_tokens - usage.cached_input_tokens);
  const cost =
    (billableInput / 1_000_000) * pricing.input +
    (usage.cached_input_tokens / 1_000_000) * pricing.cachedInput +
    (usage.output_tokens / 1_000_000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function safeOnboardingAiApiError(code: string) {
  switch (code) {
    case "INTERNAL_ERROR":
      return "We could not prepare the setup draft right now. Please try again.";
    default:
      return "We could not prepare the setup draft right now. Please try again.";
  }
}

function sanitizeDecision(value: unknown, fallback: Decision, loopCount: number): Decision {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = record.mode === "ask" ? "ask" : record.mode === "draft" ? "draft" : fallback.mode;
  const questions = Array.isArray(record.questions)
    ? record.questions
        .map((item): StoredClarifyingQuestion | null => {
          if (!item || typeof item !== "object") return null;
          const q = item as Record<string, unknown>;
          const question = trimString(q.question, 260);
          if (!question) return null;
          return {
            id: trimString(q.id, 80) || question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80),
            category: ["guest_clarity", "event_structure", "emotional_depth", "location_meaning", "guest_guidance"].includes(String(q.category)) ? q.category as StoredClarifyingQuestion["category"] : "guest_clarity",
            question,
            expectedAnswerType: q.expectedAnswerType === "short_text" ? "short_text" : "multi_line",
            targetFields: Array.isArray(q.targetFields) ? q.targetFields.map((x) => String(x).slice(0, 80)).slice(0, 8) : [],
            affectedSections: Array.isArray(q.affectedSections) ? q.affectedSections.map((x) => String(x).slice(0, 80)).slice(0, 8) : [],
            skippable: q.skippable !== false,
            round: loopCount + 1,
            status: "pending",
            answer: "",
          };
        })
        .filter((item): item is StoredClarifyingQuestion => Boolean(item))
        .slice(0, 3)
    : fallback.questions;

  const draftOutputs = normalizeDraftOutputs(record.draftOutputs, fallback.draftOutputs || buildDraftOutputs({}, []));
  const qualityScore = Math.max(0, Math.min(100, Math.round(Number(record.qualityScore ?? fallback.qualityScore))));
  const confidence = record.confidence === "high" || record.confidence === "medium" || record.confidence === "low"
    ? record.confidence
    : fallback.confidence;

  if (mode === "ask" && questions.length > 0 && loopCount < MAX_LOOP_COUNT) {
    return {
      mode,
      questions,
      why: Array.isArray(record.why) ? record.why.map((x) => String(x).slice(0, 160)).slice(0, 5) : fallback.why,
      confidence,
      qualityScore,
      loopCount,
    };
  }

  return {
    mode: "draft",
    questions: [],
    draftOutputs,
    why: Array.isArray(record.why) ? record.why.map((x) => String(x).slice(0, 160)).slice(0, 5) : fallback.why,
    confidence,
    qualityScore,
    loopCount,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Use POST.", 405);

  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({})) as RequestBody;
    const answers = normalizeAnswers(body.answers);
    const previousQuestions = Array.isArray(body.previousQuestions) ? body.previousQuestions : [];
    const followUpAnswers = body.followUpAnswers && typeof body.followUpAnswers === "object" ? body.followUpAnswers : {};
    const loopCount = Math.max(0, Math.min(MAX_LOOP_COUNT, Math.round(Number(body.loopCount ?? 0))));
    const fallback = fallbackDecision(answers, previousQuestions, followUpAnswers, loopCount);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("ONBOARDING_AI_MODEL") || Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL;

    let decision = fallback;
    let usage: ReturnType<typeof extractUsage> | null = null;
    let provider = "deterministic";

    if (apiKey) {
      try {
        const response = await fetch(OPENAI_RESPONSES_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input: [
              { role: "system", content: [{ type: "input_text", text: buildSystemPrompt() }] },
              { role: "user", content: [{ type: "input_text", text: buildUserPrompt(body, answers) }] },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "dayof_onboarding_orchestration_v1",
                strict: false,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    mode: { type: "string", enum: ["ask", "draft"] },
                    questions: {
                      type: "array",
                      maxItems: 3,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          id: { type: "string" },
                          category: { type: "string", enum: ["guest_clarity", "event_structure", "emotional_depth", "location_meaning", "guest_guidance"] },
                          question: { type: "string" },
                          expectedAnswerType: { type: "string", enum: ["short_text", "multi_line"] },
                          targetFields: { type: "array", items: { type: "string" } },
                          affectedSections: { type: "array", items: { type: "string" } },
                          skippable: { type: "boolean" },
                        },
                        required: ["id", "category", "question", "expectedAnswerType", "targetFields", "affectedSections", "skippable"],
                      },
                    },
                    draftOutputs: {
                      type: ["object", "null"],
                      additionalProperties: false,
                      properties: {
                        hero: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            headline: { type: "string" },
                            subheadline: { type: "string" },
                            toneNote: { type: "string" },
                          },
                          required: ["headline", "subheadline", "toneNote"],
                        },
                        schedule: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            intro: { type: "string" },
                            eventSummary: { type: "string" },
                          },
                          required: ["intro", "eventSummary"],
                        },
                        faq: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            guidance: { type: "array", items: { type: "string" } },
                          },
                          required: ["guidance"],
                        },
                        travel: {
                          type: "object",
                          additionalProperties: false,
                          properties: { intro: { type: "string" } },
                          required: ["intro"],
                        },
                        story: {
                          type: "object",
                          additionalProperties: false,
                          properties: { intro: { type: "string" } },
                          required: ["intro"],
                        },
                        guestGuidance: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            dressCode: { type: "string" },
                            children: { type: "string" },
                            lodging: { type: "string" },
                            transport: { type: "string" },
                          },
                          required: ["dressCode", "children", "lodging", "transport"],
                        },
                        siteTone: {
                          type: "object",
                          additionalProperties: false,
                          properties: { summary: { type: "string" } },
                          required: ["summary"],
                        },
                      },
                      required: ["hero", "schedule", "faq", "travel", "story", "guestGuidance", "siteTone"],
                    },
                    why: { type: "array", items: { type: "string" } },
                    confidence: { type: "string", enum: ["low", "medium", "high"] },
                    qualityScore: { type: "number" },
                  },
                  required: ["mode", "questions", "draftOutputs", "why", "confidence", "qualityScore"],
                },
              },
            },
          }),
        });

        if (!response.ok) throw new Error(`Onboarding AI request failed with status ${response.status}.`);
        const payload = await response.json();
        usage = extractUsage(payload);
        provider = "openai";
        const modelDecision = sanitizeDecision(JSON.parse(extractText(payload)), fallback, loopCount);
        decision = fallback.mode === "draft" && modelDecision.mode === "ask"
          ? {
              ...fallback,
              why: [
                ...fallback.why,
                "Deterministic readiness gate stopped additional follow-up rounds.",
              ].slice(0, 5),
            }
          : modelDecision;
      } catch (err) {
        console.error("ONBOARDING_AI_ORCHESTRATE_FAILED", {
          message: "Model-backed onboarding fell back to deterministic mode.",
        });
        decision = { ...fallback, fallbackUsed: true };
      }
    }

    const siteId = trimString(body.siteId, 80);
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (siteId && serviceRole && supabaseUrl && usage && provider === "openai") {
      const admin = createClient(supabaseUrl, serviceRole);
      await admin.from("internal_ai_usage_events").insert({
        wedding_site_id: siteId,
        feature: "onboarding_concierge",
        provider,
        model,
        input_tokens: usage.input_tokens,
        cached_input_tokens: usage.cached_input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost_usd: estimatedCost(model, usage),
        raw_usage: {
          ...usage.raw_usage,
          latency_ms: Date.now() - startedAt,
          loop_count: loopCount,
          mode: decision.mode,
          quality_score: decision.qualityScore,
        },
      });
    }

    return json({
      success: true,
      ...decision,
      loopCount,
      maxLoopCount: MAX_LOOP_COUNT,
    });
  } catch (err) {
    console.error("ONBOARDING_AI_ORCHESTRATE_UNEXPECTED_FAILED", {
      message: err instanceof Error ? err.message : String(err ?? "unknown error"),
    });
    return fail("INTERNAL_ERROR", safeOnboardingAiApiError("INTERNAL_ERROR"), 500);
  }
});
