import { describe, expect, it } from 'vitest';

import { buildRegistryBatchProbePreview } from '../../scripts/registry-batch-probe.mjs';

describe('registry batch probe', () => {
  it('downgrades blocked pages into clean link-only gifts', () => {
    const result = buildRegistryBatchProbePreview('https://www.rei.com/product/example', {
      blocked: true,
      html: '<title>Access denied</title>',
      jsonLd: null,
    });

    expect(result).toEqual(expect.objectContaining({
      item_name: 'Gift from REI',
      display_mode: 'link_card',
      guest_safe: true,
      source_status: 'blocked',
      review_status: 'blocked_source',
      price_label: null,
    }));
  });

  it('downgrades weak category-like titles into link-only gifts', () => {
    const result = buildRegistryBatchProbePreview('https://www.potterybarn.com/gift-guide/wedding', {
      blocked: false,
      html: `
        <html>
          <head>
            <title>The Best Wedding Gifts for Couples | Pottery Barn</title>
          </head>
        </html>
      `,
      jsonLd: null,
    });

    expect(result).toEqual(expect.objectContaining({
      item_name: 'Gift from Pottery Barn',
      display_mode: 'link_card',
      guest_safe: true,
      source_status: 'partial',
      review_status: 'needs_review',
    }));
  });

  it('keeps strong product metadata as product-card output', () => {
    const result = buildRegistryBatchProbePreview('https://www.target.com/p/stoneware-bowl/-/A-12345678', {
      blocked: false,
      html: `
        <html>
          <head>
            <title>Stoneware Bowl | Target</title>
            <meta property="og:image" content="https://target.scene7.com/is/image/Target/GUEST_123" />
            <meta property="product:price:amount" content="$49.99" />
          </head>
        </html>
      `,
      jsonLd: {
        name: 'Stoneware Bowl',
        offers: [{ price: '49.99', availability: 'https://schema.org/InStock' }],
      },
    });

    expect(result).toEqual(expect.objectContaining({
      item_name: 'Stoneware Bowl',
      display_mode: 'product_card',
      guest_safe: true,
      source_status: 'clean',
      review_status: 'clean',
      price_label: '$49.99',
      availability: 'unknown',
    }));
  });
});
