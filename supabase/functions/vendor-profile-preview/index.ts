import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const MAX_VENDOR_PREVIEW_REDIRECTS = 3;
const MAX_VENDOR_PREVIEW_BYTES = 1_500_000;
const VENDOR_PREVIEW_FETCH_TIMEOUT_MS = 8_000;
const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',
]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized) return false;
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:169.254.')
    || normalized.startsWith('::ffff:192.168.')
    || /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!normalized) return true;
  if (METADATA_HOSTS.has(normalized)) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal') || normalized.endsWith('.test')) return true;
  if (normalized.includes(':')) return true;
  if (isPrivateIpv4(normalized)) return true;
  return false;
}

async function assertPublicVendorPreviewTarget(url: string): Promise<URL> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Enter a public website URL.');
  if (parsed.username || parsed.password || isBlockedHostname(parsed.hostname)) throw new Error('Enter a public website URL.');

  try {
    const addresses = await Deno.resolveDns(parsed.hostname, 'A');
    if (addresses.some(isPrivateIpv4)) throw new Error('Enter a public website URL.');
  } catch (error) {
    if (error instanceof Error && error.message === 'Enter a public website URL.') throw error;
  }

  try {
    const addresses = await Deno.resolveDns(parsed.hostname, 'AAAA');
    if (addresses.some(isPrivateIpv6)) throw new Error('Enter a public website URL.');
  } catch (error) {
    if (error instanceof Error && error.message === 'Enter a public website URL.') throw error;
  }

  return parsed;
}

async function fetchVendorPreviewHtml(url: string): Promise<string> {
  let currentUrl = url;
  for (let redirects = 0; redirects <= MAX_VENDOR_PREVIEW_REDIRECTS; redirects += 1) {
    const parsed = await assertPublicVendorPreviewTarget(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VENDOR_PREVIEW_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DayOfVendorProfile/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      const location = response.headers.get('location');
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        if (redirects >= MAX_VENDOR_PREVIEW_REDIRECTS) throw new Error('Too many redirects');
        currentUrl = new URL(location, parsed).toString();
        continue;
      }

      if (!response.ok) throw new Error('Could not load website preview.');
      const contentType = response.headers.get('content-type') ?? '';
      if (!/\b(html|xhtml)\b/i.test(contentType)) throw new Error('URL does not point to an HTML page.');
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_VENDOR_PREVIEW_BYTES) throw new Error('Page is too large to preview.');
      const html = await response.text();
      if (new TextEncoder().encode(html).byteLength > MAX_VENDOR_PREVIEW_BYTES) throw new Error('Page is too large to preview.');
      return html;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('Too many redirects');
}

function normalizeUrl(url: string | null | undefined, allowedHost?: RegExp): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedHostname(parsed.hostname)) return null;
    if (allowedHost && !allowedHost.test(parsed.hostname.toLowerCase())) return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractInstagramHandle(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[0]?.replace(/^@/, '') || null;
  } catch {
    return null;
  }
}

function titleCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractDomainLabel(url: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const label = hostname.split('.')[0] || '';
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : null;
  } catch {
    return null;
  }
}

function extractMeta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractFirstMatch(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extractInstagramUrlFromHtml(html: string): string | null {
  return normalizeUrl(extractFirstMatch(html, /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'#?]+(?:\/)?)["']/i), /(^|\.)instagram\.com$/);
}

function extractSocialUrlFromHtml(html: string, network: 'pinterest' | 'tiktok' | 'facebook' | 'youtube'): string | null {
  const patterns: Record<typeof network, RegExp> = {
    pinterest: /href=["'](https?:\/\/(?:www\.)?pinterest\.[^"'#?]+\/[^"'#?]+(?:\/)?)["']/i,
    tiktok: /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'#?]+(?:\/)?)["']/i,
    facebook: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'#?]+(?:\/)?)["']/i,
    youtube: /href=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'#?]+(?:\/)?)["']/i,
  };
  const allowedHosts: Record<typeof network, RegExp> = {
    pinterest: /(^|\.)pinterest\.[a-z.]+$/,
    tiktok: /(^|\.)tiktok\.com$/,
    facebook: /(^|\.)facebook\.com$/,
    youtube: /(^|\.)youtube\.com$|^youtu\.be$/,
  };
  return normalizeUrl(extractFirstMatch(html, patterns[network]), allowedHosts[network]);
}

function extractMailtoEmail(html: string): string | null {
  const email = extractFirstMatch(html, /href=["']mailto:([^"'?]+)["']/i);
  return email?.toLowerCase() ?? null;
}

function screenshotUrl(url: string | null): string | null {
  if (!url) return null;
  return `https://image.thum.io/get/width/1200/noanimate/${url}`;
}

function pinterestImageUrl(url: string | null): string | null {
  if (!url) return null;
  return `https://image.thum.io/get/width/1200/noanimate/${url}`;
}

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return `https://logo.clearbit.com/${hostname}`;
  } catch {
    return null;
  }
}

