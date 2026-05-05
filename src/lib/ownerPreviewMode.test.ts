import { describe, expect, it } from 'vitest';
import { getOwnerPreviewMode } from './ownerPreviewMode';

describe('ownerPreviewMode', () => {
  it('returns null when no owner preview params are present', () => {
    expect(getOwnerPreviewMode('/site/maya-and-leo', new URLSearchParams('mobileSmoke=1'))).toBeNull();
  });

  it('detects guest preview mode and strips only preview params from the exit href', () => {
    const mode = getOwnerPreviewMode(
      '/rsvp',
      new URLSearchParams('token=private-access&previewGuest=guest-1&previewLabel=Maya&guestLang=es')
    );

    expect(mode).toMatchObject({
      targetKind: 'guest',
      title: 'Owner preview mode',
      exitHref: '/rsvp?token=private-access&guestLang=es',
    });
    expect(mode?.detail).not.toContain('private-access');
    expect(mode?.detail).not.toContain('guest-1');
  });

  it('builds safe role-preview detail from allowlisted roles only', () => {
    const plannerMode = getOwnerPreviewMode('/dashboard', new URLSearchParams('previewRole=planner'));
    const unsafeMode = getOwnerPreviewMode('/dashboard', new URLSearchParams('previewRole=<script>'));

    expect(plannerMode?.detail).toContain('planner path');
    expect(plannerMode?.exitHref).toBe('/dashboard');
    expect(unsafeMode).toBeNull();
  });

  it('supports public visitor preview without changing unrelated params', () => {
    const mode = getOwnerPreviewMode('/site/maya-and-leo', new URLSearchParams('previewSurface=public&lang=fr'));

    expect(mode).toMatchObject({
      targetKind: 'public',
      exitHref: '/site/maya-and-leo?lang=fr',
    });
  });
});
