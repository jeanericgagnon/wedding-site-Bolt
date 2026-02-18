export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    return u.toString();
  } catch {
    return withScheme;
  }
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function isValidUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  try {
    const u = new URL(normalized);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '');
  const match = cleaned.match(/[\d]+(?:\.\d+)?/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  return isNaN(val) ? null : val;
}
