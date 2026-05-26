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

Deno.test("normalizeUrl - extracts Best Buy SKU", () => {
  const url = "https://www.bestbuy.com/site/example-product/6484343.p?utm_source=google";
  const result = normalizeUrl(url);
  assertEquals(result.metadata.sku, "6484343");
  assertEquals(result.canonical, "https://bestbuy.com/site/6484343.p");
});

Deno.test("normalizeUrl - extracts IKEA article number", () => {
  const url = "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20562091/";
  const result = normalizeUrl(url);
  assertEquals(result.metadata.article_number, "20562091");
  assertEquals(result.canonical, "https://ikea.com/us/en/p/20562091/");
});

Deno.test("normalizeUrl - detects retailer correctly", () => {
  const targetUrl = "https://www.target.com/p/product/-/A-12345678";
  const amazonUrl = "https://www.amazon.com/dp/B07XYZ1234";
  const walmartUrl = "https://www.walmart.com/ip/product/12345678";
  const bestBuyUrl = "https://www.bestbuy.com/site/example-product/6484343.p";
  const reiUrl = "https://www.rei.com/product/123456/example-tent";

  assertEquals(normalizeUrl(targetUrl).retailer, "target");
  assertEquals(normalizeUrl(amazonUrl).retailer, "amazon");
  assertEquals(normalizeUrl(walmartUrl).retailer, "walmart");
  assertEquals(normalizeUrl(bestBuyUrl).retailer, "bestbuy");
  assertEquals(normalizeUrl(reiUrl).retailer, "rei");
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

Deno.test("isSameProduct - matches Best Buy products by SKU", () => {
  const url1 = "https://www.bestbuy.com/site/product-name/6484343.p?utm_source=google";
  const url2 = "https://bestbuy.com/site/another-name/6484343.p";
  assertEquals(isSameProduct(url1, url2), true);
});

Deno.test("isSameProduct - matches IKEA products by article number", () => {
  const url1 = "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20562091/";
  const url2 = "https://ikea.com/us/en/p/kallax-shelf-unit-black-brown-20562091/";
  assertEquals(isSameProduct(url1, url2), true);
});

Deno.test("isSameProduct - does not match different products", () => {
  const url1 = "https://target.com/p/product/-/A-12345678";
  const url2 = "https://target.com/p/product/-/A-87654321";
  assertEquals(isSameProduct(url1, url2), false);
});
