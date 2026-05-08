export function isSupabaseSignedMediaUrl(raw: string): boolean {
  return typeof raw === 'string' && raw.includes('/storage/v1/object/sign/');
}

export function toSupabasePublicMediaUrl(raw: string): string {
  if (typeof raw !== 'string' || !isSupabaseSignedMediaUrl(raw)) return raw;

  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizeSignedMediaUrl(raw: string): string {
  if (!isSupabaseSignedMediaUrl(raw)) return raw;
  return '';
}

export function rewriteSignedMediaUrlsToPublicDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return toSupabasePublicMediaUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteSignedMediaUrlsToPublicDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteSignedMediaUrlsToPublicDeep(child);
    }
    return out as T;
  }

  return value;
}

export function sanitizeSignedMediaUrlsDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeSignedMediaUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSignedMediaUrlsDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeSignedMediaUrlsDeep(child);
    }
    return out as T;
  }

  return value;
}
