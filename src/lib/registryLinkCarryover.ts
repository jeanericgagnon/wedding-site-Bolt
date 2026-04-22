export interface CarryoverRegistryLink {
  url: string;
  sourceLabel?: string;
}

interface CarryoverRegistryToken {
  raw: string;
  sourceLabel?: string;
  sourceLabelMode?: 'explicit' | 'inferred';
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
  if (lower.includes('crateandbarrel.com')) return 'Crate & Barrel';
  if (lower.includes('westelm.com')) return 'West Elm';
  if (lower.includes('zola.com')) return 'Zola';
  if (lower.includes('withjoy.com')) return 'Joy';
  if (lower.includes('theknot.com')) return 'The Knot';
  if (lower.includes('amazon.com')) return 'Amazon';
  if (lower.includes('target.com')) return 'Target';
  return undefined;
}

function inferSourceLabelFromText(text: string): string | undefined {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('crate') && normalized.includes('barrel')) return 'Crate & Barrel';
  if (normalized.includes('amazon')) return 'Amazon';
  if (normalized.includes('target')) return 'Target';
  if (normalized.includes('zola')) return 'Zola';
  if (normalized.includes('joy')) return 'Joy';
  if (normalized.includes('the knot') || normalized.includes('theknot')) return 'The Knot';
  return undefined;
}

function extractExplicitSourceLabelFragment(text: string): string | undefined {
  const inferred = inferSourceLabelFromText(text);
  if (inferred) return inferred;

  const cleaned = text
    .replace(/\b(purchased|already|claimed|done|complete|later)\b/gi, '')
    .replace(/\b(registry|gift\s*list|wishlist)\b/gi, '')
    .replace(/[|,;:()[\]<>"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return /[a-z]/i.test(cleaned) ? cleaned : undefined;
}

function extractExplicitSourceLabelFromTokenText(text: string): string | undefined {
  const withoutUrls = text
    .replace(/\((https?:\/\/[^)]+|www\.[^)]+|(?:[a-z0-9-]+\.)+[a-z]{2,}[^)]*)\)/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi, ' ')
    .trim();

  return withoutUrls ? extractExplicitSourceLabelFragment(withoutUrls) : undefined;
}

function cleanRegistryUrlToken(token: string): string {
  return token.replace(/[>"'),.;:!?]+$/, '');
}

function finalizeCarryoverRegistryLink(
  link: CarryoverRegistryLink & { sourceLabelMode?: 'explicit' | 'inferred' },
): CarryoverRegistryLink {
  return link.sourceLabel ? { url: link.url, sourceLabel: link.sourceLabel } : { url: link.url };
}

export function parsePersistedRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|').map((part) => part.trim()).filter(Boolean);
      if (!label) return null;

      const candidateUrl = rest.length > 0 ? rest.join(' | ') : label;
      const normalizedUrl = normalizeUrl(cleanRegistryUrlToken(candidateUrl));
      if (!normalizedUrl) return null;

      const sourceLabel = rest.length > 0 ? label : inferSourceLabel(normalizedUrl);
      return sourceLabel ? { url: normalizedUrl, sourceLabel } : { url: normalizedUrl };
    })
    .filter((link): link is CarryoverRegistryLink => Boolean(link));
}

function extractRegistryUrlTokens(line: string): CarryoverRegistryToken[] {
  const tokens = new Map<string, CarryoverRegistryToken>();
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
      if (!token) continue;
      const cleanedToken = cleanRegistryUrlToken(token);
      const explicitTokenLabel = extractExplicitSourceLabelFromTokenText(match[0]);
      const existingToken = tokens.get(cleanedToken);
      if (existingToken?.sourceLabel && !explicitTokenLabel) continue;
      tokens.set(cleanedToken, {
        raw: cleanedToken,
        sourceLabel: explicitTokenLabel,
        sourceLabelMode: explicitTokenLabel ? 'explicit' : undefined,
      });
    }
  }

  if (tokens.size > 0) return Array.from(tokens.values());

  return line
    .split(/[|,;]/)
    .map((part) => part.trim())
    .filter((part) => /\.[a-z]{2,}(?:\/|$)/i.test(part))
    .map((part) => {
      const cleanedToken = cleanRegistryUrlToken(part);
      const explicitTokenLabel = extractExplicitSourceLabelFromTokenText(part);
      return {
        raw: cleanedToken,
        sourceLabel: explicitTokenLabel,
        sourceLabelMode: explicitTokenLabel ? 'explicit' : undefined,
      };
    });
}

export function carryOverRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];
  const carried = new Map<string, CarryoverRegistryLink>();
  return raw
    .split('\n')
    .flatMap((line) => {
      let pendingSourceLabel: string | undefined;
      return line
        .split(/[|,;]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .flatMap((part) => {
          const extractedUrls = extractRegistryUrlTokens(part);
          if (extractedUrls.length > 0) {
            const normalizedTokens = extractedUrls.map((token) => ({
              ...token,
              sourceLabel: token.sourceLabel ?? pendingSourceLabel,
              sourceLabelMode: token.sourceLabelMode ?? (pendingSourceLabel ? 'explicit' : undefined),
            }));
            if (pendingSourceLabel && normalizedTokens.some((token) => token.sourceLabel === pendingSourceLabel)) {
              pendingSourceLabel = undefined;
            }
            return normalizedTokens;
          }

          pendingSourceLabel = extractExplicitSourceLabelFragment(part) ?? pendingSourceLabel;
          return [];
        });
    })
    .map((token) => {
      const url = normalizeUrl(token.raw);
      const inferredSourceLabel = inferSourceLabel(url);
      return url ? {
        url,
        sourceLabel: token.sourceLabel ?? inferredSourceLabel,
        sourceLabelMode: token.sourceLabelMode ?? (inferredSourceLabel ? 'inferred' : undefined),
      } : null;
    })
    .filter((token): token is CarryoverRegistryLink & { sourceLabelMode?: 'explicit' | 'inferred' } => Boolean(token))
    .map((token) => {
      const existing = carried.get(token.url);
      if (!existing) {
        carried.set(token.url, token);
        return null;
      }

      const existingMode = (existing as CarryoverRegistryLink & { sourceLabelMode?: 'explicit' | 'inferred' }).sourceLabelMode;
      if (
        (!existing.sourceLabel && token.sourceLabel)
        || (existingMode !== 'explicit' && token.sourceLabelMode === 'explicit' && token.sourceLabel)
      ) {
        carried.set(token.url, { ...existing, sourceLabel: token.sourceLabel });
      }

      return null;
    })
    .filter(() => false)
    .concat(Array.from(carried.values()).map((token) => finalizeCarryoverRegistryLink(token)));
}
