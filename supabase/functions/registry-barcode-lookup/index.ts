import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { mergeRegistryBarcodeProducts } from "../../../src/lib/registryBarcodeMatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegistryBarcodeFormat =
  | "upc_a"
  | "upc_e"
  | "ean_13"
  | "ean_8"
  | "gtin_14"
  | "isbn_10"
  | "isbn_13";

type BarcodeValidation =
  | { ok: true; raw: string; normalized: string; format: RegistryBarcodeFormat; digits: string }
  | { ok: false; reason: string };

type LookupProduct = {
  title: string | null;
  brand: string | null;
  image_url: string | null;
  category: string | null;
  description: string | null;
  estimated_price_cents: number | null;
  currency: string | null;
  product_url: string | null;
  selected_retailer: string | null;
  provider: string | null;
  confidence_score: number;
  provider_path?: string[];
  retailer_options: Array<{ label: string; url: string | null; price_cents: number | null; currency: string | null; is_best_match?: boolean }>;
  raw_payload: Record<string, unknown> | null;
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MISS_TTL_DAYS = 14;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isRepeating(value: string) {
  return /^(\d)\1+$/.test(value);
}

function computeModulo10CheckDigit(body: string) {
  const digits = body.split("").reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => total + (digit * (index % 2 === 0 ? 3 : 1)), 0);
  return (10 - (sum % 10)) % 10;
}

function isValidModulo10(value: string) {
  if (!/^\d+$/.test(value) || value.length < 8) return false;
  return computeModulo10CheckDigit(value.slice(0, -1)) === Number(value.slice(-1));
}

function computeIsbn10CheckDigit(body: string) {
  const digits = body.split("").map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * (10 - index), 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return "X";
  if (remainder === 11) return "0";
  return String(remainder % 11);
}

function isValidIsbn10(value: string) {
  if (!/^\d{9}[\dX]$/i.test(value)) return false;
  return computeIsbn10CheckDigit(value.slice(0, 9)) === value.slice(-1).toUpperCase();
}

function expandUpcE(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  const [numberSystem, m1, m2, m3, m4, m5, m6] = value.split("");
  let expandedBody = "";
  switch (m6) {
    case "0":
    case "1":
    case "2":
      expandedBody = `${numberSystem}${m1}${m2}${m6}0000${m3}${m4}${m5}`;
      break;
    case "3":
      expandedBody = `${numberSystem}${m1}${m2}${m3}00000${m4}${m5}`;
      break;
    case "4":
      expandedBody = `${numberSystem}${m1}${m2}${m3}${m4}00000${m5}`;
      break;
    default:
      expandedBody = `${numberSystem}${m1}${m2}${m3}${m4}${m5}0000${m6}`;
      break;
  }
  const expanded = `${expandedBody}${value.slice(-1)}`;
  return isValidModulo10(expanded) ? expanded : null;
}

function normalizeBarcode(rawValue: string): BarcodeValidation {
  const raw = rawValue.trim();
  const digits = digitsOnly(raw);
  if (!digits) return { ok: false, reason: "Enter a barcode." };
  if (isRepeating(digits)) return { ok: false, reason: "That barcode does not look valid." };

  if (digits.length === 8 && isValidModulo10(digits)) {
    const upcA = expandUpcE(digits);
    if (upcA) return { ok: true, raw, normalized: upcA, format: "upc_e", digits };
    return { ok: true, raw, normalized: digits, format: "ean_8", digits };
  }
  if (digits.length === 12 && isValidModulo10(digits)) return { ok: true, raw, normalized: digits, format: "upc_a", digits };
  if (digits.length === 13 && digits.startsWith("97") && isValidModulo10(digits)) return { ok: true, raw, normalized: digits, format: "isbn_13", digits };
  if (digits.length === 13 && isValidModulo10(digits)) return { ok: true, raw, normalized: digits, format: "ean_13", digits };
  if (digits.length === 14 && isValidModulo10(digits)) return { ok: true, raw, normalized: digits, format: "gtin_14", digits };

  const isbnCandidate = raw.replace(/[-\s]/g, "").toUpperCase();
  if (isbnCandidate.length === 10 && isValidIsbn10(isbnCandidate)) {
    return { ok: true, raw, normalized: isbnCandidate, format: "isbn_10", digits: isbnCandidate.replace(/\D/g, "") };
  }

  return { ok: false, reason: "Use a valid UPC, EAN, GTIN, or ISBN barcode." };
}

