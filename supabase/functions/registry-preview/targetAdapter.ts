/**
 * Target.com Adapter
 * Implements multiple parsing strategies for Target product pages
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

export class TargetAdapter implements RetailerAdapter {
  name = 'target';
  hostnames = /target\.com$/i;

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

    // Strategy 1: Try __NEXT_DATA__ (Target uses Next.js)
    const nextData = this.extractNextData(html);
    if (nextData) {
      const result = this.parseNextData(nextData, normalized.canonical);
      if (result && result.confidence_score >= 0.7) {
        return result;
      }
    }

    // Strategy 2: Try JSON-LD Product schema
    const jsonLd = extractJsonLdProduct(html);
    if (jsonLd) {
      const result = this.parseJsonLd(jsonLd, normalized.canonical);
      if (result && result.confidence_score >= 0.7) {
        return result;
      }
    }

    // Strategy 3: Try OpenGraph + Meta tags
    const og = extractOpenGraph(html);
    const meta = extractMetaTags(html);
    if (og.title || meta.title || og.image) {
      const result = this.parseMetadata(og, meta, html, normalized.canonical);
      if (result && result.confidence_score >= 0.5) {
        return result;
      }
    }

    // Strategy 4: Fallback with slug-based title
    return this.createFallback(url, normalized.canonical);
  }

  /**
   * Extract __NEXT_DATA__ from Target's Next.js app
   */
  private extractNextData(html: string): any | null {
    try {
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (!match) return null;

      const data = JSON.parse(match[1]);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Parse __NEXT_DATA__ structure
   */
  private parseNextData(nextData: any, canonical: string): ProductData | null {
    try {
      // Target's Next.js data structure can vary, look for product info
      const props = nextData?.props?.pageProps;
      if (!props) return null;

      // Common paths where product data might be
      const product =
        props.product ||
        props.initialData?.product ||
        props.data?.product ||
        props.productDetails?.product;

      if (!product) return null;

      const title = product.title || product.name || product.item?.product_description?.title;
      const price = product.price?.current_retail || product.price?.current || product.price;
      const image =
        product.images?.[0]?.base_url ||
        product.image ||
        product.item?.enrichment?.images?.[0]?.base_url;

      if (!title) return null;

      const missing: string[] = [];
      if (!image) missing.push('image');
      if (!price && typeof price !== 'number') missing.push('price');

      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      if (price !== null && price !== undefined) {
        if (typeof price === 'number') {
          priceAmount = price;
          priceLabel = `$${price.toFixed(2)}`;
        } else if (typeof price === 'object') {
          priceAmount = parseFloat(price.value || price.amount);
          currency = price.currency_code || 'USD';
          priceLabel = price.formatted || `$${priceAmount.toFixed(2)}`;
        }
      }

      return {
        title,
        image_url: image || undefined,
        price_label: priceLabel || undefined,
        price_amount: priceAmount,
        currency,
        availability: product.availability || undefined,
        store_name: 'Target',
        canonical_url: canonical,
        confidence_score: missing.length === 0 ? 0.95 : 0.75,
        source_method: 'retailer_adapter',
        partial: missing.length > 0,
        missing_fields: missing.length > 0 ? missing : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse JSON-LD Product schema
   */
  private parseJsonLd(jsonLd: any, canonical: string): ProductData | null {
    try {
      const title = jsonLd.name;
      if (!title) return null;

      const missing: string[] = [];
      let image = jsonLd.image;
      if (Array.isArray(image)) image = image[0];
      if (typeof image === 'object') image = image.url || image.contentUrl;
      if (!image) missing.push('image');

      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      const offers = jsonLd.offers || (Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : null);
      if (offers?.price) {
        priceAmount = parseFloat(offers.price);
        currency = offers.priceCurrency || 'USD';
        priceLabel = `$${priceAmount.toFixed(2)}`;
      } else {
        missing.push('price');
      }

      return {
        title,
        image_url: image || undefined,
        price_label: priceLabel || undefined,
        price_amount: priceAmount,
        currency,
        availability: offers?.availability || undefined,
        store_name: 'Target',
        canonical_url: canonical,
        confidence_score: missing.length === 0 ? 0.9 : 0.7,
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
    canonical: string
  ): ProductData | null {
    const title =
      og.title ||
      meta['og:title'] ||
      meta.title ||
      meta['twitter:title'] ||
      extractTitle(html);

    if (!title || title.toLowerCase().includes('target')) {
      return null;
    }

    const missing: string[] = [];

    const image = og.image || meta['og:image'] || meta['twitter:image'];
    if (!image) missing.push('image');

    const priceStr = og.price || meta['product:price:amount'] || meta.price;
    let priceLabel = '';
    let priceAmount: number | undefined;
    let currency = 'USD';

    if (priceStr) {
      const parsed = parsePrice(priceStr);
      if (parsed) {
        priceAmount = parsed.amount;
        currency = parsed.currency;
        priceLabel = `$${priceAmount.toFixed(2)}`;
      } else {
        missing.push('price');
      }
    } else {
      missing.push('price');
    }

    return {
      title: title.replace(/\s*\|\s*Target.*$/i, '').trim(),
      image_url: image || undefined,
      price_label: priceLabel || undefined,
      price_amount: priceAmount,
      currency,
      store_name: 'Target',
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
  private createFallback(url: string, canonical: string): ProductData {
    const title = generateFallbackTitle(url);

    return {
      title,
      store_name: 'Target',
      canonical_url: canonical,
      confidence_score: 0.3,
      source_method: 'fallback',
      partial: true,
      missing_fields: ['image', 'price'],
    };
  }
}
