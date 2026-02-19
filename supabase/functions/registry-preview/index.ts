import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type RetailerSlug = "amazon" | "target" | "walmart" | "crateandbarrel" | "potterybarn" | "williams-sonoma" | "etsy" | "shopify" | "generic";
type SourceMethod = "jsonld" | "og" | "adapter" | "heuristic";
type FetchStatus = "success" | "blocked" | "timeout" | "parse_failure" | "unsupported";

interface PreviewResult {
  title: string | null;
  description: string | null;
  price_label: string | null;
  price_amount: number | null;
  currency: string;
  availability: string;
  brand: string;
  store_name: string | null;
  image_url: string | null;
  canonical_url: string | null;
  confidence_score: number;
  source_method: SourceMethod;
  retailer: RetailerSlug;
  fetch_status: FetchStatus;
  error: string | null;
}

// ─────────────────────────────────────────────
// URL Normalization + Retailer Detection
// ─────────────────────────────────────────────

const TRACKING_PARAMS = [
  "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
  "ref","tag","linkCode","linkId","ascsubtag","asc_campaign","asc_source",
  "mcid","cid","sid","affid","affiliate","gclid","fbclid","msclkid",
  "yclid","dclid","zanpid","ranMID","ranEAID","ranSiteID",
  "feature","_encoding","psc","th","srs","pdp_rd_p","pdp_rd_r",
];

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return withScheme;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function detectRetailer(url: string): RetailerSlug {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (host.includes("amazon.")) return "amazon";
    if (host.includes("target.com")) return "target";
    if (host.includes("walmart.com")) return "walmart";
    if (host.includes("crateandbarrel.com")) return "crateandbarrel";
    if (host.includes("potterybarn.com") || host.includes("pbteen.com") || host.includes("pbkids.com")) return "potterybarn";
    if (host.includes("williams-sonoma.com") || host.includes("williamssonoma.com")) return "williams-sonoma";
    if (host.includes("etsy.com")) return "etsy";
    return "generic";
  } catch {
    return "generic";
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────
// URL Hash
// ─────────────────────────────────────────────

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────
// HTML Utilities
// ─────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m: string, n: string) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/gi, "");
}

function metaAttr(html: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]?.trim()) return decodeEntities(m[1].trim());
  }
  return null;
}

function parsePrice(raw: string): { amount: number | null; currency: string } {
  if (!raw) return { amount: null, currency: "" };
  const cleaned = raw.replace(/,/g, "").trim();
  const currencySymbols: Record<string, string> = { "$": "USD", "£": "GBP", "€": "EUR", "¥": "JPY" };
  let currency = "";
  for (const [sym, code] of Object.entries(currencySymbols)) {
    if (cleaned.startsWith(sym)) { currency = code; break; }
  }
  if (!currency) {
    const isoMatch = cleaned.match(/\b(USD|GBP|EUR|JPY|AUD|CAD)\b/i);
    if (isoMatch) currency = isoMatch[1].toUpperCase();
  }
  const match = cleaned.match(/([\d]+(?:\.\d+)?)/);
  const amount = match ? parseFloat(match[1]) : null;
  return { amount: (amount != null && !isNaN(amount)) ? amount : null, currency };
}

function sanitizeText(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 500) || null;
}

function sanitizeUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  try {
    const u = new URL(s.trim());
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch { /* ignore */ }
  if (s.startsWith("//")) return `https:${s}`;
  return null;
}

// ─────────────────────────────────────────────
// JSON-LD Extractor
// ─────────────────────────────────────────────

interface LdResult {
  title: string | null;
  description: string | null;
  image_url: string | null;
  price_label: string | null;
  price_amount: number | null;
  currency: string;
  availability: string;
  brand: string;
}

