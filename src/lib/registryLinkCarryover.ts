export interface CarryoverRegistryLink {
  url: string;
  sourceLabel?: string;
}

interface CarryoverRegistryToken {
  raw: string;
  sourceLabel?: string;
  sourceLabelMode?: 'explicit' | 'inferred';
  index?: number;
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
  if (lower.includes('anthropologie.com')) return 'Anthropologie';
  if (lower.includes('bloomingdales.com')) return "Bloomingdale's";
  if (lower.includes('macys.com')) return "Macy's";
  if (lower.includes('crateandbarrel.com')) return 'Crate & Barrel';
  if (lower.includes('cb2.com')) return 'CB2';
  if (lower.includes('potterybarn.com')) return 'Pottery Barn';
  if (lower.includes('westelm.com')) return 'West Elm';
  if (lower.includes('williams-sonoma.com')) return 'Williams Sonoma';
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
  if (normalized.includes('anthropologie')) return 'Anthropologie';
  if (normalized.includes('bloomingdale')) return "Bloomingdale's";
  if (normalized.includes('macy')) return "Macy's";
  if (normalized.includes('crate') && normalized.includes('barrel')) return 'Crate & Barrel';
  if (normalized.includes('cb2')) return 'CB2';
  if (normalized.includes('pottery') && normalized.includes('barn')) return 'Pottery Barn';
  if (normalized.includes('amazon')) return 'Amazon';
  if (normalized.includes('target')) return 'Target';
  if (normalized.includes('williams') && normalized.includes('sonoma')) return 'Williams Sonoma';
  if (normalized.includes('zola')) return 'Zola';
  if (normalized.includes('joy')) return 'Joy';
  if (normalized.includes('the knot') || normalized.includes('theknot')) return 'The Knot';
  return undefined;
}

