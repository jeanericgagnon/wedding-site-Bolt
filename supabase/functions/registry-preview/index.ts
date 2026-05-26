import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeUrl, isSameProduct } from './urlNormalizer.ts';
import { TargetAdapter } from './targetAdapter.ts';
import { AmazonAdapter } from './amazonAdapter.ts';
import { WalmartAdapter } from './walmartAdapter.ts';
import { IkeaAdapter } from './ikeaAdapter.ts';
import { GenericAdapter } from './genericAdapter.ts';
import { extractTitle, type RetailerAdapter, type ProductData } from './adapterTypes.ts';
import { createLinkOnlyPreview, deriveStoreName, finalizeRegistryPreview, isBadProductTitle } from './previewSafety.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Initialize adapters
const adapters: RetailerAdapter[] = [
  new TargetAdapter(),
  new AmazonAdapter(),
  new WalmartAdapter(),
  new IkeaAdapter(),
];

const genericAdapter = new GenericAdapter();
const MAX_PREVIEW_REDIRECTS = 3;
const MAX_PREVIEW_BYTES = 2_000_000;
const PREVIEW_FETCH_TIMEOUT_MS = 10_000;
const REGISTRY_PREVIEW_SIGNIN_REQUIRED_COPY = "Please sign in to preview this registry item.";
const REGISTRY_PREVIEW_URL_REQUIRED_COPY = "Enter a public product URL.";
const REGISTRY_URL_CACHE_SELECT = [
  "title",
  "image_url",
  "price_label",
  "price_amount",
  "currency",
  "availability",
  "store_name",
  "canonical_url",
  "confidence_score",
  "source_method",
  "partial",
  "missing_fields",
  "last_fetched_at",
].join(",");
const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata",
]);

class BlockedRegistryPreviewError extends Error {
  constructor(message = "Store blocked product details.") {
    super(message);
    this.name = "BlockedRegistryPreviewError";
  }
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const ipMarker = `h:${await hashRateLimitKey(`registry-preview-memory:${ip}:${Deno.env.get("SUPABASE_URL") ?? ""}`)}`;
  const entry = rateLimitMap.get(ipMarker);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipMarker, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || a === 0
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51)
    || (a === 203 && b === 0)
    || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized) return false;
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
    || normalized.startsWith("::ffff:10.")
    || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:169.254.")
    || normalized.startsWith("::ffff:192.168.")
    || /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

function isBlockedPreviewHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (!normalized) return true;
  if (METADATA_HOSTS.has(normalized)) return true;
  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || normalized.endsWith(".internal")
    || normalized.endsWith(".test")
  ) return true;
  if (normalized.includes(":")) return true;
  return isPrivateIpv4(normalized);
}

