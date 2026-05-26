import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { IkeaAdapter } from "./ikeaAdapter.ts";

Deno.test("IkeaAdapter parses JSON-LD product data", async () => {
  const adapter = new IkeaAdapter();
  const html = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context":"https://schema.org",
            "@type":"Product",
            "name":"KALLAX Shelf Unit - IKEA",
            "image":"https://www.ikea.com/images/kallax.jpg",
            "offers":{
              "@type":"Offer",
              "price":"49.99",
              "priceCurrency":"USD",
              "availability":"https://schema.org/InStock"
            }
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20562091/",
    html,
    headers: {},
  });

  assertEquals(result?.title, "KALLAX Shelf Unit");
  assertEquals(result?.price_amount, 49.99);
  assertEquals(result?.store_name, "IKEA");
});

Deno.test("IkeaAdapter accepts metadata titles with IKEA suffix", async () => {
  const adapter = new IkeaAdapter();
  const html = `
    <html>
      <head>
        <title>MALM Bed Frame | IKEA</title>
        <meta property="og:title" content="MALM Bed Frame | IKEA" />
        <meta property="og:image" content="https://www.ikea.com/images/malm.jpg" />
        <meta name="product:price:amount" content="279.00" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: "https://www.ikea.com/us/en/p/malm-bed-frame-black-brown-90404817/",
    html,
    headers: {},
  });

  assertEquals(result?.title, "MALM Bed Frame");
  assertEquals(result?.price_amount, 279);
});
