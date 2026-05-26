#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;
const BLOCKED_TERMS = [
  'access denied',
  '404 not found',
  'not found',
  'robot or human',
  'verify you are human',
  'are you a robot',
  'captcha',
  'blocked',
  'forbidden',
  'attention required',
  'akamai',
  'cloudflare',
  'perimeterx',
  'datadome',
  'bot detection',
];
const CATEGORY_TERMS = [
  'home furniture',
  'home decor',
  'outdoor furniture',
  'shop all',
  'new arrivals',
  'sale',
  'registry',
  'wedding registry',
  'furniture store',
  'room ideas',
  'featured collections',
  'gift ideas',
  'gifts for',
  'serveware',
  'tabletop',
  'dinnerware sets',
];
const STORE_NAMES = [
  ['amazon.', 'Amazon'],
  ['target.', 'Target'],
  ['walmart.', 'Walmart'],
  ['crateandbarrel.', 'Crate & Barrel'],
  ['cb2.', 'CB2'],
  ['williams-sonoma.', 'Williams Sonoma'],
  ['westelm.', 'West Elm'],
  ['potterybarn.', 'Pottery Barn'],
  ['surlatable.', 'Sur La Table'],
  ['macys.', "Macy's"],
  ['costco.', 'Costco'],
  ['wayfair.', 'Wayfair'],
  ['etsy.', 'Etsy'],
  ['brooklinen.', 'Brooklinen'],
  ['parachutehome.', 'Parachute'],
  ['fromourplace.', 'Our Place'],
  ['article.', 'Article'],
  ['ikea.', 'IKEA'],
  ['bestbuy.', 'Best Buy'],
  ['rei.', 'REI'],
];

function parseArgs(argv) {
  const args = { input: '', format: 'json', urls: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--input') {
      args.input = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (value === '--format') {
      args.format = argv[i + 1] ?? 'json';
      i += 1;
      continue;
    }
    args.urls.push(value);
  }
  return args;
}

function loadUrls(inputPath, urls) {
  if (inputPath) {
    return readFileSync(inputPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return urls;
}

function deriveStoreName(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const known = STORE_NAMES.find(([fragment]) => hostname.includes(fragment));
    if (known) return known[1];
    return hostname
      .replace(/^www\./, '')
      .split('.')[0]
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Store';
  } catch {
    return 'Store';
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : '';
}

function extractMetaContent(html, attribute, name) {
  const direct = new RegExp(`<meta[^>]*${attribute}=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const reverse = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${name}["'][^>]*>`, 'i');
  const match = html.match(direct) || html.match(reverse);
  return match?.[1] ? decodeHtml(match[1].trim()) : '';
}

function extractJsonLdProducts(html) {
  const matches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const products = [];
  for (const rawScript of matches) {
    const content = rawScript.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item) continue;
      if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
        products.push(item);
      }
      if (Array.isArray(item['@graph'])) {
        for (const graphItem of item['@graph']) {
          if (graphItem?.['@type'] === 'Product' || (Array.isArray(graphItem?.['@type']) && graphItem['@type'].includes('Product'))) {
            products.push(graphItem);
          }
        }
      }
    }
  }
  return products;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAvailability(value) {
  const raw = (value ?? '').toLowerCase().trim();
  if (!raw) return null;
  if (raw.includes('out of stock') || raw.includes('unavailable') || raw.includes('sold out')) return 'out_of_stock';
  if (raw.includes('limited') || raw.includes('few left') || raw.includes('low stock') || raw.includes('only')) return 'low_stock';
  if (raw.includes('in stock') || raw.includes('available') || raw.includes('ready to ship') || raw.includes('ships')) return 'in_stock';
  return 'unknown';
}

