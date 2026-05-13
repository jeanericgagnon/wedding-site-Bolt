import type { RegistryBarcodeProductMatch, RegistryBarcodeRetailerOption } from './registryBarcodeMatch';

export interface OpenFactsFlavorConfig {
  host: string;
  provider: 'open_food_facts' | 'open_products_facts' | 'open_beauty_facts' | 'open_pet_food_facts';
  label: string;
}

type OpenFactsPayload = Record<string, unknown> | null;

function trimText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function toCents(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100);
}

function buildRetailerOptions(
  label: string | null,
  url: string | null,
  priceCents: number | null,
  currency: string | null,
): RegistryBarcodeRetailerOption[] {
  if (!label && !url && priceCents == null) return [];
  return [{
    label: label ?? 'Suggested store',
    url,
    price_cents: priceCents,
    currency: currency ?? 'USD',
    is_best_match: true,
  }];
}

function scoreLookupConfidence(input: {
  title: string | null;
  brand: string | null;
  imageUrl: string | null;
  retailerOptions: RegistryBarcodeRetailerOption[];
}) {
  let score = 0;
  if (input.title) score += 45;
  if (input.brand) score += 15;
  if (input.imageUrl) score += 20;
  if (input.retailerOptions.some((option) => option.url)) score += 15;
  if (input.retailerOptions.some((option) => option.price_cents != null)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function resolveOpenFactsDetailUrl(host: string, barcode: string, product: Record<string, unknown>) {
  const explicit = trimText(product.link) ?? trimText(product.product_url);
  if (explicit) return explicit;
  return `https://${host}/product/${encodeURIComponent(barcode)}`;
}

export function buildOpenFactsLookupProduct(args: {
  barcode: string;
  flavor: OpenFactsFlavorConfig;
  payload: OpenFactsPayload;
}): RegistryBarcodeProductMatch | null {
  const product = args.payload?.product as Record<string, unknown> | undefined;
  if (!product) return null;

  const title = trimText(product.product_name)
    ?? trimText(product.generic_name)
    ?? trimText(product.product_name_en)
    ?? trimText(product.abbreviated_product_name);
  if (!title) return null;

  const brand = trimText(product.brands) ?? trimText(product.brand_owner);
  const imageUrl = trimText(product.image_front_url)
    ?? trimText(product.image_url)
    ?? trimText(product.image_small_url);
  const category = trimText(product.categories) ?? trimText(product.categories_tags);
  const description = trimText(product.generic_name) ?? trimText(product.quantity);
  const retailer = trimText(product.stores) ?? args.flavor.label;
  const detailUrl = resolveOpenFactsDetailUrl(args.flavor.host, args.barcode, product);
  const priceCents = toCents(product.price);
  const retailerOptions = buildRetailerOptions(retailer, detailUrl, priceCents, 'USD');

  return {
    title,
    brand,
    image_url: imageUrl,
    category,
    description,
    estimated_price_cents: priceCents,
    currency: 'USD',
    product_url: detailUrl,
    selected_retailer: retailer,
    provider: args.flavor.provider,
    confidence_score: scoreLookupConfidence({ title, brand, imageUrl, retailerOptions }),
    provider_path: [args.flavor.provider],
    retailer_options: retailerOptions,
    raw_payload: args.payload,
  };
}
