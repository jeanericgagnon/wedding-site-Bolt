import { describe, expect, it } from 'vitest';

import { buildVaultHubPath, buildVaultYearPath } from './vaultContributionPaths';

describe('vaultContributionPaths', () => {
  it('keeps invite access and preview continuity when opening a specific vault year', () => {
    const params = new URLSearchParams('invite_token=invite-123&previewGuest=guest-42');

    expect(buildVaultYearPath('maya-leo', 10, params)).toBe(
      '/vault/maya-leo/10?invite_token=invite-123&previewGuest=guest-42&previewSurface=vault',
    );
  });

  it('normalizes legacy token params into guest-safe invite_token links', () => {
    const params = new URLSearchParams('token=legacy-456');

    expect(buildVaultHubPath('maya-leo', params)).toBe('/vault/maya-leo?invite_token=legacy-456');
  });

  it('omits query noise when there is no guest continuity to preserve', () => {
    expect(buildVaultHubPath('maya-leo', new URLSearchParams('site=maya-leo'))).toBe('/vault/maya-leo');
  });
});
