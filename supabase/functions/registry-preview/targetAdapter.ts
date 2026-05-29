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
  normalizeAvailability,
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

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
  }

  /**
   * Extract __NEXT_DATA__ from Target's Next.js app
   */
  private extractNextData(html: string): Record<string, unknown> | null {
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
  private parseNextData(nextData: Record<string, unknown>, canonical: string): ProductData | null {
    try {
      // Target's Next.js data structure can vary, look for product info
      const props = this.asRecord(this.asRecord(nextData.props)?.pageProps);
      if (!props) return null;

      // Common paths where product data might be
      const product = this.asRecord(
        props.product ||
        this.asRecord(props.initialData)?.product ||
        this.asRecord(props.data)?.product ||
        this.asRecord(props.productDetails)?.product,
      );

      if (!product) return null;

      const fallbackTitle = this.asRecord(this.asRecord(product.item)?.product_description)?.title;
      const title =
        typeof product.title === 'string'
          ? product.title
          : typeof product.name === 'string'
            ? product.name
            : typeof fallbackTitle === 'string'
              ? fallbackTitle
              : null;
      const priceContainer = this.asRecord(product.price);
      const rawPrice = priceContainer?.current_retail || priceContainer?.current || product.price;
      const priceRecord = typeof rawPrice === 'object' && rawPrice !== null
        ? rawPrice as {
          value?: string | number | null;
          amount?: string | number | null;
          currency_code?: string | null;
          formatted?: string | null;
        }
        : null;
      const price = this.sanitizePrice(
        typeof rawPrice === 'number'
          ? rawPrice
          : Number.parseFloat(String(priceRecord?.value || priceRecord?.amount || rawPrice || '')),
      );
      const productImagesRaw = product.images;
      const productImages = this.asRecord(Array.isArray(productImagesRaw) ? productImagesRaw[0] : null);
      const itemImagesRaw = this.asRecord(this.asRecord(product.item)?.enrichment)?.images;
      const itemEnrichment = this.asRecord(Array.isArray(itemImagesRaw) ? itemImagesRaw[0] : null);
      const image =
        productImages?.base_url ||
        (typeof product.image === 'string' ? product.image : undefined) ||
        itemEnrichment?.base_url;

      if (!title) return null;

      const missing: string[] = [];
      if (!image) missing.push('image');
      if (!price || !Number.isFinite(price)) missing.push('price');

      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      if (price !== null && price !== undefined) {
        if (typeof price === 'number') {
          priceAmount = this.sanitizePrice(price);
          if (priceAmount) priceLabel = `$${priceAmount.toFixed(2)}`;
        } else if (priceRecord) {
          priceAmount = this.sanitizePrice(parseFloat(String(priceRecord.value || priceRecord.amount || '')));
          currency = priceRecord.currency_code || 'USD';
          if (priceAmount) priceLabel = priceRecord.formatted || `$${priceAmount.toFixed(2)}`;
        }
      }

      return {
        title,
        image_url: typeof image === 'string' ? image : undefined,
        price_label: priceLabel || undefined,
        price_amount: priceAmount,
        currency,
        availability: normalizeAvailability(typeof product.availability === 'string' ? product.availability : undefined),
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
  private parseJsonLd(jsonLd: Record<string, unknown>, canonical: string): ProductData | null {
    try {
      const title = typeof jsonLd.name === 'string' ? jsonLd.name : null;
      if (!title) return null;
      if (this.looksLikeSkuTitle(title)) return null;

      const missing: string[] = [];
      let image = jsonLd.image;
      if (Array.isArray(image)) image = image[0];
      if (typeof image === 'object' && image !== null) {
        const imageRecord = image as Record<string, unknown>;
        image = imageRecord.url || imageRecord.contentUrl;
      }
      if (!image) missing.push('image');

      let priceLabel = '';
      let priceAmount: number | undefined;
      let currency = 'USD';

      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      const offerRecord = this.asRecord(offers);
      if (offerRecord?.price) {
        priceAmount = this.sanitizePrice(parseFloat(String(offerRecord.price)));
        currency = typeof offerRecord.priceCurrency === 'string' ? offerRecord.priceCurrency : 'USD';
        if (priceAmount) {
          priceLabel = `$${priceAmount.toFixed(2)}`;
        } else {
          missing.push('price');
        }
      } else {
        missing.push('price');
      }

      return {
        title,
        image_url: typeof image === 'string' ? image : undefined,
        price_label: priceLabel || undefined,
        price_amount: priceAmount,
        currency,
        availability: normalizeAvailability(typeof offerRecord?.availability === 'string' ? offerRecord.availability : undefined),
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

    if (!title) {
      return null;
    }

    const cleanedTitle = title
      .replace(/\s*\|\s*Target.*$/i, '')
      .replace(/^Target\s*:\s*/i, '')
      .trim();
    if (!cleanedTitle || this.looksLikeSkuTitle(cleanedTitle)) return null;

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
        priceAmount = this.sanitizePrice(parsed.amount);
        currency = parsed.currency;
        if (priceAmount) {
          priceLabel = `$${priceAmount.toFixed(2)}`;
        } else {
          missing.push('price');
        }
      } else {
        missing.push('price');
      }
    } else {
      missing.push('price');
    }

    return {
      title: cleanedTitle,
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
    if (this.looksLikeSkuTitle(title)) {
      return {
        title: 'Target Product',
        store_name: 'Target',
        canonical_url: canonical,
        confidence_score: 0.15,
        source_method: 'fallback',
        partial: true,
        missing_fields: ['title', 'image', 'price'],
      };
    }

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

  private sanitizePrice(amount?: number): number | undefined {
    if (!amount || !Number.isFinite(amount)) return undefined;
    if (amount < 1 || amount > 10000) return undefined;
    return amount;
  }

  private looksLikeSkuTitle(title: string): boolean {
    const value = title.trim();
    return /^[a-z]?\s?\d{5,}$/i.test(value) || /^A-\d+$/i.test(value);
  }
}
