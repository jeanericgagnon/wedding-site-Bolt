import { getConfiguredPublicSiteDomain } from '../publicSiteSlug';

const BLOCKED_PARAM_PATTERN = /(token|invite|secret|secure|signature|signed|jwt|key|access|auth|bearer|cookie|passcode|password|session)/i;

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

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

export function isUnsafeQrHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'metadata' || normalized === 'metadata.google.internal' || normalized === '169.254.169.254') return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.invalid') ||
    normalized.endsWith('.example') ||
    normalized.endsWith('.test')
  ) return true;
  if (normalized.includes(':')) return true;
  return isPrivateIpv4(normalized);
}

export function isAllowedDayOfHost(hostname: string, currentHost?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  const normalizedCurrent = currentHost ? normalizeHostname(currentHost) : '';
  const configuredDomain = normalizeHostname(getConfiguredPublicSiteDomain());
  if (!normalized || isUnsafeQrHostname(normalized)) return false;
  if (normalized === configuredDomain || normalized.endsWith(`.${configuredDomain}`)) return true;
  if (normalizedCurrent && normalized === normalizedCurrent && !isUnsafeQrHostname(normalizedCurrent)) return true;
  return false;
}

export function hasTokenishQrData(url: URL): boolean {
  for (const [key, value] of url.searchParams.entries()) {
    if (BLOCKED_PARAM_PATTERN.test(key)) return true;
    if (BLOCKED_PARAM_PATTERN.test(value)) return true;
    if (BLOCKED_PARAM_PATTERN.test(safeDecodeURIComponent(key))) return true;
    if (BLOCKED_PARAM_PATTERN.test(safeDecodeURIComponent(value))) return true;
  }
  if (BLOCKED_PARAM_PATTERN.test(url.hash)) return true;
  if (BLOCKED_PARAM_PATTERN.test(safeDecodeURIComponent(url.hash))) return true;
  return false;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
