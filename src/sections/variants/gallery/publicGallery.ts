export interface PublicGalleryImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
}

const INTERNAL_GALLERY_TEXT = /\b(provider|metadata|database|storage|bucket|token|jwt|service role|permission denied|functions\/v1|debug|diagnostic|not found|access denied|page not found)\b/i;

export function getSafePublicGalleryImageUrl(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    const host = parsed.hostname.toLowerCase();
    if (host.includes('image.thum.io')) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizePublicGalleryText(value?: string | null): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized || INTERNAL_GALLERY_TEXT.test(normalized)) return '';
  return normalized;
}

export function sanitizePublicGalleryImages<T extends { id?: string; url?: string; alt?: string; caption?: string }>(
  images: T[] | undefined,
): PublicGalleryImage[] {
  if (!Array.isArray(images)) return [];

  return images
    .map((image, index) => {
      const url = getSafePublicGalleryImageUrl(image.url);
      if (!url) return null;

      return {
        id: sanitizePublicGalleryText(image.id) || `gallery-${index}`,
        url,
        alt: sanitizePublicGalleryText(image.alt) || sanitizePublicGalleryText(image.caption) || 'Gallery photo',
        caption: sanitizePublicGalleryText(image.caption),
      };
    })
    .filter((image): image is PublicGalleryImage => Boolean(image));
}
