import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateFallbackTitle } from "./adapterTypes.ts";

Deno.test("generateFallbackTitle derives readable title from Etsy-style slug", () => {
  const title = generateFallbackTitle("https://www.etsy.com/listing/123456789/personalized-wedding-guest-book-album");
  assertEquals(title, "Personalized Wedding Guest Book Album");
});

Deno.test("generateFallbackTitle skips generic path markers and ids", () => {
  const title = generateFallbackTitle("https://www.target.com/p/greenpan-rio-advanced-8-ceramic/-/A-95024971");
  assertEquals(title, "Greenpan Rio Advanced 8 Ceramic");
});

Deno.test("generateFallbackTitle falls back to host item when slug is unusable", () => {
  const title = generateFallbackTitle("https://www.amazon.com/dp/B0ABC12345");
  assertEquals(title, "Amazon item");
});
