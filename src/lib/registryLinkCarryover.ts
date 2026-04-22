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

function extractRegistryUrlToken(line: string): string | null {
  const markdownHref = line.match(/\[[^\]]+\]\((https?:\/\/[^)]+|www\.[^)]+)\)/i)?.[1] ?? null;
  if (markdownHref) return markdownHref.replace(/[),.;:!?]+$/, '');
  const bracketedHref = line.match(/<(https?:\/\/[^>]+|www\.[^>]+)>/i)?.[1] ?? null;
  if (bracketedHref) return bracketedHref.replace(/[),.;:!?]+$/, '');
  const bareDomainMatch = line.match(/(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i)?.[1] ?? null;
  if (bareDomainMatch) return bareDomainMatch.replace(/[),.;:!?]+$/, '');
  const directMatch = line.match(/https?:\/\/\S+/i)?.[0] ?? line.match(/www\.\S+/i)?.[0] ?? null;
  if (directMatch) return directMatch.replace(/[),.;:!?]+$/, '');
  const parts = line.split(/[|,;]/).map((part) => part.trim()).filter(Boolean);
  const candidate = parts.find((part) => /\.[a-z]{2,}(?:\/|$)/i.test(part)) ?? null;
  return candidate ? candidate.replace(/[),.;:!?]+$/, '') : null;
}

export function carryOverRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  return raw
    .split('\n')
    .map((line) => normalizeUrl(extractRegistryUrlToken(line) ?? line))
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url) => ({ url, sourceLabel: inferSourceLabel(url) }));
}