function looksLikeLogo(url: string | null): boolean {
  if (!url) return false;
  return /logo|icon|avatar|favicon/i.test(url);
}

function isScreenshotUrl(url: string): boolean {
  return url.includes('image.thum.io/get/width/1200/noanimate/');
}

function rankImage(
  url: string,
  primaryWebsiteImage: string | null,
  websiteShot: string | null,
  instagramShot: string | null,
  pinterestShot: string | null,
  tiktokShot: string | null,
  facebookShot: string | null,
  youtubeShot: string | null,
): number {
  if (url === primaryWebsiteImage && !looksLikeLogo(url)) return 100;
  if (url === websiteShot) return 80;
  if (url === pinterestShot) return 77;
  if (url === instagramShot) return 74;
  if (url === tiktokShot) return 70;
  if (url === youtubeShot) return 68;
  if (url === facebookShot) return 66;
  if (isScreenshotUrl(url)) return 58;
  if (looksLikeLogo(url)) return 30;
  return 60;
}

function cleanDescriptor(input: string | null, vendorName: string): string | null {
  if (!input) return null;
  const cleaned = input
    .replace(/\s*[|\-–—]\s*(home|about|contact|portfolio|weddings?).*$/i, '')
    .replace(new RegExp(vendorName, 'ig'), '')
    .replace(/^[\s|\-–—:,]+|[\s|\-–—:,]+$/g, '')
    .trim();
  if (!cleaned || cleaned.length < 4) return null;
  return cleaned.slice(0, 80);
}

