import { describe, expect, it } from 'vitest';

import { signSessionToken, verifySessionToken } from '../../supabase/functions/_shared/signedSession.ts';

describe('signed session helper', () => {
  it('signs versioned tokens and verifies them with a key ring', async () => {
    const token = await signSessionToken({ siteId: 'site-1' }, { v1: 'secret-1' });

    expect(token.split('.')).toHaveLength(3);
    await expect(verifySessionToken<{ siteId: string }>(token, { v1: 'secret-1' })).resolves.toEqual({ siteId: 'site-1' });
  });

  it('keeps legacy two-part tokens valid for current v1 secrets', async () => {
    const legacy = await signSessionToken({ siteId: 'site-legacy' }, 'secret-legacy');
    const [, payload, signature] = legacy.split('.');

    await expect(
      verifySessionToken<{ siteId: string }>(`${payload}.${signature}`, 'secret-legacy'),
    ).resolves.toEqual({ siteId: 'site-legacy' });
  });

  it('fails closed on malformed base64 or unknown versions', async () => {
    await expect(verifySessionToken('v2.payload.signature', { v1: 'secret-1' })).resolves.toBeNull();
    await expect(verifySessionToken('v1.invalid***.signature', { v1: 'secret-1' })).resolves.toBeNull();
    await expect(verifySessionToken('not-a-token', { v1: 'secret-1' })).resolves.toBeNull();
  });
});
