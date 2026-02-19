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

    // Create fallback with whatever we can derive from the URL
    const isAbort =
      error instanceof Error &&
      (error.message.toLowerCase().includes("abort") ||
        error.message.toLowerCase().includes("signal"));

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

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      title: fallbackTitle,
      store_name: normalized.hostname
        .replace(/^www\./, "")
        .replace(/\.(com|net|org|co\.uk)$/, "")
        .split(".")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
      canonical_url: normalized.canonical,
      confidence_score: 0.2,
      source_method: "fallback",
      partial: true,
      missing_fields: ["image", "price"],
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
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract product data
    const result = await extractProductData(rawUrl);

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
