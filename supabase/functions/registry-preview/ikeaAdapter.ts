/**
 * IKEA Adapter
 * Improves extraction for IKEA product pages where JSON-LD and metadata are
 * usually reliable enough to keep good products as product cards.
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

export class IkeaAdapter implements RetailerAdapter {
  name = 'ikea';
  hostnames = /ikea\./i;

  canHandle(url: string): boolean {
    try {
      return this.hostnames.test(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  async parse(context: AdapterContext): Promise<ProductData | null> {
    const { url, html } = context;
    const normalized = normalizeUrl(url);

    const jsonLd = extractJsonLdProduct(html);
    if (jsonLd) {
      const parsed = this.parseJsonLd(jsonLd, normalized.canonical);
      if (parsed && parsed.confidence_score >= 0.72) return parsed;
    }

    const og = extractOpenGraph(html);
    const meta = extractMetaTags(html);
    const parsed = this.parseMetadata(og, meta, html, normalized.canonical);
    if (parsed) return parsed;

    return this.createFallback(url, normalized.canonical);
  }

  private parseJsonLd(jsonLd: Record<string, unknown>, canonical: string): ProductData | null {
    const title = this.cleanIkeaTitle((jsonLd.name ?? '').toString());
    if (!title) return null;

    const missing: string[] = [];

    let image = jsonLd.image;
    if (Array.isArray(image)) image = image[0];
    if (typeof image === 'object') image = image.url || image.contentUrl;
    if (!image) missing.push('image');

    const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
    const rawPrice = offers?.price ? Number.parseFloat(String(offers.price)) : undefined;
    const price = this.sanitizePrice(rawPrice);
    if (!price) missing.push('price');

    return {
      title,
      image_url: typeof image === 'string' ? image : undefined,
      price_amount: price,
      price_label: price ? `$${price.toFixed(2)}` : undefined,
      currency: (offers?.priceCurrency ?? 'USD') as string,
      availability: normalizeAvailability(typeof offers?.availability === 'string' ? offers.availability : undefined),
      store_name: 'IKEA',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.9 : 0.78,
      source_method: 'jsonld',
      partial: missing.length > 0,
      missing_fields: missing.length ? missing : undefined,
    };
  }

  private parseMetadata(
    og: Record<string, string>,
    meta: Record<string, string>,
    html: string,
    canonical: string,
  ): ProductData | null {
    const rawTitle = og.title || meta['og:title'] || meta.title || extractTitle(html) || '';
    const title = this.cleanIkeaTitle(rawTitle);
    if (!title) return null;

    const image = og.image || meta['og:image'] || meta['twitter:image'];
    const rawPrice = meta['product:price:amount'] || meta.price || og.price || meta['twitter:data1'] || '';
    const parsed = rawPrice ? parsePrice(rawPrice) : null;
    const saneAmount = this.sanitizePrice(parsed?.amount);

    const missing: string[] = [];
    if (!image) missing.push('image');
    if (!saneAmount) missing.push('price');

    return {
      title,
      image_url: image || undefined,
      price_amount: saneAmount,
      price_label: saneAmount ? `$${saneAmount.toFixed(2)}` : undefined,
      currency: parsed?.currency ?? 'USD',
      availability: normalizeAvailability(meta['product:availability'] || meta.availability || og.availability),
      store_name: 'IKEA',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.72 : 0.58,
      source_method: 'opengraph',
      partial: missing.length > 0,
      missing_fields: missing.length ? missing : undefined,
    };
  }

  private createFallback(url: string, canonical: string): ProductData {
    const title = this.cleanIkeaTitle(generateFallbackTitle(url));
    return {
      title: title || 'IKEA Product',
      store_name: 'IKEA',
      canonical_url: canonical,
      confidence_score: 0.34,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
    };
  }

  private cleanIkeaTitle(input: string): string {
    return input
      .replace(/\s*[|\\-–—]\s*IKEA.*$/i, '')
      .replace(/^IKEA\s*[:-]\s*/i, '')
      .replace(/\s*-\s*buy online.*$/i, '')
      .replace(/\s*-\s*shop online.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizePrice(amount?: number): number | undefined {
    if (!amount || !Number.isFinite(amount)) return undefined;
    if (amount < 1 || amount > 10000) return undefined;
    return amount;
  }
}