function toLookupResponse(input: {
  normalized: BarcodeValidation & { ok: true };
  matched: boolean;
  fromCache: boolean;
  product: LookupProduct | null;
  error?: string | null;
}) {
  const product = input.product;
  const reviewRequired = Boolean(product && product.confidence_score < 70);
  return {
    ok: true,
    matched: input.matched,
    barcode: input.normalized.raw,
    normalized_barcode: input.normalized.normalized,
    format: input.normalized.format,
    provider: product?.provider ?? null,
    provider_path: product?.provider_path ?? [],
    from_cache: input.fromCache,
    confidence_score: product?.confidence_score ?? 0,
    review_required: reviewRequired,
    title: product?.title ?? null,
    brand: product?.brand ?? null,
    image_url: product?.image_url ?? null,
    category: product?.category ?? null,
    description: product?.description ?? null,
    estimated_price_cents: product?.estimated_price_cents ?? null,
    currency: product?.currency ?? null,
    product_url: product?.product_url ?? null,
    selected_retailer: product?.selected_retailer ?? null,
    retailer_options: product?.retailer_options ?? [],
    raw_payload: product?.raw_payload ?? null,
    error: input.error ?? null,
  };
}

function buildRetailerOptions(
  rawOptions: Array<Record<string, unknown> | null | undefined>,
  fallbackLabel: string | null,
  fallbackUrl: string | null,
  fallbackPriceCents: number | null,
  fallbackCurrency: string | null,
) {
  const options = rawOptions
    .map((option) => ({
      label: trimText(option?.label ?? option?.merchant ?? option?.store_name),
      url: trimText(option?.url ?? option?.link),
      price_cents: typeof option?.price_cents === "number" ? option.price_cents : toCents(option?.price),
      currency: trimText(option?.currency ?? option?.currency_code) ?? fallbackCurrency,
      is_best_match: Boolean(option?.is_best_match),
    }))
    .filter((option) => option.label || option.url);

  if (options.length > 0) {
    if (!options.some((option) => option.is_best_match)) {
      options[0].is_best_match = true;
    }
    return options.map((option) => ({
      label: option.label ?? fallbackLabel ?? "Suggested store",
      url: option.url ?? fallbackUrl,
      price_cents: option.price_cents ?? fallbackPriceCents,
      currency: option.currency ?? fallbackCurrency,
      is_best_match: option.is_best_match,
    }));
  }

  return [{
    label: fallbackLabel ?? "Suggested store",
    url: fallbackUrl,
    price_cents: fallbackPriceCents,
    currency: fallbackCurrency,
    is_best_match: true,
  }];
}

function scoreLookupConfidence(input: {
  title: string | null;
  brand: string | null;
  imageUrl: string | null;
  retailerOptions: Array<{ label: string; url: string | null; price_cents: number | null; currency: string | null; is_best_match?: boolean }>;
}) {
  let score = 0;
  if (input.title) score += 45;
  if (input.brand) score += 15;
  if (input.imageUrl) score += 20;
  if (input.retailerOptions.some((option) => option.url)) score += 15;
  if (input.retailerOptions.some((option) => option.price_cents != null)) score += 5;
  return Math.max(0, Math.min(100, score));
}

async function enforceRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 25) return false;
  entry.count += 1;
  return true;
}

function trimText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function toCents(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100);
}

