import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { GenericAdapter } from "./genericAdapter.ts";

Deno.test("GenericAdapter extracts fallback price from html when meta price is missing", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Example Product | Example Store</title>
        <meta property="og:title" content="Example Product | Example Store" />
        <meta property="og:image" content="https://example.com/product.jpg" />
      </head>
      <body>
        <div data-testid="price">$129.99</div>
      </body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://example.com/products/example-product',
    html,
    headers: {},
  });

  assertEquals(result?.price_amount, 129.99);
  assertEquals(result?.price_label, '$129.99');
});