function parsePrice(value) {
  if (!value) return null;
  const match = value.match(/([$€£])\s*([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const currency = match[1] === '$' ? 'USD' : match[1] === '€' ? 'EUR' : 'GBP';
  const amount = Number.parseFloat(match[2].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency,
    label: `${match[1]}${amount.toFixed(2)}`,
  };
}

function isBadTitle(title) {
  const clean = (title ?? '').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 8) return true;
  const lower = clean.toLowerCase();
  if (BLOCKED_TERMS.some((term) => lower.includes(term))) return true;
  if (CATEGORY_TERMS.some((term) => lower.includes(term))) return true;
  if (/^[a-z]?\s?\d{5,}$/i.test(clean)) return true;
  if (/^[a-z0-9\-_/]{6,}$/i.test(clean) && !clean.includes(' ')) return true;
  return false;
}

function cleanTitleCandidate(title, storeName) {
  let clean = decodeHtml(String(title ?? '')).trim();
  if (!clean) return '';
  if (storeName === 'Amazon') {
    clean = clean.replace(/^Amazon\.com:\s*/i, '');
    clean = clean.replace(/:\s*(semi automatic pump espresso machines|electric stand mixers|home & kitchen|kitchen & dining)\s*$/i, '');
  }
  clean = clean.replace(/\s*[|]\s*(article|west elm|pottery barn|williams sonoma|crate & barrel|cb2)\s*$/i, '');
  return clean.trim();
}

function scoreTitle(title) {
  const clean = (title ?? '').trim();
  if (!clean || isBadTitle(clean)) return 0;
  let score = 0.55;
  if (clean.length >= 12 && clean.length <= 120) score += 0.18;
  if (/\s/.test(clean)) score += 0.1;
  if (/[A-Z][a-z]/.test(clean)) score += 0.05;
  if (/\b(set|frame|bowl|plate|chair|lamp|shelf|table|glass|mixer|vacuum|blender|quilt|sheet|sofa|pan|board)\b/i.test(clean)) score += 0.12;
  if (/\b(shop|buy|sale|registry|guide|ideas|collection)\b/i.test(clean)) score -= 0.18;
  return Math.max(0, Math.min(1, score));
}

function pickBestTitle(candidates, storeName) {
  return candidates
    .map((candidate) => cleanTitleCandidate(candidate, storeName))
    .filter(Boolean)
    .map((title) => ({ title, confidence: scoreTitle(title) }))
    .sort((a, b) => b.confidence - a.confidence || a.title.length - b.title.length)[0] ?? null;
}

function pickBestImage(html, jsonLd) {
  const candidates = [];
  const og = extractMetaContent(html, 'property', 'og:image');
  const twitter = extractMetaContent(html, 'name', 'twitter:image');
  for (const value of [jsonLd?.image, og, twitter]) {
    const image = Array.isArray(value) ? value[0] : typeof value === 'object' ? value?.url : value;
    if (typeof image === 'string' && /^https?:\/\//i.test(image) && !/\b(sprite|icon|logo|avatar|placeholder)\b/i.test(image)) {
      candidates.push(image);
    }
  }
  return candidates[0] ?? null;
}

function pickBestPrice(html, jsonLd) {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
  const offerPrice = parsePrice(typeof offers?.price === 'string' ? offers.price : typeof offers?.price === 'number' ? `$${offers.price}` : '');
  if (offerPrice) return offerPrice;
  const metaPrice = parsePrice(extractMetaContent(html, 'property', 'product:price:amount'))
    || parsePrice(extractMetaContent(html, 'name', 'price'))
    || parsePrice(extractMetaContent(html, 'name', 'twitter:data1'));
  if (metaPrice) return metaPrice;
  const visible = html.match(/([$€£]\s*[\d,]+(?:\.\d{2})?)/);
  return visible ? parsePrice(visible[1]) : null;
}

function pickAvailability(html, jsonLd) {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
  return normalizeAvailability(
    offers?.availability
    || extractMetaContent(html, 'property', 'product:availability')
    || html.match(/\b(in stock|out of stock|currently unavailable|limited stock|few left|ready to ship)\b/i)?.[1]
    || ''
  );
}

function isBlockedPage({ status, html, finalUrl }) {
  if ([401, 403, 429].includes(status)) return true;
  const sample = `${extractTitle(html)} ${finalUrl} ${html.slice(0, 5000)}`.toLowerCase();
  return BLOCKED_TERMS.some((term) => sample.includes(term));
}

async function fetchHtml(url) {
  let current = url;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: new URL(current).origin,
        'Cache-Control': 'no-cache',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) break;
      current = new URL(location, current).toString();
      continue;
    }
    const html = await response.text();
    return { finalUrl: current, status: response.status, html };
  }
  throw new Error('Too many redirects');
}