async function lookupGoogleBooks(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  if (barcode.format !== "isbn_10" && barcode.format !== "isbn_13") return null;
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(barcode.normalized)}`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as { items?: Array<Record<string, unknown>> } | null;
  const item = payload?.items?.[0];
  const info = item?.volumeInfo as Record<string, unknown> | undefined;
  if (!info) return null;
  const retailerOptions = buildRetailerOptions(
    [{ label: "Book listing", url: trimText(info.infoLink), price_cents: null, currency: "USD", is_best_match: true }],
    "Book listing",
    trimText(info.infoLink),
    null,
    "USD",
  );
  return {
    title: trimText(info.title),
    brand: Array.isArray(info.authors) ? trimText((info.authors as unknown[]).join(", ")) : null,
    image_url: trimText((info.imageLinks as Record<string, unknown> | undefined)?.thumbnail),
    category: Array.isArray(info.categories) ? trimText((info.categories as unknown[]).join(", ")) : null,
    description: trimText(info.description),
    estimated_price_cents: null,
    currency: "USD",
    product_url: trimText(info.infoLink),
    selected_retailer: "Book listing",
    provider: "google_books",
    confidence_score: 85,
    provider_path: ["google_books"],
    retailer_options: retailerOptions,
    raw_payload: item,
  };
}

async function lookupOpenLibrary(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  if (barcode.format !== "isbn_10" && barcode.format !== "isbn_13") return null;
  const response = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(barcode.normalized)}.json`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const title = trimText(payload?.title);
  if (!payload || !title) return null;
  const coverId = Array.isArray(payload.covers) && typeof payload.covers[0] === "number" ? payload.covers[0] : null;
  const imageUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  const detailsUrl = `https://openlibrary.org/isbn/${encodeURIComponent(barcode.normalized)}`;
  const retailerOptions = buildRetailerOptions(
    [{ label: "Open Library", url: detailsUrl, is_best_match: true }],
    "Open Library",
    detailsUrl,
    null,
    "USD",
  );
  return {
    title,
    brand: null,
    image_url: imageUrl,
    category: trimText(Array.isArray(payload.subjects) ? payload.subjects.join(", ") : null),
    description: trimText(payload.subtitle),
    estimated_price_cents: null,
    currency: "USD",
    product_url: detailsUrl,
    selected_retailer: "Open Library",
    provider: "open_library",
    confidence_score: scoreLookupConfidence({ title, brand: null, imageUrl, retailerOptions }),
    provider_path: ["open_library"],
    retailer_options: retailerOptions,
    raw_payload: payload,
  };
}

async function lookupOpenFoodFacts(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode.normalized)}.json`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const product = payload?.product as Record<string, unknown> | undefined;
  if (!product) return null;
  const title = trimText(product.product_name) ?? trimText(product.generic_name);
  const brand = trimText(product.brands);
  const imageUrl = trimText(product.image_front_url) ?? trimText(product.image_url);
  const retailerOptions = buildRetailerOptions(
    [{ label: trimText(product.stores) ?? "Open Food Facts", url: trimText(product.link), is_best_match: true }],
    trimText(product.stores) ?? "Open Food Facts",
    trimText(product.link),
    null,
    "USD",
  );
  return {
    title,
    brand,
    image_url: imageUrl,
    category: trimText(product.categories),
    description: trimText(product.quantity),
    estimated_price_cents: null,
    currency: "USD",
    product_url: trimText(product.link),
    selected_retailer: trimText(product.stores) ?? "Open Food Facts",
    provider: "open_food_facts",
    confidence_score: scoreLookupConfidence({ title, brand, imageUrl, retailerOptions }),
    provider_path: ["open_food_facts"],
    retailer_options: retailerOptions,
    raw_payload: payload,
  };
}

async function lookupUpcDatabase(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  const apiKey = Deno.env.get("UPC_DATABASE_API_KEY");
  if (!apiKey) return null;
  const response = await fetch(`https://api.upcdatabase.org/product/${encodeURIComponent(barcode.normalized)}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const item = payload?.item as Record<string, unknown> | undefined;
  const title = trimText(item?.title ?? payload?.title);
  if (!title) return null;
  const image = trimText(item?.images?.[0]) ?? trimText(payload?.image);
  const offerUrl = trimText(item?.offers?.[0]?.url) ?? trimText(payload?.url);
  const retailer = trimText(item?.offers?.[0]?.merchant) ?? trimText(payload?.brand);
  const priceCents = toCents(item?.offers?.[0]?.price ?? payload?.price);
  const retailerOptions = buildRetailerOptions(
    Array.isArray(item?.offers) ? item.offers as Array<Record<string, unknown>> : [],
    retailer,
    offerUrl,
    priceCents,
    "USD",
  );
  return {
    title,
    brand: trimText(payload?.brand),
    image_url: image,
    category: trimText(payload?.category),
    description: trimText(payload?.description),
    estimated_price_cents: priceCents,
    currency: "USD",
    product_url: offerUrl,
    selected_retailer: retailer,
    provider: "upcdatabase",
    confidence_score: scoreLookupConfidence({ title, brand: trimText(payload?.brand), imageUrl: image, retailerOptions }),
    provider_path: ["upcdatabase"],
    retailer_options: retailerOptions,
    raw_payload: payload,
  };
}

