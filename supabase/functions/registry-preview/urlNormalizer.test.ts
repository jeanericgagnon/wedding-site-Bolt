import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { normalizeUrl, isSameProduct } from "./urlNormalizer.ts";

Deno.test("normalizeUrl - removes tracking parameters", () => {
  const url = "https://www.target.com/p/product/-/A-12345678?utm_source=google&ref=abc";
  const result = normalizeUrl(url);
  assertEquals(result.canonical, "https://target.com/p/-/A-12345678");
});

Deno.test("normalizeUrl - extracts Target TCIN", () => {
  const url = "https://www.target.com/p/greenpan-rio-advanced-8-ceramic/-/A-95024971";
  const result = normalizeUrl(url);
  assertEquals(result.metadata.tcin, "95024971");
  assertEquals(result.canonical, "https://target.com/p/-/A-95024971");
});

Deno.test("normalizeUrl - extracts Amazon ASIN", () => {
  const url = "https://www.amazon.com/dp/B07XYZ1234?tag=test";
  const result = normalizeUrl(url);
  assertEquals(result.metadata.asin, "B07XYZ1234");
  assertEquals(result.canonical, "https://amazon.com/dp/B07XYZ1234");
});

Deno.test("normalizeUrl - detects retailer correctly", () => {
  const targetUrl = "https://www.target.com/p/product/-/A-12345678";
  const amazonUrl = "https://www.amazon.com/dp/B07XYZ1234";
  const walmartUrl = "https://www.walmart.com/ip/product/12345678";

  assertEquals(normalizeUrl(targetUrl).retailer, "target");
  assertEquals(normalizeUrl(amazonUrl).retailer, "amazon");
  assertEquals(normalizeUrl(walmartUrl).retailer, "walmart");
});

Deno.test("isSameProduct - matches by canonical URL", () => {
  const url1 = "https://target.com/p/product-name/-/A-12345678?utm_source=google";
  const url2 = "https://www.target.com/p/different-name/-/A-12345678?ref=abc";
  assertEquals(isSameProduct(url1, url2), true);
});

Deno.test("isSameProduct - matches by TCIN", () => {
  const url1 = "https://target.com/p/product-a/-/A-12345678";
  const url2 = "https://target.com/p/product-b/-/A-12345678";
  assertEquals(isSameProduct(url1, url2), true);
});

Deno.test("isSameProduct - does not match different products", () => {
  const url1 = "https://target.com/p/product/-/A-12345678";
  const url2 = "https://target.com/p/product/-/A-87654321";
  assertEquals(isSameProduct(url1, url2), false);
});
