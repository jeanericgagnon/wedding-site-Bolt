const PUBLIC_INTERNAL_FIELD_KEYS = new Set([
  'token',
  'invitetoken',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'secret',
  'apikey',
  'anonkey',
  'provider',
  'providerpath',
  'bucket',
  'command',
  'debug',
  'debuginfo',
  'internalerror',
  'internalerrors',
  'internalnote',
  'internalnotes',
  'servicerole',
  'servicerolekey',
]);

const PUBLIC_INTERNAL_KEY_PATTERNS = [
  /token/,
  /secret/,
  /apikey/,
  /anonkey/,
  /provider/,
  /bucket/,
  /command/,
  /debug/,
  /internal(?:error|note)?/,
  /servicerole/,
];

const PUBLIC_LEAK_VALUE_PATTERN =
  /\b(provider|bucket|command|internal(?:\s+error|\s+note)?|debug|service[-_\s]*role|access[-_\s]*token|refresh[-_\s]*token|invite[-_\s]*token|secret|api[-_\s]*key|anon[-_\s]*key)\b/i;

function normalizePublicInternalFieldKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isPublicInternalFieldKey(key: string): boolean {
  const normalized = normalizePublicInternalFieldKey(key);
  return PUBLIC_INTERNAL_FIELD_KEYS.has(normalized)
    || PUBLIC_INTERNAL_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function stripPublicInternalFieldsDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripPublicInternalFieldsDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isPublicInternalFieldKey(key)) continue;
      out[key] = stripPublicInternalFieldsDeep(child);
    }
    return out as T;
  }

  return value;
}

export function collectPublicLeakValuePaths(
  value: unknown,
  path = 'root',
): string[] {
  if (typeof value === 'string') {
    return PUBLIC_LEAK_VALUE_PATTERN.test(value) || value.includes('/storage/v1/object/sign/')
      ? [path]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectPublicLeakValuePaths(item, `${path}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectPublicLeakValuePaths(child, `${path}.${key}`),
    );
  }

  return [];
}
