import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('site view travel handoff continuity', () => {
  it('keeps guest-hub invite token handoff support in the public site route', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');

    expect(source).toContain('capturePublicInviteTokenFromSearch');
    expect(source).toContain('getInviteTokenFromSearch');
    expect(source).toContain("if (searchParams.has('token') || searchParams.has('invite_token') || searchParams.has('passwordSession')) return '/site/invite';");
  });

  it('keeps blocked invite-only views marked noindex for public crawlers', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');

    expect(source).toContain("const shouldNoIndex = hideFromSearch || sitePrivacyMode !== 'public' || privacyGate === 'invite_only' || privacyGate === 'password_required';");
    expect(source).toContain("meta.name = 'robots';");
    expect(source).toContain("meta.content = 'noindex, nofollow';");
    expect(source).toContain("meta.dataset.dayofNoindex = '1';");
  });
});
