import {
  getSafePublicActionHref,
  getSafePublicImageUrl,
} from '../sections/publicLinks.ts';

const IMAGE_KEY_PATTERN = /(?:image|photo|photos|picture|thumbnail|poster|avatar|portrait|logo)/i;
const LINK_KEY_PATTERN = /(?:href|url|link|website|rsvp|registry|cashfund|viewall|map|embed|playlist|video)/i;
const IMAGE_VALUE_KEY_PATTERN = /^(src|url)$/i;
const IMAGE_METADATA_KEY_PATTERN = /(?:alt|caption)$/i;
const LINK_METADATA_KEY_PATTERN = /(?:label|description|note|headline|title|subtitle|prompt|placeholder|calltoaction)$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isImageKey(key?: string): boolean {
  return Boolean(key && IMAGE_KEY_PATTERN.test(key));
}

function isLinkKey(key?: string): boolean {
  return Boolean(key && LINK_KEY_PATTERN.test(key));
}

function sanitizePublicSectionValue(value: unknown, key?: string, imageContext = false): unknown {
  const nextImageContext = imageContext || isImageKey(key);
  const shouldSanitizeAsImage = (
    Boolean(key && isImageKey(key) && !IMAGE_METADATA_KEY_PATTERN.test(key))
  ) || (imageContext && Boolean(key && IMAGE_VALUE_KEY_PATTERN.test(key)));
  const shouldSanitizeAsLink = Boolean(key && isLinkKey(key) && !LINK_METADATA_KEY_PATTERN.test(key));

  if (typeof value === 'string') {
    if (shouldSanitizeAsImage) return getSafePublicImageUrl(value);
    if (shouldSanitizeAsLink) return getSafePublicActionHref(value);
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicSectionValue(item, key, nextImageContext));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizePublicSectionValue(childValue, childKey, nextImageContext);
    }
    return out;
  }

  return value;
}

export function sanitizePublicSectionDataDeep<T>(value: T): T {
  return sanitizePublicSectionValue(value) as T;
}
