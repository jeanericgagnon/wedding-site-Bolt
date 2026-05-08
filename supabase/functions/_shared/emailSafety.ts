function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
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

function isSafeEmailHost(parsed: URL): boolean {
  if (parsed.username || parsed.password) return false;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname) return false;
  if (hostname === "metadata" || hostname === "metadata.google.internal" || hostname === "169.254.169.254") return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".test")
  ) return false;
  if (hostname.includes(":")) return false;
  return !isPrivateIpv4(hostname);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeEmailUrl(value: unknown, fallback: string | null = null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fallback;
    if (!isSafeEmailHost(parsed)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function safeEmailHref(value: unknown, fallback = "https://dayof.love"): string {
  return escapeHtml(safeEmailUrl(value, fallback) ?? fallback);
}

export function isSafeEmailAddress(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  return /^[^\s@<>"'()]+@[^\s@<>"'()]+\.[^\s@<>"'()]+$/.test(raw);
}

export function sanitizeEmailSubject(value: unknown): string {
  const normalized = String(value ?? "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "DayOf update").slice(0, 180);
}
