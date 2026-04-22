import { describe, expect, it } from 'vitest';
import { SITE_TRUST_COPY } from './siteTrustCopy';

describe('SITE_TRUST_COPY starter draft truth', () => {
  it('keeps private editing and draft-to-share wording framed around sharing with guests instead of launch claims', () => {
    expect(SITE_TRUST_COPY.privateEditing).toBe('Keep refining it privately, then share it with guests when you are ready.');
    expect(SITE_TRUST_COPY.guestFacingLaunch).toBe('Share with guests');
    expect(SITE_TRUST_COPY.draftToLaunch).toBe('A clean path from draft editing to sharing it with guests.');
    expect(SITE_TRUST_COPY.privateEditing.toLowerCase()).not.toContain('launch it for guests');
    expect(SITE_TRUST_COPY.draftToLaunch.toLowerCase()).not.toContain('guest-facing launch');
  });

  it('keeps the trust copy aligned with starter-draft review language before publish', () => {
    expect(SITE_TRUST_COPY.privateEditing).toContain('share it with guests when you are ready');
    expect(SITE_TRUST_COPY.privateEditing.toLowerCase()).not.toContain('live');
    expect(SITE_TRUST_COPY.draftToLaunch).toContain('sharing it with guests');
  });
});
