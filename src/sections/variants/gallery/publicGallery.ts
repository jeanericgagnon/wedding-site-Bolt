export interface PublicGalleryImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
}

const PUBLIC_GALLERY_INTERNAL_TEXT =
  /\b(debug|diagnostic|not found|access denied|page not found|openai|gpt(?:[-\w.]+)?|anthropic|claude|gemini|google\s+oauth|provider\s+metadata|api[-_\s]*key|apikey|authorization|bearer|jwt|access[-_\s]*token|refresh[-_\s]*token|token(?:s)?|secret|service[-_\s]*role|supabase|postgres|postgrest|rpc|sql|schema|relation|duplicate\s*key|foreign\s*key|violates|row[-_\s]*level[-_\s]*security|rls|edge[-_\s]*function|functions?\/v1|database|storage\s+bucket|bucket\s+policy|request\s*failed|failed\s*to\s*fetch|timeout|timed\s*out|status\s*code|error_code|error_message|metadata)\b/i;

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
  if (!normalized || PUBLIC_GALLERY_INTERNAL_TEXT.test(normalized)) return '';
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
