import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeUrl, isSameProduct } from './urlNormalizer.ts';
import { TargetAdapter } from './targetAdapter.ts';
import { GenericAdapter } from './genericAdapter.ts';
import type { RetailerAdapter, ProductData } from './adapterTypes.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Initialize adapters
const adapters: RetailerAdapter[] = [
  new TargetAdapter(),
  // Add more adapters here as they're implemented
  // new AmazonAdapter(),
  // new WalmartAdapter(),
];

const genericAdapter = new GenericAdapter();

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
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

async function getCached(
  db: ReturnType<typeof createClient>,
  hash: string
): Promise<ProductData | null> {
  try {
    const { data } = await db
      .from("registry_url_cache")
      .select("*")
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
  data: ProductData
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
        retailer: 'generic',
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
  if (/amazon\./i.test(hostname)) {
    const asin = extractAsin(url);
    if (asin) return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`;
  }
  return `https://logo.clearbit.com/${hostname.replace(/^www\./, '')}`;
}

async function extractProxyTextData(url: string): Promise<{ title?: string; priceAmount?: number; priceLabel?: string; imageUrl?: string } | null> {
  try {
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
    const resp = await fetch(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DayOfRegistryPreview/1.0)",
        Accept: "text/plain, text/markdown, */*",
      },
    });
    if (!resp.ok) return null;

    const body = await resp.text();
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
    const priceAmount = chosenPrice?.amount;
    const priceLabel = chosenPrice ? `${chosenPrice.currency}${chosenPrice.amount.toFixed(2)}` : undefined;

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
    return { title: finalTitle, priceAmount, priceLabel, imageUrl };
  } catch {
    return null;
  }
}

function ensureBaselineMetadata(rawUrl: string, data: ProductData): ProductData {
  const normalized = normalizeUrl(rawUrl);
  const title = data.title?.trim() || deriveFallbackTitle(rawUrl);
  const imageUrl = data.image_url || deriveFallbackImage(rawUrl, normalized.hostname);

  const missing = new Set(data.missing_fields ?? []);
  if (title) missing.delete('title'); else missing.add('title');
  if (imageUrl) missing.delete('image'); else missing.add('image');

  return {
    ...data,
    title,
    image_url: imageUrl,
    partial: missing.size > 0,
    missing_fields: missing.size ? Array.from(missing) : undefined,
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

  // Fetch HTML with browser-like headers
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: new URL(url).origin,
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (response.status === 403 || response.status === 429) {
      throw new Error(
        `This store blocks automated access (HTTP ${response.status}). Please enter details manually.`
      );
    }

    if (!response.ok) {
      throw new Error(`Page returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new Error("URL does not point to an HTML page");
    }

    const html = await response.text();

    if (html.length < 200) {
      throw new Error("Page content too short — site may require login or block access");
    }

    // Parse with adapter
    const result = await adapter.parse({
      url,
      html,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (result) {
      return result;
    }

    // If adapter failed but we have HTML, create a minimal fallback
    throw new Error("Could not extract product information from page");
  } catch (error) {
    clearTimeout(timeout);

    const proxyData = await extractProxyTextData(url);
    if (proxyData?.title) {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
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
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    const normalized = normalizeUrl(rawUrl);
    const hash = await hashUrl(normalized.canonical);

    // Check cache unless force refresh
    if (!forceRefresh) {
      const cached = await getCached(supabaseAdmin, hash);
      if (cached) {
        const normalizedCached = ensureBaselineMetadata(rawUrl, cached);
        return new Response(JSON.stringify({ ...normalizedCached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract product data
    const extracted = await extractProductData(rawUrl);
    const result = ensureBaselineMetadata(rawUrl, extracted);

    // Save to cache in background
    EdgeRuntime.waitUntil(saveCache(supabaseAdmin, hash, normalized.canonical, result));

    return new Response(JSON.stringify({ ...result, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("registry-preview error:", msg);
    return new Response(
      JSON.stringify({
        error: "Preview service unavailable. Please fill in details manually.",
        details: msg,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
