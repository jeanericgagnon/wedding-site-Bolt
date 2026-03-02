/**
 * Amazon Adapter
 * Adds Amazon-specific parsing + normalization to improve extraction quality.
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

export class AmazonAdapter implements RetailerAdapter {
  name = 'amazon';
  hostnames = /amazon\./i;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.hostnames.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  async parse(context: AdapterContext): Promise<ProductData | null> {
    const { url, html } = context;
    const normalized = normalizeUrl(url);

    const jsonLd = extractJsonLdProduct(html);
    if (jsonLd) {
      const fromJsonLd = this.parseJsonLd(jsonLd, normalized.canonical);
      if (fromJsonLd && fromJsonLd.confidence_score >= 0.72) return fromJsonLd;
    }

    const og = extractOpenGraph(html);
    const meta = extractMetaTags(html);
    const fromMeta = this.parseMetadata(og, meta, html, normalized.canonical);
    if (fromMeta) return fromMeta;

    return this.createFallback(url, normalized.canonical);
  }

  private parseJsonLd(jsonLd: any, canonical: string): ProductData | null {
    const title = this.cleanAmazonTitle((jsonLd?.name ?? '').toString());
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
      store_name: 'Amazon',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.9 : 0.76,
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
    const title = this.cleanAmazonTitle(rawTitle);
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
      store_name: 'Amazon',
      canonical_url: canonical,
      confidence_score: missing.length === 0 ? 0.68 : 0.56,
      source_method: 'opengraph',
      partial: missing.length > 0,
      missing_fields: missing.length ? missing : undefined,
    };
  }

  private createFallback(url: string, canonical: string): ProductData {
    const title = this.cleanAmazonTitle(generateFallbackTitle(url));
    return {
      title: title || 'Amazon Product',
      store_name: 'Amazon',
      canonical_url: canonical,
      confidence_score: 0.32,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
    };
  }

  private cleanAmazonTitle(input: string): string {
    return input
      .replace(/\s*:\s*Amazon\.?com.*$/i, '')
      .replace(/\s*\|\s*Amazon\.?com.*$/i, '')
      .replace(/^Amazon\.?com:\s*/i, '')
      .replace(/\s+at Amazon\.?com\s*$/i, '')
      .trim();
  }
}
