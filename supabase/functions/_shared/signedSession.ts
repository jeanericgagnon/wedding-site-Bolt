const encoder = new TextEncoder();
const SESSION_TOKEN_VERSION = "v1";
type SessionSecretSource = string | Readonly<Record<string, string>>;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isTokenSegment(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function resolveSecretForVersion(secretSource: SessionSecretSource, version: string): string | null {
  if (typeof secretSource === "string") return secretSource;
  const secret = secretSource[version];
  return typeof secret === "string" && secret.trim() ? secret : null;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionToken<TPayload extends object>(
  payload: TPayload,
  secretSource: SessionSecretSource,
): Promise<string> {
  const payloadText = JSON.stringify(payload);
  const payloadBase64 = toBase64Url(encoder.encode(payloadText));
  const secret = resolveSecretForVersion(secretSource, SESSION_TOKEN_VERSION);
  if (!secret) throw new Error(`Missing session secret for ${SESSION_TOKEN_VERSION}`);
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  return `${SESSION_TOKEN_VERSION}.${payloadBase64}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken<TPayload extends object>(
  token: string,
  secretSource: SessionSecretSource,
): Promise<TPayload | null> {
  try {
    const parts = token.split(".");
    let version = SESSION_TOKEN_VERSION;
    let payloadBase64 = "";
    let signatureBase64 = "";

    if (parts.length === 3) {
      [version, payloadBase64, signatureBase64] = parts;
    } else if (parts.length === 2) {
      [payloadBase64, signatureBase64] = parts;
    } else {
      return null;
    }

    if (!payloadBase64 || !signatureBase64 || !isTokenSegment(payloadBase64) || !isTokenSegment(signatureBase64)) return null;
    if (parts.length === 3 && !isTokenSegment(version)) return null;

    const secret = resolveSecretForVersion(secretSource, version);
    if (!secret) return null;

    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureBase64),
      encoder.encode(payloadBase64),
    );
    if (!valid) return null;

    const payloadText = new TextDecoder().decode(fromBase64Url(payloadBase64));
    const parsed = JSON.parse(payloadText);
    return parsed && typeof parsed === "object" ? parsed as TPayload : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
