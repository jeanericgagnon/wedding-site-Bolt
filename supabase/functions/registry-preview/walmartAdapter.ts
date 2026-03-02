/**
 * Walmart Adapter
 * Improves extraction for Walmart product pages with platform-specific title cleanup.
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

export class WalmartAdapter implements RetailerAdapter {
  name = 'walmart';
  hostnames = /walmart\./i;

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

  private parseJsonLd(jsonLd: any, canonical: string): ProductData | null {
    const title = this.cleanWalmartTitle((jsonLd?.name ?? '').toString());
    if (!title) return null;

    const missing: string[] = [];
    let image = jsonLd?.image;
    if (Array.isArray(image)) image = image[0];
    if (typeof image === 'object') image = image.url || image.contentUrl;
    if (!image) missing.push('image');

    const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
    const price = offers?.price ? Number.parseFloat(String(offers.price)) : undefined;
    if (!price || !Number.isFinite(price)) missing.push('price');

    return {
      title,
      image_url: typeof image === 'string' ? image : undefined,
      price_amount: price,
      price_label: price ? `$${price.toFixed(2)}` : undefined,
      currency: (offers?.priceCurrency ?? 'USD') as string,
      availability: typeof offers?.availability === 'string' ? offers.availability : undefined,
      store_name: 'Walmart',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.88 : 0.75,
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
    const title = this.cleanWalmartTitle(rawTitle);
    if (!title) return null;

    const image = og.image || meta['og:image'] || meta['twitter:image'];
    const rawPrice = meta['product:price:amount'] || meta.price || og.price || '';
    const parsed = rawPrice ? parsePrice(rawPrice) : null;

    const missing: string[] = [];
    if (!image) missing.push('image');
    if (!parsed?.amount) missing.push('price');

    return {
      title,
      image_url: image || undefined,
      price_amount: parsed?.amount,
      price_label: parsed ? `$${parsed.amount.toFixed(2)}` : undefined,
      currency: parsed?.currency ?? 'USD',
      store_name: 'Walmart',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.66 : 0.54,
      source_method: 'opengraph',
      partial: missing.length > 0,
      missing_fields: missing.length ? missing : undefined,
    };
  }

  private createFallback(url: string, canonical: string): ProductData {
    return {
      title: this.cleanWalmartTitle(generateFallbackTitle(url)) || 'Walmart Product',
      store_name: 'Walmart',
      canonical_url: canonical,
      confidence_score: 0.3,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
    };
  }

  private cleanWalmartTitle(input: string): string {
    return input
      .replace(/\s*\|\s*Walmart\.com.*$/i, '')
      .replace(/\s*at Walmart\.?\s*$/i, '')
      .replace(/^Walmart\.?com\s*-\s*/i, '')
      .trim();
  }
}
