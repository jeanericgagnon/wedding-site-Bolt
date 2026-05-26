export interface RegistryBarcodeRetailerOption {
  label: string | null;
  url: string | null;
  price_cents: number | null;
  currency: string | null;
  is_best_match?: boolean;
}

export interface RegistryBarcodeProductMatch {
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
  retailer_options: RegistryBarcodeRetailerOption[];
  raw_payload: Record<string, unknown> | null;
}

function trimText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreCandidate(product: RegistryBarcodeProductMatch) {
  let score = Number(product.confidence_score ?? 0);
  if (trimText(product.title)) score += 12;
  if (trimText(product.brand)) score += 6;
  if (trimText(product.image_url)) score += 5;
  if (trimText(product.description)) score += 3;
  if (product.retailer_options.some((option) => option.url)) score += 6;
  if (product.retailer_options.some((option) => option.price_cents != null)) score += 6;
  return score;
}

function uniqueValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = trimText(value);
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }
  return output;
}

function pickConsensusText(
  products: RegistryBarcodeProductMatch[],
  selector: (product: RegistryBarcodeProductMatch) => string | null,
) {
  const ranked = products
    .map((product, index) => ({ value: trimText(selector(product)), rank: index }))
    .filter((entry): entry is { value: string; rank: number } => Boolean(entry.value));

  if (ranked.length === 0) return null;

  const counts = new Map<string, { value: string; count: number; firstRank: number }>();
  for (const entry of ranked) {
    const key = normalizeText(entry.value);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    counts.set(key, { value: entry.value, count: 1, firstRank: entry.rank });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.value.length - a.value.length || a.firstRank - b.firstRank)[0]
    ?.value ?? null;
}

