/**
 * URL Normalization Utilities
 * Cleans and canonicalizes URLs for consistent processing and duplicate detection
 */

export interface NormalizedUrl {
  canonical: string;
  hostname: string;
  pathname: string;
  retailer: string | null;
  metadata: Record<string, string>;
}

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'referrer', 'source', 'fbclid', 'gclid', 'msclkid',
  'preselect', 'clkid', 'irclickid', 'siteID', 'sid',
];

const RETAILER_PATTERNS: Record<string, RegExp> = {
  target: /target\.com$/i,
  amazon: /amazon\.(com|ca|co\.uk|de|fr|it|es|co\.jp|in|com\.au|com\.br|com\.mx|nl|se|pl|sg|ae|sa)$/i,
  walmart: /walmart\.com$/i,
  etsy: /etsy\.com$/i,
  wayfair: /wayfair\.(com|ca|co\.uk|de)$/i,
  ikea: /ikea\.com$/i,
  crateandbarrel: /(crateandbarrel|cb2)\.com$/i,
  westelm: /westelm\.com$/i,
  potterybarn: /potterybarn\.com$/i,
  anthropologie: /anthropologie\.com$/i,
  urbanoutfitters: /urbanoutfitters\.com$/i,
  bedbathandbeyond: /bedbathandbeyond\.com$/i,
  macys: /macys\.com$/i,
  nordstrom: /nordstrom\.com$/i,
  williams_sonoma: /williams-sonoma\.com$/i,
  sur_la_table: /surlatable\.com$/i,
};

/**
 * Extract Target TCIN (Target.com Item Number) from URL
 * Format: /p/product-name/-/A-12345678
 */
function extractTargetTCIN(pathname: string): string | null {
  const match = pathname.match(/\/A-(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Extract Amazon ASIN from URL
 * Format: /dp/B07XYZ1234 or /gp/product/B07XYZ1234
 */
function extractAmazonASIN(pathname: string): string | null {
  const match = pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
  return match ? match[2] : null;
}

/**
 * Detect retailer from hostname
 */
function detectRetailer(hostname: string): string | null {
  for (const [retailer, pattern] of Object.entries(RETAILER_PATTERNS)) {
    if (pattern.test(hostname)) {
      return retailer;
    }
  }
  return null;
}

/**
 * Normalize and canonicalize a product URL
 */
export function normalizeUrl(url: string): NormalizedUrl {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const retailer = detectRetailer(hostname);
    const metadata: Record<string, string> = {};

    // Remove tracking parameters
    const cleanParams = new URLSearchParams();
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!TRACKING_PARAMS.some(param => key.toLowerCase().includes(param.toLowerCase()))) {
        cleanParams.set(key, value);
      }
    }

    // Remove hash/anchor
    parsed.hash = '';

    // Retailer-specific normalization
    let canonicalPath = parsed.pathname;

    if (retailer === 'target') {
      const tcin = extractTargetTCIN(parsed.pathname);
      if (tcin) {
        metadata.tcin = tcin;
        // Canonical Target URL format
        canonicalPath = `/p/-/A-${tcin}`;
      }
    } else if (retailer === 'amazon') {
      const asin = extractAmazonASIN(parsed.pathname);
      if (asin) {
        metadata.asin = asin;
        // Canonical Amazon URL format
        canonicalPath = `/dp/${asin}`;
      }
    }

    // Rebuild canonical URL
    const canonical = `${parsed.protocol}//${hostname}${canonicalPath}${
      cleanParams.toString() ? '?' + cleanParams.toString() : ''
    }`;

    return {
      canonical,
      hostname,
      pathname: canonicalPath,
      retailer,
      metadata,
    };
  } catch (error) {
    // If URL parsing fails, return original
    return {
      canonical: url,
      hostname: '',
      pathname: '',
      retailer: null,
      metadata: {},
    };
  }
}

/**
 * Check if two URLs point to the same product
 */
export function isSameProduct(url1: string, url2: string): boolean {
  const norm1 = normalizeUrl(url1);
  const norm2 = normalizeUrl(url2);

  // Compare canonical URLs
  if (norm1.canonical === norm2.canonical) {
    return true;
  }

  // Compare retailer-specific identifiers
  if (norm1.retailer === norm2.retailer && norm1.retailer) {
    if (norm1.metadata.tcin && norm2.metadata.tcin) {
      return norm1.metadata.tcin === norm2.metadata.tcin;
    }
    if (norm1.metadata.asin && norm2.metadata.asin) {
      return norm1.metadata.asin === norm2.metadata.asin;
    }
  }

  return false;
}
