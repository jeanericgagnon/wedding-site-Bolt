export interface CarryoverRegistryLink {
  url: string;
  sourceLabel?: string;
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function inferSourceLabel(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes('zola.com')) return 'Zola';
  if (lower.includes('withjoy.com')) return 'Joy';
  if (lower.includes('theknot.com')) return 'The Knot';
  if (lower.includes('amazon.com')) return 'Amazon';
  if (lower.includes('target.com')) return 'Target';
  return undefined;
}

export function carryOverRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  return raw
    .split('\n')
    .map((line) => normalizeUrl(line))
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url) => ({ url, sourceLabel: inferSourceLabel(url) }));
}
