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
} from './adapterTypes.ts';
import { normalizeUrl } from './urlNormalizer.ts';

export class GenericAdapter implements RetailerAdapter {
  name = 'generic';
  hostnames = /.*/; // Matches all

  canHandle(url: string): boolean {
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

  /**
   * Parse JSON-LD Product schema
   */
  private parseJsonLd(jsonLd: any, canonical: string, hostname: string): ProductData | null {
    try {
      const title = jsonLd.name;
      if (!title) return null;

      const missing: string[] = [];

      // Extract image
      let image = jsonLd.image;
      if (Array.isArray(image)) image = image[0];
      if (typeof image === 'object') image = image.url || image.contentUrl;
      if (!image) missing.push('image');

      // Extract price
      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
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
        availability: offers?.availability || undefined,
        store_name: storeName,
        canonical_url: canonical,
        confidence_score: missing.length === 0 ? 0.85 : 0.7,
        source_method: 'jsonld',
        partial: missing.length > 0,
        missing_fields: missing.length > 0 ? missing : undefined,
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
    const title =
      og.title ||
      meta['og:title'] ||
      meta.title ||
      meta['twitter:title'] ||
      extractTitle(html);

    if (!title) return null;

    const missing: string[] = [];

    // Extract image
    const image = og.image || meta['og:image'] || meta['twitter:image'];
    if (!image) missing.push('image');

    // Extract price
    const priceStr =
      og.price ||
      meta['product:price:amount'] ||
      meta.price ||
      meta['twitter:data1'] ||
      meta['twitter:label1'];

    let priceLabel = '';
    let priceAmount: number | undefined;
    let currency = 'USD';

    if (priceStr) {
      const parsed = parsePrice(priceStr);
      if (parsed) {
        priceAmount = parsed.amount;
        currency = parsed.currency;
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
        priceLabel = symbol ? `${symbol}${priceAmount.toFixed(2)}` : `${priceAmount.toFixed(2)} ${currency}`;
      } else {
        missing.push('price');
      }
    } else {
      missing.push('price');
    }

    const storeName = this.deriveStoreName(hostname);

    return {
      title: this.cleanTitle(title, hostname),
      image_url: image || undefined,
      price_label: priceLabel || undefined,
      price_amount: priceAmount,
      currency,
      store_name: storeName,
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.6 : 0.5,
      source_method: 'opengraph',
      partial: missing.length > 0,
      missing_fields: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Create fallback with slug-based title
   */
  private createFallback(url: string, canonical: string, hostname: string): ProductData {
    const title = generateFallbackTitle(url);
    const storeName = this.deriveStoreName(hostname);

    return {
      title,
      store_name: storeName,
      canonical_url: canonical,
      confidence_score: 0.3,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
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
    return title.replace(pattern, '').trim();
  }
}