function extractJsonLd(html: string): LdResult | null {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const raw = JSON.parse(s[1]);
      const nodes: unknown[] = Array.isArray(raw) ? raw : raw?.["@graph"] ? raw["@graph"] : [raw];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        const type = ((n["@type"] as string) ?? "").toLowerCase();
        if (!type.includes("product")) continue;

        let priceLabel: string | null = null;
        let priceAmount: number | null = null;
        let currency = "";
        let availability = "";

        const offersRaw = n["offers"];
        const offer = Array.isArray(offersRaw)
          ? (offersRaw as Record<string, unknown>[])[0]
          : (offersRaw as Record<string, unknown> | undefined);

        if (offer) {
          const p = offer["price"];
          if (typeof p === "number") {
            priceAmount = p;
            priceLabel = `${p}`;
          } else if (typeof p === "string" && p) {
            priceLabel = p;
            const parsed = parsePrice(p);
            priceAmount = parsed.amount;
            currency = parsed.currency;
          }
          if (offer["priceCurrency"]) currency = String(offer["priceCurrency"]).toUpperCase();
          const avail = offer["availability"] as string | undefined;
          if (avail) {
            availability = avail.includes("InStock") || avail.includes("in_stock") ? "In Stock" : avail.replace(/^.*\//, "");
          }
        }

        if (priceLabel && currency && priceAmount != null) {
          priceLabel = `${currency === "USD" ? "$" : currency + " "}${priceAmount.toFixed(2)}`;
        }

        const imgRaw = n["image"];
        const image_url = sanitizeUrl(
          typeof imgRaw === "string" ? imgRaw
            : Array.isArray(imgRaw) ? (imgRaw as string[])[0]
            : (typeof imgRaw === "object" && imgRaw) ? ((imgRaw as Record<string, string>)["url"] ?? null)
            : null
        );

        const brandRaw = n["brand"];
        const brand =
          typeof brandRaw === "string" ? brandRaw
          : (typeof brandRaw === "object" && brandRaw) ? ((brandRaw as Record<string, string>)["name"] ?? "")
          : "";

        return {
          title: sanitizeText(n["name"] as string),
          description: sanitizeText(n["description"] as string),
          image_url,
          price_label: priceLabel,
          price_amount: priceAmount,
          currency,
          availability,
          brand: brand.slice(0, 100),
        };
      }
    } catch { /* skip malformed */ }
  }
  return null;
}

// ─────────────────────────────────────────────
// OpenGraph Extractor
// ─────────────────────────────────────────────

interface OgResult {
  title: string | null;
  description: string | null;
  image_url: string | null;
  store_name: string | null;
  canonical_url: string | null;
}

function extractOG(html: string): OgResult {
  const head = html.slice(0, 50000);
  return {
    title: metaAttr(head, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    ]),
    description: metaAttr(head, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    ]),
    image_url: sanitizeUrl(metaAttr(head, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ])),
    store_name: metaAttr(head, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    ]),
    canonical_url: sanitizeUrl(
      metaAttr(head, [
        /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
      ]) ??
      metaAttr(head, [
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
      ])
    ),
  };
}

// ─────────────────────────────────────────────
// Retailer Adapters
// ─────────────────────────────────────────────

interface AdapterResult {
  title: string | null;
  description: string | null;
  image_url: string | null;
  price_label: string | null;
  price_amount: number | null;
  currency: string;
  availability: string;
  brand: string;
  store_name: string;
  confidence: number;
}

