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
  'preselect', 'clkid', 'irclickid', 'siteID', 'sid', 'tag',
];

const RETAILER_PATTERNS: Record<string, RegExp> = {
  target: /target\.com$/i,
  amazon: /amazon\.(com|ca|co\.uk|de|fr|it|es|co\.jp|in|com\.au|com\.br|com\.mx|nl|se|pl|sg|ae|sa)$/i,
  walmart: /walmart\.com$/i,
  bestbuy: /bestbuy\.com$/i,
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
  rei: /(^|\.)rei\.com$/i,
  sur_la_table: /surlatable\.com$/i,
};

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224 ||
    a === 0
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (!normalized) return true;
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.invalid') ||
    normalized.endsWith('.example') ||
    normalized.endsWith('.test') ||
    normalized === 'metadata' ||
    normalized === 'metadata.google.internal'
  ) {
    return true;
  }
  if (normalized.includes(':')) return true;
  return isPrivateIpv4(normalized);
}

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
 * Extract Best Buy product id from URL
 * Format: /site/product-name/6484343.p
 */
function extractBestBuySku(pathname: string): string | null {
  const match = pathname.match(/\/(\d+)\.p(?:\/|$)/i);
  return match ? match[1] : null;
}

/**
 * Extract IKEA article number from URL
 * Format: .../product-name-20500016/
 */
function extractIkeaArticleNumber(pathname: string): string | null {
  const match = pathname.match(/-([0-9]{8})(?:\/|$)/);
  return match ? match[1] : null;
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

export function isPublicPreviewResourceUrl(url: string, depth = 0): boolean {
  try {
    const parsed = new URL(url);
    const publicTarget = (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && !parsed.username
      && !parsed.password
      && !isBlockedHostname(parsed.hostname);
    if (!publicTarget) return false;

    if (parsed.hostname.toLowerCase() === 'images.weserv.nl') {
      const proxiedTarget = parsed.searchParams.get('url');
      if (!proxiedTarget) return true;
      if (depth >= 2) return false;
      const normalizedTarget = /^https?:\/\//i.test(proxiedTarget)
        ? proxiedTarget
        : `https://${proxiedTarget.replace(/^\/+/, '')}`;
      return isPublicPreviewResourceUrl(normalizedTarget, depth + 1);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize and canonicalize a product URL
 */
export function normalizeUrl(url: string): NormalizedUrl {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('URL must use http or https');
    }
    if (parsed.username || parsed.password) {
      throw new Error('URL cannot include credentials');
    }
    if (isBlockedHostname(parsed.hostname)) {
      throw new Error('URL must be a public product page');
    }

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
    } else if (retailer === 'bestbuy') {
      const sku = extractBestBuySku(parsed.pathname);
      if (sku) {
        metadata.sku = sku;
        canonicalPath = `/site/${sku}.p`;
      }
    } else if (retailer === 'ikea') {
      const article = extractIkeaArticleNumber(parsed.pathname);
      if (article) {
        metadata.article_number = article;
        canonicalPath = `/us/en/p/${article}/`;
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
  } catch {
    throw new Error('Enter a public product URL.');
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
    if (norm1.metadata.sku && norm2.metadata.sku) {
      return norm1.metadata.sku === norm2.metadata.sku;
    }
    if (norm1.metadata.article_number && norm2.metadata.article_number) {
      return norm1.metadata.article_number === norm2.metadata.article_number;
    }
  }

  return false;
}
