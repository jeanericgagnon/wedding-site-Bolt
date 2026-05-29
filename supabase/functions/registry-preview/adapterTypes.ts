/**
 * Adapter Architecture for Retailer-Specific URL Parsing
 */

export interface ProductData {
  title: string;
  image_url?: string;
  price_label?: string;
  price_amount?: number;
  currency?: string;
  availability?: string;
  store_name: string;
  canonical_url: string;
  confidence_score: number; // 0-1, how confident we are in the data
  source_method: 'retailer_adapter' | 'jsonld' | 'opengraph' | 'fallback' | 'link_only';
  partial?: boolean; // true if some data is missing
  missing_fields?: string[]; // list of fields we couldn't extract
  display_mode?: 'product_card' | 'link_card' | 'review_only' | 'hidden';
  guest_safe?: boolean;
  source_status?: 'clean' | 'partial' | 'blocked' | 'timeout' | 'invalid_url' | 'parse_failed' | 'manual' | 'not_imported';
  review_status?: 'clean' | 'needs_review' | 'missing_price' | 'missing_image' | 'weak_title' | 'blocked_source' | 'duplicate_candidate' | 'manual_override';
  import_reason?: string;
  owner_message?: string;
  confidence?: {
    overall: number;
    title: number;
    price: number;
    image: number;
    availability: number;
    canonical_url: number;
  };
}

export interface AdapterContext {
  url: string;
  html: string;
  headers: Record<string, string>;
}

export interface RetailerAdapter {
  name: string;
  hostnames: RegExp;
  canHandle(url: string): boolean;
  parse(context: AdapterContext): Promise<ProductData | null>;
}

type JsonLdNode = Record<string, unknown>;

/**
 * Normalize heterogeneous availability strings into a stable, UI-friendly vocabulary.
 */
export function normalizeAvailability(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = input.toLowerCase().trim();
  if (!raw) return undefined;

  if (
    raw.includes('out of stock') ||
    raw.includes('unavailable') ||
    raw.includes('sold out') ||
    raw.includes('currently unavailable')
  ) {
    return 'out_of_stock';
  }

  if (
    raw.includes('limited') ||
    raw.includes('few left') ||
    raw.includes('low stock') ||
    raw.includes('only')
  ) {
    return 'low_stock';
  }

  if (
    raw.includes('in stock') ||
    raw.includes('available') ||
    raw.includes('ready to ship') ||
    raw.includes('ships')
  ) {
    return 'in_stock';
  }

  return 'unknown';
}

/**
 * Extract JSON-LD Product schema from HTML
 */
export function extractJsonLdProduct(html: string): JsonLdNode | null {
  try {
    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );

    if (!jsonLdMatch) return null;

    for (const match of jsonLdMatch) {
      const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      try {
        const data = JSON.parse(jsonContent);

        // Handle both single objects and arrays
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item['@type'] === 'Product' || String(item['@type'] ?? '').includes('Product')) {
            return item;
          }
          // Handle nested graph structures
          const graph = Array.isArray(item['@graph']) ? item['@graph'] : null;
          if (graph) {
            const product = graph.find(
              (g): g is JsonLdNode =>
                typeof g === 'object' &&
                g !== null &&
                ('@type' in g) &&
                (g['@type'] === 'Product' || String(g['@type'] ?? '').includes('Product'))
            );
            if (product) return product;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Parsing failed
  }
  return null;
}

/**
 * Extract OpenGraph metadata from HTML
 */
export function extractOpenGraph(html: string): Record<string, string> {
  const og: Record<string, string> = {};

  const ogRegex = /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = ogRegex.exec(html)) !== null) {
    og[match[1]] = match[2];
  }

  // Also check for reversed attribute order
  const ogRegex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:([^"']+)["'][^>]*>/gi;
  while ((match = ogRegex2.exec(html)) !== null) {
    og[match[2]] = match[1];
  }

  return og;
}

/**
 * Extract meta tags from HTML
 */
export function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};

  const metaRegex = /<meta[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = metaRegex.exec(html)) !== null) {
    meta[match[1]] = match[2];
  }

  // Reversed order
  const metaRegex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((match = metaRegex2.exec(html)) !== null) {
    meta[match[2]] = match[1];
  }

  const propertyRegex = /<meta[^>]*property=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  while ((match = propertyRegex.exec(html)) !== null) {
    meta[match[1]] = match[2];
  }

  const propertyRegex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']([^"']+)["'][^>]*>/gi;
  while ((match = propertyRegex2.exec(html)) !== null) {
    meta[match[2]] = match[1];
  }

  return meta;
}

/**
 * Extract page title from HTML
 */
export function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Parse price string to amount and currency
 */
export function parsePrice(priceStr: string): { amount: number; currency: string } | null {
  if (!priceStr) return null;

  // Remove common price labels
  const cleaned = priceStr
    .replace(/sale|price|now|was|reg\.|regular/gi, '')
    .trim();

  // Extract currency and amount
  const match = cleaned.match(/([£$€¥₹])\s*([\d,]+\.?\d*)/);
  if (match) {
    const currencySymbols: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR',
    };

    const currency = currencySymbols[match[1]] || 'USD';
    const amount = parseFloat(match[2].replace(/,/g, ''));

    return { amount, currency };
  }

  // Try without symbol
  const numMatch = cleaned.match(/([\d,]+\.?\d*)/);
  if (numMatch) {
    const amount = parseFloat(numMatch[1].replace(/,/g, ''));
    return { amount, currency: 'USD' };
  }

  return null;
}

/**
 * Generate slug-based fallback title from URL
 */
export function generateFallbackTitle(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    const cleanedCandidates = pathParts
      .map((part) => part.replace(/\.html?$/i, ''))
      .filter((part) => /[a-zA-Z]/.test(part))
      .filter((part) => !/^dp$/i.test(part))
      .filter((part) => !/^gp$/i.test(part))
      .filter((part) => !/^product$/i.test(part))
      .filter((part) => !/^listing$/i.test(part))
      .filter((part) => !/^ip$/i.test(part))
      .filter((part) => !/^[A-Z0-9]{8,}$/i.test(part))
      .filter((part) => !/^A-\d+$/i.test(part));

    const slugLike = cleanedCandidates.find(part => /[-_]/.test(part) && part.length > 5)
      ?? cleanedCandidates[cleanedCandidates.length - 1];

    if (slugLike) {
      const title = slugLike
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());

      if (title && title.length > 2) return title;
    }

    const host = parsed.hostname.replace(/^www\./, '').split('.')[0];
    return `${host.charAt(0).toUpperCase()}${host.slice(1)} item`;
  } catch {
    return 'Registry Item';
  }
}