function tryAmazonAdapter(html: string, url: string): AdapterResult | null {
  try {
    const title = metaAttr(html, [
      /<span[^>]+id=["']productTitle["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/span>/i,
      /<h1[^>]*class=["'][^"']*product-title[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i,
    ]);
    if (!title) return null;

    const priceStr = metaAttr(html, [
      /<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(\$[\d,]+\.?\d*)\s*<\/span>/i,
      /["']priceAmount["']:\s*["']([^"']+)["']/i,
    ]);

    const { amount } = parsePrice(priceStr ?? "");
    const image_url = sanitizeUrl(metaAttr(html, [
      /<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i,
      /<img[^>]+id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i,
    ]));

    const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    void asin;

    return {
      title: sanitizeText(title),
      description: null,
      image_url,
      price_label: priceStr ?? null,
      price_amount: amount,
      currency: "USD",
      availability: html.includes("In Stock") || html.includes("in stock") ? "In Stock" : "",
      brand: metaAttr(html, [/["']brand["']:\s*["']([^"']{1,80})["']/i]) ?? "",
      store_name: "Amazon",
      confidence: 0.75,
    };
  } catch { return null; }
}

function tryTargetAdapter(html: string): AdapterResult | null {
  try {
    const title = metaAttr(html, [
      /<h1[^>]*data-test=["'][^"']*product-title[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i,
    ]);
    if (!title) return null;
    const priceStr = metaAttr(html, [
      /["']formatted_current_price["']:\s*["']([^"']+)["']/i,
    ]);
    const { amount } = parsePrice(priceStr ?? "");
    return { title: sanitizeText(title), description: null, image_url: null, price_label: priceStr ?? null, price_amount: amount, currency: "USD", availability: "", brand: "", store_name: "Target", confidence: 0.65 };
  } catch { return null; }
}

function tryWalmartAdapter(html: string): AdapterResult | null {
  try {
    const title = metaAttr(html, [/<h1[^>]*itemprop=["']name["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i]);
    if (!title) return null;
    const priceStr = metaAttr(html, [/["']currentPrice["']:\s*([\d.]+)/i]);
    const { amount } = parsePrice(priceStr ?? "");
    return { title: sanitizeText(title), description: null, image_url: null, price_label: priceStr ? `$${amount ?? priceStr}` : null, price_amount: amount, currency: "USD", availability: "", brand: "", store_name: "Walmart", confidence: 0.65 };
  } catch { return null; }
}

function tryCrateAdapter(html: string): AdapterResult | null {
  try {
    const title = metaAttr(html, [/<h1[^>]*class=["'][^"']*product-name[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i]);
    if (!title) return null;
    const priceStr = metaAttr(html, [/<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*(\$[\d,]+\.?\d*)/i]);
    const { amount } = parsePrice(priceStr ?? "");
    return { title: sanitizeText(title), description: null, image_url: null, price_label: priceStr ?? null, price_amount: amount, currency: "USD", availability: "", brand: "Crate & Barrel", store_name: "Crate & Barrel", confidence: 0.65 };
  } catch { return null; }
}

function tryPbAdapter(html: string, retailer: RetailerSlug): AdapterResult | null {
  try {
    const title = metaAttr(html, [/<h1[^>]*class=["'][^"']*pip-summary__title[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i, /<h1[^>]*class=["'][^"']*product-name[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i]);
    if (!title) return null;
    const priceStr = metaAttr(html, [/<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*(\$[\d,]+\.?\d*)/i]);
    const { amount } = parsePrice(priceStr ?? "");
    const storeName = retailer === "potterybarn" ? "Pottery Barn" : "Williams-Sonoma";
    return { title: sanitizeText(title), description: null, image_url: null, price_label: priceStr ?? null, price_amount: amount, currency: "USD", availability: "", brand: storeName, store_name: storeName, confidence: 0.6 };
  } catch { return null; }
}

function tryEtsyAdapter(html: string): AdapterResult | null {
  try {
    const title = metaAttr(html, [
      /<h1[^>]*class=["'][^"']*wt-text-body-03[^"']*["'][^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i,
      /<h1[^>]*data-buy-box-listing-title[^>]*>\s*([\s\S]{3,300}?)\s*<\/h1>/i,
    ]);
    if (!title) return null;
    const priceStr = metaAttr(html, [/<p[^>]*class=["'][^"']*wt-text-title-03[^"']*["'][^>]*>\s*([\s\S]{1,40}?)\s*<\/p>/i]);
    const { amount } = parsePrice(priceStr ?? "");
    return { title: sanitizeText(title), description: null, image_url: null, price_label: priceStr ?? null, price_amount: amount, currency: "USD", availability: "In Stock", brand: "", store_name: "Etsy", confidence: 0.65 };
  } catch { return null; }
}

function tryShopifyAdapter(html: string): AdapterResult | null {
  try {
    const jsonMatch = html.match(/ShopifyAnalytics\.meta\s*=\s*(\{[\s\S]*?\});/);
    if (jsonMatch) {
      const meta = JSON.parse(jsonMatch[1]);
      const product = meta?.product;
      if (product?.title) {
        const variant = product.variants?.[0];
        const priceRaw = variant?.price ? (variant.price / 100).toFixed(2) : null;
        return {
          title: sanitizeText(product.title),
          description: sanitizeText(product.description),
          image_url: sanitizeUrl(product.featured_image ?? null),
          price_label: priceRaw ? `$${priceRaw}` : null,
          price_amount: priceRaw ? parseFloat(priceRaw) : null,
          currency: "USD",
          availability: variant?.available ? "In Stock" : "Out of Stock",
          brand: product.vendor ?? "",
          store_name: metaAttr(html, [/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i]) ?? "",
          confidence: 0.8,
        };
      }
    }
    return null;
  } catch { return null; }
}

function runAdapter(html: string, url: string, retailer: RetailerSlug): AdapterResult | null {
  switch (retailer) {
    case "amazon": return tryAmazonAdapter(html, url);
    case "target": return tryTargetAdapter(html);
    case "walmart": return tryWalmartAdapter(html);
    case "crateandbarrel": return tryCrateAdapter(html);
    case "potterybarn": return tryPbAdapter(html, retailer);
    case "williams-sonoma": return tryPbAdapter(html, retailer);
    case "etsy": return tryEtsyAdapter(html);
    case "shopify": return tryShopifyAdapter(html);
    default: return null;
  }
}

// ─────────────────────────────────────────────
// Heuristic Price Fallback
// ─────────────────────────────────────────────

function heuristicPrice(html: string): string | null {
  const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const patterns = [/([$£€]\s*[\d,]+(?:\.\d{2})?)/, /([\d,]+\.\d{2}\s*(?:USD|GBP|EUR|AUD|CAD))/i];
  for (const p of patterns) {
    const m = plainText.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ─────────────────────────────────────────────
// Confidence Scoring
// ─────────────────────────────────────────────

function scoreResult(r: Partial<PreviewResult>): number {
  let score = 0;
  if (r.title) score += 0.35;
  if (r.image_url) score += 0.25;
  if (r.price_amount != null || r.price_label) score += 0.25;
  if (r.store_name) score += 0.1;
  if (r.description) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}

// ─────────────────────────────────────────────
// DB Cache
// ─────────────────────────────────────────────

const CACHE_TTL_DAYS = 7;

async function getCached(db: ReturnType<typeof createClient>, hash: string): Promise<PreviewResult | null> {
  try {
    const { data } = await db.from("registry_url_cache").select("*").eq("normalized_url_hash", hash).maybeSingle();
    if (!data) return null;
    const age = (Date.now() - new Date(data.last_fetched_at).getTime()) / 86400000;
    if (age > CACHE_TTL_DAYS) return null;
    return {
      title: data.title, description: data.description, price_label: data.price_label,
      price_amount: data.price_amount ? parseFloat(data.price_amount) : null,
      currency: data.currency, availability: data.availability, brand: data.brand,
      store_name: data.store_name, image_url: data.image_url, canonical_url: data.canonical_url,
      confidence_score: parseFloat(data.confidence_score),
      source_method: data.source_method as SourceMethod, retailer: data.retailer as RetailerSlug,
      fetch_status: data.fetch_status as FetchStatus, error: data.error_message,
    };
  } catch { return null; }
}

async function saveCache(db: ReturnType<typeof createClient>, hash: string, url: string, r: PreviewResult): Promise<void> {
  try {
    await db.from("registry_url_cache").upsert({
      normalized_url_hash: hash, normalized_url: url,
      title: r.title, description: r.description, image_url: r.image_url,
      price_label: r.price_label, price_amount: r.price_amount,
      currency: r.currency, availability: r.availability, brand: r.brand,
      store_name: r.store_name, canonical_url: r.canonical_url,
      confidence_score: r.confidence_score, source_method: r.source_method,
      retailer: r.retailer, fetch_status: r.fetch_status, error_message: r.error,
      last_fetched_at: new Date().toISOString(),
    }, { onConflict: "normalized_url_hash" });
  } catch (e) { console.warn("cache save failed:", e); }
}

// ─────────────────────────────────────────────
// Main Extraction Pipeline
// ─────────────────────────────────────────────

function makeErrorResult(url: string, status: FetchStatus, errorMsg: string): PreviewResult {
  return {
    title: null, description: null, price_label: null, price_amount: null,
    currency: "", availability: "", brand: "",
    store_name: extractDomain(url),
    image_url: null, canonical_url: url,
    confidence_score: 0, source_method: "heuristic",
    retailer: detectRetailer(url), fetch_status: status, error: errorMsg,
  };
}

async function fetchAndExtract(url: string): Promise<PreviewResult> {
  const normalized = normalizeUrl(url);
  if (!isValidUrl(normalized)) return makeErrorResult(url, "unsupported", "Invalid URL");

  const retailer = detectRetailer(normalized);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  let html: string;
  let finalUrl = normalized;

  try {
    const resp = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    finalUrl = resp.url || normalized;

    if (resp.status === 403 || resp.status === 429) {
      return makeErrorResult(normalized, "blocked", `This store blocks automated access (HTTP ${resp.status}). Please enter details manually.`);
    }
    if (!resp.ok) return makeErrorResult(normalized, "parse_failure", `Page returned HTTP ${resp.status}`);
    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return makeErrorResult(normalized, "unsupported", "URL does not point to an HTML page");
    html = await resp.text();
    if (html.length < 200) return makeErrorResult(normalized, "blocked", "Page content too short — site may require login");
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "Fetch failed";
    const isAbort = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("signal");
    return makeErrorResult(normalized, isAbort ? "timeout" : "parse_failure", isAbort ? "Request timed out" : "Could not reach the page");
  }

  const head = html.slice(0, 65000);

  const ld = extractJsonLd(head);
  const og = extractOG(head);
  const adapter = runAdapter(head, finalUrl, retailer);
  const fallbackPrice = (!ld?.price_label && !adapter?.price_label) ? heuristicPrice(head) : null;

  const title = ld?.title ?? adapter?.title ?? og.title ?? null;
  const description = ld?.description ?? adapter?.description ?? og.description ?? null;
  const image_url = ld?.image_url ?? adapter?.image_url ?? og.image_url ?? null;
  const price_label = ld?.price_label ?? adapter?.price_label ?? fallbackPrice ?? null;
  const price_amount = ld?.price_amount ?? adapter?.price_amount ?? (fallbackPrice ? parsePrice(fallbackPrice).amount : null);
  const currency = ld?.currency || adapter?.currency || "";
  const availability = ld?.availability || adapter?.availability || "";
  const brand = ld?.brand || adapter?.brand || "";
  const store_name = adapter?.store_name ?? og.store_name ?? extractDomain(finalUrl) ?? null;
  const canonical_url = og.canonical_url ?? finalUrl;

  let source_method: SourceMethod = "heuristic";
  if (ld?.title) source_method = "jsonld";
  else if (adapter?.title) source_method = "adapter";
  else if (og.title) source_method = "og";

  const partial: PreviewResult = {
    title, description, price_label, price_amount, currency, availability, brand,
    store_name, image_url, canonical_url, source_method, retailer, fetch_status: "success", error: null,
    confidence_score: 0,
  };
  partial.confidence_score = scoreResult(partial);
  return partial;
}

// ─────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    const forceRefresh = body?.force_refresh === true;

    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "url is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    if (!isValidUrl(normalizedUrl)) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hash = await hashUrl(normalizedUrl);

    if (!forceRefresh) {
      const cached = await getCached(supabaseAdmin, hash);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const result = await fetchAndExtract(normalizedUrl);
    EdgeRuntime.waitUntil(saveCache(supabaseAdmin, hash, normalizedUrl, result));

    return new Response(JSON.stringify({ ...result, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("registry-preview error:", msg);
    return new Response(JSON.stringify({ error: "Preview service unavailable. Please fill in details manually." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