export function buildRegistryBatchProbePreview(url, payload) {
  const storeName = deriveStoreName(url);
  if (payload.blocked) {
    return {
      item_name: `Gift from ${storeName}`,
      store_name: storeName,
      display_mode: 'link_card',
      guest_safe: true,
      source_status: 'blocked',
      review_status: 'blocked_source',
      owner_message: `${storeName} blocked product details. Added as a clean link-only gift.`,
      price_label: null,
      availability: 'unknown',
      confidence: { overall: 0.4, title: 0, price: 0, image: 0, availability: 0 },
    };
  }

  const jsonLd = payload.jsonLd;
  const bestTitle = pickBestTitle([
    jsonLd?.name,
    jsonLd?.alternateName,
    jsonLd?.headline,
    extractMetaContent(payload.html, 'property', 'og:title'),
    extractMetaContent(payload.html, 'name', 'twitter:title'),
    extractMetaContent(payload.html, 'name', 'title'),
    extractTitle(payload.html),
  ], storeName);
  const price = pickBestPrice(payload.html, jsonLd);
  const image = pickBestImage(payload.html, jsonLd);
  const availability = pickAvailability(payload.html, jsonLd);
  const titleConfidence = bestTitle?.confidence ?? 0;
  const imageConfidence = image ? 0.75 : 0;
  const priceConfidence = price ? 0.7 : 0;
  const availabilityConfidence = availability ? 0.45 : 0;
  const overall = Math.max(titleConfidence, (titleConfidence + imageConfidence + priceConfidence) / 3);

  if (!bestTitle || titleConfidence < 0.58) {
    return {
      item_name: `Gift from ${storeName}`,
      store_name: storeName,
      display_mode: 'link_card',
      guest_safe: true,
      source_status: 'partial',
      review_status: 'needs_review',
      owner_message: `Added as a clean link-only gift because product details were not reliable.`,
      price_label: null,
      availability: availability ?? 'unknown',
      confidence: { overall: 0.4, title: titleConfidence, price: priceConfidence, image: imageConfidence, availability: availabilityConfidence },
    };
  }

  const missingFields = [];
  if (!price) missingFields.push('price');
  if (!image) missingFields.push('image');

  return {
    item_name: bestTitle.title,
    store_name: storeName,
    display_mode: 'product_card',
    guest_safe: true,
    source_status: missingFields.length > 0 ? 'partial' : 'clean',
    review_status: missingFields.includes('image') ? 'missing_image' : missingFields.includes('price') ? 'missing_price' : 'clean',
    owner_message: missingFields.length > 0
      ? `Imported with ${missingFields.join(' and ')} missing.`
      : 'Imported cleanly.',
    price_label: price?.label ?? null,
    availability: availability ?? 'unknown',
    confidence: {
      overall: Number(overall.toFixed(2)),
      title: Number(titleConfidence.toFixed(2)),
      price: Number(priceConfidence.toFixed(2)),
      image: Number(imageConfidence.toFixed(2)),
      availability: Number(availabilityConfidence.toFixed(2)),
    },
  };
}

async function probe(url) {
  try {
    const payload = await fetchHtml(url);
    const jsonLd = extractJsonLdProducts(payload.html)[0] ?? null;
    const blocked = isBlockedPage(payload);
    const result = buildRegistryBatchProbePreview(url, { ...payload, jsonLd, blocked });
    return {
      url,
      final_url: payload.finalUrl,
      status: payload.status,
      ...result,
    };
  } catch (error) {
    return {
      url,
      final_url: null,
      status: null,
      item_name: `Gift from ${deriveStoreName(url)}`,
      store_name: deriveStoreName(url),
      display_mode: 'review_only',
      guest_safe: false,
      source_status: 'parse_failed',
      review_status: 'needs_review',
      owner_message: error instanceof Error ? error.message : 'Probe failed',
      price_label: null,
      availability: 'unknown',
      confidence: { overall: 0, title: 0, price: 0, image: 0, availability: 0 },
    };
  }
}

function printText(summary, results) {
  const lines = [
    `Registry batch probe`,
    `Total: ${summary.total}`,
    `Product cards: ${summary.product_card}`,
    `Link cards: ${summary.link_card}`,
    `Review only: ${summary.review_only}`,
    '',
  ];
  for (const result of results) {
    lines.push(`${result.display_mode.toUpperCase()} | ${result.store_name} | ${result.item_name}`);
    lines.push(`  URL: ${result.url}`);
    lines.push(`  Price: ${result.price_label ?? 'n/a'} | Status: ${result.source_status} | Review: ${result.review_status}`);
    lines.push(`  Message: ${result.owner_message}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function runRegistryBatchProbe(argv = process.argv.slice(2)) {
  const args = parseArgs(['node', 'registry-batch-probe.mjs', ...argv]);
  const urls = loadUrls(args.input, args.urls);
  if (urls.length === 0) {
    throw new Error('Provide URLs as args or via --input <file>.');
  }

  const results = [];
  for (const url of urls) {
    results.push(await probe(url));
  }

  const summary = results.reduce((acc, result) => {
    acc.total += 1;
    acc[result.display_mode] = (acc[result.display_mode] ?? 0) + 1;
    return acc;
  }, { total: 0, product_card: 0, link_card: 0, review_only: 0 });

  if (args.format === 'text') {
    return printText(summary, results);
  }

  return JSON.stringify({ ok: true, summary, results }, null, 2);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  runRegistryBatchProbe()
    .then((output) => {
      console.log(output);
    })
    .catch((error) => {
      console.error(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown registry batch probe failure',
      }, null, 2));
      process.exit(1);
    });
}
