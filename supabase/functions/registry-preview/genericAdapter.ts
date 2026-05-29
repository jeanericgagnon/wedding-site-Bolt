/**
 * Generic Adapter
 * Fallback parser for non-specialized retailers using standard metadata
 */

import {
  type RetailerAdapter,
  type AdapterContext,
  type ProductData,
  extractJsonLdProduct,
  extractOpenGraph,
  extractMetaTags,
  extractTitle,
  parsePrice,
  generateFallbackTitle,
  normalizeAvailability,
} from './adapterTypes.ts';
import { normalizeUrl } from './urlNormalizer.ts';

const CATEGORY_LIKE_TERMS = [
  'home furniture',
  'home decor',
  'outdoor furniture',
  'shop all',
  'new arrivals',
  'sale',
  'registry',
  'wedding registry',
  'furniture store',
  'room ideas',
  'featured collections',
  'gifts for',
  'gift ideas',
  'dinnerware sets',
  'serveware',
  'bedding basics',
  'tabletop',
];

const CATEGORY_LIKE_PATTERNS = [
  /\bshop\b.*\b(collection|category|categories)\b/i,
  /\b(the )?(best|top)\b.*\b(gifts|registry|decor)\b/i,
  /\b(gift|wedding)\s+(guide|shop)\b/i,
  /\bhome\b.*\b(outdoor|decor|furniture)\b/i,
];

type PriceCandidate = { amount: number; currency: string; label: string };
type ImageCandidate = { url: string; confidence: number };
type AvailabilityCandidate = { value: string; confidence: number };

