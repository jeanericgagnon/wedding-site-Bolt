import { describe, expect, it } from 'vitest';
import { TargetAdapter } from '../../../../supabase/functions/registry-preview/targetAdapter';

describe('TargetAdapter regression', () => {
  it('parses JSON-LD offers arrays and keeps price', async () => {
    const adapter = new TargetAdapter();
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Stoneware Bowl",
              "image": "https://target.scene7.com/is/image/Target/GUEST_123",
              "offers": [
                {
                  "@type": "Offer",
                  "price": "49.99",
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock"
                }
              ]
            }
          </script>
        </head>
      </html>
    `;

    const parsed = await adapter.parse({
      url: 'https://www.target.com/p/stoneware-bowl/-/A-12345678',
      html,
      headers: {},
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Stoneware Bowl');
    expect(parsed?.price_amount).toBe(49.99);
    expect(parsed?.price_label).toBe('$49.99');
    expect(parsed?.partial).toBe(false);
  });

  it('accepts OpenGraph titles containing Target branding', async () => {
    const adapter = new TargetAdapter();
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Wood Tray | Target" />
          <meta property="og:image" content="https://target.scene7.com/is/image/Target/GUEST_456" />
          <meta property="product:price:amount" content="24.00" />
        </head>
      </html>
    `;

    const parsed = await adapter.parse({
      url: 'https://www.target.com/p/wood-tray/-/A-87654321',
      html,
      headers: {},
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Wood Tray');
    expect(parsed?.price_amount).toBe(24);
    expect(parsed?.partial).toBe(false);
  });
});
