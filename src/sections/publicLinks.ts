const SAFE_WEB_PROTOCOLS = new Set(['http:', 'https:']);
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);/i;
const SAFE_EMAIL_PATTERN = /^[^\s@<>"'()]+@[^\s@<>"'()]+\.[^\s@<>"'()]+$/;
const SAFE_INSTAGRAM_HANDLE_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;
const SAFE_INSTAGRAM_HASHTAG_PATTERN = /^[a-zA-Z0-9_]{1,80}$/;
const SAFE_FRAGMENT_PATTERN = /^#[a-zA-Z0-9_-]*$/;
const UNSAFE_LOCAL_PATH_PATTERN = /[<>"'`\\]/;

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isSafePublicHost(parsed: URL): boolean {
  if (parsed.username || parsed.password) return false;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname) return false;
  if (hostname === 'metadata' || hostname === 'metadata.google.internal' || hostname === '169.254.169.254') return false;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.test')) return false;
  if (hostname.endsWith('.invalid') || hostname.endsWith('.example')) return false;
  if (hostname.includes(':')) return false;
  return !isPrivateIpv4(hostname);
}

export function getSafePublicWebUrl(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === '#') return '';

  try {
    const parsed = new URL(trimmed);
    if (!SAFE_WEB_PROTOCOLS.has(parsed.protocol)) return '';
    if (!isSafePublicHost(parsed)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function getSafePublicActionHref(value?: string | null, fallback = ''): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return fallback;
  if (SAFE_FRAGMENT_PATTERN.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) return trimmed;

  return getSafePublicWebUrl(trimmed) || fallback;
}

export function getSafePublicMapsUrl(value?: string | null, fallbackQuery?: string | null): string {
  const query = String(fallbackQuery ?? '').trim();
  const explicitUrl = getSafePublicWebUrl(value);
  if (explicitUrl) {
    try {
      const parsed = new URL(explicitUrl);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'google.com' || hostname === 'maps.google.com') {
        const explicitQuery = parsed.searchParams.get('q') || parsed.searchParams.get('query') || query;
        return explicitQuery ? `https://maps.google.com/?q=${encodeURIComponent(explicitQuery)}` : parsed.href;
      }
    } catch {
      return '';
    }
  }

  return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : '';
}

export function getSafePublicMapsEmbedUrl(value?: string | null, fallbackQuery?: string | null): string {
  const query = String(fallbackQuery ?? '').trim();
  const explicitUrl = getSafePublicWebUrl(value);

  if (explicitUrl) {
    try {
      const parsed = new URL(explicitUrl);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'google.com' || hostname === 'maps.google.com') {
        const explicitQuery = parsed.searchParams.get('q') || parsed.searchParams.get('query') || query;
        return explicitQuery ? `https://www.google.com/maps?q=${encodeURIComponent(explicitQuery)}&output=embed` : '';
      }
    } catch {
      return '';
    }
  }

  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : '';
}

export function getSafePublicImageUrl(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  if (SAFE_DATA_IMAGE_PATTERN.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !UNSAFE_LOCAL_PATH_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!SAFE_WEB_PROTOCOLS.has(parsed.protocol)) return '';
    if (!isSafePublicHost(parsed)) return '';
    if (parsed.hostname.toLowerCase() === 'image.thum.io') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function getSafePublicEmailHref(email?: string | null, subject?: string | null): string {
  const trimmedEmail = String(email ?? '').trim();
  if (!SAFE_EMAIL_PATTERN.test(trimmedEmail)) return '';

  const trimmedSubject = String(subject ?? '').trim();
  return trimmedSubject
    ? `mailto:${trimmedEmail}?subject=${encodeURIComponent(trimmedSubject)}`
    : `mailto:${trimmedEmail}`;
}

export function getSafePublicTelHref(phone?: string | null): string {
  const trimmedPhone = String(phone ?? '').trim();
  if (!trimmedPhone || /[a-z<>"'`]/i.test(trimmedPhone)) return '';

  const normalized = trimmedPhone.replace(/[^\d+]/g, '');
  const plusCount = (normalized.match(/\+/g) ?? []).length;
  const digitCount = (normalized.match(/\d/g) ?? []).length;
  if (plusCount > 1 || (plusCount === 1 && !normalized.startsWith('+')) || digitCount < 7) return '';

  return `tel:${normalized}`;
}

export function getSafePublicInstagramUrl(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.username || parsed.password) return '';
    if (parsed.protocol !== 'https:' || (hostname !== 'instagram.com' && hostname !== 'www.instagram.com')) return '';
    const handle = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return SAFE_INSTAGRAM_HANDLE_PATTERN.test(handle) ? `https://instagram.com/${handle}` : '';
  } catch {
    const handle = trimmed.replace(/^@/, '');
    return SAFE_INSTAGRAM_HANDLE_PATTERN.test(handle) ? `https://instagram.com/${handle}` : '';
  }
}

export function getSafePublicInstagramHashtagUrl(value?: string | null): string {
  const tag = String(value ?? '').trim().replace(/^#/, '');
  return SAFE_INSTAGRAM_HASHTAG_PATTERN.test(tag)
    ? `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`
    : '';
}

export function getSafePublicVideoEmbedUrl(value: string | null | undefined, type: 'youtube' | 'vimeo' | 'direct', autoplay = false): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const auto = autoplay ? '1' : '0';

  if (type === 'direct') return getSafePublicWebUrl(trimmed);

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (type === 'youtube') {
      const videoId = hostname === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : hostname === 'youtube.com'
          ? parsed.searchParams.get('v') || (parsed.pathname.startsWith('/embed/') ? parsed.pathname.split('/').filter(Boolean)[1] : '')
          : '';
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId ?? '')
        ? `https://www.youtube.com/embed/${videoId}?autoplay=${auto}&rel=0`
        : '';
    }

    if (type === 'vimeo') {
      const videoId = hostname === 'vimeo.com'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : hostname === 'player.vimeo.com' && parsed.pathname.startsWith('/video/')
          ? parsed.pathname.split('/').filter(Boolean)[1]
          : '';
      return /^\d{5,12}$/.test(videoId ?? '')
        ? `https://player.vimeo.com/video/${videoId}?autoplay=${auto}`
        : '';
    }
  } catch {
    return '';
  }

  return '';
}
