import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createLinkOnlyPreview, finalizeRegistryPreview } from "./previewSafety.ts";
import type { ProductData } from "./adapterTypes.ts";

function makePreview(overrides: Partial<ProductData> = {}): ProductData {
  return {
    title: "Useful Product",
    store_name: "Store",
    canonical_url: "https://example.com/product/useful-product",
    confidence_score: 0.7,
    source_method: "opengraph",
    ...overrides,
  };
}

Deno.test("finalizeRegistryPreview forces blocked-heavy fallback stores into link-only cards when metadata is weak", () => {
  const result = finalizeRegistryPreview(
    "https://www.walmart.com/ip/example-product",
    makePreview({
      title: "Great Product",
      store_name: "Walmart",
      confidence_score: 0.32,
      source_method: "fallback",
      partial: true,
      missing_fields: ["image", "price"],
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.guest_safe, true);
  assertEquals(result.title, "Gift from Walmart");
});

Deno.test("finalizeRegistryPreview keeps strong Amazon products guest-safe even when price is missing", () => {
  const result = finalizeRegistryPreview(
    "https://www.amazon.com/dp/B0ABC12345",
    makePreview({
      title: "Anker Nano Charging Station",
      store_name: "Amazon",
      image_url: "https://images.example.com/anker.jpg",
      confidence_score: 0.68,
      source_method: "opengraph",
      partial: true,
      missing_fields: ["price"],
    }),
  );

  assertEquals(result.display_mode, "product_card");
  assertEquals(result.guest_safe, true);
  assertEquals(result.review_status, "missing_price");
});

Deno.test("finalizeRegistryPreview rejects bad titles as link-only previews", () => {
  const result = finalizeRegistryPreview(
    "https://www.rei.com/product/example",
    makePreview({
      title: "Access Denied",
      store_name: "REI",
      confidence_score: 0.6,
      source_method: "opengraph",
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.title, "Gift from REI");
});

Deno.test("finalizeRegistryPreview rejects 404 titles as link-only previews", () => {
  const result = finalizeRegistryPreview(
    "https://www.target.com/p/-/A-12345678",
    makePreview({
      title: "404 Not Found",
      store_name: "Target",
      confidence_score: 0.9,
      source_method: "opengraph",
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.title, "Gift from Target");
});

Deno.test("finalizeRegistryPreview rejects homepage-style titles for blocked stores", () => {
  const result = finalizeRegistryPreview(
    "https://www.potterybarn.com/products/example-chair/",
    makePreview({
      title: "Home Furniture, Home Decor & Outdoor Furniture",
      store_name: "Pottery Barn",
      confidence_score: 0.55,
      source_method: "opengraph",
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.title, "Gift from Pottery Barn");
});

Deno.test("finalizeRegistryPreview rejects gift-guide style titles for blocked stores", () => {
  const result = finalizeRegistryPreview(
    "https://www.crateandbarrel.com/gift-guide/wedding",
    makePreview({
      title: "The Best Wedding Gifts for Couples",
      store_name: "Crate & Barrel",
      confidence_score: 0.58,
      source_method: "opengraph",
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.title, "Gift from Crate & Barrel");
});

Deno.test("createLinkOnlyPreview keeps guest-safe link cards stable", () => {
  const result = createLinkOnlyPreview("https://www.target.com/p/-/A-12345678", "blocked_by_store");

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.guest_safe, true);
  assertEquals(result.title, "Gift from Target");
});

Deno.test("finalizeRegistryPreview downgrades weak generic title confidence into link-only", () => {
  const result = finalizeRegistryPreview(
    "https://example.com/products/registry-guide",
    makePreview({
      title: "Registry Guide",
      store_name: "Example Store",
      confidence_score: 0.62,
      source_method: "opengraph",
      confidence: {
        overall: 0.62,
        title: 0.42,
        price: 0.7,
        image: 0.7,
        availability: 0.3,
        canonical_url: 0.8,
      },
    }),
  );

  assertEquals(result.display_mode, "link_card");
  assertEquals(result.title, "Gift from Example");
});