async function lookupUpcItemDb(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  const apiKey = Deno.env.get("UPCITEMDB_API_KEY");
  if (!apiKey) return null;
  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode.normalized)}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const item = Array.isArray(payload?.items) ? payload.items[0] as Record<string, unknown> | undefined : undefined;
  const title = trimText(item?.title);
  if (!title) return null;
  const brand = trimText(item?.brand);
  const imageUrl = trimText(Array.isArray(item?.images) ? item.images[0] : null);
  const retailerOptions = buildRetailerOptions(
    Array.isArray(item?.offers) ? item.offers as Array<Record<string, unknown>> : [],
    brand ?? "UPCitemdb",
    null,
    null,
    "USD",
  );
  return {
    title,
    brand,
    image_url: imageUrl,
    category: trimText(item?.category),
    description: trimText(item?.description),
    estimated_price_cents: retailerOptions[0]?.price_cents ?? null,
    currency: retailerOptions[0]?.currency ?? "USD",
    product_url: retailerOptions[0]?.url ?? null,
    selected_retailer: retailerOptions[0]?.label ?? "UPCitemdb",
    provider: "upcitemdb",
    confidence_score: scoreLookupConfidence({ title, brand, imageUrl, retailerOptions }),
    provider_path: ["upcitemdb"],
    retailer_options: retailerOptions,
    raw_payload: payload,
  };
}