function pickLongestText(
  products: RegistryBarcodeProductMatch[],
  selector: (product: RegistryBarcodeProductMatch) => string | null,
) {
  return products
    .map((product) => trimText(selector(product)))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

function buildFallbackRetailerOption(product: RegistryBarcodeProductMatch): RegistryBarcodeRetailerOption | null {
  const label = trimText(product.selected_retailer);
  const url = trimText(product.product_url);
  const priceCents = typeof product.estimated_price_cents === 'number' ? product.estimated_price_cents : null;
  if (!label && !url && priceCents == null) return null;
  return {
    label: label ?? product.provider ?? 'Suggested store',
    url,
    price_cents: priceCents,
    currency: trimText(product.currency),
    is_best_match: true,
  };
}

function mergeRetailerOptions(products: RegistryBarcodeProductMatch[]) {
  const merged = new Map<string, RegistryBarcodeRetailerOption & { sourceRank: number }>();

  for (const [productIndex, product] of products.entries()) {
    const options = product.retailer_options.length > 0
      ? product.retailer_options
      : [buildFallbackRetailerOption(product)].filter((option): option is RegistryBarcodeRetailerOption => Boolean(option));

    for (const option of options) {
      const label = trimText(option.label);
      const url = trimText(option.url);
      const key = `${normalizeText(label)}|${normalizeText(url)}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          label: label ?? product.selected_retailer ?? product.provider ?? 'Suggested store',
          url,
          price_cents: typeof option.price_cents === 'number' ? option.price_cents : null,
          currency: trimText(option.currency) ?? trimText(product.currency),
          is_best_match: Boolean(option.is_best_match),
          sourceRank: productIndex,
        });
        continue;
      }

      if (!existing.url && url) existing.url = url;
      if (!existing.label && label) existing.label = label;
      if (existing.price_cents == null || (option.price_cents != null && option.price_cents < existing.price_cents)) {
        existing.price_cents = typeof option.price_cents === 'number' ? option.price_cents : existing.price_cents;
      }
      if (!existing.currency && option.currency) existing.currency = trimText(option.currency);
      existing.is_best_match = existing.is_best_match || Boolean(option.is_best_match);
      existing.sourceRank = Math.min(existing.sourceRank, productIndex);
    }
  }

  const options = [...merged.values()]
    .sort((a, b) => {
      const aPriced = a.price_cents != null ? 0 : 1;
      const bPriced = b.price_cents != null ? 0 : 1;
      return aPriced - bPriced
        || (a.price_cents ?? Number.MAX_SAFE_INTEGER) - (b.price_cents ?? Number.MAX_SAFE_INTEGER)
        || Number(b.is_best_match) - Number(a.is_best_match)
        || a.sourceRank - b.sourceRank
        || String(a.label).localeCompare(String(b.label));
    })
    .map(({ sourceRank: _sourceRank, ...option }) => ({ ...option, is_best_match: false }));

  if (options.length > 0) {
    options[0].is_best_match = true;
  }

  return options;
}

function countConsensus(values: Array<string | null | undefined>) {
  const normalized = values
    .map((value) => normalizeText(value))
    .filter(Boolean);
  const counts = new Map<string, number>();
  for (const value of normalized) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].sort((a, b) => b - a)[0] ?? 0;
}

export function mergeRegistryBarcodeProducts(products: RegistryBarcodeProductMatch[]): RegistryBarcodeProductMatch | null {
  const valid = products.filter((product) => trimText(product.title));
  if (valid.length === 0) return null;

  const ranked = [...valid].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  const primary = ranked[0];
  const retailerOptions = mergeRetailerOptions(ranked);
  const bestRetailer = retailerOptions[0] ?? buildFallbackRetailerOption(primary);
  const uniqueTitleCount = uniqueValues(ranked.map((product) => product.title)).length;
  const uniqueBrandCount = uniqueValues(ranked.map((product) => product.brand)).length;
  const titleConsensus = countConsensus(ranked.map((product) => product.title));
  const brandConsensus = countConsensus(ranked.map((product) => product.brand));
  const conflictPenalty = uniqueTitleCount > 2 ? 24 : uniqueTitleCount > 1 ? 14 : 0;

  const confidenceScore = clamp(
    Math.max(...ranked.map((product) => Number(product.confidence_score ?? 0)))
      + (titleConsensus >= 2 ? 8 : 0)
      + (brandConsensus >= 2 ? 4 : 0)
      + (retailerOptions.length > 1 ? 4 : 0)
      + (retailerOptions.some((option) => option.price_cents != null) ? 4 : 0)
      - conflictPenalty
      - (uniqueBrandCount > 2 ? 4 : 0),
    0,
    100,
  );

  return {
    title: pickConsensusText(ranked, (product) => product.title) ?? primary.title,
    brand: pickConsensusText(ranked, (product) => product.brand) ?? primary.brand,
    image_url: pickConsensusText(ranked, (product) => product.image_url) ?? primary.image_url,
    category: pickConsensusText(ranked, (product) => product.category) ?? primary.category,
    description: pickLongestText(ranked, (product) => product.description) ?? primary.description,
    estimated_price_cents: bestRetailer?.price_cents ?? primary.estimated_price_cents,
    currency: bestRetailer?.currency ?? primary.currency,
    product_url: bestRetailer?.url ?? primary.product_url,
    selected_retailer: bestRetailer?.label ?? primary.selected_retailer,
    provider: primary.provider,
    confidence_score: confidenceScore,
    provider_path: uniqueValues(ranked.flatMap((product) => product.provider_path?.length ? product.provider_path : [product.provider])),
    retailer_options: retailerOptions,
    raw_payload: {
      merged: ranked.length > 1,
      primary_provider: primary.provider,
      provider_matches: ranked.map((product) => ({
        provider: product.provider,
        title: product.title,
        brand: product.brand,
        confidence_score: product.confidence_score,
        product_url: product.product_url,
        selected_retailer: product.selected_retailer,
        retailer_options: product.retailer_options,
      })),
    },
  };
}
