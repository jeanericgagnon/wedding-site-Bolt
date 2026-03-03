export function normalizePublicSiteSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const fromPath = raw.match(/\/site\/([^/?#]+)/i);
  if (fromPath?.[1]) return cleanSlugToken(fromPath[1]);

  const host = extractHost(raw);
  if (host) {
    if (host.endsWith('.dayof.love')) {
      const sub = host.replace(/\.dayof\.love$/, '');
      if (sub && sub !== 'www') return cleanSlugToken(sub);
    }
    if (host === 'dayof.love' || host === 'www.dayof.love') return null;
  }

  if (raw.includes('.') || raw.includes('/')) return null;
  return cleanSlugToken(raw);
}

export function buildSiteUrlLookupCandidates(slug: string): string[] {
  const normalized = normalizePublicSiteSlug(slug);
  if (!normalized) return [];

  const bare = `${normalized}.dayof.love`;
  return [
    bare,
    `https://${bare}`,
    `http://${bare}`,
    `https://www.${bare}`,
    `http://www.${bare}`,
  ];
}

export function resolvePublicSiteSlugFromRow(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const bySlug = normalizePublicSiteSlug(typeof row.site_slug === 'string' ? row.site_slug : null);
  if (bySlug) return bySlug;
  return normalizePublicSiteSlug(typeof row.site_url === 'string' ? row.site_url : null);
}

function extractHost(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function cleanSlugToken(token: string): string | null {
  const cleaned = token.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  return cleaned || null;
}