function extractExplicitSourceLabelFragment(text: string): string | undefined {
  const inferred = inferSourceLabelFromText(text);
  if (inferred) return inferred;

  const cleaned = text
    .replace(/\b(purchased|purchasing|buying|claimed|claiming|reserved|reserving|booked|booking)\s+by\s+[a-z][^|,;:()[\]<>"']*/gi, '')
    .replace(/\b(purchased|purchasing|buying|already|claimed|partially|partial|pending|done|complete|later)\b/gi, '')
    .replace(/\b(registry|gift\s*list|wishlist)\b/gi, '')
    .replace(/[|,;:()[\]<>"']/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:and|&)\b\s*/i, '')
    .replace(/\s*\b(?:and|&)$/i, '')
    .trim();

  return /[a-z]/i.test(cleaned) ? cleaned : undefined;
}

function normalizeExplicitSourceLabel(label: string | undefined): string | undefined {
  return label ? extractExplicitSourceLabelFragment(label) : undefined;
}

function normalizeCarryoverRegistryLink(link: CarryoverRegistryLink): CarryoverRegistryLink | null {
  const normalizedUrl = normalizeUrl(cleanRegistryUrlToken(link.url));
  if (!normalizedUrl) return null;

  const sourceLabel = normalizeExplicitSourceLabel(link.sourceLabel) ?? inferSourceLabel(normalizedUrl);
  return sourceLabel ? { url: normalizedUrl, sourceLabel } : { url: normalizedUrl };
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

function dedupeNormalizedRegistryLinks(links: CarryoverRegistryLink[]): CarryoverRegistryLink[] {
  const deduped = new Map<string, CarryoverRegistryLink>();
  for (const link of links) {
    const existing = deduped.get(link.url);
    if (!existing) {
      deduped.set(link.url, link);
      continue;
    }

    const existingInferredLabel = inferSourceLabel(existing.url);
    if (!existing.sourceLabel && link.sourceLabel) {
      deduped.set(link.url, link);
    } else if (link.sourceLabel && existing.sourceLabel === existingInferredLabel && link.sourceLabel !== existing.sourceLabel) {
      deduped.set(link.url, link);
    }
  }

  return Array.from(deduped.values());
}

export function parsePersistedRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {
  if (!raw?.trim()) return [];

  const persisted = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [label, ...rest] = line.split('|').map((part) => part.trim()).filter(Boolean);
      if (!label) return [];

      const explicitSourceLabel = rest.length > 0 ? normalizeExplicitSourceLabel(label) : undefined;
      const candidateUrl = rest.length > 0 ? rest.join(' | ') : line;
      const parsedLinks = carryOverRegistryLinks(candidateUrl);
      if (parsedLinks.length > 0) {
        return parsedLinks.map((parsedLink, index) => ({
          url: parsedLink.url,
          sourceLabel: index === 0 ? (explicitSourceLabel ?? parsedLink.sourceLabel) : parsedLink.sourceLabel,
        }));
      }

      const normalizedUrl = normalizeUrl(cleanRegistryUrlToken(rest.length > 0 ? candidateUrl : label));
      if (!normalizedUrl) return [];

      const sourceLabel = explicitSourceLabel ?? inferSourceLabel(normalizedUrl);
      return sourceLabel ? [{ url: normalizedUrl, sourceLabel }] : [{ url: normalizedUrl }];
    })
    .filter((link): link is CarryoverRegistryLink => Boolean(link));

  return dedupeNormalizedRegistryLinks(persisted);
}

export function mergeRegistrySourceLabels(
  carried: CarryoverRegistryLink[],
  existing: CarryoverRegistryLink[],
): CarryoverRegistryLink[] {
  const mergedByUrl = new Map<string, CarryoverRegistryLink>();
  const merged = carried
    .map((link) => normalizeCarryoverRegistryLink(link))
    .filter((link): link is CarryoverRegistryLink => Boolean(link));
  const existingNormalized = dedupeNormalizedRegistryLinks(existing
    .map((link) => normalizeCarryoverRegistryLink(link))
    .filter((link): link is CarryoverRegistryLink => Boolean(link)));
  const existingByUrl = new Map(existingNormalized.map((link) => [link.url, link]));
  for (const link of merged) {
    const existingLink = existingByUrl.get(link.url);
    const sourceLabel = link.sourceLabel ?? existingLink?.sourceLabel;
    const nextLink = sourceLabel ? { ...link, sourceLabel } : { url: link.url };
    const existingMerged = mergedByUrl.get(link.url);
    if (!existingMerged) {
      if (
        existingLink?.sourceLabel
        && nextLink.sourceLabel === inferSourceLabel(nextLink.url)
        && existingLink.sourceLabel !== nextLink.sourceLabel
      ) {
        mergedByUrl.set(link.url, existingLink);
      } else {
        mergedByUrl.set(link.url, nextLink);
      }
      continue;
    }

    if (!existingMerged.sourceLabel && nextLink.sourceLabel) {
      mergedByUrl.set(link.url, nextLink);
      continue;
    }

    const inferredMergedLabel = inferSourceLabel(existingMerged.url);
    if (
      nextLink.sourceLabel
      && existingMerged.sourceLabel === inferredMergedLabel
      && nextLink.sourceLabel !== existingMerged.sourceLabel
    ) {
      mergedByUrl.set(link.url, nextLink);
    }
  }

  const dedupedMerged = Array.from(mergedByUrl.values());
  const carriedUrls = new Set(dedupedMerged.map((link) => link.url));
  return dedupedMerged.concat(existingNormalized.filter((link) => !carriedUrls.has(link.url)));
}

function extractRegistryUrlTokens(line: string): CarryoverRegistryToken[] {
  const tokens = new Map<string, CarryoverRegistryToken>();
  let firstUrlIndex: number | null = null;
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
      if (typeof match.index === 'number') {
        firstUrlIndex = firstUrlIndex === null ? match.index : Math.min(firstUrlIndex, match.index);
      }
      const cleanedToken = cleanRegistryUrlToken(token);
      const explicitTokenLabel = extractExplicitSourceLabelFromTokenText(match[0]);
      const existingToken = tokens.get(cleanedToken);
      if (existingToken?.sourceLabel && !explicitTokenLabel) continue;
      tokens.set(cleanedToken, {
        raw: cleanedToken,
        sourceLabel: explicitTokenLabel,
        sourceLabelMode: explicitTokenLabel ? 'explicit' : undefined,
        index: typeof match.index === 'number' ? match.index : undefined,
      });
    }
  }

  if (tokens.size > 0) {
    const lineExplicitLabel = extractExplicitSourceLabelFromTokenText(
      firstUrlIndex === null ? line : line.slice(0, firstUrlIndex),
    );
    let lineLabelApplied = false;
    return Array.from(tokens.values())
      .sort((left, right) => (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER))
      .map((token) => {
      const canApplyLineLabel = Boolean(lineExplicitLabel) && !lineLabelApplied && !token.sourceLabel;
      if (canApplyLineLabel) lineLabelApplied = true;
      return canApplyLineLabel
        ? { ...token, sourceLabel: lineExplicitLabel, sourceLabelMode: 'explicit' }
        : token;
      });
  }

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
            let pendingLabelApplied = false;
            const normalizedTokens = extractedUrls.map((token) => {
              const canApplyPendingLabel = Boolean(pendingSourceLabel) && !pendingLabelApplied && !token.sourceLabel;
              if (canApplyPendingLabel) pendingLabelApplied = true;
              return {
                ...token,
                sourceLabel: token.sourceLabel ?? (canApplyPendingLabel ? pendingSourceLabel : undefined),
                sourceLabelMode: token.sourceLabelMode ?? (canApplyPendingLabel ? 'explicit' : undefined),
              };
            });
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
      const existingInferredLabel = inferSourceLabel(existing.url);
      if (
        (!existing.sourceLabel && token.sourceLabel)
        || (token.sourceLabel && existing.sourceLabel === existingInferredLabel && token.sourceLabel !== existing.sourceLabel)
        || (existingMode !== 'explicit' && token.sourceLabelMode === 'explicit' && token.sourceLabel)
      ) {
        carried.set(token.url, { ...existing, sourceLabel: token.sourceLabel });
      }

      return null;
    })
    .filter(() => false)
    .concat(Array.from(carried.values()).map((token) => finalizeCarryoverRegistryLink(token)));
}