function extractPriceCandidatesFromHtml(html: string): PriceCandidate[] {
  const patterns = [
    /"price"\s*:\s*"?([0-9]+(?:\.[0-9]{2})?)"?/i,
    /"priceAmount"\s*:\s*"?([0-9]+(?:\.[0-9]{2})?)"?/i,
    /data-testid="price"[^>]*>[^\d$€£]*([$€£]?\s*[0-9]+(?:\.[0-9]{2})?)/i,
    /([$€£]\s*[0-9]+(?:\.[0-9]{2})?)/i,
  ];
  const results: PriceCandidate[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    for (const match of html.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))) {
      const parsed = parsePrice(match[1]);
      if (!parsed || !Number.isFinite(parsed.amount) || parsed.amount < 1 || parsed.amount > 10000) continue;
      const symbol = parsed.currency === 'USD' ? '$' : parsed.currency === 'EUR' ? '€' : parsed.currency === 'GBP' ? '£' : '';
      const candidate = {
        amount: parsed.amount,
        currency: parsed.currency,
        label: symbol ? `${symbol}${parsed.amount.toFixed(2)}` : `${parsed.amount.toFixed(2)} ${parsed.currency}`,
      };
      const key = `${candidate.currency}:${candidate.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(candidate);
    }
  }

  return results.sort((a, b) => a.amount - b.amount);
}

function extractPriceFromHtml(html: string): PriceCandidate | null {
  return extractPriceCandidatesFromHtml(html)[0] ?? null;
}

function isLikelyDisplayableImage(url: string): boolean {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  if (/\b(sprite|icon|logo|avatar|placeholder)\b/i.test(clean)) return false;
  return true;
}

function extractImageCandidatesFromHtml(html: string): ImageCandidate[] {
  const patterns = [
    { pattern: /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi, confidence: 0.78 },
    { pattern: /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi, confidence: 0.7 },
    { pattern: /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["'][^>]*>/gi, confidence: 0.68 },
    { pattern: /<img[^>]+src=["']([^"']+)["'][^>]*(?:class|alt)=["'][^"']*(?:product|primary|hero)[^"']*["'][^>]*>/gi, confidence: 0.56 },
    { pattern: /<img[^>]+(?:class|alt)=["'][^"']*(?:product|primary|hero)[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/gi, confidence: 0.56 },
  ];
  const results: ImageCandidate[] = [];
  const seen = new Set<string>();

  for (const { pattern, confidence } of patterns) {
    for (const match of html.matchAll(pattern)) {
      const candidate = match[1]?.trim();
      if (!candidate || !isLikelyDisplayableImage(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      results.push({ url: candidate, confidence });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

function extractAvailabilityCandidatesFromHtml(html: string): AvailabilityCandidate[] {
  const patterns = [
    { pattern: /"availability"\s*:\s*"([^"]+)"/gi, confidence: 0.72 },
    { pattern: /<meta[^>]*(?:name|property)=["']product:availability["'][^>]*content=["']([^"']+)["'][^>]*>/gi, confidence: 0.68 },
    { pattern: /<link[^>]*itemprop=["']availability["'][^>]*href=["']([^"']+)["'][^>]*>/gi, confidence: 0.66 },
    { pattern: /\b(in stock|out of stock|currently unavailable|limited stock|few left|ready to ship)\b/gi, confidence: 0.45 },
  ];
  const results: AvailabilityCandidate[] = [];
  const seen = new Set<string>();

  for (const { pattern, confidence } of patterns) {
    for (const match of html.matchAll(pattern)) {
      const normalized = normalizeAvailability(match[1]);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      results.push({ value: normalized, confidence });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export class GenericAdapter implements RetailerAdapter {
  name = 'generic';
  hostnames = /.*/; // Matches all

  canHandle(url: string): boolean {
    void url;
    return true; // Generic adapter handles everything
  }

  async parse(context: AdapterContext): Promise<ProductData | null> {
    const { url, html } = context;
    const normalized = normalizeUrl(url);

    // Strategy 1: JSON-LD Product schema
    const jsonLd = extractJsonLdProduct(html);
    if (jsonLd) {
      const result = this.parseJsonLd(jsonLd, normalized.canonical, normalized.hostname);
      if (result && result.confidence_score >= 0.7) {
        return result;
      }
    }

    // Strategy 2: OpenGraph + Meta tags
    const og = extractOpenGraph(html);
    const meta = extractMetaTags(html);
    if (og.title || meta.title || og.image) {
      const result = this.parseMetadata(og, meta, html, normalized.canonical, normalized.hostname);
      if (result && result.confidence_score >= 0.5) {
        return result;
      }
    }

    // Strategy 3: Fallback
    return this.createFallback(url, normalized.canonical, normalized.hostname);
  }

  private isCategoryLikeTitle(title: string): boolean {
    const clean = title.trim().toLowerCase();
    if (!clean) return true;
    return CATEGORY_LIKE_TERMS.some((term) => clean.includes(term))
      || CATEGORY_LIKE_PATTERNS.some((pattern) => pattern.test(clean));
  }

  private scoreTitleCandidate(title: string): number {
    const clean = title.trim();
    if (!clean) return 0;
    const lower = clean.toLowerCase();
    let score = 0.55;
    if (clean.length >= 12 && clean.length <= 120) score += 0.2;
    if (/[a-z]/i.test(clean) && /\s/.test(clean)) score += 0.1;
    if (/[A-Z][a-z]/.test(clean)) score += 0.05;
    if (/\b(set|frame|bowl|plate|chair|lamp|shelf|table|mug|vase|blanket|duvet|sheet|storage|basket)\b/i.test(clean)) score += 0.1;
    if (this.isCategoryLikeTitle(clean)) score -= 0.45;
    if (/\b(shop|buy|sale|registry|guide|ideas|collection)\b/i.test(lower)) score -= 0.2;
    if (/^[a-z0-9\s\-_/]+$/i.test(clean) && !/\s/.test(clean)) score -= 0.2;
    return Math.max(0, Math.min(1, score));
  }

  private pickBestTitle(candidates: Array<string | undefined | null>, hostname: string): { title: string; confidence: number } | null {
    const evaluated = candidates
      .map((candidate) => this.cleanTitle(String(candidate ?? ''), hostname))
      .map((candidate) => candidate.trim())
      .filter(Boolean)
      .map((candidate) => ({ title: candidate, confidence: this.scoreTitleCandidate(candidate) }))
      .filter((candidate) => !this.isCategoryLikeTitle(candidate.title))
      .sort((a, b) => b.confidence - a.confidence || a.title.length - b.title.length);

    return evaluated[0] ?? null;
  }

  /**
   * Parse JSON-LD Product schema
   */
  private parseJsonLd(jsonLd: Record<string, unknown>, canonical: string, hostname: string): ProductData | null {
    try {
      const titleCandidate = this.pickBestTitle([jsonLd.name, jsonLd.alternateName, jsonLd.headline], hostname);
      if (!titleCandidate) return null;
      const title = titleCandidate.title;

      const missing: string[] = [];

      // Extract image
      let image = jsonLd.image;
      if (Array.isArray(image)) image = image[0];
      if (typeof image === 'object') image = image.url || image.contentUrl;
      if (typeof image === 'string' && !isLikelyDisplayableImage(image)) image = undefined;
      if (!image) missing.push('image');

      // Extract price
      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      const availability = normalizeAvailability(offers?.availability)
        ?? extractAvailabilityCandidatesFromHtml(JSON.stringify(jsonLd))[0]?.value;
      if (offers?.price) {
        priceAmount = parseFloat(offers.price);
        currency = offers.priceCurrency || 'USD';
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
        priceLabel = symbol ? `${symbol}${priceAmount.toFixed(2)}` : `${priceAmount.toFixed(2)} ${currency}`;
      } else {
        missing.push('price');
      }

      // Extract store name
      const storeName = this.deriveStoreName(hostname, jsonLd.brand?.name);

      return {
        title,
        image_url: image || undefined,
        price_label: priceLabel || undefined,
        price_amount: priceAmount,
        currency,
        availability,
        store_name: storeName,
        canonical_url: canonical,
        confidence_score: missing.length === 0 ? 0.85 : 0.7,
        source_method: 'jsonld',
        partial: missing.length > 0,
        missing_fields: missing.length > 0 ? missing : undefined,
        confidence: {
          overall: missing.length === 0 ? 0.85 : 0.7,
          title: titleCandidate.confidence,
          price: priceAmount ? 0.88 : 0.2,
          image: image ? 0.8 : 0.15,
          availability: availability ? 0.7 : 0.2,
          canonical_url: 0.9,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse OpenGraph and meta tags
   */
  private parseMetadata(
    og: Record<string, string>,
    meta: Record<string, string>,
    html: string,
    canonical: string,
    hostname: string
  ): ProductData | null {
    const titleCandidate = this.pickBestTitle([
      og.title,
      meta['og:title'],
      meta.title,
      meta['twitter:title'],
      meta['product:title'],
      extractTitle(html),
    ], hostname);
    if (!titleCandidate) return null;
    const cleanedTitle = titleCandidate.title;

    const missing: string[] = [];

    // Extract image
    const imageCandidates = [
      og.image,
      meta['og:image'],
      meta['twitter:image'],
      meta['product:image'],
      ...extractImageCandidatesFromHtml(html).map((candidate) => candidate.url),
    ]
      .map((candidate) => candidate?.trim())
      .filter((candidate): candidate is string => Boolean(candidate && isLikelyDisplayableImage(candidate)));
    const image = imageCandidates[0];
    if (!image) missing.push('image');

    // Extract price
    let priceLabel = '';
    let priceAmount: number | undefined;
    let currency = 'USD';
    const explicitPriceCandidates = [
      og.price,
      meta['product:price:amount'],
      meta.price,
      meta['twitter:data1'],
      meta['twitter:label1'],
    ]
      .map((candidate) => candidate ? parsePrice(candidate) : null)
      .filter((candidate): candidate is NonNullable<ReturnType<typeof parsePrice>> => Boolean(candidate))
      .filter((candidate) => Number.isFinite(candidate.amount) && candidate.amount >= 1 && candidate.amount <= 10000);
    const fallbackPrice = extractPriceFromHtml(html);
    const priceCandidate = explicitPriceCandidates[0]
      ? {
          amount: explicitPriceCandidates[0].amount,
          currency: explicitPriceCandidates[0].currency,
          label: `${explicitPriceCandidates[0].currency === 'USD' ? '$' : explicitPriceCandidates[0].currency === 'EUR' ? '€' : explicitPriceCandidates[0].currency === 'GBP' ? '£' : ''}${explicitPriceCandidates[0].amount.toFixed(2)}`,
        }
      : fallbackPrice;

    if (priceCandidate) {
      priceAmount = priceCandidate.amount;
      currency = priceCandidate.currency;
      priceLabel = priceCandidate.label;
    } else {
      missing.push('price');
    }

    const availabilityCandidates = [
      meta['product:availability'],
      meta.availability,
      og.availability,
      ...extractAvailabilityCandidatesFromHtml(html).map((candidate) => candidate.value),
    ]
      .map((candidate) => normalizeAvailability(candidate))
      .filter((candidate): candidate is string => Boolean(candidate));
    const availability = availabilityCandidates[0];
    const storeName = this.deriveStoreName(hostname);
    const overallConfidence = missing.length === 0 ? 0.68 : missing.length === 1 ? 0.56 : 0.46;

    return {
      title: cleanedTitle,
      image_url: image || undefined,
      price_label: priceLabel || undefined,
      price_amount: priceAmount,
      currency,
      availability,
      store_name: storeName,
      canonical_url: canonical,
      confidence_score: overallConfidence,
      source_method: 'opengraph',
      partial: missing.length > 0,
      missing_fields: missing.length > 0 ? missing : undefined,
      confidence: {
        overall: overallConfidence,
        title: titleCandidate.confidence,
        price: priceAmount ? (explicitPriceCandidates[0] ? 0.72 : 0.55) : 0.18,
        image: image ? (og.image || meta['og:image'] || meta['twitter:image'] ? 0.72 : 0.56) : 0.2,
        availability: availability ? 0.6 : 0.2,
        canonical_url: 0.85,
      },
    };
  }

  /**
   * Create fallback with slug-based title
   */
  private createFallback(url: string, canonical: string, hostname: string): ProductData {
    const title = this.cleanTitle(generateFallbackTitle(url), hostname);
    const storeName = this.deriveStoreName(hostname);

    return {
      title,
      store_name: storeName,
      canonical_url: canonical,
      confidence_score: 0.3,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
      confidence: {
        overall: 0.3,
        title: this.scoreTitleCandidate(title),
        price: 0,
        image: 0,
        availability: 0,
        canonical_url: 0.8,
      },
    };
  }

  /**
   * Derive store name from hostname
   */
  private deriveStoreName(hostname: string, brandName?: string): string {
    if (brandName) return brandName;

    // Remove common TLDs and www
    const cleaned = hostname
      .replace(/^www\./, '')
      .replace(/\.(com|net|org|co\.uk|ca|de|fr|it|es)$/, '');

    // Convert to title case
    return cleaned
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Clean title by removing common suffixes
   */
  private cleanTitle(title: string, hostname: string): string {
    const storeName = this.deriveStoreName(hostname);

    // Remove store name from end of title
    const pattern = new RegExp(`\\s*[|\\-–—]\\s*${storeName}.*$`, 'i');
    return title
      .replace(/^\s*(shop|buy)\s+[^|:\-–—]+[:|\-–—]\s*/i, '')
      .replace(/\s*[|\\-–—]\s*(gifts?|gift ideas|registry|wedding registry|new arrivals|sale|official site).*$/i, '')
      .replace(pattern, '')
      .replace(/\s*[|\\-–—]\s*(buy online|shop online|official site).*$/i, '')
      .replace(/\s*-\s*free (shipping|delivery).*$/i, '')
      .replace(/\s*:\s*(shop|buy)\s+now.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