async function assertPublicPreviewTarget(url: string): Promise<URL> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Enter a public product URL.");
  }
  if (parsed.username || parsed.password || isBlockedPreviewHostname(parsed.hostname)) {
    throw new Error("Enter a public product URL.");
  }

  try {
    const addresses = await Deno.resolveDns(parsed.hostname, "A");
    if (addresses.some(isPrivateIpv4)) {
      throw new Error("Enter a public product URL.");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Enter a public product URL.") throw err;
    // DNS resolution may be unavailable for some edge runtimes; hostname rules above still apply.
  }

  try {
    const addresses = await Deno.resolveDns(parsed.hostname, "AAAA");
    if (addresses.some(isPrivateIpv6)) {
      throw new Error("Enter a public product URL.");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Enter a public product URL.") throw err;
    // DNS resolution may be unavailable for some edge runtimes; hostname rules above still apply.
  }

  return parsed;
}

async function fetchPreviewHtml(url: string): Promise<{ finalUrl: string; html: string; headers: Headers; status: number }> {
  let currentUrl = url;

  for (let redirects = 0; redirects <= MAX_PREVIEW_REDIRECTS; redirects++) {
    const parsed = await assertPublicPreviewTarget(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Referer: parsed.origin,
          "Cache-Control": "no-cache",
        },
        redirect: "manual",
      });

      const location = response.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        if (redirects >= MAX_PREVIEW_REDIRECTS) throw new Error("Too many redirects");
        currentUrl = new URL(location, parsed).toString();
        continue;
      }

      if (response.status === 401 || response.status === 403 || response.status === 429) {
        throw new BlockedRegistryPreviewError(`This store blocks automated access (HTTP ${response.status}).`);
      }
      if (!response.ok) throw new Error(`Page returned HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") ?? "";
      if (!/\b(html|xhtml)\b/i.test(contentType)) {
        throw new Error("URL does not point to an HTML page");
      }

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_PREVIEW_BYTES) {
        throw new Error("Page is too large to preview");
      }

      const html = await response.text();
      if (new TextEncoder().encode(html).byteLength > MAX_PREVIEW_BYTES) {
        throw new Error("Page is too large to preview");
      }

      return { finalUrl: parsed.toString(), html, headers: response.headers, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects");
}

// URL hash for caching
async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cache management
const CACHE_TTL_DAYS = 7;

async function hashRateLimitKey(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function enforceDurableRegistryPreviewRateLimit(
  db: ReturnType<typeof createClient>,
  userId: string,
  ip: string,
): Promise<boolean> {
  const ipHash = await hashRateLimitKey(`registry-preview:${userId}:${ip}:${Deno.env.get("SUPABASE_URL") ?? ""}`);
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { data: existingLimit } = await db
    .from("rsvp_rate_limit")
    .select("id, attempts, last_attempt_at")
    .eq("ip_hash", ipHash)
    .gte("last_attempt_at", windowStart)
    .maybeSingle();

  if (existingLimit) {
    if (existingLimit.attempts >= 30) return false;
    await db
      .from("rsvp_rate_limit")
      .update({ attempts: existingLimit.attempts + 1, last_attempt_at: new Date().toISOString() })
      .eq("id", existingLimit.id);
    return true;
  }

  const safeSubjectMarker = `h:${await hashRateLimitKey(`registry-preview-user:${userId}:${Deno.env.get("SUPABASE_URL") ?? ""}`)}`;
  await db
    .from("rsvp_rate_limit")
    .insert({ ip_hash: ipHash, guest_token: safeSubjectMarker, attempts: 1 });
  return true;
}

async function getCached(
  db: ReturnType<typeof createClient>,
  hash: string
): Promise<ProductData | null> {
  try {
    const { data } = await db
      .from("registry_url_cache")
      .select(REGISTRY_URL_CACHE_SELECT)
      .eq("normalized_url_hash", hash)
      .maybeSingle();

    if (!data) return null;

    const age = (Date.now() - new Date(data.last_fetched_at).getTime()) / 86400000;
    if (age > CACHE_TTL_DAYS) return null;

    return {
      title: data.title,
      image_url: data.image_url || undefined,
      price_label: data.price_label || undefined,
      price_amount: data.price_amount ? parseFloat(data.price_amount) : undefined,
      currency: data.currency || undefined,
      availability: data.availability || undefined,
      store_name: data.store_name,
      canonical_url: data.canonical_url,
      confidence_score: parseFloat(data.confidence_score),
      source_method: data.source_method as ProductData['source_method'],
      partial: data.partial || false,
      missing_fields: data.missing_fields || undefined,
    };
  } catch {
    return null;
  }
}

async function saveCache(
  db: ReturnType<typeof createClient>,
  hash: string,
  url: string,
  data: ProductData,
  retailer: string
): Promise<void> {
  try {
    await db.from("registry_url_cache").upsert(
      {
        normalized_url_hash: hash,
        normalized_url: url,
        title: data.title,
        image_url: data.image_url || null,
        price_label: data.price_label || null,
        price_amount: data.price_amount || null,
        currency: data.currency || null,
        availability: data.availability || null,
        brand: data.store_name,
        store_name: data.store_name,
        canonical_url: data.canonical_url,
        confidence_score: data.confidence_score,
        source_method: data.source_method,
        retailer,
        fetch_status: 'success',
        error_message: null,
        last_fetched_at: new Date().toISOString(),
        partial: data.partial || false,
        missing_fields: data.missing_fields || null,
      },
      { onConflict: "normalized_url_hash" }
    );
  } catch (e) {
    console.warn("Cache save failed:", e);
  }
}

function extractAsin(url: string): string | null {
  const m = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

function deriveFallbackTitle(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const slug = [...pathParts].reverse().find((part) => /[a-zA-Z]/.test(part)) || '';
    if (slug) {
      const cleaned = slug
        .replace(/\.html?$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      if (cleaned && cleaned.length > 2 && !/^dp$/i.test(cleaned)) return cleaned;
    }
    const host = parsed.hostname.replace(/^www\./, '').split('.')[0];
    return `${host.charAt(0).toUpperCase()}${host.slice(1)} item`;
  } catch {
    return 'Registry item';
  }
}

function deriveFallbackImage(url: string, hostname: string): string | undefined {
  const cleanHost = hostname.replace(/^www\./, '');
  if (/amazon\./i.test(hostname)) {
    const asin = extractAsin(url);
    if (asin) return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`;
  }
  if (/target\./i.test(hostname)) {
    const tcin = url.match(/A-(\d+)/i)?.[1];
    if (tcin) return `https://target.scene7.com/is/image/Target/GUEST_${tcin}?wid=1200&hei=1200&fmt=webp`;
  }
  // Clearbit first, with a universally available avatar fallback when logos are blocked.
  return `https://logo.clearbit.com/${cleanHost}`;
}