function cleanAbout(input: string | null, vendorName: string, sourceLabel: string): string {
  const fallback = `${vendorName} is a wedding vendor profile built from public source details, keeping the strongest images, core links, and a direct inquiry path in one clean page.`;
  if (!input) return fallback;

  const normalized = input
    .replace(/\s+/g, ' ')
    .replace(/cookie[^.]+\./gi, '')
    .replace(/subscribe[^.]+\./gi, '')
    .replace(/learn more[^.]*\.?/gi, '')
    .trim();

  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const picked = sentences.filter((sentence) => sentence.length > 24 && sentence.length < 170).slice(0, 2).join(' ');
  const cleaned = (picked || normalized).trim();
  if (!cleaned) return fallback;

  if (cleaned.length < 90) {
    return `${cleaned} This profile pulls together the essential images, links, and inquiry path from ${sourceLabel}.`.slice(0, 240);
  }

  return cleaned.slice(0, 240);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const requestUrl = new URL(req.url);
  if (requestUrl.searchParams.get("readiness") === "1") {
    return json({ success: true, function: "vendor-profile-preview", readiness: "ok" });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { vendorName, instagramUrl, websiteUrl, pinterestUrl, tiktokUrl, facebookUrl, youtubeUrl } = await req.json();
    if (!vendorName || typeof vendorName !== 'string') {
      return json({ error: 'vendorName is required' }, 400);
    }
    if (!instagramUrl && !websiteUrl) {
      return json({ error: 'Add at least an Instagram URL or website URL.' }, 400);
    }

    const normalizedWebsite = normalizeUrl(websiteUrl);
    const normalizedInstagram = normalizeUrl(instagramUrl, /(^|\.)instagram\.com$/);
    const normalizedPinterest = normalizeUrl(pinterestUrl, /(^|\.)pinterest\.[a-z.]+$/);
    const normalizedTiktok = normalizeUrl(tiktokUrl, /(^|\.)tiktok\.com$/);
    const normalizedFacebook = normalizeUrl(facebookUrl, /(^|\.)facebook\.com$/);
    const normalizedYoutube = normalizeUrl(youtubeUrl, /(^|\.)youtube\.com$|^youtu\.be$/);
    if (websiteUrl && !normalizedWebsite) {
      return json({ error: 'Enter a public website URL.' }, 400);
    }
    if (instagramUrl && !normalizedInstagram) {
      return json({ error: 'Enter a public Instagram URL.' }, 400);
    }
    const instagramHandle = extractInstagramHandle(normalizedInstagram);
    const websiteLabel = extractDomainLabel(normalizedWebsite);
    const sourceLabel = instagramHandle ? `@${instagramHandle}` : websiteLabel ? titleCase(websiteLabel) : 'public source';

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRole) {
      const admin = createClient(supabaseUrl, serviceRole);
      const rateLimit = await enforcePublicSubmissionRateLimit({
        admin,
        request: req,
        scope: "vendor_profile_preview",
        subject: normalizedWebsite || normalizedInstagram || vendorName.trim().toLowerCase(),
        maxIp: 12,
        maxSubject: 4,
        windowMinutes: 10,
      });
      if (!rateLimit.ok) {
        return json({ error: rateLimit.message }, rateLimit.status);
      }
    }

    let websiteTitle: string | null = null;
    let websiteDescription: string | null = null;
    let websiteImage: string | null = null;
    let websiteInstagramUrl: string | null = null;
    let websitePinterestUrl: string | null = null;
    let websiteTiktokUrl: string | null = null;
    let websiteFacebookUrl: string | null = null;
    let websiteYoutubeUrl: string | null = null;
    let websiteContactEmail: string | null = null;

    if (normalizedWebsite) {
      try {
        const html = await fetchVendorPreviewHtml(normalizedWebsite);
        websiteTitle = extractMeta(html, 'og:title') || extractTitle(html);
        websiteDescription = extractMeta(html, 'og:description') || extractMeta(html, 'description');
        websiteImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
        websiteInstagramUrl = extractInstagramUrlFromHtml(html);
        websitePinterestUrl = extractSocialUrlFromHtml(html, 'pinterest');
        websiteTiktokUrl = extractSocialUrlFromHtml(html, 'tiktok');
        websiteFacebookUrl = extractSocialUrlFromHtml(html, 'facebook');
        websiteYoutubeUrl = extractSocialUrlFromHtml(html, 'youtube');
        websiteContactEmail = extractMailtoEmail(html);
      } catch {
        // ignore and fall back
      }
    }

    const resolvedInstagram = normalizedInstagram ?? websiteInstagramUrl;
    const resolvedPinterest = normalizedPinterest ?? websitePinterestUrl;
    const resolvedTiktok = normalizedTiktok ?? websiteTiktokUrl;
    const resolvedFacebook = normalizedFacebook ?? websiteFacebookUrl;
    const resolvedYoutube = normalizedYoutube ?? websiteYoutubeUrl;
    const resolvedInstagramHandle = extractInstagramHandle(resolvedInstagram);

    const descriptor = websiteTitle && !websiteTitle.toLowerCase().includes(vendorName.toLowerCase())
      ? cleanDescriptor(websiteTitle, vendorName)
      : resolvedInstagramHandle
        ? `Wedding vendor on Instagram @${resolvedInstagramHandle}`
        : websiteLabel
          ? `${websiteLabel} wedding vendor profile`
          : 'Wedding vendor profile';

    const about = websiteDescription?.trim()
      ? cleanAbout(websiteDescription, vendorName, sourceLabel)
      : resolvedInstagramHandle
        ? `${vendorName} is a wedding vendor surfaced from public Instagram details. This page keeps the strongest images, core links, and a direct inquiry path in one simple place so couples can get oriented fast.`
        : websiteLabel
          ? `${vendorName} is a wedding vendor profile generated from public web details from ${titleCase(websiteLabel)}. It keeps the key images, source links, and inquiry path in one clean page for quick couple review.`
          : `${vendorName} is a wedding vendor profile generated from public source details so couples can quickly get the essentials in one clean place.`;

    const websiteShot = screenshotUrl(normalizedWebsite);
    const instagramShot = screenshotUrl(resolvedInstagram);
    const pinterestShot = pinterestImageUrl(resolvedPinterest);
    const tiktokShot = screenshotUrl(resolvedTiktok);
    const facebookShot = screenshotUrl(resolvedFacebook);
    const youtubeShot = screenshotUrl(resolvedYoutube);
    const rawImages = [
      websiteImage,
      websiteShot,
      instagramShot,
      pinterestShot,
      tiktokShot,
      facebookShot,
      youtubeShot,
      logoUrl(normalizedWebsite),
    ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);

    const images = rawImages
      .sort((a, b) => rankImage(b, websiteImage, websiteShot, instagramShot, pinterestShot, tiktokShot, facebookShot, youtubeShot) - rankImage(a, websiteImage, websiteShot, instagramShot, pinterestShot, tiktokShot, facebookShot, youtubeShot))
      .slice(0, 6);

    const heroImage = images
      .filter((image) => !looksLikeLogo(image))
      .sort((a, b) => rankImage(b, websiteImage, websiteShot, instagramShot, pinterestShot, tiktokShot, facebookShot, youtubeShot) - rankImage(a, websiteImage, websiteShot, instagramShot, pinterestShot, tiktokShot, facebookShot, youtubeShot))[0]
      ?? images[0]
      ?? null;
    const galleryImages = images.filter((image) => image !== heroImage);

    return json({
      slug: slugify(vendorName),
      vendor_name: vendorName.trim(),
      descriptor: descriptor || null,
      about,
      hero_image_url: heroImage,
      image_urls: galleryImages,
      instagram_url: resolvedInstagram,
      website_url: normalizedWebsite,
      contact_email: websiteContactEmail,
      source_payload: {
        sourceLabel,
        instagramHandle: resolvedInstagramHandle,
        pinterest_url: resolvedPinterest,
        tiktok_url: resolvedTiktok,
        facebook_url: resolvedFacebook,
        youtube_url: resolvedYoutube,
        websiteLabel,
        websiteTitle,
        websiteDescription,
        websiteImage,
        websiteInstagramUrl,
        websitePinterestUrl,
        websiteTiktokUrl,
        websiteFacebookUrl,
        websiteYoutubeUrl,
        websiteContactEmail,
      },
    });
  } catch (error) {
    return json({ error: 'Could not prepare vendor preview. Please try again.' }, 500);
  }
});
