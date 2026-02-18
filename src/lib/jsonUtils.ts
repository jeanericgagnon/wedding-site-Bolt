export function safeJsonParse<T>(
  input: unknown,
  fallback: T
): T {
  if (input === null || input === undefined) return fallback;
  if (typeof input === 'object') return input as T;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed !== null && typeof parsed === 'object') return parsed as T;
      return fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
