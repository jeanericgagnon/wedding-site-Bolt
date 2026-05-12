import { verifySessionToken } from "./signedSession.ts";
import type { SessionSecretSource } from "./signedSession.ts";

export type PublicPrivacyMode = "public" | "password_protected" | "invite_only" | "hidden";
export type PublicGateStatus = "coming_soon" | "password_required" | "invite_required" | "open" | "unavailable";

interface PasswordSessionPayload {
  scope: "public_site_password";
  slug: string;
  exp: number;
}

export function normalizePublicPrivacyMode(value: unknown): PublicPrivacyMode | null {
  if (
    value === "public" ||
    value === "password_protected" ||
    value === "invite_only" ||
    value === "hidden"
  ) {
    return value;
  }

  return null;
}

export async function hasValidPublicPasswordSession(input: {
  slug: string | null | undefined;
  sessionToken: string | null | undefined;
  secret: SessionSecretSource;
}): Promise<boolean> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (!slug || !input.sessionToken) return false;
  const payload = await verifySessionToken<PasswordSessionPayload>(input.sessionToken, input.secret);
  return Boolean(
    payload &&
    payload.scope === "public_site_password" &&
    payload.slug === slug &&
    Number.isFinite(payload.exp) &&
    payload.exp > Date.now(),
  );
}

export async function resolvePublicAccessStatus(input: {
  isPublished: boolean;
  privacyMode: unknown;
  siteSlug: string | null | undefined;
  inviteToken?: string | null;
  passwordSession?: string | null;
  storedInviteToken?: string | null;
  secret: SessionSecretSource;
}): Promise<PublicGateStatus> {
  if (!input.isPublished) return "coming_soon";

  const privacyMode = normalizePublicPrivacyMode(input.privacyMode);
  if (!privacyMode) return "unavailable";

  if (privacyMode === "hidden") return "coming_soon";
  if (privacyMode === "public") return "open";

  if (privacyMode === "password_protected") {
    return await hasValidPublicPasswordSession({
      slug: input.siteSlug,
      sessionToken: input.passwordSession ?? null,
      secret: input.secret,
    })
      ? "open"
      : "password_required";
  }

  if (privacyMode === "invite_only") {
    const inviteToken = typeof input.inviteToken === "string" ? input.inviteToken.trim() : "";
    const storedInviteToken = typeof input.storedInviteToken === "string" ? input.storedInviteToken.trim() : "";
    return inviteToken && storedInviteToken && inviteToken === storedInviteToken
      ? "open"
      : "invite_required";
  }

  return "unavailable";
}

export async function canReadPublicSubresource(input: {
  isPublished: boolean;
  privacyMode: unknown;
  siteSlug: string | null | undefined;
  inviteToken?: string | null;
  passwordSession?: string | null;
  storedInviteToken?: string | null;
  secret: SessionSecretSource;
}): Promise<boolean> {
  return await resolvePublicAccessStatus(input) === "open";
}