async function lookupProduct(barcode: BarcodeValidation & { ok: true }): Promise<LookupProduct | null> {
  const settled = await Promise.allSettled([
    lookupGoogleBooks(barcode),
    lookupOpenLibrary(barcode),
    lookupOpenFoodFacts(barcode),
    lookupUpcDatabase(barcode),
    lookupUpcItemDb(barcode),
  ]);

  const matches = settled
    .filter((result): result is PromiseFulfilledResult<LookupProduct | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((product): product is LookupProduct => Boolean(product?.title));

  return mergeRegistryBarcodeProducts(matches);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey) return json({ error: "Supabase env missing." }, 500);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const { data: userData } = await authClient.auth.getUser();
  if (!userData.user) return json({ error: "Please sign in to scan registry items." }, 401);

  const forwardedFor = req.headers.get("x-forwarded-for") ?? "local";
  if (!(await enforceRateLimit(`${userData.user.id}:${forwardedFor}`))) {
    return json({ error: "Too many barcode lookups. Please pause for a minute." }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const validated = normalizeBarcode(String(body?.barcode ?? ""));
  if (!validated.ok) return json({ error: validated.reason }, 400);

  const admin = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : authClient;

  const { data: cachedRow } = await admin
    .from("registry_product_cache")
    .select("*")
    .or(`barcode.eq.${validated.normalized},normalized_gtin.eq.${validated.normalized}`)
    .maybeSingle();

  if (cachedRow) {
    await admin
      .from("registry_product_cache")
      .update({
        lookup_count: Number(cachedRow.lookup_count ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("barcode", String(cachedRow.barcode));

    return json(toLookupResponse({
      normalized: validated,
      matched: true,
      fromCache: true,
      product: {
        title: trimText(cachedRow.title),
        brand: trimText(cachedRow.brand),
        image_url: trimText(cachedRow.image_url),
        category: trimText(cachedRow.category),
        description: trimText(cachedRow.description),
        estimated_price_cents: typeof cachedRow.price_cents === "number" ? cachedRow.price_cents : null,
        currency: trimText(cachedRow.currency),
        product_url: trimText(cachedRow.product_url),
        selected_retailer: trimText(cachedRow.selected_retailer),
        provider: trimText(cachedRow.provider),
        confidence_score: Number(cachedRow.confidence_score ?? 0),
        provider_path: Array.isArray((cachedRow.raw_payload as Record<string, unknown> | null)?.provider_path)
          ? ((cachedRow.raw_payload as Record<string, unknown>).provider_path as string[])
          : [trimText(cachedRow.provider) ?? "cache"],
        retailer_options: buildRetailerOptions(
          Array.isArray((cachedRow.raw_payload as Record<string, unknown> | null)?.retailer_options)
            ? ((cachedRow.raw_payload as Record<string, unknown>).retailer_options as Array<Record<string, unknown>>)
            : [],
          trimText(cachedRow.selected_retailer),
          trimText(cachedRow.product_url),
          typeof cachedRow.price_cents === "number" ? cachedRow.price_cents : null,
          trimText(cachedRow.currency),
        ),
        raw_payload: (cachedRow.raw_payload as Record<string, unknown> | null) ?? null,
      },
    }));
  }

  const missCutoff = new Date(Date.now() - MISS_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: missRow } = await admin
    .from("registry_barcode_misses")
    .select("*")
    .eq("barcode", validated.normalized)
    .gte("last_attempt_at", missCutoff)
    .maybeSingle();

  if (missRow) {
    return json(toLookupResponse({
      normalized: validated,
      matched: false,
      fromCache: true,
      product: null,
      error: "We still do not have a confident product match for that barcode. Try pasting a store link or finish the gift by hand.",
    }));
  }

  try {
    const product = await lookupProduct(validated);
    if (!product || !product.title) {
      await admin
        .from("registry_barcode_misses")
        .upsert({
          barcode: validated.normalized,
          attempts: Number(missRow?.attempts ?? 0) + 1,
          last_attempt_at: new Date().toISOString(),
          last_provider: null,
          last_error: "no_confident_match",
        }, { onConflict: "barcode" });

      return json(toLookupResponse({
        normalized: validated,
        matched: false,
        fromCache: false,
        product: null,
        error: "We could not find a confident match for that barcode. You can still add the gift manually or paste a store link.",
      }));
    }

    await admin
      .from("registry_product_cache")
      .upsert({
        barcode: validated.normalized,
        normalized_gtin: validated.normalized,
        title: product.title,
        brand: product.brand,
        image_url: product.image_url,
        category: product.category,
        description: product.description,
        price_cents: product.estimated_price_cents,
        currency: product.currency,
        product_url: product.product_url,
        selected_retailer: product.selected_retailer,
        provider: product.provider,
        confidence_score: product.confidence_score,
        raw_payload: {
          ...(product.raw_payload ?? {}),
          provider_path: product.provider_path ?? [product.provider].filter(Boolean),
          retailer_options: product.retailer_options,
        },
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        lookup_count: 1,
      }, { onConflict: "barcode" });

    return json(toLookupResponse({
      normalized: validated,
      matched: true,
      fromCache: false,
      product,
    }));
  } catch {
    return json(toLookupResponse({
      normalized: validated,
      matched: false,
      fromCache: false,
      product: null,
      error: "Barcode lookup is temporarily unavailable. You can still add the gift manually.",
    }), 200);
  }
});
