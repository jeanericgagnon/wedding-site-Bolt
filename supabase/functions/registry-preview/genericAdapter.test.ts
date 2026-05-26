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

Deno.test("GenericAdapter rejects homepage-style category titles", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Home Furniture, Home Decor & Outdoor Furniture | Pottery Barn</title>
        <meta property="og:title" content="Home Furniture, Home Decor & Outdoor Furniture | Pottery Barn" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://www.potterybarn.com/products/example-chair',
    html,
    headers: {},
  });

  assertEquals(result, null);
});

Deno.test("GenericAdapter strips retailer marketing suffixes before validating title", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Stoneware Serving Bowl | Gift Ideas | Pottery Barn</title>
        <meta property="og:title" content="Stoneware Serving Bowl | Gift Ideas | Pottery Barn" />
        <meta property="og:image" content="https://example.com/bowl.jpg" />
      </head>
      <body>
        <div data-testid="price">$64.00</div>
      </body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://www.potterybarn.com/products/stoneware-serving-bowl',
    html,
    headers: {},
  });

  assertEquals(result?.title, 'Stoneware Serving Bowl');
  assertEquals(result?.price_amount, 64);
});

Deno.test("GenericAdapter rejects gift-guide style titles that are not products", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>The Best Wedding Gifts for Couples | Crate & Barrel</title>
        <meta property="og:title" content="The Best Wedding Gifts for Couples | Crate & Barrel" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://www.crateandbarrel.com/gift-guide/wedding',
    html,
    headers: {},
  });

  assertEquals(result, null);
});

Deno.test("GenericAdapter prefers stronger product titles over generic marketing titles", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Shop our featured collections | Example Store</title>
        <meta property="og:title" content="Stoneware Serving Bowl | Example Store" />
        <meta name="twitter:title" content="Gift Ideas | Example Store" />
        <meta property="og:image" content="https://example.com/bowl.jpg" />
        <meta name="product:price:amount" content="64.00" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://example.com/products/stoneware-serving-bowl',
    html,
    headers: {},
  });

  assertEquals(result?.title, 'Stoneware Serving Bowl');
  assertEquals(result?.confidence?.title !== undefined && result.confidence.title >= 0.58, true);
});

Deno.test("GenericAdapter falls back to product-style image candidates when social image tags are missing", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Ceramic Serving Bowl | Example Store</title>
        <meta property="og:title" content="Ceramic Serving Bowl | Example Store" />
        <meta name="product:price:amount" content="54.00" />
      </head>
      <body>
        <img class="product-photo primary" src="https://example.com/images/bowl.jpg" alt="Ceramic Serving Bowl" />
      </body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://example.com/products/ceramic-serving-bowl',
    html,
    headers: {},
  });

  assertEquals(result?.image_url, 'https://example.com/images/bowl.jpg');
});

Deno.test("GenericAdapter extracts visible availability language when metadata is missing", async () => {
  const adapter = new GenericAdapter();
  const html = `
    <html>
      <head>
        <title>Linen Throw Blanket | Example Store</title>
        <meta property="og:title" content="Linen Throw Blanket | Example Store" />
        <meta property="og:image" content="https://example.com/blanket.jpg" />
        <meta name="product:price:amount" content="84.00" />
      </head>
      <body>
        <p>Ready to ship in 2 business days.</p>
      </body>
    </html>
  `;

  const result = await adapter.parse({
    url: 'https://example.com/products/linen-throw-blanket',
    html,
    headers: {},
  });

  assertEquals(result?.availability, 'in_stock');
});
