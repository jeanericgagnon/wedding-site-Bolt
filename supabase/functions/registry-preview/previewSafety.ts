import type { ProductData } from "./adapterTypes.ts";
import { normalizeUrl } from "./urlNormalizer.ts";

type StoreCapability = {
  storeName: string;
  likelyBlocked: boolean;
  defaultFallback: "product_card" | "link_card";
  allowMissingPriceProduct: boolean;
  rejectSkuTitle: boolean;
};

const STORE_CAPABILITIES: Record<string, StoreCapability> = {
  amazon: {
    storeName: "Amazon",
    likelyBlocked: false,
    defaultFallback: "link_card",
    allowMissingPriceProduct: true,
    rejectSkuTitle: false,
  },
  target: {
    storeName: "Target",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: true,
  },
  walmart: {
    storeName: "Walmart",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  bestbuy: {
    storeName: "Best Buy",
    likelyBlocked: false,
    defaultFallback: "link_card",
    allowMissingPriceProduct: true,
    rejectSkuTitle: false,
  },
  ikea: {
    storeName: "IKEA",
    likelyBlocked: false,
    defaultFallback: "product_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  potterybarn: {
    storeName: "Pottery Barn",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  crateandbarrel: {
    storeName: "Crate & Barrel",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  williamssonoma: {
    storeName: "Williams Sonoma",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  macys: {
    storeName: "Macy's",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
  rei: {
    storeName: "REI",
    likelyBlocked: true,
    defaultFallback: "link_card",
    allowMissingPriceProduct: false,
    rejectSkuTitle: false,
  },
};

function normalizeStoreKey(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("target.")) return "target";
  if (host.includes("walmart.")) return "walmart";
  if (host.includes("bestbuy.")) return "bestbuy";
  if (host.includes("ikea.")) return "ikea";
  if (host.includes("potterybarn.")) return "potterybarn";
  if (host.includes("crateandbarrel.")) return "crateandbarrel";
  if (host.includes("williams-sonoma.")) return "williamssonoma";
  if (host.includes("macys.")) return "macys";
  if (/(^|\.)rei\./i.test(host)) return "rei";
  return null;
}

export function deriveStoreKey(url: string): string | null {
  try {
    return normalizeStoreKey(new URL(url).hostname);
  } catch {
    return null;
  }
}

export function deriveStoreName(url: string): string {
  const storeKey = deriveStoreKey(url);
  if (storeKey && STORE_CAPABILITIES[storeKey]) {
    return STORE_CAPABILITIES[storeKey].storeName;
  }

  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host
      .split(".")[0]
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "store";
  } catch {
    return "store";
  }
}

export function isBadProductTitle(title?: string | null): boolean {
  const value = (title ?? "").replace(/\s+/g, " ").trim();
  if (!value) return true;
  const clean = value.toLowerCase();
  const badTerms = [
    "access denied",
    "404 not found",
    "robot or human",
    "verify you are human",
    "are you a robot",
    "forbidden",
    "blocked",
    "attention required",
    "captcha",
    "gift link needs review",
    "home furniture, home decor",
    "product unavailable",
    "page not found",
  ];
  if (clean.length < 8) return true;
  if (badTerms.some((term) => clean.includes(term))) return true;
  if (/^[a-z]?\s?\d{5,}$/i.test(value)) return true;
  if (/^[a-z0-9\-_/]{6,}$/i.test(value) && !value.includes(" ")) return true;
  return false;
}

export function isHomepageOrCategoryTitle(title?: string | null): boolean {
  const clean = (title ?? "").trim().toLowerCase();
  if (!clean) return true;
  const termMatch = [
    "home furniture",
    "home decor",
    "outdoor furniture",
    "shop all",
    "new arrivals",
    "sale",
    "registry",
    "wedding registry",
    "furniture store",
    "room ideas",
    "featured collections",
    "gift ideas",
    "gifts for",
    "serveware",
    "tabletop",
    "dinnerware sets",
  ].some((term) => clean.includes(term));
  if (termMatch) return true;

  return [
    /\bshop\b.*\b(collection|category|categories)\b/i,
    /\b(the )?(best|top)\b.*\b(gifts|registry|decor)\b/i,
    /\b(gift|wedding)\s+(guide|shop)\b/i,
    /\bhome\b.*\b(outdoor|decor|furniture)\b/i,
  ].some((pattern) => pattern.test(clean));
}

export function createLinkOnlyPreview(url: string, reason: string): ProductData {
  const normalized = normalizeUrl(url);
  const storeName = deriveStoreName(url);
  const blocked = reason.includes("blocked");
  return {
    title: `Gift from ${storeName}`,
    store_name: storeName,
    canonical_url: normalized.canonical,
    price_label: undefined,
    price_amount: undefined,
    image_url: undefined,
    availability: "unknown",
    confidence_score: 0.4,
    source_method: "link_only",
    partial: false,
    missing_fields: [],
    display_mode: "link_card",
    guest_safe: true,
    source_status: blocked ? "blocked" : "partial",
    review_status: blocked ? "blocked_source" : "needs_review",
    import_reason: reason,
    owner_message: blocked
      ? `${storeName} blocked product details. Added as a clean link-only gift.`
      : `Added as a clean link-only gift because product details were not reliable.`,
    confidence: {
      overall: 0.4,
      title: 0,
      price: 0,
      image: 0,
      availability: 0,
      canonical_url: 0.8,
    },
  };
}

export function finalizeRegistryPreview(url: string, data: ProductData): ProductData {
  if (data.display_mode === "link_card" || data.source_method === "link_only") {
    return data;
  }

  const storeKey = deriveStoreKey(url);
  const capability = storeKey ? STORE_CAPABILITIES[storeKey] : null;
  const title = (data.title ?? "").trim();
  const missingPrice = !data.price_amount;
  const missingImage = !data.image_url;
  const weakFallback = data.source_method === "fallback" || data.confidence_score < 0.45;
  const weakTitleConfidence = typeof data.confidence?.title === "number" && data.confidence.title < 0.58;
  const partialWithThinData = Boolean(data.partial) && missingImage && missingPrice;
  const genericCategoryTitle = isHomepageOrCategoryTitle(title);
  const titleBad = isBadProductTitle(title) || (capability?.rejectSkuTitle && /^[a-z]?\s?\d{5,}$/i.test(title));

  if (titleBad) {
    return createLinkOnlyPreview(url, "weak_product_metadata");
  }

  if (weakTitleConfidence && data.source_method !== "retailer_adapter" && data.source_method !== "jsonld") {
    return createLinkOnlyPreview(url, "weak_title_confidence");
  }

  if (genericCategoryTitle && data.source_method !== "retailer_adapter" && data.source_method !== "jsonld") {
    return createLinkOnlyPreview(url, "category_or_homepage_title");
  }

  if (
    capability &&
    capability.defaultFallback === "link_card" &&
    (weakFallback || partialWithThinData || (capability.likelyBlocked && data.source_method === "fallback"))
  ) {
    return createLinkOnlyPreview(url, capability.likelyBlocked ? "blocked_or_weak_store_metadata" : "weak_store_metadata");
  }

  if (capability && missingPrice && !capability.allowMissingPriceProduct && data.source_method === "fallback") {
    return createLinkOnlyPreview(url, "missing_price_for_store");
  }

  const missingFields = new Set(data.missing_fields ?? []);
  if (missingImage) missingFields.add("image");
  if (missingPrice) missingFields.add("price");

  return {
    ...data,
    display_mode: data.display_mode ?? "product_card",
    guest_safe: data.guest_safe ?? true,
    source_status: data.source_status ?? (missingFields.size > 0 ? "partial" : "clean"),
    review_status: data.review_status
      ?? (missingPrice ? "missing_price" : missingImage ? "missing_image" : "clean"),
    missing_fields: missingFields.size > 0 ? Array.from(missingFields) : undefined,
    partial: missingFields.size > 0,
  };
}
