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
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function safeEmailHref(value: unknown, fallback = "https://dayof.love"): string {
  return escapeHtml(safeEmailUrl(value, fallback) ?? fallback);
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