function deriveUltimateImageFallback(hostname: string, title: string): string {
  const cleanHost = hostname.replace(/^www\./, '');
  const label = encodeURIComponent(title || cleanHost);
  return `https://ui-avatars.com/api/?name=${label}&size=512&background=f3f4f6&color=374151&bold=true`;
}

function isBlockedPage(input: { html: string; title?: string | null; finalUrl?: string; status?: number }): boolean {
  if ([401, 403, 429].includes(input.status ?? 0)) return true;
  const haystack = [
    input.title ?? "",
    input.finalUrl ?? "",
    input.html.slice(0, 5000),
  ].join(" ").toLowerCase();
  return [
    "access denied",
    "robot or human",
    "verify you are human",
    "are you a robot",
    "captcha",
    "forbidden",
    "attention required",
    "akamai",
    "cloudflare",
    "perimeterx",
    "datadome",
    "bot detection",
  ].some((term) => haystack.includes(term));
}

function toDisplayableImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('images.weserv.nl')) return url;
  if (url.includes('ui-avatars.com')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=1200&fit=inside`;
  } catch {
    return undefined;
  }
}

const MIN_PRICE_CONFIDENCE_SCORE = 2;

async function extractProxyTextData(url: string): Promise<{ title?: string; priceAmount?: number; priceLabel?: string; imageUrl?: string; priceConfidence?: number } | null> {
  try {
    await assertPublicPreviewTarget(url);
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);
    const resp = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DayOfRegistryPreview/1.0)",
        Accept: "text/plain, text/markdown, */*",
      },
    }).finally(() => clearTimeout(timeout));
    if (!resp.ok) return null;
    const contentLength = Number(resp.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_PREVIEW_BYTES) return null;

    const body = await resp.text();
    if (new TextEncoder().encode(body).byteLength > MAX_PREVIEW_BYTES) return null;
    if (!body || body.length < 80) return null;

    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const titleLine = lines.find((l) => l.startsWith('Title:')) || lines.find((l) => l.startsWith('# ')) || lines[0];
    const title = titleLine
      ?.replace(/^Title:\s*/i, '')
      .replace(/^#\s*/, '')
      .replace(/\s*[|\-–—]\s*(Amazon|Etsy|Target|Walmart|Wayfair).*$/i, '')
      .replace(/^Amazon\.com:\s*/i, '')
      .trim();

    const rawPriceMatches = [...body.matchAll(/([$€£])\s?([\d,]+(?:\.\d{1,2})?)/g)];
    const rankedPrices = rawPriceMatches
      .map((m) => {
        const amount = parseFloat(m[2].replace(/,/g, ''));
        if (!Number.isFinite(amount) || amount <= 0) return null;
        const idx = m.index ?? 0;
        const context = body.slice(Math.max(0, idx - 30), Math.min(body.length, idx + 40)).toLowerCase();
        let score = 0;
        if (context.includes('price') || context.includes('sale') || context.includes('now')) score += 2;
        if (context.includes('shipping') || context.includes('/oz') || context.includes('monthly')) score -= 2;
        if (amount < 5) score -= 1;
        if (amount > 8000) score -= 2;
        return { amount, currency: m[1], score };
      })
      .filter((v): v is { amount: number; currency: string; score: number } => Boolean(v))
      .sort((a, b) => (b.score - a.score) || (b.amount - a.amount));

    const chosenPrice = rankedPrices[0];
    const hasConfidentPrice = (chosenPrice?.score ?? -99) >= MIN_PRICE_CONFIDENCE_SCORE;
    const priceAmount = hasConfidentPrice ? chosenPrice?.amount : undefined;
    const priceLabel = hasConfidentPrice && chosenPrice ? `${chosenPrice.currency}${chosenPrice.amount.toFixed(2)}` : undefined;

    const imageCandidates = [
      ...body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g),
      ...body.matchAll(/(https?:\/\/[^\s"')]+\.(?:jpg|jpeg|png|webp))/gi),
    ]
      .map((m) => m[1])
      .filter(Boolean)
      .filter((u) => !/(logo|icon|sprite|favicon|1x1|blank)/i.test(u));

    const imageUrl = imageCandidates[0];

    const etsySlugMatch = url.match(/etsy\.com\/listing\/\d+\/([^/?#]+)/i);
    const etsySlugTitle = etsySlugMatch
      ? etsySlugMatch[1].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : undefined;

    const finalTitle = title && !/^etsy\.com$/i.test(title) ? title : etsySlugTitle;

    if (!finalTitle) return null;
    return { title: finalTitle, priceAmount, priceLabel, imageUrl, priceConfidence: chosenPrice?.score };
  } catch {
    return null;
  }
}

function tuneConfidenceScore(base: number, source: ProductData['source_method'], missingCount: number): number {
  let score = Number.isFinite(base) ? base : 0.35;

  // Method priors
  if (source === 'retailer_adapter') score = Math.max(score, 0.72);
  if (source === 'jsonld') score = Math.max(score, 0.66);
  if (source === 'opengraph') score = Math.max(score, 0.5);
  if (source === 'fallback') score = Math.min(score, 0.45);
  if (source === 'link_only') score = Math.min(score, 0.4);

  // Penalize missing fields to keep confidence interpretable in UI.
  score -= Math.min(0.3, missingCount * 0.12);

  if (score < 0.15) return 0.15;
  if (score > 0.98) return 0.98;
  return Number(score.toFixed(2));
}

function ensureBaselineMetadata(rawUrl: string, data: ProductData): ProductData {
  const safeData = finalizeRegistryPreview(rawUrl, data);

  if (safeData.display_mode === "link_card" || safeData.source_method === "link_only") {
    return {
      ...safeData,
      title: safeData.title || `Gift from ${deriveStoreName(rawUrl)}`,
      image_url: undefined,
      price_label: undefined,
      price_amount: undefined,
      partial: false,
      missing_fields: [],
    };
  }

  const normalized = normalizeUrl(rawUrl);
  const title = safeData.title?.trim() || deriveFallbackTitle(rawUrl);
  const rawImageUrl = safeData.image_url || deriveFallbackImage(rawUrl, normalized.hostname) || deriveUltimateImageFallback(normalized.hostname, title);
  const imageUrl = toDisplayableImageUrl(rawImageUrl) || deriveUltimateImageFallback(normalized.hostname, title);

  const missing = new Set(safeData.missing_fields ?? []);
  if (title) missing.delete('title'); else missing.add('title');
  if (imageUrl) missing.delete('image'); else missing.add('image');

  const missingList = missing.size ? Array.from(missing) : undefined;
  const confidence = tuneConfidenceScore(safeData.confidence_score, safeData.source_method, missing.size);

  return {
    ...safeData,
    title,
    image_url: imageUrl,
    confidence_score: confidence,
    partial: missing.size > 0,
    missing_fields: missingList,
  };
}

// Main extraction function
async function extractProductData(url: string): Promise<ProductData> {
  const normalized = normalizeUrl(url);

  // Select appropriate adapter
  let adapter: RetailerAdapter = genericAdapter;
  for (const a of adapters) {
    if (a.canHandle(url)) {
      adapter = a;
      break;
    }
  }

  console.log(`Using ${adapter.name} adapter for ${url}`);

  try {
    const { finalUrl, html, headers, status } = await fetchPreviewHtml(url);

    if (html.length < 200) {
      throw new Error("Page content too short — site may require login or block access");
    }

    if (isBlockedPage({ html, title: extractTitle(html), finalUrl, status })) {
      throw new BlockedRegistryPreviewError();
    }

    // Parse with adapter
    const result = await adapter.parse({
      url: finalUrl,
      html,
      headers: Object.fromEntries(headers.entries()),
    });

    if (result) {
      return result;
    }

    // If adapter failed but we have HTML, create a minimal fallback
    throw new Error("Could not extract product information from page");
  } catch (error) {
    if (error instanceof BlockedRegistryPreviewError) {
      return createLinkOnlyPreview(url, "blocked_by_store");
    }

    const proxyData = await extractProxyTextData(url);
    if (proxyData?.title && !isBadProductTitle(proxyData.title)) {
      const fallbackImage = proxyData.imageUrl || deriveFallbackImage(url, normalized.hostname);
      const missing: string[] = [];
      if (!fallbackImage) missing.push('image');
      if (!proxyData.priceAmount) missing.push('price');
      return {
        title: proxyData.title,
        store_name: normalized.hostname
          .replace(/^www\./, "")
          .replace(/\.(com|net|org|co\.uk)$/, "")
          .split(".")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" "),
        canonical_url: normalized.canonical,
        image_url: fallbackImage,
        price_amount: proxyData.priceAmount,
        price_label: proxyData.priceLabel,
        confidence_score: proxyData.imageUrl && proxyData.priceAmount ? 0.58 : proxyData.priceAmount ? 0.46 : 0.4,
        source_method: "fallback",
        partial: missing.length > 0,
        missing_fields: missing,
      };
    }

    // Extract a basic title from URL slug
    const fallbackTitle = (() => {
      try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        const productSlug = pathParts.find((part) => part.includes("-") && part.length > 5);
        if (productSlug) {
          return productSlug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
        return "Product";
      } catch {
        return "Product";
      }
    })();

    if (isBadProductTitle(fallbackTitle)) {
      return createLinkOnlyPreview(url, "weak_product_metadata");
    }

    const fallbackImage = deriveFallbackImage(url, normalized.hostname);
    return {
      title: fallbackTitle,
      store_name: normalized.hostname
        .replace(/^www\./, "")
        .replace(/\.(com|net|org|co\.uk)$/, "")
        .split(".")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
      canonical_url: normalized.canonical,
      image_url: fallbackImage,
      confidence_score: fallbackImage ? 0.28 : 0.2,
      source_method: "fallback",
      partial: true,
      missing_fields: fallbackImage ? ["price"] : ["image", "price"],
    };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: REGISTRY_PREVIEW_SIGNIN_REQUIRED_COPY }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: REGISTRY_PREVIEW_SIGNIN_REQUIRED_COPY }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await checkRateLimit(ip))) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (!(await enforceDurableRegistryPreviewRateLimit(supabaseAdmin, user.id, ip))) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request
    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    const forceRefresh = body?.force_refresh === true;

    if (!rawUrl) {
      return new Response(JSON.stringify({ error: REGISTRY_PREVIEW_URL_REQUIRED_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    let normalized;
    try {
      normalized = normalizeUrl(rawUrl);
    } catch {
      return json({ error: "Enter a public product URL." }, 400);
    }
    const hash = await hashUrl(normalized.canonical);

    // Check cache unless force refresh
    if (!forceRefresh) {
      const cached = await getCached(supabaseAdmin, hash);
      if (cached) {
        const normalizedCached = ensureBaselineMetadata(rawUrl, isBadProductTitle(cached.title)
          ? createLinkOnlyPreview(normalized.canonical, "weak_cached_product_metadata")
          : cached);
        return new Response(JSON.stringify({ ...normalizedCached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract product data
    const extracted = await extractProductData(normalized.canonical);
    const result = ensureBaselineMetadata(
      normalized.canonical,
      isBadProductTitle(extracted.title) ? createLinkOnlyPreview(normalized.canonical, "weak_product_metadata") : extracted,
    );

    // Save to cache in background
    EdgeRuntime.waitUntil(saveCache(supabaseAdmin, hash, normalized.canonical, result, normalized.retailer));

    return new Response(JSON.stringify({ ...result, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err: unknown) {
    console.error("REGISTRY_PREVIEW_UNEXPECTED_FAILED", { reason: "PREVIEW_FETCH_FAILED" });
    return new Response(
      JSON.stringify({
        error: "Preview service unavailable. Please fill in details manually.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
