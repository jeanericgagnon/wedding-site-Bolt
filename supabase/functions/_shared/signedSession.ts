const encoder = new TextEncoder();

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
  secret: string,
): Promise<string> {
  const payloadText = JSON.stringify(payload);
  const payloadBase64 = toBase64Url(encoder.encode(payloadText));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  return `${payloadBase64}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken<TPayload extends object>(
  token: string,
  secret: string,
): Promise<TPayload | null> {
  const [payloadBase64, signatureBase64] = token.split(".");
  if (!payloadBase64 || !signatureBase64) return null;

  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signatureBase64),
    encoder.encode(payloadBase64),
  );
  if (!valid) return null;

  try {
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
