import type { SessionSecretSource } from "./signedSession.ts";

export const PUBLIC_SITE_SESSION_SECRET_V1_ENV = "PUBLIC_SITE_SESSION_SECRET_V1";
export const PUBLIC_SITE_SESSION_SECRET_LEGACY_ENV = "PUBLIC_SITE_SESSION_SECRET";
export const SERVICE_ROLE_SECRET_ENV = "SUPABASE_SERVICE_ROLE_KEY";

type SecretEnvReader = {
  get(key: string): string | undefined | null;
};

function readSecret(env: SecretEnvReader, key: string): string | null {
  const value = env.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function defaultSecretEnvReader(): SecretEnvReader {
  const runtime = globalThis as typeof globalThis & {
    Deno?: {
      env?: SecretEnvReader;
    };
  };
  return runtime.Deno?.env ?? { get: () => undefined };
}

export function getPublicSessionSecretSource(
  env: SecretEnvReader = defaultSecretEnvReader(),
): SessionSecretSource {
  const current = readSecret(env, PUBLIC_SITE_SESSION_SECRET_V1_ENV);
  const legacy = readSecret(env, PUBLIC_SITE_SESSION_SECRET_LEGACY_ENV);
  const serviceRole = readSecret(env, SERVICE_ROLE_SECRET_ENV);

  if (serviceRole && current === serviceRole) {
    throw new Error(`${PUBLIC_SITE_SESSION_SECRET_V1_ENV} must not equal ${SERVICE_ROLE_SECRET_ENV}`);
  }
  if (serviceRole && legacy === serviceRole) {
    throw new Error(`${PUBLIC_SITE_SESSION_SECRET_LEGACY_ENV} must not equal ${SERVICE_ROLE_SECRET_ENV}`);
  }

  const signingSecret = current ?? legacy;
  if (!signingSecret) {
    throw new Error(`Missing ${PUBLIC_SITE_SESSION_SECRET_V1_ENV} or ${PUBLIC_SITE_SESSION_SECRET_LEGACY_ENV}`);
  }

  const verifySecrets = [signingSecret];
  if (legacy && legacy !== signingSecret) verifySecrets.push(legacy);

  return { v1: verifySecrets };
}
