import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, fail, json, sha256Hex, sleep } from "../_shared/photoUtils.ts";

const HOSTED_BUCKET = "photo-uploads";
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const PHOTO_UPLOAD_AI_ANALYSIS_SELECT = [
  "id",
  "upload_id",
  "wedding_site_id",
  "photo_album_id",
  "source_hash",
  "analyzed_at",
  "error_message",
  "status",
  "provider",
  "model",
  "detected_moment",
  "suggested_bucket_id",
  "suggested_bucket_name",
  "bucket_confidence",
  "quality_score",
  "blur_score",
  "people_count_range",
  "is_video",
  "slideshow_priority",
  "caption",
  "tags",
  "warnings",
  "raw_result",
  "created_at",
  "updated_at",
].join(", ");

type PhotoUpload = {
  id: string;
  wedding_site_id: string;
  photo_album_id: string;
  original_filename: string;
  guest_name: string | null;
  note: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  drive_file_id: string | null;
  uploaded_at: string;
};

type Bucket = {
  id: string;
  name: string;
  slug: string;
  parent_album_id?: string | null;
  hierarchy_label?: string | null;
  is_active: boolean;
  ai_enabled?: boolean;
  bucket_type?: string | null;
  ai_description?: string | null;
  sort_priority?: number | null;
};

type PhotoUploadMetadata = {
  upload_id: string;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  camera_make: string | null;
  camera_model: string | null;
  has_exif: boolean;
  has_gps: boolean;
  location_label: string | null;
  event_match_id: string | null;
  event_match_confidence: number | null;
  event_match_reason: string | null;
  file_sha256: string | null;
  perceptual_hash: string | null;
};

type PhotoBucketCorrection = {
  action: "accepted" | "rejected" | "manual";
  previous_bucket_id: string | null;
  suggested_bucket_id: string | null;
  chosen_bucket_id: string | null;
  confidence: number | null;
  reason: string | null;
  created_at: string;
};

type ExtractedPhotoMetadata = {
  fileSha256: string;
  perceptualHash: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  takenAt: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAltitude: number | null;
  hasExif: boolean;
  hasGps: boolean;
  rawExif: Record<string, unknown>;
};

