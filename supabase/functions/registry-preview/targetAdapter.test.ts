import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { TargetAdapter } from "./targetAdapter.ts";

Deno.test("TargetAdapter accepts metadata titles that include the Target suffix", async () => {
  const adapter = new TargetAdapter();
  const html = `
    <html>
      <head>
        <title>GreenPan Rio Ceramic Frypan | Target</title>
        <meta property="og:title" content="GreenPan Rio Ceramic Frypan | Target" />
        <meta property="og:image" content="https://images.example.com/frypan.jpg" />
        <meta name="product:price:amount" content="39.99" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: "https://www.target.com/p/-/A-95024971",
    html,
    headers: {},
  });

  assertEquals(result?.title, "GreenPan Rio Ceramic Frypan");
  assertEquals(result?.price_amount, 39.99);
});

Deno.test("TargetAdapter rejects SKU-only metadata titles", async () => {
  const adapter = new TargetAdapter();
  const html = `
    <html>
      <head>
        <title>A 49168231 | Target</title>
        <meta property="og:title" content="A 49168231 | Target" />
      </head>
      <body></body>
    </html>
  `;

  const result = await adapter.parse({
    url: "https://www.target.com/p/-/A-49168231",
    html,
    headers: {},
  });

  assertEquals(result?.title, "Target Product");
  assertEquals(result?.source_method, "fallback");
  assertEquals(result?.confidence_score, 0.15);
});
