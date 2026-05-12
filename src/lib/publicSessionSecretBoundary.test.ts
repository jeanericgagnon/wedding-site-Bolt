import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getPublicSessionSecretSource } from '../../supabase/functions/_shared/publicSessionSecrets.ts';

describe('public session secret boundary', () => {
  it('prefers the dedicated v1 public session secret and keeps legacy verification fallback separate', () => {
    const source = getPublicSessionSecretSource({
      get(key: string) {
        if (key === 'PUBLIC_SITE_SESSION_SECRET_V1') return 'session-v1';
        if (key === 'PUBLIC_SITE_SESSION_SECRET') return 'legacy-session';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role';
        return undefined;
      },
    });

    expect(source).toEqual({ v1: ['session-v1', 'legacy-session'] });
  });

  it('fails closed if a public session secret reuses the service-role key', () => {
    expect(() =>
      getPublicSessionSecretSource({
        get(key: string) {
          if (key === 'PUBLIC_SITE_SESSION_SECRET_V1') return 'shared-secret';
          if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'shared-secret';
          return undefined;
        },
      }),
    ).toThrow('must not equal SUPABASE_SERVICE_ROLE_KEY');
  });

  it('keeps service-role secrets out of public session signing and verification paths', () => {
    const publicSiteAccess = readFileSync('supabase/functions/public-site-access/index.ts', 'utf8');
    const guestContactLookup = readFileSync('supabase/functions/guest-contact-lookup/index.ts', 'utf8');
    const guestContactSubmit = readFileSync('supabase/functions/guest-contact-submit/index.ts', 'utf8');
    const helper = readFileSync('supabase/functions/_shared/publicSessionSecrets.ts', 'utf8');

    expect(publicSiteAccess).toContain('getPublicSessionSecretSource()');
    expect(publicSiteAccess).not.toContain('const sessionSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!');
    expect(guestContactLookup).toContain('const publicSessionSecretSource = getPublicSessionSecretSource();');
    expect(guestContactLookup).not.toContain('}, serviceRole)');
    expect(guestContactSubmit).toContain('verifySessionToken<ContactSessionPayload>(contactSession, publicSessionSecretSource)');
    expect(helper).toContain('PUBLIC_SITE_SESSION_SECRET_V1');
    expect(helper).toContain('PUBLIC_SITE_SESSION_SECRET');
    expect(helper).toContain('SERVICE_ROLE_SECRET_ENV');
  });
});
