import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PreviewResult {
  title: string | null;
  price_label: string | null;
  price_amount: number | null;
  image_url: string | null;
  merchant: string | null;
  canonical_url: string | null;
  error: string | null;
}

const cache = new Map<string, { result: PreviewResult; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  const match = cleaned.match(/[\d]+(?:\.\d+)?/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  return isNaN(val) ? null : val;
}

function attr(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractFromOG(html: string): Partial<PreviewResult> {
  return {
    title:
      attr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i),
    image_url:
      attr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i),
    merchant:
      attr(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i),
    canonical_url:
      attr(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i),
  };
}

function extractFromTwitter(html: string): Partial<PreviewResult> {
  return {
    title:
      attr(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i),
    image_url:
      attr(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
      attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i),
  };
}

function extractFromJsonLd(html: string): Partial<PreviewResult> {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const data = JSON.parse(s[1]);
      const nodes: unknown[] = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        const type = (n["@type"] as string | undefined) ?? "";
        if (!type.toLowerCase().includes("product")) continue;

        let priceLabel: string | null = null;
        let priceAmount: number | null = null;

        const offers = n["offers"] as Record<string, unknown> | Record<string, unknown>[] | undefined;
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer && typeof offer === "object") {
            const o = offer as Record<string, unknown>;
            const priceProp = o["price"];
            if (typeof priceProp === "number") {
              priceAmount = priceProp;
              const currency = (o["priceCurrency"] as string | undefined) ?? "";
              priceLabel = currency ? `${currency} ${priceProp}` : String(priceProp);
            } else if (typeof priceProp === "string") {
              priceLabel = priceProp;
              priceAmount = parsePrice(priceProp);
            }
          }
        }

        return {
          title: typeof n["name"] === "string" ? n["name"] : null,
          image_url:
            typeof n["image"] === "string"
              ? n["image"]
              : Array.isArray(n["image"])
              ? (n["image"] as string[])[0] ?? null
              : null,
          price_label: priceLabel,
          price_amount: priceAmount,
        };
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return {};
}

function extractFromHtmlTitle(html: string): string | null {
  return attr(html, /<title[^>]*>([^<]+)<\/title>/i);
}

function extractCanonicalLink(html: string): string | null {
  return attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    attr(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
}

function extractPriceFallback(html: string): string | null {
  const patterns = [
    /class=["'][^"']*price[^"']*["'][^>]*>[\s]*([^\s<][^<]{0,30})/i,
    /([$£€]\s*[\d,]+(?:\.\d{2})?)/,
    /([\d,]+\.\d{2}\s*(?:USD|GBP|EUR|AUD|CAD))/i,
  ];
  const plainText = html.replace(/<[^>]+>/g, " ");
  for (const p of patterns) {
    const m = plainText.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

async function fetchPreview(rawUrl: string): Promise<PreviewResult> {
  const url = normalizeUrl(rawUrl);

  if (!isValidUrl(url)) {
    return { title: null, price_label: null, price_amount: null, image_url: null, merchant: null, canonical_url: null, error: "Invalid URL" };
  }

  const cacheKey = url.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WeddingSiteBot/1.0; +registry-preview)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return { title: null, price_label: null, price_amount: null, image_url: null, merchant: extractDomain(url), canonical_url: url, error: `HTTP ${resp.status}` };
    }

    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.includes("html")) {
      return { title: null, price_label: null, price_amount: null, image_url: null, merchant: extractDomain(url), canonical_url: url, error: "Non-HTML response" };
    }

    const text = await resp.text();
    const head = text.slice(0, 40000);

    const og = extractFromOG(head);
    const tw = extractFromTwitter(head);
    const ld = extractFromJsonLd(head);
    const titleFallback = extractFromHtmlTitle(head);
    const canonFallback = extractCanonicalLink(head);
    const priceFallback = extractPriceFallback(head);

    const title = og.title ?? ld.title ?? tw.title ?? titleFallback ?? null;
    const image_url = og.image_url ?? ld.image_url ?? tw.image_url ?? null;
    const merchant = og.merchant ?? extractDomain(url);
    const canonical_url = og.canonical_url ?? canonFallback ?? resp.url;

    const price_label = ld.price_label ?? priceFallback;
    let price_amount = ld.price_amount ?? null;
    if (price_label && price_amount === null) {
      price_amount = parsePrice(price_label);
    }

    const result: PreviewResult = {
      title,
      price_label,
      price_amount,
      image_url,
      merchant,
      canonical_url,
      error: null,
    };

    cache.set(cacheKey, { result, ts: Date.now() });
    return result;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Fetch failed";
    const isAbort = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
    return {
      title: null,
      price_label: null,
      price_amount: null,
      image_url: null,
      merchant: extractDomain(url),
      canonical_url: url,
      error: isAbort ? "Request timed out" : "Could not fetch page",
    };
  }
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("registry-preview auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await fetchPreview(url);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
