import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { AmazonAdapter } from "./amazonAdapter.ts";

Deno.test("AmazonAdapter parses JSON-LD product data", async () => {
  const adapter = new AmazonAdapter();
  const html = `
    <html><head>
      <script type="application/ld+json">
        {
          "@context":"https://schema.org",
          "@type":"Product",
          "name":"Acme Toaster | Amazon.com",
          "image":["https://images.example.com/toaster.jpg"],
          "offers": { "@type":"Offer", "price":"49.99", "priceCurrency":"USD" }
        }
      </script>
    </head><body></body></html>
  `;

  const result = await adapter.parse({
    url: "https://www.amazon.com/dp/B0ABC12345",
    html,
    headers: {},
  });

  assertEquals(result?.store_name, "Amazon");
  assertEquals(result?.title, "Acme Toaster");
  assertEquals(result?.price_amount, 49.99);
  assertEquals(result?.source_method, "jsonld");
});

Deno.test("AmazonAdapter falls back with Amazon store name", async () => {
  const adapter = new AmazonAdapter();
  const result = await adapter.parse({
    url: "https://www.amazon.com/dp/B0ABC12345",
    html: "<html><head><title>Amazon.com: Great Product</title></head><body></body></html>",
    headers: {},
  });

  assertEquals(result?.store_name, "Amazon");
  assertEquals(result?.canonical_url, "https://amazon.com/dp/B0ABC12345");
});
