import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { WalmartAdapter } from "./walmartAdapter.ts";

Deno.test("WalmartAdapter parses JSON-LD product data", async () => {
  const adapter = new WalmartAdapter();
  const html = `
    <html><head>
      <script type="application/ld+json">
        {
          "@context":"https://schema.org",
          "@type":"Product",
          "name":"Mainstays Coffee Maker | Walmart.com",
          "image":["https://images.example.com/coffee-maker.jpg"],
          "offers": { "@type":"Offer", "price":"29.88", "priceCurrency":"USD" }
        }
      </script>
    </head><body></body></html>
  `;

  const result = await adapter.parse({
    url: "https://www.walmart.com/ip/123456789",
    html,
    headers: {},
  });

  assertEquals(result?.store_name, "Walmart");
  assertEquals(result?.title, "Mainstays Coffee Maker");
  assertEquals(result?.price_amount, 29.88);
  assertEquals(result?.source_method, "jsonld");
});

Deno.test("WalmartAdapter fallback keeps walmart canonical", async () => {
  const adapter = new WalmartAdapter();
  const result = await adapter.parse({
    url: "https://www.walmart.com/ip/123456789",
    html: "<html><head><title>Walmart.com</title></head><body></body></html>",
    headers: {},
  });

  assertEquals(result?.store_name, "Walmart");
  assertEquals(result?.canonical_url, "https://walmart.com/ip/123456789");
});
