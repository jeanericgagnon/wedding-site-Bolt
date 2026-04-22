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

function cleanRegistryUrlToken(token: string): string {
  return token.replace(/[>"'),.;:!?]+$/, '');
}

function extractRegistryUrlTokens(line: string): string[] {
  const tokens = new Set<string>();
  const patterns = [
    /\[[^\]]+\]\((https?:\/\/[^)]+|www\.[^)]+)\)/gi,
    /<(https?:\/\/[^>]+|www\.[^>]+)>/gi,
    /["'](https?:\/\/[^"']+|www\.[^"']+)["']/gi,
    /\[[^\]]+\]\(((?:[a-z0-9-]+\.)+[a-z]{2,}[^)]*)\)/gi,
    /(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi,
    /(https?:\/\/\S+|www\.\S+)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of line.matchAll(pattern)) {
      const token = match[1] ?? match[0];
      if (token) tokens.add(cleanRegistryUrlToken(token));
    }
  }

  if (tokens.size > 0) return Array.from(tokens);

  return line
    .split(/[|,;]/)
    .map((part) => part.trim())
    .filter((part) => /\.[a-z]{2,}(?:\/|$)/i.test(part))
    .map(cleanRegistryUrlToken);
}

export function carryOverRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  return raw
    .split('\n')
    .flatMap((line) => {
      const extractedUrls = extractRegistryUrlTokens(line);
      return extractedUrls.length > 0 ? extractedUrls : [line.trim()].filter(Boolean);
    })
    .map((line) => normalizeUrl(line))
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url) => ({ url, sourceLabel: inferSourceLabel(url) }));
}
