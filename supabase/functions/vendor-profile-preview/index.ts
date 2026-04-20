import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).toString();
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
  return normalizeUrl(extractFirstMatch(html, /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'#?]+(?:\/)?)["']/i));
}

function extractSocialUrlFromHtml(html: string, network: 'pinterest' | 'tiktok' | 'facebook' | 'youtube'): string | null {
  const patterns: Record<typeof network, RegExp> = {
    pinterest: /href=["'](https?:\/\/(?:www\.)?pinterest\.[^"'#?]+\/[^"'#?]+(?:\/)?)["']/i,
    tiktok: /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'#?]+(?:\/)?)["']/i,
    facebook: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'#?]+(?:\/)?)["']/i,
    youtube: /href=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'#?]+(?:\/)?)["']/i,
  };
  return normalizeUrl(extractFirstMatch(html, patterns[network]));
}

function extractMailtoEmail(html: string): string | null {
  const email = extractFirstMatch(html, /href=["']mailto:([^"'?]+)["']/i);
  return email?.toLowerCase() ?? null;
}

function screenshotUrl(url: string | null): string | null {
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

function rankImage(url: string, primaryWebsiteImage: string | null, websiteShot: string | null, instagramShot: string | null): number {
  if (url === primaryWebsiteImage && !looksLikeLogo(url)) return 100;
  if (url === websiteShot) return 80;
  if (url === instagramShot) return 72;
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

  try {
    const { vendorName, instagramUrl, websiteUrl, pinterestUrl, tiktokUrl, facebookUrl, youtubeUrl } = await req.json();
    if (!vendorName || typeof vendorName !== 'string') {
      return new Response(JSON.stringify({ error: 'vendorName is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!instagramUrl && !websiteUrl) {
      return new Response(JSON.stringify({ error: 'Add at least an Instagram URL or website URL.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedWebsite = normalizeUrl(websiteUrl);
    const normalizedInstagram = normalizeUrl(instagramUrl);
    const normalizedPinterest = normalizeUrl(pinterestUrl);
    const normalizedTiktok = normalizeUrl(tiktokUrl);
    const normalizedFacebook = normalizeUrl(facebookUrl);
    const normalizedYoutube = normalizeUrl(youtubeUrl);
    const instagramHandle = extractInstagramHandle(normalizedInstagram);
    const websiteLabel = extractDomainLabel(normalizedWebsite);
    const sourceLabel = instagramHandle ? `@${instagramHandle}` : websiteLabel ? titleCase(websiteLabel) : 'public source';

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
        const resp = await fetch(normalizedWebsite, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DayOfVendorProfile/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        if (resp.ok) {
          const html = await resp.text();
          websiteTitle = extractMeta(html, 'og:title') || extractTitle(html);
          websiteDescription = extractMeta(html, 'og:description') || extractMeta(html, 'description');
          websiteImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
          websiteInstagramUrl = extractInstagramUrlFromHtml(html);
          websitePinterestUrl = extractSocialUrlFromHtml(html, 'pinterest');
          websiteTiktokUrl = extractSocialUrlFromHtml(html, 'tiktok');
          websiteFacebookUrl = extractSocialUrlFromHtml(html, 'facebook');
          websiteYoutubeUrl = extractSocialUrlFromHtml(html, 'youtube');
          websiteContactEmail = extractMailtoEmail(html);
        }
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
    const instagramShot = screenshotUrl(normalizedInstagram);
    const rawImages = [
      websiteImage,
      websiteShot,
      instagramShot,
      logoUrl(normalizedWebsite),
    ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);

    const images = rawImages
      .sort((a, b) => rankImage(b, websiteImage, websiteShot, instagramShot) - rankImage(a, websiteImage, websiteShot, instagramShot))
      .slice(0, 6);

    const heroImage = images.find((image) => !looksLikeLogo(image)) ?? images[0] ?? null;
    const galleryImages = images.filter((image) => image !== heroImage);

    return new Response(JSON.stringify({
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
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate vendor preview' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
