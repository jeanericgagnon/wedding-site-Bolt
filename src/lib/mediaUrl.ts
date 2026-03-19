const TRANSPARENT_GIF_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isExpiredSupabaseSignedUrl(raw: string, nowEpochSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (typeof raw !== 'string' || !raw.includes('/storage/v1/object/sign/')) return false;

  try {
    const parsed = new URL(raw);
    const token = parsed.searchParams.get('token');
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    const exp = typeof payload?.exp === 'number' ? payload.exp : null;
    if (!exp) return false;
    return exp <= nowEpochSeconds;
  } catch {
    return false;
  }
}

export function sanitizeSignedMediaUrl(raw: string): string {
  if (!isExpiredSupabaseSignedUrl(raw)) return raw;
  return TRANSPARENT_GIF_DATA_URL;
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
