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

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vendorName, instagramUrl, websiteUrl } = await req.json();
    if (!vendorName || typeof vendorName !== 'string') {
      return new Response(JSON.stringify({ error: 'vendorName is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedWebsite = normalizeUrl(websiteUrl);
    const normalizedInstagram = normalizeUrl(instagramUrl);
    const instagramHandle = extractInstagramHandle(normalizedInstagram);
    const websiteLabel = extractDomainLabel(normalizedWebsite);

    let websiteTitle: string | null = null;
    let websiteDescription: string | null = null;
    let websiteImage: string | null = null;

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
        }
      } catch {
        // ignore and fall back
      }
    }

    const descriptor = websiteTitle && !websiteTitle.toLowerCase().includes(vendorName.toLowerCase())
      ? websiteTitle.slice(0, 80)
      : instagramHandle
        ? `Wedding vendor on Instagram @${instagramHandle}`
        : websiteLabel
          ? `${websiteLabel} wedding vendor profile`
          : 'Wedding vendor profile';

    const about = websiteDescription?.trim()
      ? websiteDescription.trim().slice(0, 220)
      : instagramHandle
        ? `${vendorName} is a wedding vendor featured here from public Instagram details so couples can quickly get the essentials in one clean place. Reach out directly to learn more about availability, style, and fit.`
        : websiteLabel
          ? `${vendorName} is a wedding vendor profile generated from public web details from ${websiteLabel}, keeping the key images, links, and contact path in one fast page.`
          : `${vendorName} is a wedding vendor profile generated from public web details so couples can quickly get the essentials in one clean place.`;

    const images = [
      websiteImage,
      logoUrl(normalizedWebsite),
      screenshotUrl(normalizedWebsite),
      screenshotUrl(normalizedInstagram),
    ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index).slice(0, 6);

    return new Response(JSON.stringify({
      slug: slugify(vendorName),
      vendor_name: vendorName.trim(),
      descriptor: descriptor || null,
      about,
      hero_image_url: images[0] ?? null,
      image_urls: images,
      instagram_url: normalizedInstagram,
      website_url: normalizedWebsite,
      contact_email: null,
      source_payload: {
        websiteTitle,
        websiteDescription,
        websiteImage,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate vendor preview' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