type ItineraryEventForMatch = {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type ExpectedMomentTag = {
  tag: string;
  label: string;
  source: "itinerary" | "wedding_default";
  eventId: string | null;
  eventName: string | null;
  examples: string[];
};

type AnalysisResult = {
  status: "ready" | "fallback" | "skipped" | "failed";
  provider: string;
  model: string;
  detected_moment: string;
  suggested_bucket_id: string | null;
  suggested_bucket_name: string | null;
  bucket_confidence: number;
  quality_score: number;
  blur_score: number;
  people_count_range: string;
  is_video: boolean;
  slideshow_priority: number;
  caption: string;
  tags: string[];
  warnings: string[];
  error_message?: string | null;
  raw_result: Record<string, unknown>;
  internal_usage?: AiUsageEvent | null;
};

type AiUsageEvent = {
  provider: string;
  model: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  raw_usage: Record<string, unknown>;
};

const readAscii = (bytes: Uint8Array, start: number, length: number) =>
  new TextDecoder("ascii").decode(bytes.slice(start, start + length)).replace(/\0+$/g, "").trim();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256Bytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function parseExifDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

function readRational(view: DataView, offset: number, little: boolean) {
  const numerator = view.getUint32(offset, little);
  const denominator = view.getUint32(offset + 4, little);
  return denominator === 0 ? 0 : numerator / denominator;
}

function readExifValue(bytes: Uint8Array, view: DataView, tiffStart: number, entryOffset: number, little: boolean) {
  const type = view.getUint16(entryOffset + 2, little);
  const count = view.getUint32(entryOffset + 4, little);
  const valueOffset = entryOffset + 8;
  const inlineOrOffset = view.getUint32(valueOffset, little);
  const unitSize = type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 || type === 10 ? 8 : 1;
  const totalSize = count * unitSize;
  const dataOffset = totalSize <= 4 ? valueOffset : tiffStart + inlineOrOffset;

  if (dataOffset < 0 || dataOffset >= bytes.length) return null;
  if (type === 2) return readAscii(bytes, dataOffset, count);
  if (type === 3) return count === 1 ? view.getUint16(dataOffset, little) : null;
  if (type === 4) return count === 1 ? view.getUint32(dataOffset, little) : null;
  if (type === 5) return count === 1 ? readRational(view, dataOffset, little) : Array.from({ length: count }, (_, i) => readRational(view, dataOffset + i * 8, little));
  return null;
}

function readIfd(bytes: Uint8Array, view: DataView, tiffStart: number, ifdOffset: number, little: boolean) {
  const entries = new Map<number, unknown>();
  const start = tiffStart + ifdOffset;
  if (start < 0 || start + 2 > bytes.length) return entries;
  const count = view.getUint16(start, little);
  for (let i = 0; i < count; i += 1) {
    const entryOffset = start + 2 + i * 12;
    if (entryOffset + 12 > bytes.length) break;
    entries.set(view.getUint16(entryOffset, little), readExifValue(bytes, view, tiffStart, entryOffset, little));
  }
  return entries;
}

function parseJpegDimensions(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { width: null, height: null };
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  return { width: null, height: null };
}

function parsePngDimensions(bytes: Uint8Array) {
  const isPng = bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) return { width: null, height: null };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function parseJpegExif(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 10 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker === 0xe1 && readAscii(bytes, offset + 4, 6) === "Exif") {
      const tiffStart = offset + 10;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const endian = readAscii(bytes, tiffStart, 2);
      const little = endian === "II";
      if (!little && endian !== "MM") return null;
      const ifd0 = readIfd(bytes, view, tiffStart, view.getUint32(tiffStart + 4, little), little);
      const exifOffset = typeof ifd0.get(0x8769) === "number" ? ifd0.get(0x8769) as number : null;
      const gpsOffset = typeof ifd0.get(0x8825) === "number" ? ifd0.get(0x8825) as number : null;
      return {
        ifd0,
        exif: exifOffset ? readIfd(bytes, view, tiffStart, exifOffset, little) : new Map<number, unknown>(),
        gps: gpsOffset ? readIfd(bytes, view, tiffStart, gpsOffset, little) : new Map<number, unknown>(),
      };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function gpsToDecimal(value: unknown, ref: unknown) {
  if (!Array.isArray(value) || value.length < 3) return null;
  const decimal = Number(value[0]) + Number(value[1]) / 60 + Number(value[2]) / 3600;
  if (!Number.isFinite(decimal)) return null;
  const direction = String(ref ?? "").toUpperCase();
  return direction === "S" || direction === "W" ? -decimal : decimal;
}

async function extractPhotoMetadata(bytes: Uint8Array, sizeBytes: number): Promise<ExtractedPhotoMetadata> {
  const fileSha256 = await sha256Bytes(bytes);
  const jpegDims = parseJpegDimensions(bytes);
  const pngDims = parsePngDimensions(bytes);
  const parsed = parseJpegExif(bytes);
  const ifd0 = parsed?.ifd0 ?? new Map<number, unknown>();
  const exif = parsed?.exif ?? new Map<number, unknown>();
  const gps = parsed?.gps ?? new Map<number, unknown>();
  const takenAt = parseExifDate(String(exif.get(0x9003) ?? exif.get(0x9004) ?? ifd0.get(0x0132) ?? ""));
  const gpsLat = gpsToDecimal(gps.get(0x0002), gps.get(0x0001));
  const gpsLng = gpsToDecimal(gps.get(0x0004), gps.get(0x0003));
  const width = jpegDims.width ?? pngDims.width;
  const height = jpegDims.height ?? pngDims.height;

  return {
    fileSha256,
    perceptualHash: width && height ? `${width}x${height}:${Math.round(sizeBytes / 1024)}` : null,
    width,
    height,
    orientation: typeof ifd0.get(0x0112) === "number" ? ifd0.get(0x0112) as number : null,
    takenAt,
    cameraMake: typeof ifd0.get(0x010f) === "string" ? ifd0.get(0x010f) as string : null,
    cameraModel: typeof ifd0.get(0x0110) === "string" ? ifd0.get(0x0110) as string : null,
    gpsLat,
    gpsLng,
    gpsAltitude: typeof gps.get(0x0006) === "number" ? gps.get(0x0006) as number : null,
    hasExif: Boolean(parsed),
    hasGps: gpsLat !== null && gpsLng !== null,
    rawExif: {
      takenAt,
      cameraMake: typeof ifd0.get(0x010f) === "string" ? ifd0.get(0x010f) : null,
      cameraModel: typeof ifd0.get(0x0110) === "string" ? ifd0.get(0x0110) : null,
      orientation: typeof ifd0.get(0x0112) === "number" ? ifd0.get(0x0112) : null,
      width,
      height,
      hasGps: gpsLat !== null && gpsLng !== null,
    },
  };
}

function matchEventByTakenAt(takenAt: string | null, events: ItineraryEventForMatch[]) {
  if (!takenAt) return { eventMatchId: null, confidence: null, reason: null };
  const taken = new Date(takenAt);
  if (Number.isNaN(taken.getTime())) return { eventMatchId: null, confidence: null, reason: null };
  const dateKey = taken.toISOString().slice(0, 10);
  const sameDay = events.filter((event) => typeof event.event_date === "string" && event.event_date.slice(0, 10) === dateKey);
  if (sameDay.length === 0) return { eventMatchId: null, confidence: null, reason: null };
  const exact = sameDay.find((event) => {
    if (!event.start_time || !event.end_time) return false;
    const start = new Date(`${dateKey}T${event.start_time}`).getTime();
    const end = new Date(`${dateKey}T${event.end_time}`).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && taken.getTime() >= start - 30 * 60_000 && taken.getTime() <= end + 30 * 60_000;
  });
  if (exact) return { eventMatchId: exact.id, confidence: 0.9, reason: `Capture time matches ${exact.event_name}.` };
  if (sameDay.length === 1) return { eventMatchId: sameDay[0].id, confidence: 0.55, reason: `Capture date matches ${sameDay[0].event_name}.` };
  return { eventMatchId: sameDay[0].id, confidence: 0.35, reason: "Capture date matches multiple events; picked earliest same-day event." };
}

function slugTag(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function prettyMomentLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function eventMomentExamples(name: string) {
  const normalized = name.toLowerCase();
  const examples = new Set<string>();
  const add = (items: string[]) => items.forEach((item) => examples.add(item));
  if (/cocktail|drinks|hour/.test(normalized)) add(["cocktail_hour", "mingling", "drinks", "guest_candids"]);
  if (/ceremony|vow|altar/.test(normalized)) add(["ceremony", "aisle_walk", "vows", "ring_exchange", "first_kiss", "recessional"]);
  if (/processional|aisle/.test(normalized)) add(["aisle_walk", "processional", "family_processional"]);
  if (/reception|dinner/.test(normalized)) add(["reception", "dinner", "table_moments", "guest_reactions"]);
  if (/toast|speech/.test(normalized)) add(["toasts", "speeches", "reaction_shots"]);
  if (/dance|party|dj/.test(normalized)) add(["dance_floor", "first_dance", "party", "guest_dancing"]);
  if (/getting ready|prep|suite/.test(normalized)) add(["getting_ready", "details", "dress", "wedding_party"]);
  if (/photo|portrait|family/.test(normalized)) add(["portraits", "family_photos", "wedding_party"]);
  if (/cake|dessert/.test(normalized)) add(["cake_cutting", "dessert"]);
  if (/send.?off|exit|sparkler|farewell/.test(normalized)) add(["sendoff", "sparkler_exit", "farewell"]);
  if (/welcome|rehearsal/.test(normalized)) add(["welcome_party", "rehearsal", "guest_candids"]);
  if (/brunch/.test(normalized)) add(["brunch", "farewell", "next_day"]);
  return Array.from(examples).slice(0, 8);
}

function buildExpectedMomentTags(events: ItineraryEventForMatch[]): ExpectedMomentTag[] {
  const defaults = [
    "getting_ready",
    "ceremony",
    "aisle_walk",
    "vows",
    "first_kiss",
    "cocktail_hour",
    "reception",
    "toasts",
    "first_dance",
    "dance_floor",
    "cake_cutting",
    "sendoff",
    "guest_candids",
    "family_photos",
    "details",
  ].map((tag) => ({
    tag,
    label: prettyMomentLabel(tag),
    source: "wedding_default" as const,
    eventId: null,
    eventName: null,
    examples: [],
  }));

  const derived = events.flatMap((event) => {
    const base = slugTag(event.event_name);
    const examples = eventMomentExamples(event.event_name);
    const tags = [base, ...examples].filter(Boolean);
    return tags.map((tag) => ({
      tag,
      label: prettyMomentLabel(tag),
      source: "itinerary" as const,
      eventId: event.id,
      eventName: event.event_name,
      examples: examples.filter((example) => example !== tag),
    }));
  });

  const byTag = new Map<string, ExpectedMomentTag>();
  [...derived, ...defaults].forEach((entry) => {
    if (!entry.tag || byTag.has(entry.tag)) return;
    byTag.set(entry.tag, entry);
  });
  return Array.from(byTag.values()).slice(0, 80);
}

async function backfillUploadMetadata(
  admin: ReturnType<typeof createClient>,
  upload: PhotoUpload,
  events: ItineraryEventForMatch[],
): Promise<PhotoUploadMetadata | null> {
  if (!upload.mime_type?.startsWith("image/") || !upload.drive_file_id || upload.drive_file_id.startsWith("http")) return null;
  const { data, error } = await admin.storage.from(HOSTED_BUCKET).download(upload.drive_file_id);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  const extracted = await extractPhotoMetadata(bytes, upload.size_bytes ?? bytes.length);
  const eventMatch = matchEventByTakenAt(extracted.takenAt, events);
  const row = {
    upload_id: upload.id,
    wedding_site_id: upload.wedding_site_id,
    photo_album_id: upload.photo_album_id,
    file_sha256: extracted.fileSha256,
    perceptual_hash: extracted.perceptualHash,
    width: extracted.width,
    height: extracted.height,
    orientation: extracted.orientation,
    taken_at: extracted.takenAt,
    camera_make: extracted.cameraMake,
    camera_model: extracted.cameraModel,
    gps_lat: extracted.gpsLat,
    gps_lng: extracted.gpsLng,
    gps_altitude: extracted.gpsAltitude,
    location_precision: extracted.hasGps ? "exact_private" : null,
    location_label: extracted.hasGps ? "GPS captured privately" : null,
    event_match_id: eventMatch.eventMatchId,
    event_match_confidence: eventMatch.confidence,
    event_match_reason: eventMatch.reason,
    metadata_source: "analysis_backfill",
    has_exif: extracted.hasExif,
    has_gps: extracted.hasGps,
    raw_exif: extracted.rawExif,
  };
  const { error: saveError } = await admin.from("photo_upload_metadata").upsert(row, { onConflict: "upload_id" });
  if (saveError) return null;
  return {
    upload_id: upload.id,
    taken_at: extracted.takenAt,
    width: extracted.width,
    height: extracted.height,
    camera_make: extracted.cameraMake,
    camera_model: extracted.cameraModel,
    has_exif: extracted.hasExif,
    has_gps: extracted.hasGps,
    location_label: extracted.hasGps ? "GPS captured privately" : null,
    event_match_id: eventMatch.eventMatchId,
    event_match_confidence: eventMatch.confidence,
    event_match_reason: eventMatch.reason,
    file_sha256: extracted.fileSha256,
    perceptual_hash: extracted.perceptualHash,
  };
}

const clamp01 = (value: unknown, fallback = 0.5) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
};

const clampPriority = (value: unknown, fallback = 50) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean).slice(0, 12)
    : [];

function usageNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function extractOpenAiUsage(payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const usage = record.usage && typeof record.usage === "object" ? record.usage as Record<string, unknown> : {};
  const details = usage.input_tokens_details && typeof usage.input_tokens_details === "object"
    ? usage.input_tokens_details as Record<string, unknown>
    : {};
  return {
    input_tokens: usageNumber(usage.input_tokens),
    cached_input_tokens: usageNumber(details.cached_tokens),
    output_tokens: usageNumber(usage.output_tokens),
    total_tokens: usageNumber(usage.total_tokens),
    raw_usage: usage,
  };
}

function modelPricingUsdPerMillion(model: string) {
  const configuredInput = Number(Deno.env.get("PHOTO_AI_INPUT_USD_PER_1M"));
  const configuredOutput = Number(Deno.env.get("PHOTO_AI_OUTPUT_USD_PER_1M"));
  const configuredCachedInput = Number(Deno.env.get("PHOTO_AI_CACHED_INPUT_USD_PER_1M"));
  if (Number.isFinite(configuredInput) && Number.isFinite(configuredOutput)) {
    return {
      input: configuredInput,
      cachedInput: Number.isFinite(configuredCachedInput) ? configuredCachedInput : configuredInput,
      output: configuredOutput,
    };
  }

  const normalized = model.toLowerCase();
  if (normalized.includes("gpt-4.1-nano")) return { input: 0.10, cachedInput: 0.025, output: 0.40 };
  if (normalized.includes("gpt-4.1-mini")) return { input: 0.40, cachedInput: 0.10, output: 1.60 };
  if (normalized.includes("gpt-4.1")) return { input: 2.00, cachedInput: 0.50, output: 8.00 };
  return { input: 0, cachedInput: 0, output: 0 };
}

function buildAiUsageEvent(provider: string, model: string, usage: ReturnType<typeof extractOpenAiUsage>): AiUsageEvent {
  const pricing = modelPricingUsdPerMillion(model);
  const billableInput = Math.max(0, usage.input_tokens - usage.cached_input_tokens);
  const estimated =
    (billableInput / 1_000_000) * pricing.input +
    (usage.cached_input_tokens / 1_000_000) * pricing.cachedInput +
    (usage.output_tokens / 1_000_000) * pricing.output;
  return {
    provider,
    model,
    input_tokens: usage.input_tokens,
    cached_input_tokens: usage.cached_input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    estimated_cost_usd: Math.round(estimated * 1_000_000) / 1_000_000,
    raw_usage: usage.raw_usage,
  };
}

function extractOpenAiText(payload: unknown): string {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (typeof record.output_text === "string" && record.output_text.trim()) return record.output_text.trim();
  const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : [];
    for (const entry of content) {
      if (typeof entry.text === "string") parts.push(entry.text);
      const maybeText = entry.text;
      if (maybeText && typeof maybeText === "object" && typeof (maybeText as Record<string, unknown>).value === "string") {
        parts.push((maybeText as Record<string, unknown>).value as string);
      }
    }
  }
  return parts.join("\n").trim();
}

function safePhotoAiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/configured|credentials|api[_\s-]?key|provider|openai|gemini|token|secret|bearer|signed|storage|bucket|policy|rls/i.test(message)) {
    return "Photo review could not complete. The upload was organized from saved details instead.";
  }
  if (/json|schema|parse|extractable/i.test(message)) {
    return "Photo review returned an unexpected result. The upload was organized from saved details instead.";
  }
  return "Photo review could not complete. The upload was organized from saved details instead.";
}

function safePhotoAnalyzeApiError(code: string) {
  switch (code) {
    case "SITE_LOOKUP_FAILED":
      return "Could not load the wedding site for photo review.";
    case "BUCKETS_FAILED":
      return "Could not load photo albums for review.";
    case "UPLOADS_FAILED":
      return "Could not load photos for review.";
    case "SAVE_FAILED":
      return "Could not save photo review results.";
    default:
      return "Photo analysis could not complete. Please try again.";
  }
}

function findBucket(buckets: Bucket[], terms: string[]) {
  const active = buckets.filter((bucket) => bucket.is_active && bucket.ai_enabled !== false);
  return active.find((bucket) => {
    const haystack = `${bucket.name} ${bucket.slug} ${bucket.hierarchy_label ?? ""}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }) ?? active[0] ?? buckets[0] ?? null;
}

function fallbackAnalyze(upload: PhotoUpload, buckets: Bucket[], reason = "metadata_fallback", metadata?: PhotoUploadMetadata | null, expectedMoments: ExpectedMomentTag[] = []): AnalysisResult {
  const text = `${upload.original_filename} ${upload.note ?? ""} ${metadata?.event_match_reason ?? ""}`.toLowerCase();
  const rules: Array<{ moment: string; terms: string[]; confidence: number; priority: number }> = [
    { moment: "ceremony", terms: ["ceremony", "vow", "aisle", "altar", "processional", "kiss"], confidence: 0.78, priority: 82 },
    { moment: "reception", terms: ["reception", "dinner", "toast", "speech", "cake"], confidence: 0.72, priority: 72 },
    { moment: "dance_floor", terms: ["dance", "party", "dj", "floor"], confidence: 0.76, priority: 80 },
    { moment: "family", terms: ["family", "mom", "dad", "parents", "sibling", "grand"], confidence: 0.7, priority: 68 },
    { moment: "details", terms: ["ring", "flowers", "dress", "shoe", "invite", "table", "detail"], confidence: 0.68, priority: 62 },
    { moment: "wedding_weekend", terms: ["welcome", "brunch", "cocktail", "rehearsal"], confidence: 0.7, priority: 65 },
  ];
  const matched = rules.find((rule) => rule.terms.some((term) => text.includes(term)));
  const bucket = matched ? findBucket(buckets, matched.terms) : buckets.find((entry) => entry.id === upload.photo_album_id && entry.ai_enabled !== false) ?? findBucket(buckets, []);
  const guest = upload.guest_name?.trim() || "A guest";
  const bucketName = bucket?.name ?? "Wedding photos";
  const eventMoment = metadata?.event_match_id ? expectedMoments.find((moment) => moment.eventId === metadata.event_match_id) : null;
  const expectedMatch = expectedMoments.find((moment) => text.includes(moment.tag.replace(/_/g, " ")) || text.includes(moment.tag));
  const metadataTags = [
    eventMoment?.tag ?? null,
    expectedMatch?.tag ?? null,
    metadata?.taken_at ? "has_capture_time" : null,
    metadata?.has_gps ? "has_private_gps" : null,
    metadata?.event_match_id ? "event_matched" : null,
  ].filter(Boolean) as string[];
  return {
    status: reason === "video_skipped" ? "skipped" : "fallback",
    provider: "fallback",
    model: "metadata",
    detected_moment: matched?.moment ?? (upload.mime_type?.startsWith("video/") ? "video" : "uncategorized"),
    suggested_bucket_id: bucket?.id ?? upload.photo_album_id,
    suggested_bucket_name: bucketName,
    bucket_confidence: matched?.confidence ?? 0.56,
    quality_score: upload.mime_type?.startsWith("image/") ? 0.55 : 0.5,
    blur_score: 0,
    people_count_range: "unknown",
    is_video: Boolean(upload.mime_type?.startsWith("video/")),
    slideshow_priority: upload.mime_type?.startsWith("video/") ? 42 : matched?.priority ?? 50,
    caption: upload.note?.trim() ? `${guest}: ${upload.note.trim()}` : `${guest} captured a ${bucketName.toLowerCase()} moment.`,
    tags: Array.from(new Set([matched?.moment ?? eventMoment?.tag ?? expectedMatch?.tag ?? "uncategorized", ...metadataTags].filter(Boolean))).slice(0, 12),
  warnings: [reason],
  raw_result: { source: reason },
  internal_usage: null,
  };
}

function shouldTrustMetadataOnly(result: AnalysisResult, metadata?: PhotoUploadMetadata | null) {
  const hasSemanticHint = !["uncategorized", "video"].includes(result.detected_moment);
  const hasMetadataAnchor = Boolean(metadata?.event_match_id || metadata?.taken_at || metadata?.has_gps);
  const strongEventMatch = Number(metadata?.event_match_confidence ?? 0) >= 0.72;
  return result.bucket_confidence >= 0.7 && (hasSemanticHint || strongEventMatch || hasMetadataAnchor);
}

function normalizeResult(raw: Record<string, unknown>, upload: PhotoUpload, buckets: Bucket[], provider: string, model: string, metadata?: PhotoUploadMetadata | null, expectedMoments: ExpectedMomentTag[] = []): AnalysisResult {
  const suggestedBucketId = typeof raw.suggested_bucket_id === "string" ? raw.suggested_bucket_id : null;
  const bucket = buckets.find((entry) => entry.id === suggestedBucketId && entry.ai_enabled !== false) ?? buckets.find((entry) => entry.id === upload.photo_album_id && entry.ai_enabled !== false) ?? findBucket(buckets, []);
  const fallback = fallbackAnalyze(upload, buckets, "normalize_fallback", metadata, expectedMoments);
  const expectedTags = new Set(expectedMoments.map((moment) => moment.tag));
  const normalizedTags = asStringArray(raw.tags).map(slugTag).filter(Boolean);
  const preferredExpected = normalizedTags.filter((tag) => expectedTags.has(tag));
  const otherTags = normalizedTags.filter((tag) => !expectedTags.has(tag));
  return {
    status: "ready",
    provider,
    model,
    detected_moment: String(raw.detected_moment ?? fallback.detected_moment).slice(0, 80),
    suggested_bucket_id: bucket?.id ?? null,
    suggested_bucket_name: bucket?.name ?? String(raw.suggested_bucket_name ?? fallback.suggested_bucket_name ?? ""),
    bucket_confidence: clamp01(raw.bucket_confidence, fallback.bucket_confidence),
    quality_score: clamp01(raw.quality_score, fallback.quality_score),
    blur_score: clamp01(raw.blur_score, fallback.blur_score),
    people_count_range: String(raw.people_count_range ?? fallback.people_count_range).slice(0, 40),
    is_video: Boolean(upload.mime_type?.startsWith("video/")),
    slideshow_priority: clampPriority(raw.slideshow_priority, fallback.slideshow_priority),
    caption: String(raw.caption ?? fallback.caption).slice(0, 220),
    tags: Array.from(new Set([...preferredExpected, ...otherTags, ...fallback.tags])).slice(0, 12),
    warnings: asStringArray(raw.warnings),
    raw_result: raw,
    internal_usage: null,
  };
}

function summarizeLearning(corrections: PhotoBucketCorrection[], buckets: Bucket[]) {
  const bucketName = (id: string | null) => id ? buckets.find((bucket) => bucket.id === id)?.name ?? id : null;
  return corrections.slice(0, 16).map((correction) => ({
    action: correction.action,
    previousBucket: bucketName(correction.previous_bucket_id),
    suggestedBucket: bucketName(correction.suggested_bucket_id),
    chosenBucket: bucketName(correction.chosen_bucket_id),
    confidence: correction.confidence,
    reason: correction.reason,
  }));
}

async function analyzeWithOpenAi(upload: PhotoUpload, buckets: Bucket[], imageUrl: string, metadata?: PhotoUploadMetadata | null, corrections: PhotoBucketCorrection[] = [], expectedMoments: ExpectedMomentTag[] = []): Promise<AnalysisResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  const model = Deno.env.get("PHOTO_AI_MODEL") || Deno.env.get("OPENAI_PHOTO_MODEL") || "gpt-4.1-nano";
  const prompt = {
    upload: {
      id: upload.id,
      filename: upload.original_filename,
      note: upload.note,
      guestName: upload.guest_name,
      mimeType: upload.mime_type,
    },
    safeMetadata: {
      takenAt: metadata?.taken_at ?? null,
      dimensions: metadata?.width && metadata?.height ? `${metadata.width}x${metadata.height}` : null,
      camera: [metadata?.camera_make, metadata?.camera_model].filter(Boolean).join(" ") || null,
      hasExif: metadata?.has_exif ?? false,
      hasPrivateGps: metadata?.has_gps ?? false,
      locationLabel: metadata?.has_gps ? "GPS captured privately; exact coordinates withheld from AI" : null,
      eventMatchReason: metadata?.event_match_reason ?? null,
      eventMatchConfidence: metadata?.event_match_confidence ?? null,
    },
    buckets: buckets.map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      slug: bucket.slug,
      parentBucketId: bucket.parent_album_id ?? null,
      hierarchy: bucket.hierarchy_label ?? bucket.name,
      type: bucket.bucket_type ?? "other",
      description: bucket.ai_description ?? "",
      priority: bucket.sort_priority ?? 50,
    })),
    expectedMomentTags: expectedMoments.map((moment) => ({
      tag: moment.tag,
      label: moment.label,
      source: moment.source,
      eventId: moment.eventId,
      eventName: moment.eventName,
      examples: moment.examples,
    })),
    recentHumanCorrections: summarizeLearning(corrections, buckets),
    instructions: [
      "Classify this wedding image for guest photo organization.",
      "Use only one supplied suggested_bucket_id.",
      "Only choose from supplied AI-safe buckets.",
      "When a specific child bucket matches the image, prefer it over its broader parent bucket.",
      "Use expectedMomentTags as the preferred tag vocabulary. Include matching expected tags such as cocktail_hour, aisle_walk, first_dance, toasts, dance_floor, or getting_ready when visually supported.",
      "If safeMetadata eventMatchConfidence is high, strongly consider tags tied to that matched itinerary event.",
      "Do not identify people by name from faces.",
      "Use safeMetadata for chronology and event hints. Exact GPS coordinates are intentionally withheld.",
      "Use recentHumanCorrections as preference examples. Accepted means the human liked that bucket; rejected means avoid that suggested bucket for similar cases.",
      "Return JSON only.",
    ],
  };

  const requestBody = JSON.stringify({
      model,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: JSON.stringify(prompt) },
          { type: "input_image", image_url: imageUrl, detail: "low" },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "DayOfPhotoVisionAnalysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              detected_moment: { type: "string" },
              suggested_bucket_id: { type: "string" },
              suggested_bucket_name: { type: "string" },
              bucket_confidence: { type: "number" },
              quality_score: { type: "number" },
              blur_score: { type: "number" },
              people_count_range: { type: "string" },
              slideshow_priority: { type: "number" },
              caption: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } },
            },
            required: ["detected_moment", "suggested_bucket_id", "suggested_bucket_name", "bucket_confidence", "quality_score", "blur_score", "people_count_range", "slideshow_priority", "caption", "tags", "warnings"],
          },
        },
      },
    });

  let response: Response | null = null;
  let rawText = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: requestBody,
    });
    rawText = await response.text();
    if (response.ok || response.status < 500 || attempt === 3) break;
    await sleep(400 * attempt);
  }

  if (!response?.ok) throw new Error(`Photo vision request failed with status ${response?.status ?? "unknown"}.`);
  const payload = JSON.parse(rawText);
  const outputText = extractOpenAiText(payload);
  if (!outputText) throw new Error("OpenAI returned no extractable JSON.");
  const result = normalizeResult(JSON.parse(outputText), upload, buckets, "openai", model, metadata, expectedMoments);
  result.internal_usage = buildAiUsageEvent("openai", model, extractOpenAiUsage(payload));
  return result;
}

async function analyzeWithGemini(upload: PhotoUpload, buckets: Bucket[], bytes: Uint8Array, metadata?: PhotoUploadMetadata | null, corrections: PhotoBucketCorrection[] = [], expectedMoments: ExpectedMomentTag[] = []): Promise<AnalysisResult> {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const model = Deno.env.get("PHOTO_AI_MODEL") || Deno.env.get("GEMINI_PHOTO_MODEL") || "gemini-2.5-flash-lite";
  const prompt = JSON.stringify({
    upload: { id: upload.id, filename: upload.original_filename, note: upload.note, guestName: upload.guest_name, mimeType: upload.mime_type },
    safeMetadata: {
      takenAt: metadata?.taken_at ?? null,
      dimensions: metadata?.width && metadata?.height ? `${metadata.width}x${metadata.height}` : null,
      hasExif: metadata?.has_exif ?? false,
      hasPrivateGps: metadata?.has_gps ?? false,
      locationLabel: metadata?.has_gps ? "GPS captured privately; exact coordinates withheld from AI" : null,
      eventMatchReason: metadata?.event_match_reason ?? null,
      eventMatchConfidence: metadata?.event_match_confidence ?? null,
    },
    buckets: buckets.map((bucket) => ({ id: bucket.id, name: bucket.name, slug: bucket.slug, parentBucketId: bucket.parent_album_id ?? null, hierarchy: bucket.hierarchy_label ?? bucket.name, type: bucket.bucket_type ?? "other", description: bucket.ai_description ?? "", priority: bucket.sort_priority ?? 50 })),
    expectedMomentTags: expectedMoments.map((moment) => ({ tag: moment.tag, label: moment.label, source: moment.source, eventName: moment.eventName })),
    recentHumanCorrections: summarizeLearning(corrections, buckets),
    instructions: "Return compact JSON with detected_moment, suggested_bucket_id, suggested_bucket_name, bucket_confidence, quality_score, blur_score, people_count_range, slideshow_priority, caption, tags, warnings. Only choose supplied AI-safe buckets. Prefer expectedMomentTags for tags when visually supported. Do not identify people by face. Use recentHumanCorrections as preference examples.",
  });
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: upload.mime_type || "image/jpeg", data: base64 } },
        ],
      }],
      generationConfig: { response_mime_type: "application/json" },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini vision failed (${response.status})`);
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned no JSON.");
  return normalizeResult(JSON.parse(text), upload, buckets, "gemini", model, metadata, expectedMoments);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", "Method not allowed.", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("MISSING_AUTH", "Missing authorization.", 401);

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return fail("UNAUTHORIZED", "Unauthorized.", 401);

    const body = await req.json().catch(() => ({}));
    const siteId = String(body.siteId ?? body.wedding_site_id ?? "").trim();
    const force = body.force === true;
    const requestedProvider = String(body.provider ?? Deno.env.get("PHOTO_AI_PROVIDER") ?? "openai").trim().toLowerCase();
    const analysisMode = String(body.mode ?? (body.force ? "vision" : "auto")).trim().toLowerCase();
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(body.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
    const uploadIds = Array.isArray(body.uploadIds) ? body.uploadIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_LIMIT) : [];

    if (!siteId) return fail("SITE_REQUIRED", "siteId is required.", 400);

    const { data: siteRow, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,user_id")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) return fail("SITE_LOOKUP_FAILED", safePhotoAnalyzeApiError("SITE_LOOKUP_FAILED"), 500);
    if (!siteRow) return fail("SITE_NOT_FOUND", "Wedding site not found.", 404);

    let hasAccess = siteRow.user_id === userData.user.id;
    if (!hasAccess) {
      const { data: collaborator } = await admin
        .from("wedding_site_collaborators")
        .select("role,permissions")
        .eq("wedding_site_id", siteId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      const role = String(collaborator?.role ?? "");
      const permissions = Array.isArray(collaborator?.permissions) ? collaborator.permissions.map(String) : [];
      hasAccess = role === "owner" || role === "coordinator" || permissions.includes("photos") || permissions.includes("media");
    }
    if (!hasAccess) return fail("FORBIDDEN", "You do not have photo analysis access for this site.", 403);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin,
      request: req,
      scope: "photo_analyze_batch",
      subject: `${userData.user.id}:${siteId}:${requestedProvider}:${analysisMode}`,
      siteId,
      maxIp: 40,
      maxSubject: 10,
      windowMinutes: 60,
    });
    if (!rateLimit.ok) return fail("RATE_LIMITED", "Too many photo analysis requests. Please try again shortly.", rateLimit.status);

    const { data: bucketsData, error: bucketError } = await admin
      .from("photo_albums")
      .select("id,name,slug,parent_album_id,hierarchy_label,is_active,ai_enabled,bucket_type,ai_description,sort_priority")
      .eq("wedding_site_id", siteId);
    if (bucketError) return fail("BUCKETS_FAILED", safePhotoAnalyzeApiError("BUCKETS_FAILED"), 500);
    const allBuckets = (bucketsData ?? []) as Bucket[];
    const buckets = allBuckets
      .filter((bucket) => bucket.ai_enabled !== false)
      .sort((a, b) => (a.sort_priority ?? 50) - (b.sort_priority ?? 50));
    if (buckets.length === 0) return fail("NO_BUCKETS", "Create at least one photo bucket first.", 400);

    let query = admin
      .from("photo_uploads")
      .select("id,wedding_site_id,photo_album_id,original_filename,guest_name,note,mime_type,size_bytes,drive_file_id,uploaded_at")
      .eq("wedding_site_id", siteId)
      .order("uploaded_at", { ascending: false })
      .limit(limit);
    if (uploadIds.length > 0) query = query.in("id", uploadIds);

    const { data: uploadData, error: uploadError } = await query;
    if (uploadError) return fail("UPLOADS_FAILED", safePhotoAnalyzeApiError("UPLOADS_FAILED"), 500);
    const uploads = (uploadData ?? []) as PhotoUpload[];
    if (uploads.length === 0) return json({ success: true, analyzed: 0, skipped: 0, results: [] });

    const { data: itineraryData } = await admin
      .from("itinerary_events")
      .select("id,event_name,event_date,start_time,end_time")
      .eq("wedding_site_id", siteId)
      .order("event_date", { ascending: true });
    const itineraryEvents = (itineraryData ?? []) as ItineraryEventForMatch[];
    const expectedMoments = buildExpectedMomentTags(itineraryEvents);

    const { data: metadataData } = await admin
      .from("photo_upload_metadata")
      .select("upload_id,taken_at,width,height,camera_make,camera_model,has_exif,has_gps,location_label,event_match_id,event_match_confidence,event_match_reason,file_sha256,perceptual_hash")
      .eq("wedding_site_id", siteId)
      .in("upload_id", uploads.map((upload) => upload.id));
    const metadataByUploadId = new Map((metadataData ?? []).map((metadata: PhotoUploadMetadata) => [metadata.upload_id, metadata]));

    const { data: existingData } = await admin
      .from("photo_upload_ai_analysis")
      .select("upload_id,source_hash")
      .eq("wedding_site_id", siteId);
    const existing = new Map((existingData ?? []).map((entry: { upload_id: string; source_hash: string }) => [entry.upload_id, entry.source_hash]));

    const { data: correctionsData } = await admin
      .from("photo_ai_bucket_corrections")
      .select("action,previous_bucket_id,suggested_bucket_id,chosen_bucket_id,confidence,reason,created_at")
      .eq("wedding_site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(40);
    const corrections = (correctionsData ?? []) as PhotoBucketCorrection[];

    const saved: unknown[] = [];
    const skipped: string[] = [];

    for (const upload of uploads) {
      let metadata = metadataByUploadId.get(upload.id) ?? null;
      if (!metadata) {
        metadata = await backfillUploadMetadata(admin, upload, itineraryEvents);
        if (metadata) metadataByUploadId.set(upload.id, metadata);
      }
      const sourceHash = await sha256Hex(JSON.stringify({
        id: upload.id,
        album: upload.photo_album_id,
        name: upload.original_filename,
        note: upload.note,
        mime: upload.mime_type,
        size: upload.size_bytes,
        path: upload.drive_file_id,
        metadataHash: metadata?.file_sha256 ?? null,
        takenAt: metadata?.taken_at ?? null,
        eventMatch: metadata?.event_match_id ?? null,
        momentPlanVersion: 1,
        expectedMomentTags: expectedMoments.map((moment) => `${moment.tag}:${moment.eventId ?? ""}`).sort(),
      }));

      if (!force && existing.get(upload.id) === sourceHash) {
        skipped.push(upload.id);
        continue;
      }

      let result: AnalysisResult;
      try {
        const metadataOnlyResult = fallbackAnalyze(upload, buckets, "metadata_fallback", metadata, expectedMoments);
        if (!upload.mime_type?.startsWith("image/")) {
          result = fallbackAnalyze(upload, buckets, "video_skipped", metadata, expectedMoments);
        } else if (!upload.drive_file_id || upload.drive_file_id.startsWith("http")) {
          result = fallbackAnalyze(upload, buckets, "storage_path_missing", metadata, expectedMoments);
        } else if (!force && analysisMode !== "vision" && shouldTrustMetadataOnly(metadataOnlyResult, metadata)) {
          result = metadataOnlyResult;
        } else {
          const { data: signed, error: signedError } = await admin.storage
            .from(HOSTED_BUCKET)
            .createSignedUrl(upload.drive_file_id, 60 * 15);
          if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "Could not create signed image URL.");

          if (requestedProvider === "gemini") {
            const { data: fileData, error: downloadError } = await admin.storage.from(HOSTED_BUCKET).download(upload.drive_file_id);
            if (downloadError || !fileData) throw new Error(downloadError?.message ?? "Could not download image for Gemini.");
            result = await analyzeWithGemini(upload, buckets, new Uint8Array(await fileData.arrayBuffer()), metadata, corrections, expectedMoments);
          } else {
            result = await analyzeWithOpenAi(upload, buckets, signed.signedUrl, metadata, corrections, expectedMoments);
          }
        }
      } catch (error) {
        result = {
          ...fallbackAnalyze(upload, buckets, "vision_failed", metadata, expectedMoments),
          status: "fallback",
          error_message: safePhotoAiErrorMessage(error),
        };
      }

      const row = {
        upload_id: upload.id,
        wedding_site_id: upload.wedding_site_id,
        photo_album_id: upload.photo_album_id,
        source_hash: sourceHash,
        analyzed_at: new Date().toISOString(),
        error_message: result.error_message ?? null,
        status: result.status,
        provider: result.provider,
        model: result.model,
        detected_moment: result.detected_moment,
        suggested_bucket_id: result.suggested_bucket_id,
        suggested_bucket_name: result.suggested_bucket_name,
        bucket_confidence: result.bucket_confidence,
        quality_score: result.quality_score,
        blur_score: result.blur_score,
        people_count_range: result.people_count_range,
        is_video: result.is_video,
        slideshow_priority: result.slideshow_priority,
        caption: result.caption,
        tags: result.tags,
        warnings: result.warnings,
        raw_result: result.raw_result,
      };

      const { data: upserted, error: saveError } = await admin
        .from("photo_upload_ai_analysis")
        .upsert(row, { onConflict: "upload_id" })
        .select(PHOTO_UPLOAD_AI_ANALYSIS_SELECT)
        .single();
      if (saveError) return fail("SAVE_FAILED", safePhotoAnalyzeApiError("SAVE_FAILED"), 500);
      if (result.internal_usage) {
        const { error: usageError } = await admin.from("internal_ai_usage_events").insert({
          wedding_site_id: upload.wedding_site_id,
          upload_id: upload.id,
          feature: "photo_vision",
          provider: result.internal_usage.provider,
          model: result.internal_usage.model,
          input_tokens: result.internal_usage.input_tokens,
          cached_input_tokens: result.internal_usage.cached_input_tokens,
          output_tokens: result.internal_usage.output_tokens,
          total_tokens: result.internal_usage.total_tokens,
          estimated_cost_usd: result.internal_usage.estimated_cost_usd,
          raw_usage: result.internal_usage.raw_usage,
        });
        if (usageError) {
          console.error("Failed to record internal AI usage", {
            upload_id: upload.id,
            wedding_site_id: upload.wedding_site_id,
            reason: "USAGE_EVENT_INSERT_FAILED",
          });
        }
      }
      saved.push(upserted);
    }

    return json({ success: true, analyzed: saved.length, skipped: skipped.length, results: saved });
  } catch (err) {
    console.error("photo-analyze-batch failed", {
      reason: "UNEXPECTED_PHOTO_ANALYSIS_FAILURE",
    });
    return fail("INTERNAL_ERROR", safePhotoAnalyzeApiError("INTERNAL_ERROR"), 500);
  }
});
