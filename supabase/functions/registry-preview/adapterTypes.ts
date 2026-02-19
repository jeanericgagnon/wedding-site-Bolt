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
  source_method: 'retailer_adapter' | 'jsonld' | 'opengraph' | 'fallback';
  partial?: boolean; // true if some data is missing
  missing_fields?: string[]; // list of fields we couldn't extract
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

/**
 * Extract JSON-LD Product schema from HTML
 */
export function extractJsonLdProduct(html: string): any | null {
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
          if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
            return item;
          }
          // Handle nested graph structures
          if (item['@graph']) {
            const product = item['@graph'].find(
              (g: any) => g['@type'] === 'Product' || g['@type']?.includes('Product')
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

    // Find the part that looks like a product name (usually has hyphens)
    const productSlug = pathParts.find(part => part.includes('-') && part.length > 5);

    if (productSlug) {
      // Convert slug to title case
      return productSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Last resort: use last path segment
    const lastSegment = pathParts[pathParts.length - 1];
    if (lastSegment) {
      return lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    return 'Untitled Product';
  } catch {
    return 'Untitled Product';
  }
}
